import { loadSalesSummary, calcBusinessDateForSave } from "./detailCalc.js";
import { addSale, addDriverLog } from "./firestore.js";
import { setupPressAction } from "./util.js";
import { playMeterSound } from "./sound.js";
import { initFakeMeter } from "./fakeMeter.js";

let currentPanel = "meter"; // 初期状態は meter に寄せる

export function initUIHandlers({
    panel,
    summaryDisplay,
    buttons,
}) {

    /* =========================
        パネル表示切替
    ========================= */
    function switchMeterView(name) {
        Object.entries(panel).forEach(([key, el]) => {
            el?.classList.toggle("hidden", key !== name);
        });

        currentPanel = name;
    }

    function backToMeterTime() {
        switchMeterView("meter");
    }

    function hideAllPanels(panels) {
        Object.values(panels).forEach(el => {
            el?.classList.add("hidden");
        });
    }

    /* =========================
        集計表示
    ========================= */
    async function initSummary(amountEl) {
        if (!amountEl) return;

        amountEl.textContent = "読み込み中…";

        try {
            const total = await loadSalesSummary();
            amountEl.textContent = `今月度累計(税抜)\n${total.net.toLocaleString()}円`;
        } catch (e) {
            amountEl.textContent = "読み込みに失敗しました🥲";
            console.error(e);
        }
    }

    initSummary(summaryDisplay?.amount);

    /* =========================
        ボタンイベント（パネル系）
    ========================= */

    // 空車ボタン
    buttons?.log?.addEventListener("click", () => {
        navigator.vibrate?.(50);

        if (currentPanel === "log") {
            switchMeterView("meter");
        } else {
            switchMeterView("log");
        }
    });

    // 実車ボタン（短押し: 集計 / 長押し: ネタメーター）
    setupPressAction({
        element: buttons?.summary,

        shortPress: () => {
            navigator.vibrate?.(40);
            switchMeterView(currentPanel === "summaryPanel" ? "meter" : "summaryPanel");
        },

        longPress: () => {
            playMeterSound();
            initFakeMeter();
        },

        longPressTime: 700
    });

    // 支払いボタン
    buttons?.pay?.addEventListener("click", () => {
        navigator.vibrate?.(50);

        if (currentPanel === "pay") {
            switchMeterView("meter");
        } else {
            switchMeterView("pay");
        }
    });

    /* 詳細ページへ */
    buttons?.details?.addEventListener("click", () => {
        navigator.vibrate?.(50);
        location.href = "./sales-details.html";
    });

    /* =========================
        ログ保存
    ========================= */
    buttons?.saveLog?.addEventListener("click", async () => {
        const note = buttons?.logInput?.value?.trim?.() ?? "";

        if (!note) {
            alert("メモを入力してね！");
            buttons.logInput?.focus();
            return;
        }


        try {
            await addDriverLog({
                userId: window.currentUserUid,
                note,
                createdAt: new Date(),
                businessDate: calcBusinessDateForSave()
            });

            alert("🚕 ログ書き込みました！");
            if (buttons?.logInput) buttons.logInput.value = "";

            hideAllPanels(panel);
            backToMeterTime();
        } catch (e) {
            console.error("💥 driverLogs 保存失敗:", e);
            alert("保存に失敗したかも…😢");
        }
    });

    /* =========================
        売上保存
    ========================= */
    buttons?.saveSale?.addEventListener("click", async () => {
        const amount = Number(buttons?.amountInput?.value);
        const memo = buttons?.memoInput?.value || "";
        const now = new Date();

        const startTimeStr = localStorage.getItem("taxi_start_time");
        const workDateStr = localStorage.getItem("taxi_work_date");
        const hasWorkStart = !!(startTimeStr && workDateStr);

        let workStartAt = null;
        let workMinutes = null;

        if (hasWorkStart) {
            const [h, m] = startTimeStr.split(":").map(Number);
            workStartAt = new Date(`${workDateStr}T00:00:00`);
            workStartAt.setHours(h, m, 0, 0);
            workMinutes = Math.floor((now - workStartAt) / 60000);
        }

        if (!amount) {
            alert("金額を入力してください");
            buttons.amountInput?.focus();
            return;
        }

        try {
            await addSale({
                userId: window.currentUserUid,
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

            if (buttons?.amountInput) buttons.amountInput.value = "";
            if (buttons?.memoInput) buttons.memoInput.value = "";

            localStorage.removeItem("taxi_start_time");
            localStorage.removeItem("taxi_work_date");

            hideAllPanels(panel);
            backToMeterTime();
        } catch (e) {
            alert("💥 保存失敗");
            console.error(e);
        }
    });

    /* =========================
        初期表示
    ========================= */
    switchMeterView("meter");

    /* =========================
        コントロールパネルの動作
    ========================= */
    /* 帰宅ボタン */
    buttons.goHome?.addEventListener('click', () => {
        navigator.vibrate?.(50);

        const msg = encodeURIComponent('今から帰ります🚕');
        location.href = `https://line.me/R/msg/text/?${msg}`;
    });

    /* GPTボタン */
    buttons.GPT?.addEventListener('click', () => {
        navigator.vibrate?.(50);
        location.href = 'https://chatgpt.com/';
    });


    /* マップボタン */
    buttons.map?.addEventListener('click', () => {
        navigator.vibrate?.(50);
        location.href = 'https://www.google.com/maps';
    });

    /* 翻訳ボタン */
    const translateBtn = buttons.translate;


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
    buttons.phrases?.addEventListener('click', () => {
        navigator.vibrate?.(50);
        location.href = './phrases.html';
    });



}

