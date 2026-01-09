'use strict';

/* =========================
    現在時刻の表示
========================= */
const timeEl = document.getElementById('currentTime');

function updateCurrentTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `${h}:${m}`;
}

updateCurrentTime();
setInterval(updateCurrentTime, 1000);


/* =========================
    応援コメント（ランダム）
========================= */
document.addEventListener('DOMContentLoaded', () => {
    const messages = [
        '今日も安全運転で！',
        '無理せずマイペースに運行してね。',
        '焦らず、いつも通りで大丈夫！',
        '気をつけていってらっしゃい！',
        'たくさんのお客様にご乗車いただけますように✨',
        '休憩も仕事のうちです！',
        '安心安全な運転を！'
    ];

    const messageEl = document.getElementById('cheerMessage');
    if (!messageEl) return;

    const index = Math.floor(Math.random() * messages.length);
    messageEl.textContent = messages[index];
});


/* =========================
    出勤・帰社・退勤・次回出勤
========================= */
document.addEventListener('DOMContentLoaded', () => {
    const startInput   = document.getElementById('startTime');
    const returnEl     = document.getElementById('returnTime');
    const endEl        = document.getElementById('endTime');
    const nextStartEl  = document.getElementById('nextStartTime');

    if (!startInput || !returnEl || !endEl || !nextStartEl) return;

    const STORAGE_TIME = 'taxi_start_time';
    const STORAGE_DATE = 'taxi_work_date';

    const now = new Date();
    const todayWorkDate = getWorkDate(now);

    const savedDate = localStorage.getItem(STORAGE_DATE);
    const savedTime = localStorage.getItem(STORAGE_TIME);

    /* ===== 起動時：4時基準でリセット or 復元 ===== */
    if (savedDate === todayWorkDate && savedTime) {
        startInput.value = savedTime;
        calculateTimes(savedTime, returnEl, endEl, nextStartEl);
    } else {
        localStorage.removeItem(STORAGE_TIME);
        localStorage.removeItem(STORAGE_DATE);
    }

    /* ===== 出勤時間入力 ===== */
    startInput.addEventListener('change', () => {
        const value = startInput.value;
        if (!value) return;

        localStorage.setItem(STORAGE_TIME, value);
        localStorage.setItem(STORAGE_DATE, todayWorkDate);

        calculateTimes(value, returnEl, endEl, nextStartEl);
    });
});


/* =========================
    業務日判定（4:00切替）
========================= */
function getWorkDate(date) {
    const d = new Date(date);
    if (d.getHours() < 4) {
        d.setDate(d.getDate() - 1);
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}


/* =========================
    時間計算ロジック
========================= */
function calculateTimes(startValue, returnEl, endEl, nextStartEl) {
    const [h, m] = startValue.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    /*
        会社ルール
        ・拘束時間上限：15時間
        ・自動加算
        - 出勤前準備：10分
        - 休憩：1時間30分
        - 帰社後処理：30分

        → 営業可能時間：12時間50分
        → 退勤：帰社 + 40分
        → 次回出勤可能：退勤 + 9時間
    */

    const OPERATING_MINUTES = 12 * 60 + 50;
    const AFTER_RETURN_MINUTES = 40;
    const REST_MINUTES = 9 * 60;

    const returnDate = addMinutes(startDate, OPERATING_MINUTES);
    const endDate = addMinutes(returnDate, AFTER_RETURN_MINUTES);
    const nextStartDate = addMinutes(endDate, REST_MINUTES);

    returnEl.textContent = formatTime(returnDate);
    endEl.textContent = formatTime(endDate);
    nextStartEl.textContent = formatTime(nextStartDate);
}


/* =========================
    共通ユーティリティ
========================= */
function addMinutes(date, minutes) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
}

function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}
