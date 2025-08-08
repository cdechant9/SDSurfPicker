
function renderCalendar(perSpot, dates){
  const cal = document.getElementById('calendar');
  if (!cal) return;
  const rowsSorted = [...perSpot].sort((a,b)=>{
    const ma = a.daySummaries.reduce((s,d)=>s+d.avg,0)/a.daySummaries.length || 0;
    const mb = b.daySummaries.reduce((s,d)=>s+d.avg,0)/b.daySummaries.length || 0;
    return mb - ma;
  });
  cal.innerHTML = dates.map(date=>{
    const dayHtml = rowsSorted.map(s=>{
      const d = s.daySummaries.find(x=>x.date===date);
      const avg = d ? d.avg : 0;
      const rank = rankForDate(rowsSorted, date, s.spot.name);
      return `<div class="cell card"><div><strong>${s.spot.name}</strong></div><div>Rank: #${rank} · Avg: ${avg.toFixed(2)}</div></div>`;
    }).join('');
    return `<div class="day-col"><div class="card" style="margin-bottom:6px;"><strong>${date}</strong></div>${dayHtml}</div>`;
  }).join('');
}
function rankForDate(rowsSorted, date, spotName){
  const dayScores = rowsSorted.map(s=>{
    const d = s.daySummaries.find(x=>x.date===date);
    return { name: s.spot.name, score: d ? d.avg : 0 };
  }).sort((a,b)=>b.score-a.score);
  return dayScores.findIndex(x=>x.name===spotName) + 1;
}
