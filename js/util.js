/* =========================
    出勤時間計算用：共通ユーティリティ
========================= */
export function addMinutes(date, minutes) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
}


//時間を「〇〇：〇〇」の表記にする関数
export function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

/* =========================
    業務日判定（4:00切替）
========================= */
export function getWorkDate(date) {
    const d = new Date(date);

    // 深夜0:00〜4:59は前日の業務日扱い
    if (d.getHours() < 5) {
        d.setDate(d.getDate() - 1);
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
