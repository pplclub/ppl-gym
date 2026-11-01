(()=>{'use strict';
const KEY='ppl-gym-v2', $=id=>document.getElementById(id);
const goals={cut:'Похудение',muscle:'Набор мышечной массы',strength:'Увеличение силы',endurance:'Выносливость',general:'Общая физическая форма'};
const plans={A:{name:'PUSH — грудь, плечи, трицепс',items:[['Жим штанги лёжа','3×6–10',3],['Жим гантелей на наклонной скамье','3×8–12',3],['Жим гантелей сидя','3×8–12',3],['Разведения гантелей в стороны','3×12–15',3],['Разгибание рук на блоке','3×10–15',3]]},B:{name:'PULL — спина, задняя дельта, бицепс',items:[['Тяга верхнего блока','3×8–12',3],['Горизонтальная тяга','3×8–12',3],['Тяга гантели одной рукой','2×10–12',2],['Face pull','3×12–15',3],['Сгибание рук с гантелями','3×10–12',3]]},C:{name:'LEGS — ноги и корпус',items:[['Приседания / жим ногами','3×8–12',3],['Румынская тяга','3×8–12',3],['Сгибание ног','3×10–15',3],['Разгибание ног','2×12–15',2],['Подъёмы на икры','3×12–20',3]]}};
const blank=()=>({version:2,profile:null,theme:'light',xp:0,events:[],measurements:[],workouts:[],activeWorkout:null});
let state=load(), plan='A', goal=null, timer;

function load(){
  try{
    let d=Object.assign(blank(),JSON.parse(localStorage.getItem(KEY)||'{}'));
    if(d.theme) document.documentElement.setAttribute('data-theme', d.theme);
    return d;
  }catch(e){return blank()}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),2200)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'''}[c]))}
function n(v){if(v==null||String(v).trim()==='')return null;let x=Number(v);return Number.isFinite(x)&&x>=0?x:null}
function date(v){return new Date(v).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'})}
function level(){return Math.floor(state.xp/500)+1}

// ПРОВЕРКА НАКРУТКИ XP
function canEarnXP(type) {
  let today = new Date().toISOString().slice(0,10);
  return !state.events.some(e => e.date && e.date.slice(0,10) === today && e.type === type);
}

function screen(id){
  document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id));
  document.querySelectorAll('nav [data-screen]').forEach(x=>x.classList.toggle('active',x.dataset.screen===id));
  if(id==='gym')renderPlan();
  if(id==='progress')renderProgress();
  if(id==='profile')renderProfile();
  scrollTo({top:0,behavior:'smooth'})
}

document.querySelectorAll('nav [data-screen],.text-button').forEach(b=>b.addEventListener('click',()=>screen(b.dataset.screen)));
$('avatar').onclick=()=>screen('profile');

// ОНБОРДИНГ
document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{
  goal=b.dataset.goal;
  document.querySelectorAll('[data-goal]').forEach(x=>x.classList.toggle('selected',x===b));
  $('next1').disabled=false;
});
$('next1').onclick=()=>step(1);
$('back2').onclick=()=>step(0);
$('next2').onclick=()=>step(2);
$('back3').onclick=()=>step(1);
function step(i){['step1','step2','step3'].forEach((id,j)=>$(id).classList.toggle('hidden',j!==i));$('stepIndicator').textContent=`ШАГ ${i+1} ИЗ 3`}
function onboarding(){ $('onboarding').classList.remove('hidden');step(0)}

$('createProfile').onclick=()=>{
  state=blank();
  state.profile={name:$('name').value.trim()||'Атлет',goal:goal||'general',experience:$('experience').value,frequency:Number($('frequency').value),height:n($('height').value)};
  let w=n($('initialWeight').value),waist=n($('initialWaist').value);
  if(w||waist)state.measurements.push({date:new Date().toISOString(),weight:w,waist});
  save();
  $('onboarding').classList.add('hidden');
  renderAll();
  toast('Профиль создан. Добро пожаловать!');
};

// КНОПКИ БЫСТРОГО ВВОДА (С ЗАЩИТОЙ)
document.querySelectorAll('[data-xp]').forEach(b=>b.onclick=()=>{
  let p=Number(b.dataset.xp);
  let type='quick_'+p;
  if(!canEarnXP(type)) return toast('Уже учтено сегодня');
  state.xp+=p;
  state.events.unshift({points:p,date:new Date().toISOString(),type});
  save();
  renderAll();


toast('+'+p+' XP добавлено');
});

document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{
  plan=b.dataset.plan;
  document.querySelectorAll('[data-plan]').forEach(x=>x.classList.toggle('sel',x===b));
  renderPlan();
});

// ОТРИСОВКА И СОХРАНЕНИЕ ПОДХОДОВ
function renderPlan(){
  let p=plans[plan];
  $('planMeta').textContent=p.name;
  
  if(!state.activeWorkout || state.activeWorkout.plan !== plan) {
      state.activeWorkout = { plan: plan, entries: p.items.map(item => ({ exercise: item[0], sets: Array.from({length: item[2]}, () => ({w:null, r:null, rir:null})) })) };
      save();
  }
  
  $('exercises').innerHTML=p.items.map((e,i)=>`
    <article class="exercise">
      <b>${esc(e[0])}</b><small>${e[1]}</small>
      <div class="set-labels"><span>№</span><span>Вес, кг</span><span>Повт.</span><span>RIR</span></div>
      ${Array.from({length:e[2]},(_,j)=>{
        let s = state.activeWorkout.entries[i].sets[j] || {w:'', r:'', rir:''};
        return `<div class="set-row">
          <span>${j+1}</span>
          <input type="number" inputmode="decimal" min="0" step=".5" placeholder="—" value="${s.w??''}" data-i="${i}" data-j="${j}" data-f="w" aria-label="Вес">
          <input type="number" inputmode="numeric" min="0" placeholder="—" value="${s.r??''}" data-i="${i}" data-j="${j}" data-f="r" aria-label="Повторения">
          <input type="number" inputmode="numeric" min="0" max="10" placeholder="—" value="${s.rir??''}" data-i="${i}" data-j="${j}" data-f="rir" aria-label="RIR">
        </div>`
      }).join('')}
    </article>`).join('');

  // МГНОВЕННОЕ СОХРАНЕНИЕ
  document.querySelectorAll('#exercises input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      let i = e.target.dataset.i, j = e.target.dataset.j, f = e.target.dataset.f;
      state.activeWorkout.entries[i].sets[j][f] = n(e.target.value);
      save();
    });
  });
}

// ЗАВЕРШЕНИЕ ТРЕНИРОВКИ
$('finish').onclick=()=>{
  let hasData = state.activeWorkout.entries.some(e => e.sets.some(s => s.w!==null || s.r!==null || s.rir!==null));
  if(!hasData) return toast('Заполни хотя бы один подход');
  
  state.workouts.unshift({plan, name:plans[plan].name, date:new Date().toISOString(), entries:state.activeWorkout.entries});
  let isCompletedToday = !canEarnXP('workout');
  
  if(isCompletedToday) {
    toast('Тренировка сохранена (XP за сегодня уже получен)');
  } else {
    state.xp+=50;
    state.events.unshift({points:50,date:new Date().toISOString(),type:'workout'});
    toast('Тренировка сохранена · +50 XP');
  }
  
  state.activeWorkout = null; 
  save();
  renderAll();
};

function latest(){return state.measurements[0]||{}}
function card(label,v,unit){return `<div>${label}<strong>${v==null?'—':String(v).replace('.',',')+(unit?' '+unit:'')}</strong></div>`}

function renderHome(){
  let p=state.profile, m=latest(), lvl=level(), progress=state.xp%500;
  $('level').textContent='LVL '+String(lvl).padStart(2,'0');
  $('xp').textContent=state.xp;
  $('bar').style.width=(progress/500*100)+'%';
  $('xpInfo').textContent=progress+' / 500 XP';
  $('greeting').innerHTML=`Привет, ${esc(p.name)}.<em>${esc(goals[p.goal])}.</em>`;
  
  let c=[];
  if(['cut','muscle','general'].includes(p.goal))c.push(card('Вес',m.weight,'кг'));
  if(['cut','general'].includes(p.goal))c.push(card('Талия',m.waist,'см'));
  if(p.goal==='muscle')c.push(card('Рост',p.height,'см'));
  if(p.goal==='strength')c.push(card('Тренировок',state.workouts.length,''));
  if(p.goal==='endurance')c.push(card('Кардио',state.events.filter(e=>e.type==='cardio').length,''));
  c.push(card('Тренировок',state.workouts.length,''));
  
  $('homeMetrics').innerHTML=c.join('');
  $('metricsTitle').textContent=p.goal==='strength'?'Силовой прогресс':p.goal==='endurance'?'Активность':'Твои показатели';
  
  let seq=['A','B','C'], last=state.workouts[0], next=last?seq[(seq.indexOf(last.plan)+1)%3]:'A';
  $('nextWorkout').innerHTML=`<div><b>${plans[next].name}</b><small>Следующая по очереди PPL</small></div><button id="openNext">Открыть</button>`;
  $('openNext').onclick=()=>{
    plan=next


;
    document.querySelectorAll('[data-plan]').forEach(x=>x.classList.toggle('sel',x.dataset.plan===plan));
    screen('gym');
  };
}

function renderProgress(){
  let p=state.profile;
  $('progressFields').innerHTML=`
    <label>Вес, кг<input id="winput" type="number" inputmode="decimal" step=".1" placeholder="Необязательно"></label>
    ${p.goal==='strength'?'':`<label>Талия, см<input id="tinput" type="number" inputmode="decimal" step=".5" placeholder="Необязательно"></label>`}
  `;
  $('history').innerHTML=state.measurements.length?state.measurements.slice(0,20).map(m=>`<div class="history-item">${date(m.date)} · ${m.weight!=null?m.weight+' кг':'вес —'} · ${m.waist!=null?'талия '+m.waist+' см':'талия —'}</div>`).join(''):'<div class="empty-state">Пока нет измерений. Добавь первый показатель, когда будешь готов.</div>';
  $('workoutHistory').innerHTML=state.workouts.length?state.workouts.slice(0,10).map(w=>`<div class="history-item"><b>${esc(w.name)}</b><small>${date(w.date)} · ${w.entries.length} упражнений</small></div>`).join(''):'<div class="empty-state">Здесь появятся сохранённые тренировки.</div>';
  
  $('saveMetrics').onclick=()=>{
    let weight=n($('winput').value), waist=$('tinput')?n($('tinput').value):null;
    if(weight===null&&waist===null)return toast('Введи хотя бы один показатель');
    state.measurements.unshift({date:new Date().toISOString(),weight,waist});
    save(); renderAll(); toast('Показатели сохранены');
  };
}

function streak(){
  let days=[...new Set(state.workouts.map(w=>w.date.slice(0,10)))].sort().reverse();
  if(!days.length)return 0;
  let d=new Date(); d.setHours(0,0,0,0); let count=0;
  for(let i=0;i<days.length;i++){
    let target=d.toISOString().slice(0,10);
    if(days[i]===target){count++;d.setDate(d.getDate()-1)}
    else if(i===0){d.setDate(d.getDate()-1); if(days[i]===d.toISOString().slice(0,10)){count++;d.setDate(d.getDate()-1)} else break}
    else break;
  }
  return count;
}

function renderProfile(){
  let p=state.profile;
  $('profileName').textContent=p.name;
  $('profileGoal').textContent=goals[p.goal];
  $('profileAvatar').textContent=p.name.slice(0,1).toUpperCase();
  $('profileXP').textContent=state.xp;
  $('profileLevel').textContent=level();
  $('profileWorkouts').textContent=state.workouts.length;
  $('profileStreak').textContent=streak();
  $('editName').value=p.name;
  $('editGoal').value=p.goal;
  $('editTheme').value=state.theme;
}

$('saveProfile').onclick=()=>{
  state.profile.name=$('editName').value.trim()||'Атлет';
  state.profile.goal=$('editGoal').value;
  state.theme=$('editTheme').value;
  document.documentElement.setAttribute('data-theme', state.theme);
  save(); renderAll(); toast('Настройки обновлены');
};

$('export').onclick=()=>{
  let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url; a.download='ppl-gym-backup-'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(url); toast('Резервная копия подготовлена');
};

$('import').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{
  let f=e.target.files[0]; if(!f)return;
  try{
    let d=JSON.parse(await f.text());
    if(!d.profile||!Array.isArray(d.workouts))throw Error();
    state=Object.assign(blank(),d); save();
    document.documentElement.setAttribute('data-theme', state.theme || 'light');
    renderAll(); toast('Копия восстановлена');
  }catch(_){toast('Ошибка чтения файла')}
  e.target.value='';
};

$('reset').onclick=()=>{
  if(!confirm('Удалить все данные? Сначала сделай экспорт!'))return;
  localStorage.removeItem(KEY); state=blank();
  document.documentElement.setAttribute('data-theme', 'light');
  onboarding();
};

function renderAll(){renderHome();renderPlan();renderProfile();renderProgress()}
if(!state.profile) onboarding();
else{ $('onboarding').classList.add('hidden'); renderAll() }
})();





