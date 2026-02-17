import { qs, addClass,removeClass } from "./dom.js";
import { playMeterSound } from "./sound.js";

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

// ------------------------------
// ◆ フェイクメーター
// ------------------------------

export function initFakeMeter() {
    const meter = qs('#fakeMeter');
    const amountEl = qs('#fakeAmount');
    const elapsedEl = qs('#fakeElapsed');
    const breakdownEl = qs('#fakeBreakdown');

    fakeSeconds = 0;
    fakeAmount = 500;

    addClass(breakdownEl,'hidden'); // メーター開始時にリセット
    addClass(qs('#fakeThanks'), 'hidden');

    amountEl.textContent = `¥${fakeAmount.toLocaleString()}`;
    elapsedEl.textContent = '00:00';

    removeClass(meter,'hidden');

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
    addClass(meter,'hidden');
    if (fakeTimer) {
        clearInterval(fakeTimer);
        fakeTimer = null;
    }
}

//戻るボタンの挙動
qs('#fakeCloseBtn')?.addEventListener('click', closeFakeMeter);

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
    removeClass(breakdownEl,'hidden');

    // 合計金額表示
    amountEl.textContent = `¥${total.toLocaleString()}`;
}

/* ボタンが押されたらご利用ありがとうございましたと表示する関数 */
function showThanksMessage() {
    const el = qs('#fakeThanks');
    if (!el) return;

    el.textContent = `ご利用ありがとうございました`;
    removeClass(el,'hidden');
}

