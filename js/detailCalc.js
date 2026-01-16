import { fetchSales } from
    "./firestore.js";


/* 日付を変換するユーティリティ関数 */
export function formatDate(date) {
    const d = date instanceof Date ? date : date.toDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// ===============================
// 月度判定（21日スタート）
// ===============================
function getBillingPeriod(date = new Date()) {
    const d = new Date(date);

    // ==========================
    //  特例期間（必要ならここに追記）
    // ==========================
    const specialRanges = [
        // 【2月度】 2026/1/21〜2026/2/19
        { start: new Date(2026, 0, 21), end: new Date(2026, 1, 19) },

        // 【3月度】 2026/2/20〜2026/3/21
        { start: new Date(2026, 1, 20), end: new Date(2026, 2, 21) },

        // 【4月度】 2026/3/22〜2026/4/20
        { start: new Date(2026, 2, 22), end: new Date(2026, 3, 20) }
    ];

    // 今日が特例に含まれるかチェック
    for (const r of specialRanges) {
        if (d >= r.start && d <= r.end) {
            return r;
        }
    }

    // ==========================
    //  通常ルール（21日〜翌20日）
    // ==========================
    const year = d.getFullYear();
    const month = d.getMonth(); // 0=1月

    // 今日が21日以降なら今月開始
    const start = new Date(year, month, 21);

    // 今日が20日以前なら前月開始
    if (d.getDate() < 21) {
        start.setMonth(start.getMonth() - 1);
    }

    // 終了は開始の翌月20日
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(20);

    return { start, end };
}

//firestoreから期間内だけ合計を出す関数
export async function loadSalesSummary() {
    const { start, end } = getBillingPeriod();
    let total = 0;

    const sales = await fetchSales();

    sales.forEach(data => {
        if (!data.createdAt) {
            console.warn("createdAtなしのデータ:", data);
            return;
        }
        if (typeof data.memo !== "string") return;
        const createdAt =
            data.createdAt instanceof Date
                ? data.createdAt
                : data.createdAt.toDate();

        if (createdAt >= start && createdAt <= end) {
            total += Number(data.amount) || 0;
        }
    });

    return total;
}



/* 日別売上集計 */
export function groupByDate(sales) {
    const map = {};

    sales.forEach(({ amount, createdAt }) => {
        const date = formatDate(createdAt);

        if (!map[date]) {
            map[date] = { gross: 0, net: 0 };
        }

        map[date].gross += amount;
        map[date].net += Math.floor(amount / 1.1);
    });

    return map;
}

/* driverLogs 日別集計 */
export function groupDriverLogsByDate(logs) {
    const map = {};

    logs.forEach(({ note, createdAt }) => {
        if (!note) return;

        const date = formatDate(createdAt);

        if (!map[date]) map[date] = [];
        map[date].push(note);
    });

    return map;
}


// 総売上
export function calcTotal(grouped) {
    return Object.values(grouped).reduce(
        (acc, d) => {
            acc.gross += d.gross;
            acc.net += d.net;
            return acc;
        },
        { gross: 0, net: 0 }
    );
}

// 2勤1休（仮）
/* export function isWorkDay(dateStr, baseDateStr) {
    const diff =
        (new Date(dateStr) - new Date(baseDateStr))
        / (1000 * 60 * 60 * 24);

    return Math.floor(diff) % 3 < 2;
} */

// 今月残り出勤日
/* export function countRemainingWorkDays(baseDateStr) {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const last = new Date(y, m + 1, 0).getDate();

    let count = 0;

    for (let d = today.getDate(); d <= last; d++) {
        const dateStr =
            `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (isWorkDay(dateStr, baseDateStr)) count++;
    }

    return count;
} */

// 目標
/* export function calcTarget(totalGross, remainingWorkDays) {
    const TARGET = 800000;
    const remaining = TARGET - totalGross;

    return {
        remaining,
        daily: remainingWorkDays
            ? Math.ceil(remaining / remainingWorkDays)
            : 0
    };
} */