import {
    groupDriverLogsByDate,
    formatDate,
    getBillingPeriod,
    getBusinessDateForCalc
} from "./detailCalc.js";
import { fetchSalesByPeriod, fetchDriverLogsByPeriod } from "./firestore.js";

import { buildMonthSummary } from "./monthSummary.js";

/* =========================
 * 状態
 * ========================= */
let gptPayload = null;
const todayBase = new Date();

//月度判定
const { end } = getBillingPeriod(todayBase);
let analysisBaseDate = new Date(end.getFullYear(), end.getMonth(), 15);

// 「今日が属する月度」を、この画面での“最大月”にする
const { end: maxEnd } = getBillingPeriod(new Date());
const maxBaseDate = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), 15);


/* =========================
 * Utils
 * ========================= */
//時間の形式を整える
function formatTimeHM(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

//月別分析の〇年度の見出しの生成（ここで何月度の集計かを決定）
function updateMonthLabel(date) {
    const el = document.getElementById("analysisMonthLabel");
    if (!el) return;

    el.textContent =
        `${date.getFullYear()}年${date.getMonth() + 1}月度`;
}

//▶ボタンを押すと翌月へ移管
function updateMonthNavState() {
    const nextBtn = document.getElementById("nextMonth");
    if (!nextBtn) return;

    // 次に進んだ月が maxBaseDate を超えるなら無効化
    const next = shiftMonth(analysisBaseDate, +1);
    nextBtn.disabled = next > maxBaseDate;
}

/* =========================
 * Main Render
 * ========================= */
async function render() {


    //月度の期間を決める（start ~ end）
    const baseDate = analysisBaseDate;
    const { start, end } = getBillingPeriod(baseDate);

    //  Firestoreで必要分だけ取得
    const sales = await fetchSalesByPeriod(start, end);
    const logs = await fetchDriverLogsByPeriod(start, end);



    //決定した月度と翌月を生成
    updateMonthLabel(baseDate);
    updateMonthNavState();

    // 見出し下に月度期間表示
    const periodEl = document.getElementById("billingPeriod");
    if (periodEl) {
        periodEl.textContent = `${formatDate(start)} ～ ${formatDate(end)}`;
    }


    // 抽出したデータを集計
    const summary = buildMonthSummary(sales, baseDate);
    const { grouped, total, workDays } = summary;
    const logsByDate = groupDriverLogsByDate(logs);


    // 月別サマリーの表示
    document.getElementById("totalGross").textContent =
        `税込合計：${total.gross.toLocaleString()}円`;
    document.getElementById("totalNet").textContent =
        `税抜合計：${total.net.toLocaleString()}円`;
    document.getElementById("workDays").textContent =
        `${Object.keys(grouped).length}日`;


    /* =========================
     * 日別カードの生成
     * ========================= */
    const container = document.getElementById("dailyReport");
    container.innerHTML = "";

    const dailyData = [];

    Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .forEach(([date, data]) => {
            const sale = sales.find(s =>
                formatDate(getBusinessDateForCalc(s)) === date
            );

            //稼働時間のデータがない場合とある場合の表示切替
            let workTime = "⚠ 出勤時間未記録";
            if (sale?.workStartAt && sale?.workEndAt) {
                workTime = `⏱ ${formatTimeHM(sale.workStartAt.toDate())} ～ ${formatTimeHM(sale.workEndAt.toDate())}`;
            }

            //日別データカードを生成
            const memo = sale?.memo || "（売上メモなし）";
            const dayLogs = logsByDate[date] || [];

            container.insertAdjacentHTML("beforeend", `
                <article class="day-card">
                <header class="day-card__header">
                    <div class="day-card__date">
                    <span class="date">${date}</span>
                    <span class="work-time ${sale?.workStartAt ? "" : "unrecorded"}">${workTime}</span>
                    </div>
                    <div class="day-card__sales">
                    <span class="gross">税込 ${data.gross.toLocaleString()}円</span>
                    <span class="net">税抜 ${data.net.toLocaleString()}円</span>
                    </div>
                </header>
                <div class="day-card__memo">${memo}</div>
                ${dayLogs.length ? `
                <div class="day-card__logs">
                    <ul>${dayLogs.map(l => `<li>${l}</li>`).join("")}</ul>
                </div>` : ""}
                </article>
                `);

            dailyData.push({
                date,
                gross: data.gross,
                net: data.net,
                workTime,
                memo,
                logs: dayLogs
            });
        });

    /* =========================
     * GPT用
     * ========================= */
    gptPayload = {
        periodText: periodEl?.textContent || "",
        total,
        workDays: Object.keys(grouped).length,
        dailyData
    };

    //コピー用ロジック
    document.getElementById("copyForGpt")?.addEventListener("click", async () => {
        if (!gptPayload) {
            alert("分析データがまだ生成されていません");
            return;
        }

        const text = buildGPTText(gptPayload);

        try {
            await navigator.clipboard.writeText(text);
            alert("📋 分析データをコピーしました！");
        } catch (e) {
            console.error(e);
            alert("コピーに失敗しました");
        }
    });

    //文章整形用ロジック
    function buildGPTText(payload) {
        const lines = [];

        lines.push("【対象期間】");
        lines.push(payload.periodText);
        lines.push("");

        lines.push("【月サマリー】");
        lines.push(`・税込合計：${payload.total.gross.toLocaleString()}円`);
        lines.push(`・税抜合計：${payload.total.net.toLocaleString()}円`);
        lines.push(`・出勤日数：${payload.workDays}日`);
        lines.push("");

        lines.push("【日別実績】");
        payload.dailyData.forEach(d => {
            lines.push(`■ ${d.date}`);
            lines.push(`  税込：${d.gross.toLocaleString()}円`);
            lines.push(`  税抜：${d.net.toLocaleString()}円`);
            lines.push(`  稼働：${d.workTime}`);
            if (d.memo) lines.push(`  メモ：${d.memo}`);
            if (d.logs?.length) {
                d.logs.forEach(l => lines.push(`   - ${l}`));
            }
            lines.push("");
        });

        lines.push("【分析依頼】");
        lines.push("上記データを元に、運行の所見と改善点を出してください。");

        return lines.join("\n");
    }


    /* =========================
     * 曜日別点検（平均）
     * ========================= */
    const weekdaySummary = groupSalesByWeekday(sales);
    const weekdayAverages = {};
    const WEEKDAY_ORDER = ["月", "火", "水", "木", "金", "土", "日"];


    Object.entries(weekdaySummary).forEach(([day, d]) => {
        weekdayAverages[day] = {
            days: d.days,
            avgGross: Math.round(d.totalGross / d.days),
            avgMinutes: Math.round(d.totalMinutes / d.days)
        };
    });

    const weekdayContainer = document.getElementById("weekdayAverage");
    weekdayContainer.innerHTML = "";

    WEEKDAY_ORDER.forEach(day => {
        const d = weekdayAverages[day];
        if (!d) return; // データがない曜日はスキップ

        const h = Math.floor(d.avgMinutes / 60);
        const m = d.avgMinutes % 60;

        weekdayContainer.insertAdjacentHTML("beforeend", `
        <div class="weekday-card">
            <div class="weekday-card__day">${day}</div>
            <div class="weekday-card__gross">
                平均 ${d.avgGross.toLocaleString()}円
            </div>
            <div class="weekday-card__time">
                ⏱ ${h}時間${m}分
            </div>
        </div>
    `);
    });



    /* =========================
    * 所見（月別＆曜日別）を生成
    * ========================= */
    const monthKey = getMonthKey(baseDate);
    const insight = await fetchMonthlyInsight(monthKey);

    const summaryEl = document.getElementById("monthlySummary");
    const listEl = document.getElementById("weekdayInsightList");

    if (summaryEl && listEl) {
        if (insight) {
            summaryEl.textContent = insight.summary || "（未記入）";
            listEl.innerHTML = "";

            Object.entries(insight.weekday).forEach(([day, text]) => {
                if (!text) return;
                const li = document.createElement("li");
                li.textContent = `${day}：${text}`;
                listEl.appendChild(li);
            });
        } else {
            summaryEl.textContent = "（この月の所見データはありません）";
            listEl.innerHTML = "";
        }
    }

}

//所見用のmonthkey取得用関数
function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

//jsonファイルから該当する月別所見データを取得
// NOTE: monthly-insight.json
async function fetchMonthlyInsight(monthKey) {
    const res = await fetch("../data/monthly-insight.json");
    const json = await res.json();
    return json[monthKey] || null;
}


//曜日別所見を整頓
function groupSalesByWeekday(sales) {
    const map = {};
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];


    sales.forEach(sale => {
        const d = getBusinessDateForCalc(sale);
        if (!d) return;

        const day = weekdays[d.getDay()];
        map[day] ??= { days: 0, totalGross: 0, totalMinutes: 0 };

        map[day].days++;
        map[day].totalGross += Number(sale.amount) || 0;
        map[day].totalMinutes += Number(sale.workMinutes) || 0;
    });

    return map;
}


/* =========================================================
 * 月移動ユーティリティ
 * ---------------------------------------------------------
 * ■役割
 * 表示中の分析月（analysisBaseDate）を安全に操作する
 *
 * ■設計方針
 * 月度判定は「月の代表日」を基準に行う
 * → 1日ではなく15日固定にする理由
 *
 *   ・月初(1日)だと前月扱いになる可能性がある
 *   ・月末だと翌月扱いになる可能性がある
 *   ・15日は必ずその月に属する
 *
 * つまり
 * 「どの月度計算ロジックでもズレない日」
 * を基準日として採用している
 * ========================================================= */


/**
 * 指定月から ±nヶ月移動した Date を返す
 *
 * @param {Date} date 基準日
 * @param {number} diff 移動月数（例：-1=前月、+1=翌月）
 * @returns {Date} 移動後の基準日（常に15日固定）
 */
function shiftMonth(date, diff) {
    return new Date(date.getFullYear(), date.getMonth() + diff, 15);
}


/* =========================
 * 月移動イベント
 * ========================= */

// ◀をクリックすると前月を表示
document.getElementById("prevMonth")?.addEventListener("click", () => {
    analysisBaseDate = shiftMonth(analysisBaseDate, -1);
    render();
});

// ▶をクリックすると次月を表示
document.getElementById("nextMonth")?.addEventListener("click", () => {
    const next = shiftMonth(analysisBaseDate, +1);
    if (next > maxBaseDate) return;

    analysisBaseDate = next;
    render();
});

/* =========================
 * Init
 * ========================= */
//エラー時の表示
render().catch(e => {
    console.error(e);
    alert("月別データの読み込みに失敗しました");
});
