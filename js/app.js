'use strict';
let currentPanel = "time";//状態
/* firestoreデータベースをインポート */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs }
    from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

//firebaseに接続するために必要な情報群
const firebaseConfig = {
    apiKey: "AIzaSyBgBvARs1SFjkJQzRxj843MhrfVvBjaVjY",
    authDomain: "taxi-meter-pwa.firebaseapp.com",
    projectId: "taxi-meter-pwa",
    storageBucket: "taxi-meter-pwa.firebasestorage.app",
    messagingSenderId: "214753560501",
    appId: "1:214753560501:web:d3acf1471098dbe5d2fbfc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ===============================
// 空車・実車・支払パネルのボタンの取得
// ===============================
//支払いパネルの必要ボタン取得
const payBtn = document.getElementById("payBtn");
const payForm = document.getElementById("payForm");
const saveBtn = document.getElementById("saveSales");
const amountInput = document.getElementById("salesAmount");
const memoInput = document.getElementById("salesMemo");
const saveMsg = document.getElementById("saveMessage");


//空車パネルの必要ボタン取得
const kuushaBtn = document.getElementById("kuushaBtn");
const kuushaForm = document.getElementById("kuushaForm");

// ===============================
// 空車・実車・支払パネルの関数定義
// ===============================

/* 実車（集計）パネル表示 */
async function showsummaryPanel() {
    document.getElementById("summaryPanel").classList.remove("hidden");
    document.getElementById("payForm").classList.add("hidden");
    document.getElementById("logForm").classList.add("hidden");

    // ===============================
    // 実車パネルに売上集計を表示
    // ===============================

    const summaryEl = document.getElementById("summaryAmount");
    summaryEl.textContent = "読み込み中…";

    try {
        const total = await loadSalesSummary();
        summaryEl.textContent = `今月度累計：${total.toLocaleString()}円`;
    } catch (e) {
        summaryEl.textContent = "読み込みに失敗しました🥲";
        console.error(e);
    }

}

/* 全て閉じる関数 */
function backToHome() {
    document.getElementById("logForm")?.classList.add("hidden");
    document.getElementById("payForm")?.classList.add("hidden");
    document.getElementById("summaryPanel")?.classList.add("hidden");
}

/* 実車ボタン押下後に表示される詳細ボタンを押すと、売上集計ページに移管する処理 */
document.getElementById("btnDetails")?.addEventListener("click", () => {
    location.href = "./sales-details.html";
});

// ===============================
// メーターパネルの表示切替関数
// ===============================

/* 各パネルを表示切替 */
function switchMeterView(showId) {
    const ids = ["meterTime", "logForm", "summaryPanel", "payForm"];

    ids.forEach(id => {
        document.getElementById(id)?.classList.toggle("hidden", id !== showId);
    });

    currentPanel = (showId === "meterTime") ? "time" : showId;
}

// 空車ボタンを押下したときの挙動
logBtn.addEventListener("click", () => {
    navigator.vibrate?.(50);
    if (currentPanel === "logForm") {
        switchMeterView("meterTime");
    } else {
        switchMeterView("logForm");
    }
});

// 実車ボタンを押下したときの挙動
summaryBtn.addEventListener("click", async () => {
    navigator.vibrate?.(50);
    if (currentPanel === "summaryPanel") {
        switchMeterView("meterTime");
    } else {
        switchMeterView("summaryPanel");
        await showsummaryPanel();
    }
});

// 支払ボタンを押下したときの挙動
payBtn.addEventListener("click", () => {
    navigator.vibrate?.(50);
    if (currentPanel === "payForm") {
        switchMeterView("meterTime");
    } else {
        switchMeterView("payForm");
    }
});


// 戻す場所が必要なら
function backToMeterTime() {
    switchMeterView("meterTime");
}


// ======= 空車ログ 保存処理 =======
const saveLogBtn = document.getElementById("saveLogBtn");
const logInput = document.getElementById("logInput");

if (saveLogBtn) {
    saveLogBtn.addEventListener("click", async () => {
        const note = logInput.value.trim();

        if (!note) {
            alert("メモを入力してね！");
            return;
        }

        try {
            await addDoc(collection(db, "driverLogs"), {
                note: note,
                createdAt: new Date()
            });

            alert("🚕 ログ書き込みました！");
            logInput.value = ""; // 入力リセット
            backToHome();
            backToMeterTime();

        } catch (e) {
            console.error("💥 driverLogs 保存失敗:", e);
            alert("保存に失敗したかも…😢");
        }
    });
}

/* =========================
    実車ボタン（集計データの表示＆移管）
========================= */
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
async function loadSalesSummary() {
    const { start, end } = getBillingPeriod();
    let total = 0;

    const snapshot = await getDocs(collection(db, "sales"));

    snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt.toDate(); // Timestamp → Date
        if (createdAt >= start && createdAt <= end) {
            total += Number(data.amount) || 0;
        }
    });

    return total;
}



// ===============================
// 支払いフォーム表示/保存処理
// ===============================

// ⭐ 保存ボタン押したら Firestore に追加
saveBtn.addEventListener("click", async () => {
    const amount = Number(amountInput.value);
    const memo = memoInput.value || "";

    // 入力チェック
    if (!amount) {
        saveMsg.textContent = "※金額を入力してください";
        return;
    }

    try {
        await addDoc(collection(db, "sales"), {
            amount,
            memo,
            createdAt: new Date()
        });

        alert("売上入力完了！\n本日も一日おつかれさまでした！\n気をつけて帰ってきてね！");
        amountInput.value = "";
        memoInput.value = "";
        backToHome();
        backToMeterTime();


    } catch (e) {
        saveMsg.textContent = "💥 保存失敗";
        console.error(e);
    }
});



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

    // 🎯 応援コメントを更新する関数
    function setRandomMessage() {
        line1.textContent =
            messages[Math.floor(Math.random() * messages.length)];
    }

    // 🎯 一斉点呼の日判定
    function checkRollCall() {
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
const AUTO_UPDATE_INTERVAL = 30 * 60 * 1000; // 30分

function fetchWeather(retry = false) {
    if (!navigator.geolocation) {
        statusEl.textContent = '位置情報が使えません';
        return;
    }

    statusEl.textContent = '天気取得中…';
    tempEl.textContent = '';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude: lat, longitude: lon } = position.coords;

            try {
                const res = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ja&appid=${API_KEY}`
                );
                const data = await res.json();

                statusEl.textContent =
                    `${getWeatherIcon(data.weather[0].main)} ${data.weather[0].description}`;
                tempEl.textContent =
                    `気温：${Math.round(data.main.temp)}℃`;
            } catch {
                statusEl.textContent = '天気取得に失敗しました';
            }
        },
        () => {
            if (!retry) {
                setTimeout(() => fetchWeather(true), 3000);
            } else {
                statusEl.textContent = '位置情報が取得できません';
            }
        }
    );
}

function getWeatherIcon(main) {
    switch (main) {
        case 'Clear': return '☀️';
        case 'Clouds': return '☁️';
        case 'Rain':
        case 'Drizzle': return '🌧️';
        case 'Thunderstorm': return '⛈️';
        case 'Snow': return '❄️';
        default: return '🌥️';
    }
}

refreshBtn?.addEventListener('click', fetchWeather);

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

// iOS PWA 復帰対策（最重要）
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        fetchWeather();
        startAutoUpdate();
    }
});

// 初回
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
