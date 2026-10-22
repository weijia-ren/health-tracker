const KEY = 'dailyHealthCheckin.v1';
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfe2r0BYqRkVtdU1rWvpLq8MewhsoSV_ZuSOtbbpybq-xgBWA/viewform?usp=publish-editor';
const state = { selectedQuality: '', selectedNutrition: '' };
const $ = (id) => document.getElementById(id);
const today = () => new Date().toLocaleDateString('en-CA');
const clampMin = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : 0; };
const escapeHTML = (value='') => String(value).replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

function loadLog(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function saveLog(log){ localStorage.setItem(KEY, JSON.stringify(log)); }
function localDate(offset=0){ const d = new Date(); d.setDate(d.getDate()+offset); return d.toLocaleDateString('en-CA'); }
function sleepMins(record){
  if(!record.sleepBedtime || !record.sleepWaketime) return null;
  const [bh,bm]=record.sleepBedtime.split(':').map(Number), [wh,wm]=record.sleepWaketime.split(':').map(Number);
  let mins = (wh*60+wm)-(bh*60+bm);
  if(mins <= 0) mins += 1440;
  return mins;
}
function sleepText(record){ const m = sleepMins(record); return m == null ? '—' : `${Math.floor(m/60)}h${m%60 ? ' '+m%60+'m' : ''}`; }
function bedtimeGood(record){ if(!record.sleepBedtime) return false; const [h] = record.sleepBedtime.split(':').map(Number); return h < 23; }
function recordFromForm(){ return {
  date: today(),
  sleepBedtime: $('sleep-bedtime').value,
  sleepWaketime: $('sleep-waketime').value,
  sleepQuality: state.selectedQuality,
  nutritionBalance: state.selectedNutrition,
  nutritionSupplement: $('nutrition-supplement').checked,
  cardioMin: $('exercise-cardio').value,
  weightMin: $('exercise-weight').value,
  stretchMin: $('exercise-stretch').value,
  meditationMin: $('stress-meditation').value,
  social: $('stress-social').checked,
  thanks: $('stress-thanks').value.trim()
}; }
function score(record){
  const sleep = [sleepMins(record) >= 480, bedtimeGood(record), Number(record.sleepQuality) >= 4];
  const nutrition = [Number(record.nutritionBalance) >= 4, !!record.nutritionSupplement];
  const exercise = [clampMin(record.cardioMin) >= 10, clampMin(record.weightMin) >= 10, clampMin(record.stretchMin) >= 5];
  const stress = [clampMin(record.meditationMin) >= 5, !!record.social, !!(record.thanks || '').trim()];
  return { sleep, nutrition, exercise, stress, total: [...sleep, ...nutrition, ...exercise, ...stress].filter(Boolean).length, possible: 11 };
}
function setSelected(containerSelector, value){
  document.querySelectorAll(`${containerSelector} button`).forEach(btn => btn.classList.toggle('selected', btn.dataset.value === String(value)));
}
function syncForm(record={}){
  $('sleep-bedtime').value = record.sleepBedtime || '';
  $('sleep-waketime').value = record.sleepWaketime || '';
  $('nutrition-supplement').checked = !!record.nutritionSupplement;
  $('exercise-cardio').value = record.cardioMin || '';
  $('exercise-weight').value = record.weightMin || '';
  $('exercise-stretch').value = record.stretchMin || '';
  $('stress-meditation').value = record.meditationMin || '';
  $('stress-social').checked = !!record.social;
  $('stress-thanks').value = typeof record.thanks === 'string' ? record.thanks : (record.thanks ? 'Done' : '');
  state.selectedQuality = record.sleepQuality || '';
  state.selectedNutrition = record.nutritionBalance || '';
  setSelected('[data-quality="sleep-quality"]', state.selectedQuality);
  setSelected('[data-rating="nutrition-balance"]', state.selectedNutrition);
  updatePreview();
}
function updatePreview(){
  const record = recordFromForm();
  const s = score(record);
  $('sleep-length').textContent = sleepText(record);
  $('today-score').textContent = `${s.total}/${s.possible}`;
  $('today-percent').textContent = `${Math.round(s.total/s.possible*100)}%`;
  document.querySelector('.ring').style.background = `conic-gradient(var(--accent) ${s.total/s.possible*360}deg, #e7e4df 0deg)`;
  $('sleep-score').textContent = `${s.sleep.filter(Boolean).length}/3`;
  $('nutrition-score').textContent = `${s.nutrition.filter(Boolean).length}/2`;
  $('exercise-score').textContent = `${s.exercise.filter(Boolean).length}/3`;
  $('stress-score').textContent = `${s.stress.filter(Boolean).length}/3`;
  $('today-message').textContent = s.total === s.possible ? 'All set for today. Nice work.' : 'Save what is true today. Partial progress counts.';
}
function saveToday(evt){
  evt.preventDefault();
  const log = loadLog();
  const record = recordFromForm();
  const i = log.findIndex(x => x.date === record.date);
  if(i >= 0) log[i] = record; else log.unshift(record);
  saveLog(log);
  updatePreview();
  renderTrends();
}
function weekDatesThroughToday(){
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  const dates = [];
  for(const d = new Date(start); d <= now; d.setDate(d.getDate()+1)) dates.push(d.toLocaleDateString('en-CA'));
  return dates;
}
function renderTrends(){
  const log = loadLog();
  const map = Object.fromEntries(log.map(r => [r.date, r]));
  const days = Array.from({length:30}, (_,i)=>localDate(i-29));
  const areas = [
    {key:'sleep', icon:'🌙', label:'Sleep', max:3, parts:'Length, bedtime, quality'},
    {key:'nutrition', icon:'🥗', label:'Nutrition', max:2, parts:'Balance, supplement'},
    {key:'exercise', icon:'🏃', label:'Exercise', max:3, parts:'Cardio, strength, stretch'},
    {key:'stress', icon:'🧘', label:'Stress & recovery', max:3, parts:'Meditation, social, thanks/pray'}
  ];
  $('trend-grid').innerHTML = areas.map(area => {
    const vals = days.map(d => (score(map[d] || {})[area.key] || []).filter(Boolean).length);
    const bars = vals.map((v, i) => `<i title="${days[i]}: ${v}/${area.max}" aria-label="${days[i]} score ${v} out of ${area.max}" style="height:${Math.max(3, v/area.max*72)}px"></i>`).join('');
    const scale = Array.from({length: area.max + 1}, (_,i)=>area.max-i).map(n => `<span>${n}</span>`).join('');
    return `<article class="trend-card trend-plot"><div class="trend-title"><span class="emoji">${area.icon}</span><div><h3>${area.label}</h3><p class="muted">${area.parts}</p></div></div><p class="micro">Last 30 days</p><div class="plot-wrap"><div class="scale" aria-hidden="true">${scale}</div><div class="spark">${bars}</div></div></article>`;
  }).join('');
}
async function renderResources(){
  const fallback = [
    {category:'Sleep', title:'Bedtime matters, not just sleep length', summary:'A short note on why a steady bedtime can be as important as total sleep hours.', action_tip:'Tonight, choose a realistic bedtime cue and start winding down 30 minutes before it.', url:'posts/sleep-timing-matters.html'},
    {category:'Sleep', title:'Protect a consistent sleep window', summary:'A regular sleep schedule and enough time in bed make sleep patterns easier to stabilize.', action_tip:'Pick one realistic bedtime cue and protect your wake time for one week.', url:'https://www.cdc.gov/sleep/about/index.html'},
    {category:'Nutrition', title:'科学去黑头与一周护肤计划（水杨酸、A酸与屏障修护）', summary:'兼顾去黑头、细化毛孔与屏障修护的一周循环护肤法，含通用排期、操作细节、应急刹车与推荐单品。', action_tip:'谨记白天防晒、夜晚分天使用水杨酸与A酸，避免同一晚叠加，做好神经酰胺修护。', url:'posts/skincare-blackheads-routine.html'},
    {category:'Nutrition', title:'Build balanced plates', summary:'Protein, fiber-rich carbohydrates, fruits or vegetables, healthy fats, and hydration are a practical foundation.', action_tip:'At one meal today, add one protein source and one colorful plant food.', url:'https://www.myplate.gov/'},
    {category:'Exercise', title:'Use recovery-aware movement', summary:'A sustainable routine can mix cardio, strength, and mobility while adjusting to fatigue.', action_tip:'If energy is low, keep the habit with a shorter stretch, walk, or light strength set.', url:'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html'},
    {category:'Stress & recovery', title:'Make recovery small and repeatable', summary:'Short meditation, gratitude, prayer, and social connection can make recovery easier to practice.', action_tip:'Do a two-minute reset: breathe, stretch, pray, write one thanks, or message one supportive person.', url:'https://www.nimh.nih.gov/health/publications/so-stressed-out-fact-sheet'}
  ];
  let resources = fallback;
  try { const res = await fetch('resources/starter-resources.json?v=14', {cache:'no-store'}); resources = await res.json(); } catch {}
  const sections = [
    {category:'Sleep', icon:'🌙', summary:'Sleep length, schedule, and quality'},
    {category:'Nutrition', icon:'🥗', summary:'Balanced meals, supplements, and steady energy'},
    {category:'Exercise', icon:'🏃', summary:'Cardio, strength, stretching, and recovery'},
    {category:'Stress & recovery', icon:'🧘', summary:'Meditation, social connection, gratitude, and prayer'}
  ];
  $('resource-list').innerHTML = sections.map(section => {
    const posts = resources.filter(r => r.category === section.category || (section.category === 'Stress & recovery' && r.category === 'Stress'));
    const count = posts.length === 1 ? '1 post' : `${posts.length} posts`;
    const items = posts.map(r => {
      const href = r.url || r.post_url || r.source_url || '#';
      return `<article class="resource-post">
        <h4><a class="resource-title-link" href="${escapeHTML(href)}" target="_blank" rel="noreferrer">${escapeHTML(r.title)}</a></h4>
        ${r.last_reviewed ? `<p class="micro">Last reviewed: ${escapeHTML(r.last_reviewed)}</p>` : ''}
      </article>`;
    }).join('') || '<p class="muted empty-posts">Posts coming soon.</p>';
    return `<details class="resource-section"><summary><span class="emoji">${section.icon}</span><span><strong>${section.category}</strong><small>${section.summary}</small></span><span class="resource-count">${count}</span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="resource-post-list">${items}</div></details>`;
  }).join('');
  document.querySelectorAll('.resource-section').forEach(section => { section.open = false; });
}
function switchTab(tab){
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
  document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if(tab === 'trends') renderTrends();
  if(tab === 'resources') document.querySelectorAll('.resource-section').forEach(section => { section.open = false; });
}
function exportData(){
  const blob = new Blob([JSON.stringify({version:1, exportedAt:new Date().toISOString(), records:loadLog()}, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `health-checkin-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function importData(file){
  const reader = new FileReader();
  reader.onload = () => { try { const data = JSON.parse(reader.result); if(Array.isArray(data.records)) { saveLog(data.records); syncForm(data.records.find(r=>r.date===today()) || {}); renderTrends(); alert('Backup imported.'); } } catch { alert('Could not import this file.'); } };
  reader.readAsText(file);
}
function openFeedbackForm(evt){
  evt.preventDefault();
  const status = $('feedback-status');
  if(!FEEDBACK_FORM_URL) {
    status.textContent = 'Google Form is not connected yet. Add the private Google Form link before sharing the beta.';
    return;
  }
  window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
  status.textContent = 'Opening the feedback form in a new tab…';
}
function showToast(message){
  let toast = $('toast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.classList.remove('visible'); }, 2200);
}

async function shareApp(){
  const isLocal = !window.location.origin || window.location.origin === 'null' || window.location.origin.startsWith('file:');
  const shareUrl = isLocal
    ? 'https://health-tracker-app-beta.netlify.app/'
    : window.location.origin + window.location.pathname.replace(/\/posts\/.*$/, '/');
  const shareData = {
    title: 'Health Tracker',
    text: 'Health Tracker — track sleep, nutrition, exercise, and recovery in a few taps. Private, local-first, free.',
    url: shareUrl
  };
  if(navigator.share){
    try {
      await navigator.share(shareData);
      return;
    } catch(err){
      if(err.name === 'AbortError') return;
    }
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('App link copied to clipboard!');
      return;
    } catch(e){}
  }
  prompt('Copy this link to share Health Tracker:', shareUrl);
}

function bind(){
  document.querySelectorAll('.card-toggle').forEach(btn => btn.addEventListener('click', () => { const body = btn.parentElement.querySelector('.card-body'); body.classList.toggle('collapsed'); btn.setAttribute('aria-expanded', String(!body.classList.contains('collapsed'))); }));
  document.querySelectorAll('[data-quality="sleep-quality"] button').forEach(btn => btn.addEventListener('click', () => { state.selectedQuality = btn.dataset.value; setSelected('[data-quality="sleep-quality"]', state.selectedQuality); updatePreview(); }));
  document.querySelectorAll('[data-rating="nutrition-balance"] button').forEach(btn => btn.addEventListener('click', () => { state.selectedNutrition = btn.dataset.value; setSelected('[data-rating="nutrition-balance"]', state.selectedNutrition); updatePreview(); }));
  document.querySelectorAll('input, textarea').forEach(i => i.addEventListener('input', updatePreview));
  $('checkin-form').addEventListener('submit', saveToday);
  document.querySelectorAll('.bottom-nav button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('share-button')?.addEventListener('click', shareApp);
  $('share-settings-button')?.addEventListener('click', shareApp);
  $('delete-data')?.addEventListener('click', () => { if(confirm('Delete all check-in data on this device?')) { localStorage.removeItem(KEY); syncForm({}); renderTrends(); } });
  $('feedback-form')?.addEventListener('submit', openFeedbackForm);
  if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}
let deferredInstallPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; $('install-button').hidden = false; });
$('install-button').addEventListener('click', async () => { if(deferredInstallPrompt) deferredInstallPrompt.prompt(); });

bind();
const existing = loadLog().find(r => r.date === today());
syncForm(existing || {});
renderTrends();
renderResources();
