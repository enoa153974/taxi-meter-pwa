/* =========================
    import / state
========================= */
import { initAuth } from "./auth.js";
import { addMinutes, formatTime, getWorkDate } from "./util.js";
import { startClock, stopClock, updateCurrentTime } from "./clock.js";
import { initWeather } from "./weather.js";
import { initUIHandlers } from "./uiHandlers.js";




/* =========================
    初期化
========================= */


document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Firebase Auth 初期化（匿名ログイン）
        await initAuth();


        //UI周りの初期化に必要なDOM取得
        const panel = {
            meter: document.getElementById("meterTime"),
            log: document.getElementById("logForm"),
            pay: document.getElementById("payForm"),
            summaryPanel: document.getElementById("summaryPanel"),
        };

        const summaryDisplay = {
            amount: document.getElementById("summaryAmount"),
        };

        const buttons = {
            log: document.getElementById("logBtn"),
            summary: document.getElementById("summaryBtn"),
            pay: document.getElementById("payBtn"),
            details: document.getElementById("btnDetails"),

            saveLog: document.getElementById("saveLogBtn"),
            logInput: document.getElementById("logInput"),

            saveSale: document.getElementById("saveSales"),
            amountInput: document.getElementById("salesAmount"),
            memoInput: document.getElementById("salesMemo"),
            saveMsg: document.getElementById("saveMessage"),
        };

        //UI初期化
        initUIHandlers({
            panel,
            summaryDisplay,
            buttons
        });


        // 現在時刻の表示処理
        const timeEl = document.getElementById('currentTime');
        updateCurrentTime(timeEl);
        startClock(timeEl);

        //天気パネルの表示処理
        const API_KEY = '431956e1ae5d6c3bde0cbdbaf7b3102e';
        initWeather({
            statusEl: document.getElementById("weather-status"),
            tempEl: document.getElementById("weather-temp"),
            refreshBtn: document.getElementById("weather-refresh"),
            apiKey: API_KEY
        });


        // 画面の自動更新処理
        setInterval(updateCurrentTime, 1000);

    } catch (e) {
        alert("ログインに失敗しました");
        console.error(e);
    }
});




// ===============================
// AudioContext（最初の操作で一度だけ初期化）
// ===============================
// ===== メーター音 =====
const meterSound = new Audio('../sounds/meter_sound.wav');
meterSound.preload = 'auto';
/* メーター音再生用の関数 */
function playMeterSound() {
    meterSound.currentTime = 0; // 連打対策
    meterSound.play().catch(() => {
        // autoplay制限対策（基本は出ない）
        console.warn('音声再生がブロックされました');
    });
}

// ------------------------------
// ◆ 画面の自動更新を制御
// ------------------------------
//画面に非表示のとき（全ブラウザ対応：基本制御）
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopAutoUpdate();
        stopClock();
    } else {
        fetchWeather(); // 先に即更新
        startAutoUpdate();
        startClock();
    }
});

//ぺージを離れるとき（safari対策）
window.addEventListener("pagehide", () => {
    stopAutoUpdate();
    stopClock();
});

//ページが表示されたとき（iOS PWA 復帰対策）
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        fetchWeather();
        startAutoUpdate();
    }
});


/* =========================
    出勤・帰社・退勤・次回出勤
========================= */
document.addEventListener('DOMContentLoaded', () => {
    const startInput = document.getElementById('startTime');
    const regularEl = document.getElementById('regularTime');
    const returnEl = document.getElementById('returnTime');
    const endEl = document.getElementById('endTime');
    const nextStartEl = document.getElementById('nextStartTime');

    //もし以下の要素がなければ処理を止める（ガード節）
    if (!startInput || !regularEl || !returnEl || !endEl || !nextStartEl) return;

    const STORAGE_TIME = 'taxi_start_time';
    const STORAGE_DATE = 'taxi_work_date';

    const now = new Date();
    const todayWorkDate = getWorkDate(now);

    const savedDate = localStorage.getItem(STORAGE_DATE);
    const savedTime = localStorage.getItem(STORAGE_TIME);

    /* ===== 起動時：4時基準でリセット or 復元 ===== */
    if (savedDate === todayWorkDate && savedTime) {
        startInput.value = savedTime;
        calculateTimes(savedTime, regularEl, returnEl, endEl, nextStartEl);
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

        calculateTimes(value, regularEl, returnEl, endEl, nextStartEl);
    });
});




/* =========================
    時間計算ロジック（シンプル版）
========================= */
function calculateTimes(startValue, regularEl, returnEl, endEl, nextStartEl) {
    if (!startValue) return;

    const [h, m] = startValue.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    //各時間の計算方法定義
    const RETURN_MINUTES = 13 * 60;
    const REGULAR_MINUTES = 10 * 60;
    const END_MINUTES = 1 * 60;
    const REST_MINUTES = 9 * 60;

    //時間計算
    const returnDate = addMinutes(startDate, RETURN_MINUTES);
    const regularDate = addMinutes(startDate, REGULAR_MINUTES);
    const endDate = addMinutes(returnDate, END_MINUTES);
    const nextStartDate = addMinutes(endDate, REST_MINUTES);

    returnEl.textContent = formatTime(returnDate);
    regularEl.textContent = formatTime(regularDate);
    endEl.textContent = formatTime(endDate);
    nextStartEl.textContent = formatTime(nextStartDate);

    /* ===== 深夜3時超え判定 ===== */
    const LATE_HOUR = 3;

    if (returnDate.getHours() >= LATE_HOUR) {
        returnEl.classList.add('is-late-end');
    } else {
        returnEl.classList.remove('is-late-end');
    }
}


