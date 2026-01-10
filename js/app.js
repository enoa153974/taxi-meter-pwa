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
    const line1 = document.getElementById('ledLine1');
    const line2 = document.getElementById('ledLine2');
    if (!line1 || !line2) return;

    const messages = [
        '今日も安全運転で！',
        '無理せずマイペースに。',
        '焦らず、いつも通りで大丈夫！',
        '気をつけていってらっしゃい！',
        '楽しんだもん勝ち！',
        '休憩も仕事のうちです！',
        '安心安全な運転を！'
    ];

    const rollCallDays = [10, 11, 21, 22]; // 一斉点呼の日
    const today = new Date();
    const tomorrow = today.getDate() + 1;

    // 1行目（常時）
    line1.textContent =
        messages[Math.floor(Math.random() * messages.length)];

    // 2行目（必要なときだけ）
    if (rollCallDays.includes(tomorrow)) {
        line2.textContent = '明日は一斉点呼です';
        line2.style.display = 'block';
    } else {
        line2.style.display = 'none';
    }
});

/* =========================
    コントロールパネルの動作
========================= */
/* 帰宅ボタン */
document.getElementById('btnGoHome')?.addEventListener('click', () => {
    navigator.vibrate?.(50);

    const msg = encodeURIComponent('今から帰ります🚕');
    location.href = `https://line.me/R/msg/text/?${msg}`;
});

/* GPTボタン */
document.getElementById('btnChatGPT')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = 'https://chatgpt.com/';
});


/* マップボタン */
document.getElementById('btnMap')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = 'https://www.google.com/maps';
});

const translateBtn = document.getElementById('btnTranslate');

let pressTimer = null;
let isLongPress = false;
const LONG_PRESS_TIME = 600; // ms

function startPressTimer(longPressAction) {
    isLongPress = false;
    pressTimer = setTimeout(() => {
        isLongPress = true;
        navigator.vibrate?.(80);
        longPressAction();
    }, LONG_PRESS_TIME);
}

function clearPressTimer() {
    if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }
}

/* ===== 長押し開始 ===== */
translateBtn?.addEventListener('touchstart', () => {
    startPressTimer(() => {
        location.href = 'https://translate.google.com/?sl=ja&tl=zh-CN';
    });
});

translateBtn?.addEventListener('mousedown', () => {
    startPressTimer(() => {
        location.href = 'https://translate.google.com/?sl=ja&tl=zh-CN';
    });
});

/* ===== 押すのをやめた ===== */
translateBtn?.addEventListener('touchend', () => {
    clearPressTimer();

    // 短タップ判定
    if (!isLongPress) {
        navigator.vibrate?.(50);
        location.href = 'https://translate.google.com/?sl=ja&tl=en';
    }

    isLongPress = false;
});

translateBtn?.addEventListener('mouseup', () => {
    clearPressTimer();

    if (!isLongPress) {
        navigator.vibrate?.(50);
        location.href = 'https://translate.google.com/?sl=ja&tl=en';
    }

    isLongPress = false;
});

translateBtn?.addEventListener('touchcancel', clearPressTimer);
translateBtn?.addEventListener('mouseleave', clearPressTimer);



/* =========================
    天気パネルの動作
========================= */
const API_KEY = '431956e1ae5d6c3bde0cbdbaf7b3102e';

const statusEl = document.getElementById('weather-status');
const tempEl = document.getElementById('weather-temp');
const refreshBtn = document.getElementById('weather-refresh');

let weatherInterval = null;
const AUTO_UPDATE_INTERVAL = 30 * 60 * 1000;//30分

function fetchWeather() {
    if (!navigator.geolocation) {
        statusEl.textContent = '位置情報が使えません';
        return;
    }

    statusEl.textContent = '天気取得中…';
    tempEl.textContent = '';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const res = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ja&appid=${API_KEY}`
                );
                const data = await res.json();

                const weatherMain = data.weather[0].main;
                const weatherDesc = data.weather[0].description;
                const temp = Math.round(data.main.temp);

                const icon = getWeatherIcon(weatherMain);

                statusEl.textContent = `${icon} ${weatherDesc}`;
                tempEl.textContent = `気温：${temp}℃`;
            } catch (error) {
                statusEl.textContent = '天気取得に失敗しました';
            }
        },
        () => {
            statusEl.textContent = '位置情報が許可されていません';
        }
    );
}

function getWeatherIcon(main) {
    switch (main) {
        case 'Clear':
            return '☀️';
        case 'Clouds':
            return '☁️';
        case 'Rain':
        case 'Drizzle':
            return '🌧️';
        case 'Thunderstorm':
            return '⛈️';
        case 'Snow':
            return '❄️';
        default:
            return '🌥️';
    }
}

refreshBtn.addEventListener('click', fetchWeather);

/*　自動更新の開始・停止関数 */
function startAutoUpdate() {
    if (weatherInterval === null) {
        weatherInterval = setInterval(fetchWeather, AUTO_UPDATE_INTERVAL);
    }
}

function stopAutoUpdate() {
    if (weatherInterval !== null) {
        clearInterval(weatherInterval);
        weatherInterval = null;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        fetchWeather();      // 戻ってきたら即更新
        startAutoUpdate();   // 自動更新再開
    } else {
        stopAutoUpdate();    // 非表示なら停止
    }
});

// 初回取得 & 表示中のみ自動更新開始
fetchWeather();
startAutoUpdate();


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

    const RETURN_MINUTES = 13 * 60;
    const END_MINUTES = 1 * 60;
    const REST_MINUTES = 9 * 60;

    const returnDate = addMinutes(startDate, RETURN_MINUTES);
    const endDate = addMinutes(returnDate, END_MINUTES);
    const nextStartDate = addMinutes(endDate, REST_MINUTES);

    returnEl.textContent = formatTime(returnDate);
    endEl.textContent = formatTime(endDate);
    nextStartEl.textContent = formatTime(nextStartDate);

    /* ===== 深夜3時超え判定 ===== */
    const LATE_HOUR = 3;

    if (endDate.getHours() >= LATE_HOUR) {
        endEl.classList.add('is-late-end');
    } else {
        endEl.classList.remove('is-late-end');
    }
}

/* 定型文ボタン */
document.getElementById('btnPhrases')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = './phrases.html';
});

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
