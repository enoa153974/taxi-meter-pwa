
/* =========================
    現在時刻の表示
========================= */



//時計の自動更新処理
export function updateCurrentTime(el) {
    if (!el) return;

    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    el.textContent = `${h}:${m}`;
}

let timer = null;
//時計の自動更新を開始
export function startClock(el){
    if(timer) return;
    timer = setInterval(()=>updateCurrentTime(el),1000);
}

//時計の自動更新を停止
export function stopClock(){
    clearInterval(timer);
    timer = null;
}
