// Debug build: logs API URLs, status, and sample sizes to console and on-page.
const DEBUG = true;
function dlog(...args){ if(DEBUG){ console.log('[DEBUG]', ...args);} }
function dlogUi(msg){ const el=document.getElementById('debugLog'); el.textContent += (el.textContent==='(waiting)'?'':'\n') + msg; }

// Elements
const spotsEl = document.getElementById('spots');
const addSpotBtn = document.getElementById('addSpot');
const forecastBtn = document.getElementById('forecast');
const resetBtn = document.getElementById('reset');
const skillSel = document.getElementById('skill');
const boardSel = document.getElementById('board');
const tidePrefSel = document.getElementById('tidePref');
const tideImpSel = document.getElementById('tideImp');
const crowdImpSel = document.getElementById('crowdImp');
const crowdWeekendEl = document.getElementById('crowdWeekend');
const crowdPeakEl = document.getElementById('crowdPeak');
const midHintEl = document.getElementById('midHint');
const results = document.getElementById('results');
const summary = document.getElementById('summary');
const daily = document.getElementById('daily');
const errBox = document.getElementById('err');
const tpl = document.getElementById('spotRowTpl');
const debugToggle = document.getElementById('debugToggle');

// Defaults
const SAMPLE_SPOTS = [
  { name: "Tourmaline Surf Park", lat: 32.8048, lon: -117.2591, orient: 260 },
  { name: "La Jolla Shores", lat: 32.8569, lon: -117.2570, orient: 270 },
  { name: "Cardiff Reef", lat: 33.0207, lon: -117.2848, orient: 255 },
  { name: "San Elijo/Pipes", lat: 33.0352, lon: -117.2966, orient: 260 },
  { name: "Swami's", lat: 33.0360, lon: -117.2931, orient: 260 },
  { name: "Scripps Pier", lat: 32.8650, lon: -117.2530, orient: 270 },
  { name: "Black's Beach (south)", lat: 32.8825, lon: -117.2525, orient: 270 },
  { name: "Del Mar", lat: 32.9618, lon: -117.2653, orient: 270 }
];

// Helpers
function clamp360(x){ return ((x % 360) + 360) % 360; }
function degDiff(a,b){ const d=Math.abs(clamp360(a)-clamp360(b))%360; return d>180?360-d:d; }
function feet(m){ return m*3.28084; }
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

const skillTargets = { beginner:{min:1,max:3}, intermediate:{min:2,max:6}, advanced:{min:4,max:12} };
const boardPresets = {
  shortboard:{ height:{min:3,max:8}, periodPref:{softMin:10,softMax:18}, windTolerance:{ktSoft:6,ktHard:16,offshoreSpan:120} },
  fish:{ height:{min:2,max:6}, periodPref:{softMin:9,softMax:16}, windTolerance:{ktSoft:8,ktHard:18,offshoreSpan:135} },
  longboard:{ height:{min:1,max:4}, periodPref:{softMin:8,softMax:14}, windTolerance:{ktSoft:9,ktHard:20,offshoreSpan:150} }
};

function heightScore(ft, skill, preset){
  if (!Number.isFinite(ft)) return 0;
  const s = skillTargets[skill] || skillTargets.intermediate;
  const p = preset?.height || boardPresets.longboard.height;
  const min = 0.6*p.min + 0.4*s.min;
  const max = 0.6*p.max + 0.4*s.max;
  const mid = (min+max)/2, span = (max-min)/2 || 1;
  return Math.max(0, 1 - (Math.abs(ft-mid)/(span*2)));
}
function periodScoreWithPreset(sec, preset){
  if (!Number.isFinite(sec)) return 0;
  const {softMin, softMax} = preset.periodPref;
  if (sec <= softMin) return Math.max(0, Math.min(1, (sec-6)/Math.max(1,(softMin-6))));
  if (sec >= softMax) return 0.8 + Math.min(0.2, (sec-softMax)/6);
  const x = (sec-softMin)/Math.max(1,(softMax-softMin));
  return 0.6 + 0.4 * Math.max(0, Math.min(1, x));
}
function windScoreWithPreset(speedKt, windDir, beachOrient, preset){
  if (!Number.isFinite(speedKt) || !Number.isFinite(windDir)) return 0;
  const offshore = clamp360(beachOrient+180);
  const angle = degDiff(windDir, offshore);
  const span = preset.windTolerance.offshoreSpan;
  const dirScore = Math.max(0, 1 - (angle/span));
  const {ktSoft, ktHard} = preset.windTolerance;
  let speedPenalty = 0;
  if (speedKt <= ktSoft) speedPenalty = 0;
  else if (speedKt >= ktHard) speedPenalty = 0.6;
  else speedPenalty = (speedKt-ktSoft) * (0.6/(ktHard-ktSoft));
  return Math.max(0, dirScore - speedPenalty);
}

// Tide & mid-length helpers
function tideBand(pref){ if (pref === 'low') return {min:0, max:1.5}; if (pref === 'high') return {min:3, max:5}; return {min:1.5, max:3}; }
function tideScoreFt(ft, pref){ if (!Number.isFinite(ft)) return 0.6; const b=tideBand(pref); if (ft>=b.min && ft<=b.max) return 1; const dist=Math.min(Math.abs(ft-(ft<b.min?b.min:b.max)),2.5); return Math.max(0,1-dist/2.5); }
function normToBand(x, min, max){ if (!Number.isFinite(x)) return 0; if (x>=min && x<=max) return 1; const edge=x<min?min:max; const dist=Math.abs(x-edge); return clamp01(1 - dist/1.5); }
function midLengthSuitability(h, tidePref){
  const heightScore = normToBand(h.face_ft, 2.5, 5.5);
  const periodScore = Number.isFinite(h.wave_period) ? clamp01((h.wave_period - 7) / (14 - 7)) : 0;
  const windScore   = clamp01(h.wind_score ?? 0);
  const tideScore   = tideScoreFt(h.tide_height_ft, tidePref);
  return 0.40*heightScore + 0.25*windScore + 0.20*periodScore + 0.15*tideScore;
}

// APIs
async function fetchJson(url){
  dlog('FETCH', url);
  dlogUi('GET ' + url);
  const res = await fetch(url);
  dlog('STATUS', res.status, res.statusText);
  dlogUi('STATUS ' + res.status + ' ' + res.statusText);
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
  const json = await res.json();
  const n = json?.hourly?.time?.length ?? 0;
  dlog('ROWS', n);
  dlogUi('ROWS ' + n);
  return json;
}

async function fetchMarine(lat, lon){
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('hourly','wave_height,wave_period');
  url.searchParams.set('forecast_days','7');
  url.searchParams.set('timezone','auto');
  return fetchJson(url.toString());
}
async function fetchWind(lat, lon){
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('hourly','wind_speed_10m,wind_direction_10m');
  url.searchParams.set('forecast_days','7');
  url.searchParams.set('timezone','auto');
  return fetchJson(url.toString());
}
async function tryFetchTide(lat, lon){
  try{
    const url = new URL('https://marine-api.open-meteo.com/v1/tide');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('hourly','tide_height');
    url.searchParams.set('forecast_days','7');
    url.searchParams.set('timezone','auto');
    return await fetchJson(url.toString());
  }catch(e){
    dlog('TIDE FAIL', e.message);
    dlogUi('TIDE FAIL ' + e.message);
    return null;
  }
}

function buildHoursMarine(data){
  const t = data?.hourly?.time || [];
  return t.map((time,i)=>({ time, wave_height: data.hourly.wave_height[i], wave_period: data.hourly.wave_period[i] }));
}
function buildHoursWind(data){
  const t = data?.hourly?.time || [];
  return t.map((time,i)=>({ time, wind_speed_10m: data.hourly.wind_speed_10m[i], wind_direction_10m: data.hourly.wind_direction_10m[i] }));
}
function buildHoursTide(data){
  if (!data || !data.hourly) return null;
  const t = data.hourly.time;
  return t.map((time,i)=>({ time, tide_height_ft: (typeof data.hourly.tide_height[i]==='number' ? data.hourly.tide_height[i]*3.28084 : null) }));
}
function mergeByTime(...series){
  const map = new Map();
  for (const arr of series){
    if (!Array.isArray(arr)) continue;
    for (const row of arr){
      const key = row.time;
      if (!map.has(key)) map.set(key, { time: key });
      map.set(key, { ...map.get(key), ...row });
    }
  }
  return Array.from(map.values()).sort((a,b)=>a.time.localeCompare(b.time));
}

// Crowd penalty
function crowdPenaltyForHour(dateIso, sensitivity, penalizeWeekend, penalizePeak){
  const d = new Date(dateIso); const day=d.getDay(); const hr=d.getHours(); const sens=Number(sensitivity); if (sens===0) return 0;
  let penalty = sens * 0.05;
  if (penalizeWeekend && (day===0 || day===6)) penalty += sens*0.05;
  if (penalizePeak && hr>=7 && hr<=9) penalty += sens*0.05;
  return Math.min(0.20, penalty);
}

function summarizeDay(hours, skill, orient, board, tidePref, tideImp, crowdImp, crowdWeekend, crowdPeak, midHint){
  const morning = hours.filter(h=>{ const hr=new Date(h.time).getHours(); return hr>=6 && hr<=11; });
  const sample = morning.length ? morning : hours;
  if (!sample.length) return { best:null, avgScore:0, avgMid:0 };
  const preset = boardPresets[board] || boardPresets.longboard;
  const tideWeight = Math.min(0.30, Math.max(0, Number(tideImp) * 0.15));
  const baseWeight = 1 - tideWeight;

  let best=null, acc=0, midAcc=0;
  for (const h of sample){
    const hft = feet(h.wave_height);
    const wspdKt = (h.wind_speed_10m ?? 0) * 1.94384;
    const wdir = h.wind_direction_10m;

    const heightComp = heightScore(hft, skill, preset);
    const periodComp = periodScoreWithPreset(h.wave_period, preset);
    const windComp = windScoreWithPreset(wspdKt, wdir, orient, preset);
    let s = baseWeight * (0.50*heightComp + 0.25*periodComp + 0.25*windComp);

    if (tideWeight > 0){ s += tideWeight * tideScoreFt(h.tide_height_ft, tidePref); }

    const cpen = crowdPenaltyForHour(h.time, crowdImp, crowdWeekend, crowdPeak);
    s = Math.max(0, s * (1 - cpen));

    const midScore = midHint ? (0.40*normToBand(hft,2.5,5.5) + 0.25*windComp + 0.20*(Number.isFinite(h.wave_period)?clamp01((h.wave_period-7)/(14-7)):0) + 0.15*tideScoreFt(h.tide_height_ft, tidePref)) : 0;
    midAcc += midScore;
    const midFlag = midHint && midScore >= 0.6;

    acc += s;
    if (!best || s > best.score) best = { ...h, score: s, mid_score: midScore, mid_flag: midFlag };
  }
  const avgScore = acc / sample.length;
  const avgMid = midAcc / sample.length;
  return { best, avgScore, avgMid };
}

function scoreLabel(s){ if (s>=0.75) return {label:'great',cls:'good'}; if (s>=0.5) return {label:'okay',cls:'ok'}; return {label:'meh',cls:'bad'}; }

function loadSpots(){
  const saved = JSON.parse(localStorage.getItem('spots') || 'null');
  const spots = saved && Array.isArray(saved) && saved.length ? saved : SAMPLE_SPOTS;
  spotsEl.innerHTML = '';
  spots.forEach(addSpotRow);
}
function addSpotRow(spot={name:'',lat:'',lon:'',orient:270}){
  const node = tpl.content.cloneNode(true);
  const row = node.querySelector('.spot-row');
  row.querySelector('.spot-name').value = spot.name || '';
  row.querySelector('.spot-lat').value = spot.lat ?? '';
  row.querySelector('.spot-lon').value = spot.lon ?? '';
  row.querySelector('.spot-orient').value = spot.orient ?? 270;
  row.querySelector('.delete').addEventListener('click', ()=>{ row.remove(); saveSpots(); });
  Array.from(row.querySelectorAll('input')).forEach(inp=>inp.addEventListener('change', saveSpots));
  spotsEl.appendChild(node);
}
function saveSpots(){
  const rows = Array.from(document.querySelectorAll('.spot-row'));
  const spots = rows.map(r=>({
    name: r.querySelector('.spot-name').value.trim(),
    lat: parseFloat(r.querySelector('.spot-lat').value),
    lon: parseFloat(r.querySelector('.spot-lon').value),
    orient: clamp360(parseFloat(r.querySelector('.spot-orient').value) || 270),
  })).filter(s=>s.name && Number.isFinite(s.lat) && Number.isFinite(s.lon));
  localStorage.setItem('spots', JSON.stringify(spots));
}

async function runForecast(){
  const dbgOn = debugToggle.checked;
  if (!dbgOn) { document.getElementById('debugLog').textContent = '(off)'; }
  errBox.classList.add('hidden'); errBox.textContent = '';
  saveSpots();
  const skill = skillSel.value;
  const board = boardSel.value;
  const tidePref = tidePrefSel.value;
  const tideImp = tideImpSel.value;
  const crowdImp = crowdImpSel.value;
  const crowdWeekend = crowdWeekendEl.checked;
  const crowdPeak = crowdPeakEl.checked;
  const midHint = midHintEl.checked;

  const spots = JSON.parse(localStorage.getItem('spots') || '[]');
  if (!spots.length){ alert('Add at least one spot.'); return; }

  results.classList.remove('hidden');
  summary.innerHTML = '<div class="card">Fetching forecasts…</div>';
  daily.innerHTML = '';

  const perSpot = [];
  for (const spot of spots){
    try{
      dlogUi('--- Spot: ' + spot.name + ' ('+spot.lat+', '+spot.lon+')');
      const [marine, wind, tide] = await Promise.all([
        fetchMarine(spot.lat, spot.lon),
        fetchWind(spot.lat, spot.lon),
        tryFetchTide(spot.lat, spot.lon)
      ]);
      const hours = mergeByTime(
        buildHoursMarine(marine),
        buildHoursWind(wind),
        (tide ? buildHoursTide(tide) : null)
      );
      dlog('MERGED HOURS', hours.length);
      dlogUi('MERGED HOURS ' + hours.length);
      if (!hours.length) throw new Error('No hourly data after merge');
      const days = {};
      for (const h of hours){ const d = h.time.slice(0,10); (days[d] = days[d] || []).push(h); }
      const daySummaries = Object.entries(days).map(([date, hrs])=>{
        const sum = summarizeDay(hrs, skill, spot.orient, board, tidePref, tideImp, crowdImp, crowdWeekend, crowdPeak, midHint);
        return { date, best: sum.best, avg: Number.isFinite(sum.avgScore)?sum.avgScore:0, avgMid: Number.isFinite(sum.avgMid)?sum.avgMid:0 };
      });
      perSpot.push({ spot, daySummaries });
    }catch(e){
      console.error(e);
      errBox.textContent = 'Last error: '+ e.message;
      errBox.classList.remove('hidden');
      dlogUi('SPOT ERROR ' + e.message);
      perSpot.push({ spot, error:true, daySummaries: [] });
    }
  }

  if (!perSpot.length || !perSpot[0].daySummaries.length){
    summary.innerHTML = '<div class="card">No forecast data. Try clicking “Reset to San Diego sample”, then “Forecast week”.</div>';
    return;
  }

  const dates = perSpot[0].daySummaries.map(d=>d.date);
  const bestByDay = dates.map(date=>{
    let best=null;
    perSpot.forEach(s=>{
      const d = s.daySummaries.find(x=>x.date===date);
      if (!d) return;
      if (!best || d.avg > best.avg) best = { ...d, spot: s.spot };
    });
    return best;
  });

  const totals = perSpot.map(s=>({
    spot: s.spot,
    mean: s.daySummaries.length ? (s.daySummaries.reduce((a,b)=>a+b.avg,0) / s.daySummaries.length) : 0,
    meanMid: s.daySummaries.length ? (s.daySummaries.reduce((a,b)=>a+b.avgMid,0) / s.daySummaries.length) : 0
  })).sort((a,b)=>b.mean-a.mean);

  const champ = totals[0] || { spot:{name:'—'}, mean:0, meanMid:0 };
  const champLbl = scoreLabel(champ.mean);
  const champMidTag = (champ.meanMid >= 0.6 && midHint) ? '<span class="badge good">Mid‑length 🤙</span>' : '';
  summary.innerHTML = `
    <div class="card">
      <h3>Weekly pick: ${champ.spot.name} <span class="badge ${champLbl.cls}">${champLbl.label}</span> ${champMidTag}</h3>
      <div class="tags">
        <span class="tag">Avg score: <span class="score">${champ.mean.toFixed(2)}</span></span>
        <span class="tag">Skill: ${skill}</span>
        <span class="tag">Board: ${board}</span>
        <span class="tag">Tide: ${tidePref} (${['ignore','light','strong'][Number(tideImp)]})</span>
        <span class="tag">Crowd: ${['ignore','light','strong'][Number(crowdImp)]}</span>
      </div>
      <table class="table">
        <thead><tr><th>Rank</th><th>Spot</th><th>Avg AM score</th><th>Mid‑length?</th></tr></thead>
        <tbody>
          ${totals.map((t,i)=>`<tr>
            <td>${i+1}</td>
            <td>${t.spot.name}</td>
            <td>${t.mean.toFixed(2)}</td>
            <td>${(t.meanMid>=0.6 && midHint) ? '🤙' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  daily.innerHTML = '<div class="grid cols-3"></div>';
  const grid = daily.querySelector('.grid');
  bestByDay.forEach(d=>{
    if (!d || !d.best) return;
    const lbl = scoreLabel(d.avg);
    const bh = feet(d.best.wave_height).toFixed(1);
    const per = Number.isFinite(d.best.wave_period) ? d.best.wave_period.toFixed(0) : '—';
    const wkt = Number.isFinite(d.best.wind_speed_10m) ? (d.best.wind_speed_10m * 1.94384).toFixed(0) : '—';
    const wdir = Number.isFinite(d.best.wind_direction_10m) ? d.best.wind_direction_10m.toFixed(0) : '—';
    const when = new Date(d.best.time).toLocaleString([], { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const tideFt = (typeof d.best.tide_height_ft === 'number') ? d.best.tide_height_ft.toFixed(1)+' ft' : '—';
    const midTag = (d.best.mid_flag) ? '<span class="badge good">Mid‑length 🤙</span>' : '';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${d.date} — Best: ${d.spot.name} <span class="badge ${lbl.cls}">${lbl.label}</span> ${midTag}</h3>
      <div class="tags">
        <span class="tag">Avg AM score: <span class="score">${d.avg.toFixed(2)}</span></span>
        <span class="tag">Go at: ${when}</span>
      </div>
      <div class="grid cols-2" style="margin-top:6px">
        <div>
          <div><strong>Wave height:</strong> ${bh} ft</div>
          <div><strong>Swell period:</strong> ${per} s</div>
          <div><strong>Tide height:</strong> ${tideFt}</div>
        </div>
        <div>
          <div><strong>Wind:</strong> ${wkt} kt @ ${wdir}°</div>
          <div><strong>Beach orient:</strong> ${d.spot.orient}°</div>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

// Events & init
addSpotBtn.addEventListener('click', ()=>addSpotRow());
resetBtn.addEventListener('click', ()=>{ localStorage.removeItem('spots'); loadSpots(); });
forecastBtn.addEventListener('click', runForecast);
function loadSpots(){ const saved=JSON.parse(localStorage.getItem('spots')||'null'); const spots=saved&&Array.isArray(saved)&&saved.length?saved:SAMPLE_SPOTS; spotsEl.innerHTML=''; spots.forEach(addSpotRow); }
function addSpotRow(spot={name:'',lat:'',lon:'',orient:270}){
  const node=tpl.content.cloneNode(true); const row=node.querySelector('.spot-row');
  row.querySelector('.spot-name').value=spot.name||'';
  row.querySelector('.spot-lat').value=spot.lat??'';
  row.querySelector('.spot-lon').value=spot.lon??'';
  row.querySelector('.spot-orient').value=spot.orient??270;
  row.querySelector('.delete').addEventListener('click', ()=>{ row.remove(); saveSpots(); });
  Array.from(row.querySelectorAll('input')).forEach(inp=>inp.addEventListener('change', saveSpots));
  spotsEl.appendChild(node);
}
function saveSpots(){
  const rows=Array.from(document.querySelectorAll('.spot-row'));
  const spots=rows.map(r=>({
    name:r.querySelector('.spot-name').value.trim(),
    lat:parseFloat(r.querySelector('.spot-lat').value),
    lon:parseFloat(r.querySelector('.spot-lon').value),
    orient:clamp360(parseFloat(r.querySelector('.spot-orient').value)||270),
  })).filter(s=>s.name&&Number.isFinite(s.lat)&&Number.isFinite(s.lon));
  localStorage.setItem('spots', JSON.stringify(spots));
}
loadSpots();
