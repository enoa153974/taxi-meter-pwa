import {
    groupByDate,
    groupLogsByDate,
    calcTotal
} from "./detailCalc.js";
import { fetchSales } from "./firestore.js";

async function render() {
    const sales = await fetchSales();

    // 日別集計
    const grouped = groupByDate(sales);
    const logs = groupLogsByDate(sales);
    const total = calcTotal(grouped);

    // 総売上表示
    document.getElementById("totalGross").textContent =
        `税込合計：${total.gross.toLocaleString()}円`;

    document.getElementById("totalNet").textContent =
        `税抜合計：${total.net.toLocaleString()}円`;

    // 日別売上表
    const tbody = document.getElementById("dailySales");
    Object.entries(grouped).forEach(([date, data]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${date}</td>
        <td>${data.gross.toLocaleString()}円</td>
        <td>${data.net.toLocaleString()}円</td>
    `;
        tbody.appendChild(tr);
    });

    // 日別ログ
    const logsEl = document.getElementById("dailyLogs");
    Object.entries(logs).forEach(([date, items]) => {
        const div = document.createElement("div");
        div.innerHTML = `
        <strong>${date}</strong>
        <ul>
            ${items.map(t => `<li>${t}</li>`).join("")}
        </ul>
    `;
        logsEl.appendChild(div);
    });
}

render().catch(e => {
    console.error(e);
    alert("売上データの読み込みに失敗しました");
});
