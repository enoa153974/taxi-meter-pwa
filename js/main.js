
import { loadSalesSummary, calcBusinessDateForSave } from "./detailCalc.js";
import { addSale, addDriverLog } from "./firestore.js";
import { initAuth } from "./auth.js";

await initAuth();

let currentPanel = "time";//状態

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
/* =========================
    UIユーティリティ
========================= */
/* 長押し検知関数（通常タップと長押しで結果を使い分ける用） */
function setupPressAction({
    element,
    shortPress,
    longPress,
    longPressTime = 800
}) {
    element.addEventListener('contextmenu', e => e.preventDefault());
    let pressTimer = null;
    let isLongPress = false;

    const onPointerDown = (e) => {
        e.preventDefault();
        isLongPress = false;

        pressTimer = setTimeout(() => {
            isLongPress = true;
            navigator.vibrate?.(80);
            longPress?.();
        }, longPressTime);
    };

    const onPointerUp = (e) => {
        e.preventDefault();

        clearTimeout(pressTimer);
        pressTimer = null;

        if (!isLongPress) {
            shortPress?.();
        }
    };

    const onPointerCancel = () => {
        clearTimeout(pressTimer);
        pressTimer = null;
        isLongPress = false;
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerCancel);
    element.addEventListener('pointerleave', onPointerCancel);
}

// ===============================
// 空車・実車・支払パネルのボタンの取得
// ===============================
//支払いパネルの必要ボタン取得
const payBtn = document.getElementById("payBtn");
const saveBtn = document.getElementById("saveSales");
const amountInput = document.getElementById("salesAmount");
const memoInput = document.getElementById("salesMemo");
const saveMsg = document.getElementById("saveMessage");


// ===============================
// 実車パネルに売上集計を表示(今月度の)
// ===============================
async function initSummary() {
    const summaryEl = document.getElementById("summaryAmount");
    if (!summaryEl) return;

    summaryEl.textContent = "読み込み中…";

    try {
        const total = await loadSalesSummary();
        summaryEl.textContent = `今月度累計(税抜)\n${total.net.toLocaleString()}円`;
    } catch (e) {
        summaryEl.textContent = "読み込みに失敗しました🥲";
        console.error(e);
    }
}


//初期状態（現在の時刻を表示）
document.addEventListener("DOMContentLoaded", () => {
    switchMeterView("meterTime"); // ← これを1行足す
    initSummary();
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
setupPressAction({
    element: summaryBtn,

    shortPress: () => {
        navigator.vibrate?.(40);
        switchMeterView(
            currentPanel === "summaryPanel"
                ? "meterTime"
                : "summaryPanel"
        );
    },

    longPress: () => {
        playMeterSound();//メーター音の再生
        openFakeMeter();
    },

    longPressTime: 700
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



/* 全て閉じる関数 */
function backToHome() {
    document.getElementById("logForm")?.classList.add("hidden");
    document.getElementById("payForm")?.classList.add("hidden");
    document.getElementById("summaryPanel")?.classList.add("hidden");
}

/* 実車ボタン押下後に表示される詳細ボタンを押すと、売上集計ページに移管する処理 */
document.getElementById("btnDetails")?.addEventListener("click", () => {
    navigator.vibrate?.(50);
    location.href = "./sales-details.html";
});



// ===============================
// ログフォーム保存処理
// ===============================

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
            await addDriverLog({
                note,
                createdAt: new Date(),
                businessDate: calcBusinessDateForSave()
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

// ===============================
// 支払いフォーム表示/保存処理
// ===============================

// ⭐ 保存ボタン押したら Firestore に売上を追加
saveBtn.addEventListener("click", async () => {
    const amount = Number(amountInput.value);
    const memo = memoInput.value || "";
    const now = new Date();

    const startTimeStr = localStorage.getItem('taxi_start_time');
    const workDateStr = localStorage.getItem('taxi_work_date');
    const hasWorkStart = !!(startTimeStr && workDateStr);

    let workStartAt = null;
    let workMinutes = null;

    if (hasWorkStart) {
        const [h, m] = startTimeStr.split(':').map(Number);

        workStartAt = new Date(`${workDateStr}T00:00:00`);
        workStartAt.setHours(h, m, 0, 0);

        workMinutes = Math.floor((now - workStartAt) / 60000);
    }

    if (!amount) {
        saveMsg.textContent = "※金額を入力してください";
        return;
    }

    try {
        await addSale({
            amount,
            memo,
            createdAt: now,
            businessDate: workDateStr,

            workStartAt,
            workEndAt: now,
            workMinutes
        });

        let message = "売上入力完了！\n本日も一日おつかれさまでした！";
        if (!hasWorkStart) {
            message += "\n\n⚠ 出勤時間が未入力のため、稼働時間は記録されていません。";
        }

        alert(message);

        amountInput.value = "";
        memoInput.value = "";

        localStorage.removeItem('taxi_start_time');
        localStorage.removeItem('taxi_work_date');

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
    console.log("LED DOMContentLoaded fired");
    const line1 = document.getElementById('ledLine1');
    const line2 = document.getElementById('ledLine2');
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
    const el = document.getElementById('meterDate');
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
    const meter = document.getElementById('fakeMeter');
    const amountEl = document.getElementById('fakeAmount');
    const elapsedEl = document.getElementById('fakeElapsed');
    const breakdownEl = document.getElementById('fakeBreakdown');

    fakeSeconds = 0;
    fakeAmount = 500;

    breakdownEl.classList.add('hidden'); // メーター開始時にリセット
    document.getElementById('fakeThanks')?.classList.add('hidden');

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
    const meter = document.getElementById('fakeMeter');
    meter.classList.add('hidden');
    if (fakeTimer) {
        clearInterval(fakeTimer);
        fakeTimer = null;
    }
}

//戻るボタンの挙動
document.getElementById('fakeCloseBtn')?.addEventListener('click', closeFakeMeter);

document.addEventListener('touchstart', () => {
    meterSound.play().then(() => {
        meterSound.pause();
        meterSound.currentTime = 0;
    });
}, { once: true });

//支払ボタンの挙動
document.getElementById('fakeStopBtn')?.addEventListener('click', () => {
    if (fakeTimer) {
        clearInterval(fakeTimer);
        fakeTimer = null;
    }

    playMeterSound();
    showFakeTotal();
    showThanksMessage();
});


function showFakeTotal() {
    const breakdownEl = document.getElementById('fakeBreakdown');
    const amountEl = document.getElementById('fakeAmount');

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
    const el = document.getElementById('fakeThanks');
    if (!el) return;

    el.textContent = `ご利用ありがとうございました`;
    el.classList.remove('hidden');
}


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

/* 翻訳ボタン */
const translateBtn = document.getElementById('btnTranslate');

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

    // 深夜0:00〜4:59は前日の業務日扱い
    if (d.getHours() < 5) {
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
