import {
    groupByDate,
    groupDriverLogsByDate,
    calcTotal,
    formatDate
} from "./detailCalc.js";
import { fetchSales, fetchDriverLogs } from "./firestore.js";

async function render() {
    const sales = await fetchSales();
    const driverLogs = await fetchDriverLogs();

    // 日別集計
    const grouped = groupByDate(sales);
    const total = calcTotal(grouped);


    // ログ集計
    const logsByDate = groupDriverLogsByDate(driverLogs);

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
            const hasMemo = sales.some(
                s => formatDate(s.createdAt) === date && s.memo
            );
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
                <strong class="log__date">${date}</strong>
                <ul>
                    ${items.map(t => `<li>${t}</li>`).join("")}
                </ul>
            `;
            logsEl.appendChild(div);
        });

    /* ===== 売上メモのクリック表示 ===== */
    document.querySelectorAll(".memo-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const date = btn.dataset.date;

            const memos = sales
                .filter(s => formatDate(s.createdAt) === date && s.memo)
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
