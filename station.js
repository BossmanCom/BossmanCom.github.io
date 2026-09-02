function pad(n){ return n.toString().padStart(2,'0'); }

function updateClock(){
  const now = new Date();
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  document.getElementById('timeDisplay').innerHTML = `${h}:${m}<span class="blink">:${s}</span>`;
  document.getElementById('dateDisplay').textContent = now.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' });
  document.getElementById('dayDisplay').textContent = now.toLocaleDateString(undefined, { weekday:'long' });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  document.getElementById('tzName').textContent = tz;
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offH = pad(Math.floor(Math.abs(offsetMin)/60));
  const offM = pad(Math.abs(offsetMin)%60);
  document.getElementById('utcOffset').textContent = `${sign}${offH}:${offM}`;
  document.getElementById('statusClock').textContent = 'SYSTEM TIME OK';
}
updateClock();
setInterval(updateClock, 1000);

const weatherCodeMap = {
  0:"CLEAR SKY", 1:"MOSTLY CLEAR", 2:"PARTLY CLOUDY", 3:"OVERCAST",
  45:"FOG", 48:"FREEZING FOG",
  51:"LIGHT DRIZZLE", 53:"DRIZZLE", 55:"DENSE DRIZZLE",
  61:"LIGHT RAIN", 63:"RAIN", 65:"HEAVY RAIN",
  71:"LIGHT SNOW", 73:"SNOW", 75:"HEAVY SNOW",
  80:"LIGHT SHOWERS", 81:"SHOWERS", 82:"VIOLENT SHOWERS",
  95:"THUNDERSTORM", 96:"THUNDERSTORM W/ HAIL", 99:"SEVERE THUNDERSTORM"
};

let weatherLat = 43.1394;
let weatherLon = -80.2644;
let weatherLabel = 'Brantford, Ontario, Canada';

async function loadWeather(lat = weatherLat, lon = weatherLon, label = weatherLabel){
  const status = document.getElementById('weatherStatus');
  status.innerHTML = '<span class="dot"></span>FETCHING...';
  status.classList.remove('err');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('forecast failed');
    const data = await res.json();
    const c = data.current;
    document.getElementById('tempDisplay').textContent = `${Math.round(c.temperature_2m)}°C`;
    document.getElementById('feelsDisplay').textContent = `${Math.round(c.apparent_temperature)}°C`;
    document.getElementById('humidDisplay').textContent = `${Math.round(c.relative_humidity_2m)}%`;
    document.getElementById('windDisplay').textContent = `${Math.round(c.wind_speed_10m)} km/h`;
    document.getElementById('condDisplay').textContent = weatherCodeMap[c.weather_code] || 'UNKNOWN';
    document.getElementById('locDisplay').textContent = label;
    weatherLat = lat; weatherLon = lon; weatherLabel = label;
    status.innerHTML = '<span class="dot"></span>LIVE — OPEN-METEO';
    status.classList.remove('err');
  } catch(err) {
    status.textContent = 'SIGNAL LOST';
    status.classList.add('err');
  }
}

async function searchWeather(){
  const q = document.getElementById('weatherQuery').value.trim();
  const status = document.getElementById('weatherStatus');
  if(!q){
    status.textContent = 'ENTER A CITY NAME';
    status.classList.add('err');
    return;
  }
  status.innerHTML = '<span class="dot"></span>LOCATING...';
  status.classList.remove('err');
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if(!geoRes.ok) throw new Error('geocode failed');
    const geo = await geoRes.json();
    if(!geo.results || !geo.results.length){
      status.textContent = 'LOCATION NOT FOUND';
      status.classList.add('err');
      return;
    }
    const place = geo.results[0];
    const label = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
    await loadWeather(place.latitude, place.longitude, label);
  } catch(err) {
    status.textContent = 'SEARCH FAILED';
    status.classList.add('err');
  }
}

document.getElementById('weatherSearchBtn').addEventListener('click', searchWeather);
document.getElementById('weatherQuery').addEventListener('keydown', (e) => {
  if(e.key === 'Enter') searchWeather();
});

loadWeather();
setInterval(() => loadWeather(), 10 * 60 * 1000);

const radioPlayer = document.getElementById('radioPlayer');
const radioStation = document.getElementById('radioStation');
const radioPlayBtn = document.getElementById('radioPlayBtn');
const radioVolume = document.getElementById('radioVolume');
const radioStatus = document.getElementById('radioStatus');
radioPlayer.volume = radioVolume.value / 100;
radioVolume.addEventListener('input', () => { radioPlayer.volume = radioVolume.value / 100; });
radioStation.addEventListener('change', () => {
  const url = radioStation.value;
  if(!url){
    radioPlayer.pause(); radioPlayer.src = '';
    radioPlayBtn.textContent = '▶ PLAY'; radioStatus.textContent = 'STOPPED'; return;
  }
  radioPlayer.src = url;
  radioPlayer.play().then(() => {
    radioPlayBtn.textContent = '⏸ PAUSE';
    radioStatus.textContent = `PLAYING — ${radioStation.options[radioStation.selectedIndex].text}`;
  }).catch(() => { radioStatus.textContent = 'PRESS PLAY TO START'; });
});
radioPlayBtn.addEventListener('click', () => {
  if(!radioStation.value){ radioStatus.textContent = 'SELECT A STATION FIRST'; return; }
  if(radioPlayer.paused){
    if(!radioPlayer.src) radioPlayer.src = radioStation.value;
    radioPlayer.play().then(() => {
      radioPlayBtn.textContent = '⏸ PAUSE';
      radioStatus.textContent = `PLAYING — ${radioStation.options[radioStation.selectedIndex].text}`;
    }).catch(() => { radioStatus.textContent = 'PLAYBACK BLOCKED — TRY AGAIN'; });
  } else {
    radioPlayer.pause(); radioPlayBtn.textContent = '▶ PLAY'; radioStatus.textContent = 'PAUSED';
  }
});
radioPlayer.addEventListener('waiting', () => { radioStatus.textContent = 'BUFFERING...'; });
radioPlayer.addEventListener('error', () => { radioStatus.textContent = 'STREAM ERROR — TRY ANOTHER STATION'; });
