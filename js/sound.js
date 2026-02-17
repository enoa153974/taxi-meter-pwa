let meterSound = null;

// 初期化
export function initSound() {
    meterSound = new Audio('/sounds/meter_sound.wav');
    meterSound.preload = 'auto';

    const unlock = () => {
        meterSound.play()
            .then(() => {
                meterSound.pause();
                meterSound.currentTime = 0;
            })
            .catch(err => {
                console.warn("Sound unlock failed:", err);
            });
    };

    // 全デバイス対応
    document.addEventListener('pointerdown', unlock, { once: true });
}

// 再生
export function playMeterSound() {
    if (!meterSound) {
        console.warn("Sound not initialized");
        return;
    }

    meterSound.currentTime = 0;

    meterSound.play().catch(err => {
        console.warn("Play blocked:", err);
    });
}
