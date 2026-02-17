/* =========================
    import / state
========================= */
import { initAuth } from "./auth.js";
import { addMinutes, formatTime, getWorkDate ,setupPressAction } from "./util.js";
import { startClock, stopClock, updateCurrentTime } from "./clock.js";
import { initWeather } from "./weather.js";
import { initUIHandlers } from "./uiHandlers.js";
import { qs } from "./dom.js";





/* =========================
    初期化
========================= */


document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Firebase Auth 初期化（匿名ログイン）
        await initAuth();


        //UI周りの初期化に必要なDOM取得
        const panel = {
            meter: qs("#meterTime"), 
            log:qs("#logForm"),
            pay: qs("#payForm"),
            summaryPanel: qs("#summaryPanel"),
        };

        const summaryDisplay = {
            amount: qs("#summaryAmount"),
        };

        const buttons = {
            log: qs("#logBtn"),
            summary: qs("#summaryBtn"),
            pay: qs("#payBtn"),
            details: qs("#btnDetails"),

            saveLog: qs("#saveLogBtn"),
            logInput: qs("#logInput"),

            saveSale: qs("#saveSales"),
            amountInput: qs("#salesAmount"),
            memoInput: qs("#salesMemo"),
            saveMsg: qs("#saveMessage"),
        };

        //UI初期化
        initUIHandlers({
            panel,
            summaryDisplay,
            buttons
        });


        // 現在時刻の表示処理
        const timeEl = qs('#currentTime');
        updateCurrentTime(timeEl);
        startClock(timeEl);

        //天気パネルの表示処理
        const API_KEY = '431956e1ae5d6c3bde0cbdbaf7b3102e';
        initWeather({
            statusEl: qs("#weather-status"),
            tempEl: qs("#weather-temp"),
            refreshBtn: qs("#weather-refresh"),
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
    const startInput = qs('#startTime');
    const regularEl = qs('#regularTime');
    const returnEl = qs('#returnTime');
    const endEl = qs('#endTime');
    const nextStartEl = qs('#nextStartTime');

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




/* =========================
    応援コメント（ランダム）
========================= */
document.addEventListener('DOMContentLoaded', () => {
    console.log("LED DOMContentLoaded fired");
    const line1 = qs('#ledLine1');
    const line2 = qs('#ledLine2');
    if (!line1 || !line2) return;

    line1.textContent = "LEDテスト表示";

    const messages = [
        '今日も安全運転で！',
        '無理せずマイペースに。',
        '焦らず、いつも通りで大丈夫！',
        '気をつけていってらっしゃい！',
        '楽しんだもん勝ち！',
        '休憩も仕事のうちです！',
        '安心安全な運転を！'
    ];


    // 🎯 応援コメントを更新する関数
    function setRandomMessage() {
        line1.textContent =
            messages[Math.floor(Math.random() * messages.length)];
    }


    // 🎯 一斉点呼の日判定
    function checkRollCall() {
        const rollCallDays = [10, 11, 21, 22]; // 一斉点呼の日
        const today = new Date();
        const tomorrow = today.getDate() + 1;

        if (rollCallDays.includes(tomorrow)) {
            line2.textContent = '明日は一斉点呼です';
            line2.style.display = 'block';
        } else {
            line2.style.display = 'none';
        }
    }


    // 🌟 初回実行
    setRandomMessage();
    checkRollCall();

    // 🔁30分ごと更新（1800000ミリ秒）
    const UPDATE_INTERVAL = 30 * 60 * 1000;
    setInterval(setRandomMessage, UPDATE_INTERVAL);
});


/* ネタ用実車メーター （実車ボタン長押しで表示）*/
function updateMeterDate() {
    const el = qs('#meterDate');
    if (!el) return;

    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    const weeks = ['日', '月', '火', '水', '木', '金', '土'];
    const w = weeks[d.getDay()];

    el.textContent = `${y}.${m}.${day}（${w}）`;
}

updateMeterDate();

let fakeTimer = null;
let fakeSeconds = 0;
let fakeAmount = 500;

function openFakeMeter() {
    const meter = qs('#fakeMeter');
    const amountEl = qs('#fakeAmount');
    const elapsedEl = qs('#fakeElapsed');
    const breakdownEl = qs('#fakeBreakdown');

    fakeSeconds = 0;
    fakeAmount = 500;

    breakdownEl.classList.add('hidden'); // メーター開始時にリセット
    qs('#fakeThanks')?.classList.add('hidden');

    amountEl.textContent = `¥${fakeAmount.toLocaleString()}`;
    elapsedEl.textContent = '00:00';

    meter.classList.remove('hidden');

    fakeTimer = setInterval(() => {
        fakeSeconds++;

        // 30秒ごとに+100円（テンポ良し）
        if (fakeSeconds % 30 === 0) {
            fakeAmount += 100;
            amountEl.textContent = `¥${fakeAmount.toLocaleString()}`;
        }

        const mm = String(Math.floor(fakeSeconds / 60)).padStart(2, '0');
        const ss = String(fakeSeconds % 60).padStart(2, '0');
        elapsedEl.textContent = `${mm}:${ss}`;
    }, 1000);
}

function closeFakeMeter() {
    const meter = qs('#fakeMeter');
    meter.classList.add('hidden');
    if (fakeTimer) {
        clearInterval(fakeTimer);
        fakeTimer = null;
    }
}

//戻るボタンの挙動
qs('#fakeCloseBtn')?.addEventListener('click', closeFakeMeter);

document.addEventListener('touchstart', () => {
    meterSound.play().then(() => {
        meterSound.pause();
        meterSound.currentTime = 0;
    });
}, { once: true });

//支払ボタンの挙動
qs('#fakeStopBtn')?.addEventListener('click', () => {
    if (fakeTimer) {
        clearInterval(fakeTimer);
        fakeTimer = null;
    }

    playMeterSound();
    showFakeTotal();
    showThanksMessage();
});


function showFakeTotal() {
    const breakdownEl = qs('#fakeBreakdown');
    const amountEl = qs('#fakeAmount');

    const PICKUP_FEE = 300;
    const total = fakeAmount + PICKUP_FEE;

    // 内訳表示
    breakdownEl.textContent = `迎車料金 +¥${PICKUP_FEE}`;
    breakdownEl.classList.remove('hidden');

    // 合計金額表示
    amountEl.textContent = `¥${total.toLocaleString()}`;
}

/* ボタンが押されたらご利用ありがとうございましたと表示する関数 */
function showThanksMessage() {
    const el = qs('#fakeThanks');
    if (!el) return;

    el.textContent = `ご利用ありがとうございました`;
    el.classList.remove('hidden');
}


/* =========================
    コントロールパネルの動作
========================= */
/* 帰宅ボタン */
qs('#btnGoHome')?.addEventListener('click', () => {
    navigator.vibrate?.(50);

    const msg = encodeURIComponent('今から帰ります🚕');
    location.href = `https://line.me/R/msg/text/?${msg}`;
});

/* GPTボタン */
qs('#btnChatGPT')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = 'https://chatgpt.com/';
});


/* マップボタン */
qs('#btnMap')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = 'https://www.google.com/maps';
});

/* 翻訳ボタン */
const translateBtn = qs('#btnTranslate');


setupPressAction({
    element: translateBtn,

    // 短タップ → 英語
    shortPress: () => {
        navigator.vibrate?.(40);
        location.href = 'https://translate.google.com/?sl=ja&tl=en';
    },

    // 長押し → 中国語
    longPress: () => {
        location.href = 'https://translate.google.com/?sl=ja&tl=zh-CN';
    },

    longPressTime: 600
});

/* 定型文ボタン */
qs('#btnPhrases')?.addEventListener('click', () => {
    navigator.vibrate?.(50);
    location.href = './phrases.html';
});

