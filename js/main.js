import { loadSalesSummary, calcBusinessDateForSave } from "./detailCalc.js";
import { addSale, addDriverLog } from "./firestore.js";
import { initAuth } from "./auth.js";

/* =========================
   グローバル状態
========================= */
let currentPanel = "time";
let fakeTimer = null;
let fakeSeconds = 0;
let fakeAmount = 500;

/* =========================
   起動処理（唯一の入口）
========================= */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await initAuth();
        console.log("Auth 初期化完了");

        initUI();
        initEvents();
        initClock();
        initSummary();
        initCheerMessage();
        initWorkTime();
        initWeather();

    } catch (e) {
        console.error("初期化失敗", e);
        alert("アプリの初期化に失敗しました");
    }
});

/* =========================
   UI 初期化
========================= */
function initUI() {
    switchMeterView("meterTime");
    updateMeterDate();
}

/* =========================
   イベント登録
========================= */
function initEvents() {
    const logBtn = document.getElementById("logBtn");
    const summaryBtn = document.getElementById("summaryBtn");
    const payBtn = document.getElementById("payBtn");
    const saveBtn = document.getElementById("saveSales");
    const saveLogBtn = document.getElementById("saveLogBtn");

    logBtn?.addEventListener("click", () => {
        navigator.vibrate?.(50);
        switchMeterView(currentPanel === "logForm" ? "meterTime" : "logForm");
    });

    setupPressAction({
        element: summaryBtn,
        shortPress: () => {
            navigator.vibrate?.(40);
            switchMeterView(
                currentPanel === "summaryPanel" ? "meterTime" : "summaryPanel"
            );
        },
        longPress: () => {
            playMeterSound();
            openFakeMeter();
        },
        longPressTime: 700
    });

    payBtn?.addEventListener("click", () => {
        navigator.vibrate?.(50);
        switchMeterView(currentPanel === "payForm" ? "meterTime" : "payForm");
    });

    saveLogBtn?.addEventListener("click", saveDriverLog);
    saveBtn?.addEventListener("click", saveSale);

    document.getElementById("btnDetails")?.addEventListener("click", () => {
        location.href = "./sales-details.html";
    });

    document.getElementById("fakeCloseBtn")?.addEventListener("click", closeFakeMeter);
    document.getElementById("fakeStopBtn")?.addEventListener("click", stopFakeMeter);
}

/* =========================
   画面切替
========================= */
function switchMeterView(showId) {
    const ids = ["meterTime", "logForm", "summaryPanel", "payForm"];
    ids.forEach(id => {
        document.getElementById(id)?.classList.toggle("hidden", id !== showId);
    });
    currentPanel = showId === "meterTime" ? "time" : showId;
}

/* =========================
   売上集計
========================= */
async function initSummary() {
    const summaryEl = document.getElementById("summaryAmount");
    if (!summaryEl) return;

    summaryEl.textContent = "読み込み中…";
    try {
        const total = await loadSalesSummary();
        summaryEl.textContent = `今月度累計(税抜)\n${total.net.toLocaleString()}円`;
    } catch (e) {
        summaryEl.textContent = "読み込み失敗";
        console.error(e);
    }
}

/* =========================
   時計
========================= */
function initClock() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
}

function updateCurrentTime() {
    const el = document.getElementById("currentTime");
    if (!el) return;
    const now = new Date();
    el.textContent =
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/* =========================
   応援コメント
========================= */
function initCheerMessage() {
    const line1 = document.getElementById("ledLine1");
    const line2 = document.getElementById("ledLine2");
    if (!line1 || !line2) return;

    const messages = [
        "今日も安全運転で！",
        "無理せずマイペースに。",
        "焦らず、いつも通りで大丈夫！",
        "気をつけていってらっしゃい！",
        "休憩も仕事のうちです！"
    ];

    const setRandom = () => {
        line1.textContent = messages[Math.floor(Math.random() * messages.length)];
    };

    setRandom();
    setInterval(setRandom, 30 * 60 * 1000);

    const tomorrow = new Date().getDate() + 1;
    if ([10, 11, 21, 22].includes(tomorrow)) {
        line2.textContent = "明日は一斉点呼です";
        line2.style.display = "block";
    } else {
        line2.style.display = "none";
    }
}

/* =========================
   出勤時間計算
========================= */
function initWorkTime() {
    const startInput = document.getElementById("startTime");
    const returnEl = document.getElementById("returnTime");
    const endEl = document.getElementById("endTime");
    const nextStartEl = document.getElementById("nextStartTime");
    if (!startInput || !returnEl || !endEl || !nextStartEl) return;

    startInput.addEventListener("change", () => {
        calculateTimes(startInput.value, returnEl, endEl, nextStartEl);
    });
}

function calculateTimes(startValue, returnEl, endEl, nextStartEl) {
    if (!startValue) return;
    const [h, m] = startValue.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);

    const returnDate = addMinutes(start, 13 * 60);
    const endDate = addMinutes(returnDate, 60);
    const nextDate = addMinutes(endDate, 9 * 60);

    returnEl.textContent = formatTime(returnDate);
    endEl.textContent = formatTime(endDate);
    nextStartEl.textContent = formatTime(nextDate);
}

/* =========================
   Fake メーター
========================= */
function openFakeMeter() {
    fakeSeconds = 0;
    fakeAmount = 500;
    document.getElementById("fakeMeter")?.classList.remove("hidden");

    fakeTimer = setInterval(() => {
        fakeSeconds++;
        if (fakeSeconds % 30 === 0) fakeAmount += 100;
        document.getElementById("fakeAmount").textContent = `¥${fakeAmount}`;
    }, 1000);
}

function stopFakeMeter() {
    clearInterval(fakeTimer);
    fakeTimer = null;
}

function closeFakeMeter() {
    stopFakeMeter();
    document.getElementById("fakeMeter")?.classList.add("hidden");
}

/* =========================
   保存処理
========================= */
async function saveDriverLog() {
    const input = document.getElementById("logInput");
    if (!input.value) return alert("メモを入力してください");

    await addDriverLog({
        note: input.value,
        createdAt: new Date(),
        businessDate: calcBusinessDateForSave()
    });
    alert("ログ保存完了");
    input.value = "";
}

async function saveSale() {
    const amount = Number(document.getElementById("salesAmount").value);
    if (!amount) return alert("金額未入力");

    await addSale({
        amount,
        createdAt: new Date(),
        businessDate: calcBusinessDateForSave()
    });
    alert("売上保存完了");
}

/* =========================
   天気
========================= */
function initWeather() {
    fetchWeather();
    setInterval(fetchWeather, 30 * 60 * 1000);
}

function fetchWeather() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=ja&appid=431956e1ae5d6c3bde0cbdbaf7b3102e`
        );
        const data = await res.json();
        document.getElementById("weather-temp").textContent =
            `${Math.round(data.main.temp)}℃`;
    });
}

/* =========================
   ユーティリティ
========================= */
function addMinutes(date, min) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + min);
    return d;
}

function formatTime(d) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function updateMeterDate() {
    const el = document.getElementById("meterDate");
    if (!el) return;
    const d = new Date();
    const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    el.textContent = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}（${w}）`;
}

/* =========================
   メーター音
========================= */
const meterSound = new Audio("../sounds/meter_sound.wav");
function playMeterSound() {
    meterSound.currentTime = 0;
    meterSound.play().catch(() => { });
}

/* =========================
   長押し検知
========================= */
function setupPressAction({ element, shortPress, longPress, longPressTime = 800 }) {
    if (!element) return;
    let timer;
    element.addEventListener("pointerdown", () => {
        timer = setTimeout(longPress, longPressTime);
    });
    element.addEventListener("pointerup", () => {
        clearTimeout(timer);
        shortPress?.();
    });
}
