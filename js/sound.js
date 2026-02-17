let meterSound = null;

export function initSound() {
    meterSound = new Audio('/sounds/meter_sound.wav');
    meterSound.preload = 'auto';
}

export function playMeterSound() {
    if (!meterSound) {
        meterSound = new Audio('/sounds/meter_sound.wav');
    }

    meterSound.currentTime = 0;
    meterSound.play().catch(() => { });
}
