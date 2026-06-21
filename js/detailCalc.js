import { fetchSalesByPeriod } from
    "./firestore.js";


/* 日付を変換するユーティリティ関数 */
export function formatDate(date) {
    const d = date instanceof Date ? date : date.toDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}（${getWeekday(d)}）`;
}

/* 曜日を返すユーティリティ関数 */
export function getWeekday(date) {
    const d = date instanceof Date ? date : date.toDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return weekdays[d.getDay()];
}

/* businessDateをstring型に変換する関数 */
export function toBusinessDateKey(date) {
    const d = date instanceof Date ? date : date.toDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;

}


// ===============================
// 月度判定（21日スタート）
// ===============================
export function getBillingPeriod(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // 特例（この方式が正解）
    const specialRanges = [
        { start: new Date(2026, 0, 21), end: new Date(2026, 1, 19) }, // 2月度
        { start: new Date(2026, 1, 20), end: new Date(2026, 2, 21) }, // 3月度
        { start: new Date(2026, 2, 22), end: new Date(2026, 3, 20) }  // 4月度
    ];

    for (const r of specialRanges) {
        const s = new Date(r.start); s.setHours(0, 0, 0, 0);
        const e = new Date(r.end); e.setHours(23, 59, 59, 999);
        if (d >= s && d <= e) return { start: s, end: e };
    }

    // 通常（21日〜翌20日）
    const year = d.getFullYear();
    const month = d.getMonth();

    const start = new Date(year, month, 21);
    if (d.getDate() < 21) start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(20);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}


//保存用
export function calcBusinessDateForSave(date = new Date()) {
    const d = new Date(date);

    // AM0〜4時なら前日扱い
    if (d.getHours() < 5) {
        d.setDate(d.getDate() - 1);
    }


    // 時刻を切り落として日付だけに
    d.setHours(0, 0, 0, 0);

    return d;
}

// 集計用（旧データ対応）
export function getBusinessDateForCalc(data) {

    // ===== businessDate優先 =====
    if (data.businessDate) {

        // NOTE: デバッグ用
        //console.log("businessDate raw =", data.businessDate);

        let d;

        if (data.businessDate instanceof Date) {
            d = new Date(data.businessDate);

        } else if (typeof data.businessDate.toDate === "function") {
            d = data.businessDate.toDate();

        } else if (typeof data.businessDate === "string") {

            if (/^\d{8}$/.test(data.businessDate)) {
                const y = data.businessDate.slice(0, 4);
                const m = data.businessDate.slice(4, 6);
                const day = data.businessDate.slice(6, 8);
                d = new Date(`${y}-${m}-${day}`);
            } else {
                d = new Date(data.businessDate);
            }

        } else {
            return null;
        }

        d.setHours(0, 0, 0, 0);

        return d;
    }

    // ===== createdAt fallback =====
    if (!data.createdAt) return null;

    const d = data.createdAt instanceof Date
        ? new Date(data.createdAt)
        : data.createdAt.toDate();

    if (d.getHours() < 5) {
        d.setDate(d.getDate() - 1);
    }

    d.setHours(0, 0, 0, 0);
    return d;

}


//firestoreから期間内だけ合計を出す関数
// firestoreから期間内だけ合計を出す関数（税抜・税込）
export async function loadSalesSummary() {
    const { start, end } = getBillingPeriod();

    let gross = 0;
    let net = 0;

    const sales = await fetchSalesByPeriod(start, end);

    sales.forEach(data => {
        const amount = Number(data.amount) || 0;
        gross += amount;
        net += Math.floor(amount / 1.1);
    });

    return { gross, net };
}



/* 日別売上集計 */
export function groupByDate(sales) {
    const map = {};

    sales.forEach(data => {
        const amount = Number(data.amount) || 0;

        const businessDate = getBusinessDateForCalc(data);
        const date = formatDate(businessDate);

        if (!map[date]) {
            map[date] = { gross: 0, net: 0 };
        }

        map[date].gross += amount;
        map[date].net += Math.floor(amount / 1.1);
    });

    return map;
}

/* driverLogs 日別集計（旧データ吸収対応） */
export function groupDriverLogsByDate(logs) {
    const map = {};

    logs.forEach(data => {
        if (!data.note) return;

        const businessDate = getBusinessDateForCalc(data);
        const date = formatDate(businessDate);

        if (!map[date]) map[date] = [];

        const text =
            typeof data.note === "string"
                ? data.note
                : data.note.note ?? JSON.stringify(data.note);

        map[date].push(text);
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