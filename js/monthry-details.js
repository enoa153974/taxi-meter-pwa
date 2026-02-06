import {
    groupByDate,
    groupDriverLogsByDate,
    calcTotal,
    formatDate,
    getBillingPeriod,
    getBusinessDateForCalc
} from "./detailCalc.js";
import { fetchSales, fetchDriverLogs } from "./firestore.js";

let gptPayload = null;

// 時刻フォーマット
function formatTimeHM(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

async function render() {
    const allSales = await fetchSales();
    const driverLogs = await fetchDriverLogs();

    // ★ 表示対象の月（今月 or 選択中の月）
    const baseDate = new Date(); 
    const { start, end } = getBillingPeriod(baseDate);

    // 期間表示
    const periodEl = document.getElementById("billingPeriod");
    if (periodEl) {
        periodEl.textContent =
            `${formatDate(start)} ～ ${formatDate(end)}`;
    }

    // 対象売上
    const sales = allSales.filter(s => {
        const d = getBusinessDateForCalc(s);
        return d >= start && d <= end;
    });

    // 対象ログ
    const logs = driverLogs.filter(l => {
        const d = getBusinessDateForCalc(l);
        return d >= start && d <= end;
    });

    // 日別集計
    const grouped = groupByDate(sales);
    const total = calcTotal(grouped);
    const logsByDate = groupDriverLogsByDate(logs);

    // 月サマリー
    document.getElementById("totalGross").textContent =
        `税込合計：${total.gross.toLocaleString()}円`;
    document.getElementById("totalNet").textContent =
        `税抜合計：${total.net.toLocaleString()}円`;
    const workDays = Object.keys(grouped).length;
    document.getElementById("workDays").textContent = `${workDays}日`;

    // 日別カード
    const container = document.getElementById("dailyReport");
    const dailyData = [];

    container.innerHTML = "";


    Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .forEach(([date, data]) => {

            const saleOfDay = sales.find(s => {
                const d = formatDate(getBusinessDateForCalc(s));
                return d === date;
            });

            let workTimeText = "⚠ 出勤時間未記録";
            if (saleOfDay?.workStartAt && saleOfDay?.workEndAt) {
                const start = saleOfDay.workStartAt.toDate();
                const end = saleOfDay.workEndAt.toDate();
                workTimeText = `⏱ ${formatTimeHM(start)} ～ ${formatTimeHM(end)}`;
            }

            const memoText = saleOfDay?.memo
                ? saleOfDay.memo
                : "（売上メモなし）";

            const dayLogs = logsByDate[date] || [];

            const card = document.createElement("article");
            card.className = "day-card";
            card.innerHTML = `
        <header class="day-card__header">
        <div class="day-card__date">
            <span class="date">${date}</span>
            <span class="work-time ${saleOfDay?.workStartAt ? "" : "unrecorded"}">
                ${workTimeText}
            </span>
        </div>
        <div class="day-card__sales">
            <span class="gross">税込 ${data.gross.toLocaleString()}円</span>
            <span class="net">税抜 ${data.net.toLocaleString()}円</span>
            </div>
        </header>

        <div class="day-card__memo">
            ${memoText}
        </div>

        ${dayLogs.length ? `
            <div class="day-card__logs">
            <ul>
                ${dayLogs.map(l => `<li>${l}</li>`).join("")}
            </ul>
            </div>
        ` : ""}
        `;

            container.appendChild(card);

            dailyData.push({
                date,
                gross: data.gross.toLocaleString(),
                net: data.net.toLocaleString(),
                workTime: workTimeText,
                memo: memoText,
                logs: dayLogs
            });


        });

    // =========================
    // 曜日別集計
    // =========================
    const weekdaySummary = groupSalesByWeekday(sales);

    // デバッグ確認（まず必須）
    console.log("曜日別集計（合計）", weekdaySummary);

    // =========================
    // 平均値計算（表示用に整形）
    // =========================
    const weekdayAverages = {};

    Object.entries(weekdaySummary).forEach(([weekday, data]) => {
        weekdayAverages[weekday] = {
            days: data.days,
            avgGross: Math.round(data.totalGross / data.days),
            avgMinutes: Math.round(data.totalMinutes / data.days)
        };
    });

    const weekdayContainer = document.getElementById("weekdayAverage");
    weekdayContainer.innerHTML = "";

    Object.entries(weekdayAverages).forEach(([day, data]) => {
        const card = document.createElement("div");
        card.className = "weekday-card";

        const hours = Math.floor(data.avgMinutes / 60);
        const minutes = data.avgMinutes % 60;

        card.innerHTML = `
                <div class="weekday-card__day">${day}</div>
                <div class="weekday-card__gross">
                平均 ${data.avgGross.toLocaleString()}円
                </div>
                <div class="weekday-card__time">
                ⏱ ${hours}時間${minutes}分
                </div>
            `;

        weekdayContainer.appendChild(card);
    });


    // ===== 所見表示 =====
    const monthKey = getMonthKey(baseDate);
    const insight = await fetchMonthlyInsight(monthKey);

    if (insight) {
        document.getElementById("monthlySummary").textContent =
            insight.summary || "（未記入）";

        const ul = document.getElementById("weekdayInsightList");
        ul.innerHTML = "";

        Object.entries(insight.weekday).forEach(([day, text]) => {
            if (!text) return;

            const li = document.createElement("li");
            li.textContent = `${day}：${text}`;
            ul.appendChild(li);
        });
    } else {
        document.getElementById("monthlySummary").textContent =
            "（この月の所見データはありません）";
    }

    gptPayload = {
        periodText: document.getElementById("billingPeriod")?.textContent || "",
        total,
        workDays,
        weekdayAverages,
        dailyData
    };


}

render().catch(e => {
    console.error(e);
    alert("月別データの読み込みに失敗しました");
});

//曜日別にまとめる関数
function groupSalesByWeekday(sales) {
    const map = {};

    sales.forEach(sale => {
        const businessDate = getBusinessDateForCalc(sale);
        if (!businessDate) return;

        const weekdayIndex = businessDate.getDay(); // 0=日
        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
        const weekday = weekdays[weekdayIndex];

        if (!map[weekday]) {
            map[weekday] = {
                days: 0,
                totalGross: 0,
                totalMinutes: 0
            };
        }

        map[weekday].days += 1;
        map[weekday].totalGross += Number(sale.amount) || 0;
        map[weekday].totalMinutes += Number(sale.workMinutes) || 0;
    });

    return map;
}

function getMonthKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

async function fetchMonthlyInsight(monthKey) {
    const res = await fetch("../data/monthly-insight.json");
    const json = await res.json();
    return json[monthKey] || null;
}


//GPT用のプロンプト形式で日別データをコピーできる関数
function buildGptPrompt({
    periodText,
    total,
    workDays,
    weekdayAverages,
    dailyData
}) {
    let text = "";

    text += `【対象月】\n${periodText}\n\n`;

    text += `【月サマリー】\n`;
    text += `・税込合計：${total.gross.toLocaleString()}円\n`;
    text += `・税抜合計：${total.net.toLocaleString()}円\n`;
    text += `・出勤日数：${workDays}日\n\n`;

    text += `【曜日別平均】\n`;
    Object.entries(weekdayAverages).forEach(([day, d]) => {
        const h = Math.floor(d.avgMinutes / 60);
        const m = d.avgMinutes % 60;
        text += `${day}：平均売上 ${d.avgGross.toLocaleString()}円／平均稼働 ${h}時間${m}分\n`;
    });

    text += `\n【日別実績】\n`;
    dailyData.forEach(day => {
        text += `■ ${day.date}\n`;
        text += `売上：税込 ${day.gross}円／税抜 ${day.net}円\n`;
        text += `稼働時間：${day.workTime}\n`;
        text += `売上メモ：\n${day.memo}\n\n`;

        if (day.logs.length) {
            text += `業務ログ：\n`;
            day.logs.forEach(l => {
                text += `・${l}\n`;
            });
            text += `\n`;
        }
    });

    return text;
}
document.getElementById("copyForGpt").addEventListener("click", async () => {
    if (!gptPayload) {
        alert("データがまだ準備できていません");
        return;
    }

    const text = buildGptPrompt(gptPayload);

    await navigator.clipboard.writeText(text);
    alert("GPT用テキストをコピーしました");
});

