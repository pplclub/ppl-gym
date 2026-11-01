(() => {
  'use strict';

  const KEY = 'ppl-gym-v1';
  const $ = id => document.getElementById(id);

  const goals = { cut: 'Похудение', muscle: 'Набор массы', strength: 'Увеличение силы', endurance: 'Выносливость', general: 'Общая форма' };
  
  const plans = {
    A: { name: 'PUSH — грудь, плечи, трицепс', items: [['Жим штанги лёжа', '3×6–10', 3], ['Жим гантелей на наклонной скамье', '3×8–12', 3], ['Жим гантелей сидя', '3×8–12', 3], ['Разведения гантелей в стороны', '3×12–15', 3], ['Разгибание рук на блоке', '3×10–15', 3]] },
    B: { name: 'PULL — спина, задняя дельта, бицепс', items: [['Тяга верхнего блока', '3×8–12', 3], ['Горизонтальная тяга', '3×8–12', 3], ['Тяга гантели одной рукой', '2×10–12', 2], ['Face pull', '3×12–15', 3], ['Сгибание рук с гантелями', '3×10–12', 3]] },
    C: { name: 'LEGS — ноги и корпус', items: [['Приседания / жим ногами', '3×8–12', 3], ['Румынская тяга', '3×8–12', 3], ['Сгибание ног', '3×10–15', 3], ['Разгибание ног', '2×12–15', 2], ['Подъёмы на икры', '3×12–20', 3]] }
  };

  const blankState = () => ({ profile: null, theme: 'light', xp: 0, events: [], workouts: [], activeWorkout: null });
  
  let state = loadState();
  let currentPlan = 'A';
  let selectedGoal = null;
  let toastTimer;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign(blankState(), saved);
    } catch (e) {
      return blankState();
    }
  }

  function saveState() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function showToast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  function checkDailyXP(type) {
    const today = new Date().toISOString().slice(0, 10);
    return !state.events.some(e => e.date && e.date.slice(0, 10) === today && e.type === type);
  }

  function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.querySelectorAll('nav [data-screen]').forEach(b => b.classList.toggle('active', b.dataset.screen === id));
    if (id === 'gym') renderGym();
    if (id === 'profile') renderProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderApp() {
    if (!state.profile) {
      $('onboarding').classList.remove('hidden');
      return;
    }
    $('onboarding').classList.add('hidden');
    renderHome();
    renderProfile();
    if ($('gym').classList.contains('active')) renderGym();
  }

  // --- ONBOARDING ---
  document.querySelectorAll('[data-goal]').forEach(btn => {
    btn.onclick = () => {
      selectedGoal = btn.dataset.goal;
      document.querySelectorAll('[data-goal]').forEach(b => b.classList.toggle('selected', b === btn));
      $('next1').disabled = false;
    };
  });

  $('next1').onclick = () => {
    $('step1').classList.add('hidden');
    $('step2').classList.remove('hidden');
    $('stepIndicator').textContent = 'ШАГ 2 ИЗ 2';
  };

  $('back2').onclick = () => {
    $('step2').classList.add('hidden');
    $('step1').classList.remove('hidden');
    $('stepIndicator').textContent = 'ШАГ 1 ИЗ 2';
  };

  $('createProfile').onclick = () => {
    const name = $('name').value.trim() || 'Атлет';
    state.profile = { name, goal: selectedGoal || 'general' };
    saveState();
    renderApp();
    showToast('Профиль создан. Добро пожаловать!');
  };

  // --- HOME ---
  function renderHome() {
    if (!state.profile) return;
    const p = state.profile;
    const lvl = Math.floor(state.xp / 500) + 1;
    const progress = state.xp % 500;

    $('greeting').innerHTML = `Привет, ${p.name}.<em>${goals[p.goal]}.</em>`;
    $('level').textContent = 'LVL ' + String(lvl).padStart(2, '0');
    $('xp').textContent = state.xp;
    $('bar').style.width = (progress / 500 * 100) + '%';
    $('xpInfo').textContent = progress + ' / 500 XP';
    $('avatar').textContent = p.name.slice(0, 1).toUpperCase();

    const lastWorkout = state.workouts[0]


e() {
    if (!state.profile) return;
    const p = state.profile;
    $('profileName').textContent = p.name;
    $('profileGoal').textContent = goals[p.goal];
    $('profileAvatar').textContent = p.name.slice(0, 1).toUpperCase();
    $('profileXP').textContent = state.xp;
    $('profileLevel').textContent = Math.floor(state.xp / 500) + 1;
    $('profileWorkouts').textContent = state.workouts.length;
    $('editName').value = p.name;
    $('editGoal').value = p.goal;
    $('editTheme').value = state.theme;
    
    document.documentElement.setAttribute('data-theme', state.theme);
  }

  $('saveProfile').onclick = () => {
    state.profile.name = $('editName').value.trim() || 'Атлет';
    state.profile.goal = $('editGoal').value;
    state.theme = $('editTheme').value;
    saveState();
    renderApp();
    showToast('Настройки обновлены');
  };

  $('export').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppl-gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  $('reset').onclick = () => {
    if (!confirm('Удалить все данные? Сначала сделай экспорт!')) return;
    localStorage.removeItem(KEY);
    state = blankState();
    renderApp();
  };

  // --- INIT ---
  document.querySelectorAll('nav [data-screen], .text-button').forEach(btn => {
    btn.onclick = () => switchScreen(btn.dataset.screen);
  });
  
  $('avatar').onclick = () => switchScreen('profile');

  renderApp();
})();;


let nextPlan = 'A';
    if (lastWorkout) {
      const seq = ['A', 'B', 'C'];
      nextPlan = seq[(seq.indexOf(lastWorkout.plan) + 1) % 3];
    }

    $('nextWorkout').innerHTML = `
      <div>
        <b>${plans[nextPlan].name}</b>
        <small>Следующая по очереди PPL</small>
      </div>
      <button id="openNext">Открыть</button>
    `;

    $('openNext').onclick = () => {
      currentPlan = nextPlan;
      switchScreen('gym');
      updatePlanTabs();
    };
  }

  document.querySelectorAll('[data-xp]').forEach(btn => {
    btn.onclick = () => {
      const amount = Number(btn.dataset.xp);
      const type = 'quick_' + amount;
      if (!checkDailyXP(type)) return showToast('Уже учтено сегодня');
      
      state.xp += amount;
      state.events.unshift({ points: amount, date: new Date().toISOString(), type });
      saveState();
      renderHome();
      showToast(`+${amount} XP добавлено`);
    };
  });

  // --- GYM ---
  function updatePlanTabs() {
    document.querySelectorAll('[data-plan]').forEach(b => b.classList.toggle('sel', b.dataset.plan === currentPlan));
  }

  document.querySelectorAll('[data-plan]').forEach(btn => {
    btn.onclick = () => {
      currentPlan = btn.dataset.plan;
      updatePlanTabs();
      renderGym();
    };
  });

  function renderGym() {
    const plan = plans[currentPlan];
    $('planMeta').textContent = plan.name;

    if (!state.activeWorkout || state.activeWorkout.plan !== currentPlan) {
      state.activeWorkout = {
        plan: currentPlan,
        entries: plan.items.map(item => ({
          exercise: item[0],
          sets: Array.from({ length: item[2] }, () => ({ w: null, r: null, rir: null }))
        }))
      };
      saveState();
    }

    $('exercises').innerHTML = plan.items.map((ex, i) => `
      <article class="exercise">
        <b>${ex[0]}</b>
        <small>${ex[1]}</small>
        <div class="set-labels"><span>№</span><span>Вес</span><span>Повт</span><span>RIR</span></div>
        ${Array.from({ length: ex[2] }, (_, j) => {
          const set = state.activeWorkout.entries[i].sets[j] || { w: '', r: '', rir: '' };
          return `
            <div class="set-row">
              <span>${j + 1}</span>
              <input type="number" inputmode="decimal" step=".5" placeholder="—" value="${set.w ?? ''}" data-i="${i}" data-j="${j}" data-f="w">
              <input type="number" inputmode="numeric" placeholder="—" value="${set.r ?? ''}" data-i="${i}" data-j="${j}" data-f="r">
              <input type="number" inputmode="numeric" placeholder="—" value="${set.rir ?? ''}" data-i="${i}" data-j="${j}" data-f="rir">
            </div>
          `;
        }).join('')}
      </article>
    `).join('');

    // Мгновенное сохранение при вводе
    document.querySelectorAll('#exercises input').forEach(input => {
      input.addEventListener('input', (e) => {
        const i = e.target.dataset.i;
        const j = e.target.dataset.j;
        const field = e.target.dataset.f;
        const val = e.target.value === '' ? null : Number(e.target.value);
        state.activeWorkout.entries[i].sets[j][field] = val;
        saveState();
      });
    });
  }

  $('finish').onclick = () => {
    if (!state.activeWorkout) return;
    
    const hasData = state.activeWorkout.entries.some(e => 
      e.sets.some(s => s.w !== null || s.r !== null || s.rir !== null)
    );

    if (!hasData) return showToast('Заполни хотя бы один подход');

    state.workouts.unshift({
      plan: currentPlan,
      name: plans[currentPlan].name,
      date: new Date().toISOString(),
      entries: state.activeWorkout.entries
    });

    const canGainXP = checkDailyXP('workout');
    if (canGainXP) {
      state.xp += 50;
      state.events.unshift({ points: 50, date: new Date().toISOString(), type: 'workout' });
      showToast('Тренировка сохранена · +50 XP');
    } else {
      showToast('Тренировка сохранена (XP уже получен сегодня)');
    }

    state.activeWorkout = null;
    saveState();
    renderApp();
    switchScreen('home');
  };

  // --- PROFILE ---
  function renderProfil
