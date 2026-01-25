import {
    groupByDate,
    groupDriverLogsByDate,
    calcTotal,
    formatDate,
    getBillingPeriod,
    getBusinessDateForCalc
} from "./detailCalc.js";
import { fetchSales, fetchDriverLogs } from "./firestore.js";

async function render() {
    const allSales = await fetchSales();
    const driverLogs = await fetchDriverLogs();

    // ★ 月度期間を取得
    const { start, end } = getBillingPeriod();

    //対象期間の表示
    const periodEl = document.getElementById("billingPeriod");
    if (periodEl) {
        periodEl.textContent =
            `今月の対象期間：${formatDate(start)} ～ ${formatDate(end)}`;
    }

    // ★ 月度内の売上だけに絞る
    const sales = allSales.filter(s => {
        const businessDate = getBusinessDateForCalc(s);
        return businessDate >= start && businessDate <= end;
    });

    //月度内のログだけに絞る
    const logs = driverLogs.filter(l => {
        const businessDate = getBusinessDateForCalc(l);
        return businessDate >= start && businessDate <= end;
    });


    // 日別集計
    const grouped = groupByDate(sales);
    const total = calcTotal(grouped);


    // ログ集計
    const logsByDate = groupDriverLogsByDate(logs);

    // 総売上表示
    document.getElementById("totalGross").textContent =
        `税込合計：${total.gross.toLocaleString()}円`;

    document.getElementById("totalNet").textContent =
        `税抜合計：${total.net.toLocaleString()}円`;

    // 日別売上表
    const tbody = document.getElementById("dailySales");
    Object.entries(grouped)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .forEach(([date, data]) => {


            // ★ この日付に売上メモがあるか判定
            const hasMemo = sales.some(s => {
                const d = formatDate(getBusinessDateForCalc(s));
                return d === date && s.memo;
            });

            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${date}</td>
            <td>${data.gross.toLocaleString()}円</td>
            <td>${data.net.toLocaleString()}円</td>
            <td class="memo-cell">
                ${hasMemo
                    ? `<button class="memo-btn" data-date="${date}">📝</button>`
                    : ``}
            </td>
        `;
            tbody.appendChild(tr);
        });
    /* ===== 日別ログ ===== */
    const logsEl = document.getElementById("dailyLogs");

    Object.entries(logsByDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .forEach(([date, items]) => {
            const div = document.createElement("div");
            div.innerHTML = `
<strong class="log__date">
${date}
</strong>
<ul>
${items.map(t => `<li>${t}</li>`).join("")}
</ul>
`;
            logsEl.appendChild(div);
        });    /* ===== 売上メモのクリック表示 ===== */
    document.querySelectorAll(".memo-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            navigator.vibrate?.(50);
            const date = btn.dataset.date;

            const memos = sales
                .filter(s => {
                    const d = formatDate(getBusinessDateForCalc(s));
                    return d === date && s.memo;
                })
                .map(s => s.memo);
            alert(
                memos.length
                    ? memos.join("\n")
                    : "この日の売上メモはありません"
            );
        });
    });
}

render().catch(e => {
    console.error(e);
    alert("売上データの読み込みに失敗しました");
});
