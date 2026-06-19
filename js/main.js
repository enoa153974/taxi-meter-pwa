/* =========================
    import / state
========================= */
import { initAuth } from "./auth.js";
import { addMinutes, formatTime, getWorkDate } from "./util.js";
import { startClock, stopClock, updateCurrentTime } from "./clock.js";
import { initWeather } from "./weather.js";
import { initUIHandlers } from "./uiHandlers.js";
import { initSound } from "./sound.js";

import { qs, toggleClass } from "./dom.js";





/* =========================
    初期化
========================= */


document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Firebase Auth 初期化（匿名ログイン）
        await initAuth();

        initSound();

        //UI周りの初期化に必要なDOM取得
        const panel = {
            meter: qs("#meterTime"),
            log: qs("#logForm"),
            pay: qs("#payForm"),
            summaryPanel: qs("#summaryPanel"),
        };

        const summaryDisplay = {
            amount: qs("#summaryAmount"),
        };

        const buttons = {
            //メインパネルのボタン
            log: qs("#logBtn"),
            summary: qs("#summaryBtn"),
            pay: qs("#payBtn"),
            details: qs("#btnDetails"),

            saveLog: qs("#saveLogBtn"),
            logInput: qs("#logInput"),

            saveSale: qs("#saveSales"),
            amountInput: qs("#salesAmount"),
            memoInput: qs("#salesMemo"),

            //コントロールパネルのボタン
            goHome: qs('#btnGoHome'),
            GPT: qs('#btnChatGPT'),
            map: qs('#btnMap'),
            translate: qs('#btnTranslate'),
            phrases: qs('#btnPhrases')
        };


        //UI初期化
        initUIHandlers({
            panel,
            summaryDisplay,
            buttons,
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

    const isNextDay =
        returnDate.toDateString() !== startDate.toDateString();

    const isLateEnd =
        isNextDay && returnDate.getHours() >= LATE_HOUR;

    toggleClass(returnEl, 'is-late-end', isLateEnd);
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


    // 月別例外（必要な月だけ）
    const rollCallOverrides = {
        //3月度
        "2026-02": [10, 11, 20, 21],
        //4月度
        "2026-03": [10, 11, 22, 23]
    };

    // 月キー生成
    function getMonthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    function checkRollCall() {
        const defaultDays = [10, 11, 21, 22];

        const today = new Date();
        const todayDate = today.getDate();
        const monthKey = getMonthKey(today);

        const activeDays =
            rollCallOverrides[monthKey] ?? defaultDays;

        // セットを自動抽出（連続する日をグループ化）
        const sorted = [...activeDays].sort((a, b) => a - b);
        const sets = [];
        let temp = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === sorted[i - 1] + 1) {
                temp.push(sorted[i]);
            } else {
                sets.push(temp);
                temp = [sorted[i]];
            }
        }
        sets.push(temp);

        const line2 = document.getElementById("ledLine2");
        if (!line2) return;

        let message = "";

        sets.forEach(set => {
            const firstDay = set[0];

            // 前日表示（セットの1日目の前だけ）
            if (todayDate === firstDay - 1) {
                message = "明日は一斉点呼です";
            }

            // 当日表示
            if (set.includes(todayDate)) {
                message = "本日は一斉点呼です";
            }
        });

        if (message) {
            line2.textContent = message;
            line2.style.display = "block";
        } else {
            line2.style.display = "none";
        }
    }

    // 🌟 初回実行
    setRandomMessage();
    checkRollCall();

    // 🔁30分ごと更新（1800000ミリ秒）
    const UPDATE_INTERVAL = 30 * 60 * 1000;
    setInterval(setRandomMessage, UPDATE_INTERVAL);
});

