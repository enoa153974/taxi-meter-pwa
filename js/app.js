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
    コントロールパネルの動作
========================= */
document.getElementById('btnGoHome')?.addEventListener('click', () => {
    navigator.vibrate?.(50);

    const msg = encodeURIComponent('今から帰ります🚕');
    location.href = `https://line.me/R/msg/text/?${msg}`;
});

document.getElementById('btnChatGPT')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = 'https://chatgpt.com/';
});


document.getElementById('btnMap')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = 'https://www.google.com/maps';
});


document.getElementById('btnCalc')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = 'https://www.google.com/search?q=calculator';
});


/* =========================
    出勤・帰社・退勤・次回出勤
========================= */
document.addEventListener('DOMContentLoaded', () => {
    const startInput = document.getElementById('startTime');
    const returnEl = document.getElementById('returnTime');
    const endEl = document.getElementById('endTime');
    const nextStartEl = document.getElementById('nextStartTime');

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

    // 深夜0:00〜3:59は前日の業務日扱い
    if (d.getHours() < 4) {
        d.setDate(d.getDate() - 1);
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}


/* =========================
    時間計算ロジック（シンプル版）
========================= */
function calculateTimes(startValue, returnEl, endEl, nextStartEl) {
    if (!startValue) return;

    const [h, m] = startValue.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    /*
        シンプル運用ルール
        ・帰社：出勤から13時間後
        ・退勤：帰社から1時間後
        ・次回出勤可能：退勤から9時間後
    */

    const RETURN_MINUTES = 13 * 60; // 出勤 → 帰社
    const END_MINUTES = 1 * 60;     // 帰社 → 退勤
    const REST_MINUTES = 9 * 60;    // 退勤 → 次回出勤可能

    const returnDate = addMinutes(startDate, RETURN_MINUTES);
    const endDate = addMinutes(returnDate, END_MINUTES);
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
