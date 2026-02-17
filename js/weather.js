/* =========================
    天気パネルの動作
========================= */


let weatherInterval = null;
const AUTO_UPDATE_INTERVAL = 30 * 60 * 1000; // 30分


// ------------------------------
// ◆ 天気モジュール初期化
// ------------------------------
export function initWeather({
    statusEl,
    tempEl,
    refreshBtn,
    apiKey
}) {

    //天気パネル表示
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
                        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ja&appid=${apiKey}`
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
    //天気パネルのアイコンを切り替える
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

    //天気パネルの更新ボタン
    refreshBtn?.addEventListener('click', fetchWeather);


    // 天気初回表示実行
    fetchWeather();
    startAutoUpdate();


    // 天気自動更新関数
    function startAutoUpdate() {
        if (weatherInterval === null) {
            weatherInterval = setInterval(fetchWeather, AUTO_UPDATE_INTERVAL);
        }
    }

    // 天気自動更新停止関数
    function stopAutoUpdate() {
        if (weatherInterval !== null) {
            clearInterval(weatherInterval);
            weatherInterval = null;
        }
    }
}