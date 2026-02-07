import {
    groupByDate,
    groupDriverLogsByDate,
    calcTotal,
    formatDate,
    getBillingPeriod,
    getBusinessDateForCalc
} from "./detailCalc.js";
import { fetchSales, fetchDriverLogs } from "./firestore.js";

/* =========================
 * 状態
 * ========================= */
let gptPayload = null;

// 今日（未来ガード用）
const todayBase = new Date();

// 表示中の分析月（初期：今月）
let analysisBaseDate = new Date();

/* =========================
 * Utils
 * ========================= */
function formatTimeHM(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

function updateMonthLabel(date) {
    const el = document.getElementById("analysisMonthLabel");
    if (!el) return;
    el.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月度`;
}

function updateMonthNavState() {
    const nextBtn = document.getElementById("nextMonth");
    if (!nextBtn) return;

    const isCurrentMonth =
        analysisBaseDate.getFullYear() === todayBase.getFullYear() &&
        analysisBaseDate.getMonth() === todayBase.getMonth();

    nextBtn.disabled = isCurrentMonth;
}

/* =========================
 * Main Render
 * ========================= */
async function render() {
    const allSales = await fetchSales();
    const driverLogs = await fetchDriverLogs();

    const baseDate = analysisBaseDate;
    const { start, end } = getBillingPeriod(baseDate);

    updateMonthLabel(baseDate);
    updateMonthNavState();

    // 期間表示
    const periodEl = document.getElementById("billingPeriod");
    if (periodEl) {
        periodEl.textContent = `${formatDate(start)} ～ ${formatDate(end)}`;
    }

    // 対象データ抽出
    const sales = allSales.filter(s => {
        const d = getBusinessDateForCalc(s);
        return d >= start && d <= end;
    });

    const logs = driverLogs.filter(l => {
        const d = getBusinessDateForCalc(l);
        return d >= start && d <= end;
    });

    // 集計
    const grouped = groupByDate(sales);
    const total = calcTotal(grouped);
    const logsByDate = groupDriverLogsByDate(logs);

    // 月サマリー
    document.getElementById("totalGross").textContent =
        `税込合計：${total.gross.toLocaleString()}円`;
    document.getElementById("totalNet").textContent =
        `税抜合計：${total.net.toLocaleString()}円`;
    document.getElementById("workDays").textContent =
        `${Object.keys(grouped).length}日`;

    /* =========================
     * 日別カード
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

            let workTime = "⚠ 出勤時間未記録";
            if (sale?.workStartAt && sale?.workEndAt) {
                workTime = `⏱ ${formatTimeHM(sale.workStartAt.toDate())} ～ ${formatTimeHM(sale.workEndAt.toDate())}`;
            }

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
    * 所見
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

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchMonthlyInsight(monthKey) {
    const res = await fetch("../data/monthly-insight.json");
    const json = await res.json();
    return json[monthKey] || null;
}


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

/* =========================
 * 月移動
 * ========================= */
document.getElementById("prevMonth")?.addEventListener("click", () => {
    analysisBaseDate.setMonth(analysisBaseDate.getMonth() - 1);
    render();
});

document.getElementById("nextMonth")?.addEventListener("click", () => {
    const next = new Date(analysisBaseDate);
    next.setMonth(next.getMonth() + 1);

    if (
        next.getFullYear() > todayBase.getFullYear() ||
        (next.getFullYear() === todayBase.getFullYear() &&
            next.getMonth() > todayBase.getMonth())
    ) return;

    analysisBaseDate = next;
    render();
});

/* =========================
 * Init
 * ========================= */
render().catch(e => {
    console.error(e);
    alert("月別データの読み込みに失敗しました");
});
