(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const screens = {
    start: $('#screenStart'),
    game: $('#screenGame'),
    result: $('#screenResult'),
  };

  function showScreen(name){
    Object.values(screens).forEach(s => s.classList.remove('screen--active'));
    screens[name].classList.add('screen--active');
    window.scrollTo({top:0, behavior:'smooth'});
  }

  // ---- tiny audio (beeps) ----
  const audio = {
    enabled: true,
    ctx: null,
    init(){
      if(this.ctx) return;
      try{ this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
    },
    beep(freq=440, dur=0.08, type='sine', vol=0.03){
      if(!this.enabled) return;
      this.init();
      if(!this.ctx) return;
      const ctx=this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    },
    ok(){ this.beep(660, 0.06, 'sine', 0.03); },
    warn(){ this.beep(360, 0.10, 'square', 0.03); },
    bad(){ this.beep(220, 0.12, 'sawtooth', 0.04); },
  };

  function vibrate(ms){
    const chk = $('#chkVibe');
    if(chk && chk.checked && navigator.vibrate) navigator.vibrate(ms);
  }

  // ---- Data: 5 scenes, 2~3 choices each ----
  // Notes:
  // - No visible status bar.
  // - "Safety" is NOT always choice #1 (we randomize order).
  // - Ending depends on accumulated hidden stats.
  const IMG = (name) => `assets/${name}`;

  const PROJECTS = {
    relocate: {
      title: "지장전주 이설",
      scenes: [
        {
          img: IMG('scene_complaint.svg'),
          line: "도로 통제로 민원 폭발. 통제선을 줄여달라고 압박한다.",
          choices: [
            { t: "통제선은 유지하고, 안내요원으로 통행을 유도한다.", s: "시간은 조금 더 걸림.", eff:{ control:+10, risk:-6, pressure:-4, prog:+8 } },
            { t: "통제선을 안쪽으로 당겨 통행을 살리고 바로 작업한다.", s: "민원은 줄지만 통제가 약해짐.", eff:{ control:-10, risk:+10, pressure:-6, prog:+14 } },
            { t: "작업은 잠깐 멈추고 민원 설명 후, 통제선 재정렬한다.", s: "민원은 진정되지만 공정이 느림.", eff:{ control:+6, risk:-4, pressure:-10, prog:+4 } },
          ]
        },
        {
          img: IMG('scene_car.svg'),
          line: "주차 차량이 안 빠져서 장비 자리를 못 잡는다.",
          choices: [
            { t: "재배치(우회 동선)로 안전한 자리 확보 후 진행한다.", s: "공정은 조금 느려짐.", eff:{ control:+8, risk:-6, pressure:+2, prog:+6 } },
            { t: "각도를 무리해서라도 장비를 세우고 진행한다.", s: "빨라 보이지만 불안정.", eff:{ control:-8, risk:+12, pressure:-2, prog:+14 } },
            { t: "작업 구간을 분할하고, 차량 설득을 병행한다.", s: "타협이지만 통제를 유지하기 쉬움.", eff:{ control:+4, risk:-2, pressure:-4, prog:+10 } },
          ]
        },
        {
          img: IMG('scene_refuse.svg'),
          line: "일용원이 감시 역할을 거부한다. 통제가 흔들린다.",
          choices: [
            { t: "역할을 재배치하고 감시자를 지정해 다시 시작한다.", s: "통제 회복.", eff:{ control:+12, risk:-6, pressure:+2, prog:+6 } },
            { t: "그냥 진행한다. 서로 '대충' 보면 된다.", s: "통제 붕괴 위험.", eff:{ control:-14, risk:+12, pressure:-2, prog:+12 } },
            { t: "인원 교체를 요청하고, 저위험 작업만 먼저 한다.", s: "느리지만 안전하게.", eff:{ control:+8, risk:-4, pressure:+4, prog:+6 } },
          ]
        },
        {
          img: IMG('scene_hazard.svg'),
          line: "이설 중 근접 구간. 임시지지/차폐에 시간이 걸린다.",
          choices: [
            { t: "임시지지·차폐를 기준대로 하고 단계 작업한다.", s: "시간↑ 하지만 리스크↓", eff:{ control:+10, risk:-10, pressure:+4, prog:+8 } },
            { t: "핵심 지점만 보강하고 나머지는 경험으로 진행한다.", s: "겉보기엔 합리적.", eff:{ control:+2, risk:+4, pressure:-2, prog:+12 } },
            { t: "차폐는 생략하고 조심해서 한 번에 끝낸다.", s: "빠르지만 위험.", eff:{ control:-10, risk:+14, pressure:-6, prog:+16 } },
          ]
        },
        {
          img: IMG('scene_wrapup.svg'),
          line: "마무리 단계. 정리·점검·민원 종료 안내가 남았다.",
          choices: [
            { t: "정리정돈+최종점검 후, 민원 안내까지 하고 철수한다.", s: "완료 품질↑", eff:{ control:+10, risk:-8, pressure:-6, prog:+14 } },
            { t: "핵심만 점검하고 빨리 철수한다.", s: "무난하지만 빈틈.", eff:{ control:+2, risk:+2, pressure:-2, prog:+16 } },
            { t: "바로 철수한다. 민원은 나중에 대응한다.", s: "빠르지만 뒷탈.", eff:{ control:-8, risk:+8, pressure:+6, prog:+18 } },
          ]
        },
      ]
    },

    new: {
      title: "신규공사",
      scenes: [
        {
          img: IMG('scene_complaint.svg'),
          line: "소음·통제로 민원이 크게 올라왔다. 빨리 끝내라 한다.",
          choices: [
            { t: "안내요원을 세우고 통제를 유지한다.", s: "느리지만 안전.", eff:{ control:+10, risk:-6, pressure:-6, prog:+8 } },
            { t: "통제선을 줄여 민원을 잠재우고 작업을 강행한다.", s: "통제 약화.", eff:{ control:-10, risk:+10, pressure:-8, prog:+14 } },
          ]
        },
        {
          img: IMG('scene_car.svg'),
          line: "장비 동선이 막혔다. 우회하면 시간이 늦어진다.",
          choices: [
            { t: "우회 동선으로 안전 확보 후 진행한다.", s: "안정적.", eff:{ control:+8, risk:-6, pressure:+2, prog:+6 } },
            { t: "좁은 공간에 무리해서 장비를 세운다.", s: "불안정.", eff:{ control:-8, risk:+12, pressure:-2, prog:+14 } },
            { t: "작업 분할로 공정을 이어간다.", s: "현장 타협.", eff:{ control:+4, risk:-2, pressure:-4, prog:+10 } },
          ]
        },
        {
          img: IMG('scene_refuse.svg'),
          line: "신입이 기준을 몰라 불안해한다. TBM을 짧게 하자는 분위기.",
          choices: [
            { t: "핵심 기준(근접·추락·차폐)을 다시 공유하고 역할을 정한다.", s: "통제↑", eff:{ control:+12, risk:-6, pressure:+2, prog:+6 } },
            { t: "서명만 받고 바로 투입한다.", s: "빠르지만 위험.", eff:{ control:-14, risk:+12, pressure:-2, prog:+12 } },
          ]
        },
        {
          img: IMG('scene_hazard.svg'),
          line: "근접 작업 구간. 차폐 설치하면 지연된다.",
          choices: [
            { t: "차폐/절연 확인 후 진행한다.", s: "원칙.", eff:{ control:+10, risk:-10, pressure:+4, prog:+8 } },
            { t: "부분 차폐로 시간과 안전을 절충한다.", s: "읽어봐야 판단.", eff:{ control:+2, risk:+4, pressure:-2, prog:+12 } },
            { t: "차폐는 생략하고 조심해서 한다.", s: "위험.", eff:{ control:-10, risk:+14, pressure:-6, prog:+16 } },
          ]
        },
        {
          img: IMG('scene_wrapup.svg'),
          line: "끝날 때가 가장 위험하다. 정리·점검을 할까?",
          choices: [
            { t: "정리정돈+최종점검 후 종료한다.", s: "뒷탈 방지.", eff:{ control:+10, risk:-8, pressure:-6, prog:+14 } },
            { t: "핵심만 점검하고 종료한다.", s: "무난.", eff:{ control:+2, risk:+2, pressure:-2, prog:+16 } },
            { t: "바로 철수한다.", s: "뒷탈 위험.", eff:{ control:-8, risk:+8, pressure:+6, prog:+18 } },
          ]
        },
      ]
    },

    transformer: {
      title: "노후 변압기 교체",
      scenes: [
        {
          img: IMG('scene_complaint.svg'),
          line: "정전 민원이 거세다. 무정전으로 하자는 압박도 있다.",
          choices: [
            { t: "정전 최소 시간으로 계획하고 사전 안내 후 진행한다.", s: "민원은 늘지만 안전.", eff:{ control:+10, risk:-6, pressure:+4, prog:+8 } },
            { t: "부분 정전으로 쪼개서 진행한다.", s: "절충.", eff:{ control:+4, risk:+2, pressure:+2, prog:+12 } },
            { t: "무정전으로 절차를 줄여 진행한다.", s: "빠르지만 위험↑", eff:{ control:-10, risk:+12, pressure:-6, prog:+14 } },
          ]
        },
        {
          img: IMG('scene_refuse.svg'),
          line: "방전/접지 절차를 생략하자는 분위기. 시간이 부족하다.",
          choices: [
            { t: "체크리스트로 방전/접지 절차를 확인하고 시작한다.", s: "통제↑", eff:{ control:+12, risk:-8, pressure:+2, prog:+6 } },
            { t: "서류만 처리하고 바로 진행한다.", s: "빠르지만 빈틈.", eff:{ control:-12, risk:+10, pressure:-2, prog:+12 } },
          ]
        },
        {
          img: IMG('scene_lift.svg'),
          line: "인양 작업. 신호수/통제 범위를 줄이면 빨라진다.",
          choices: [
            { t: "신호수 배치 + 통제 확보 후 인양한다.", s: "안전.", eff:{ control:+10, risk:-10, pressure:+2, prog:+8 } },
            { t: "통제 범위를 줄이고 빠르게 인양한다.", s: "속도↑ 위험↑", eff:{ control:-8, risk:+12, pressure:-2, prog:+14 } },
            { t: "인양은 안전하게, 통제는 최소로 한다.", s: "절충.", eff:{ control:+2, risk:+4, pressure:-2, prog:+12 } },
          ]
        },
        {
          img: IMG('scene_hazard.svg'),
          line: "투입 직전. ‘한 번에 투입’하면 민원은 줄지만 계통이 불안하다.",
          choices: [
            { t: "단계 투입 + 확인 절차 후 진행한다.", s: "안정성↑", eff:{ control:+10, risk:-8, pressure:+2, prog:+10 } },
            { t: "한 번에 투입한다.", s: "빠르지만 위험.", eff:{ control:-10, risk:+14, pressure:-6, prog:+14 } },
          ]
        },
        {
          img: IMG('scene_wrapup.svg'),
          line: "끝. 민원 안내/정리/인수인계를 남겼다.",
          choices: [
            { t: "민원 안내 + 정리정돈 + 기록까지 마무리한다.", s: "완료 품질↑", eff:{ control:+10, risk:-8, pressure:-6, prog:+14 } },
            { t: "기록은 최소로 하고 종료한다.", s: "뒷탈 가능.", eff:{ control:-6, risk:+6, pressure:+4, prog:+18 } },
          ]
        },
      ]
    },

    switch: {
      title: "불량 개폐기 교체",
      scenes: [
        {
          img: IMG('scene_complaint.svg'),
          line: "정전 민원이 심하다. 무정전 강행 유혹이 커진다.",
          choices: [
            { t: "정전 최소 시간으로 계획하고 사전 안내한다.", s: "민원↑ 안전↑", eff:{ control:+10, risk:-6, pressure:+4, prog:+8 } },
            { t: "무정전으로 절차를 줄여 진행한다.", s: "빠르지만 위험↑", eff:{ control:-10, risk:+12, pressure:-6, prog:+14 } },
            { t: "부분 정전으로 단계 작업한다.", s: "절충.", eff:{ control:+4, risk:+2, pressure:+2, prog:+12 } },
          ]
        },
        {
          img: IMG('scene_refuse.svg'),
          line: "작업자들이 피로/수당으로 불만. 통제가 흔들린다.",
          choices: [
            { t: "조건을 조율하고 역할을 다시 정해 통제를 회복한다.", s: "느리지만 안정.", eff:{ control:+12, risk:-6, pressure:+2, prog:+6 } },
            { t: "그냥 밀어붙인다.", s: "통제 붕괴 위험.", eff:{ control:-14, risk:+12, pressure:-2, prog:+12 } },
          ]
        },
        {
          img: IMG('scene_arc.svg'),
          line: "아크 위험. 차폐·거리·절차를 지키면 시간이 늘어난다.",
          choices: [
            { t: "차폐/보호구/거리 통제를 하고 진행한다.", s: "원칙.", eff:{ control:+10, risk:-10, pressure:+2, prog:+8 } },
            { t: "부분 통제로 빠르게 교체한다.", s: "겉보기 합리적.", eff:{ control:+2, risk:+4, pressure:-2, prog:+12 } },
            { t: "주의만 주고 바로 교체한다.", s: "위험.", eff:{ control:-10, risk:+14, pressure:-6, prog:+16 } },
          ]
        },
        {
          img: IMG('scene_hazard.svg'),
          line: "투입 직전. 단계 확인 vs 한 번에 투입.",
          choices: [
            { t: "단계 투입 + 확인 절차를 한다.", s: "안정성↑", eff:{ control:+10, risk:-8, pressure:+2, prog:+10 } },
            { t: "한 번에 투입한다.", s: "빠르지만 위험.", eff:{ control:-10, risk:+14, pressure:-6, prog:+14 } },
          ]
        },
        {
          img: IMG('scene_wrapup.svg'),
          line: "마무리. 민원 안내와 기록을 남길까?",
          choices: [
            { t: "안내+정리+기록까지 하고 종료한다.", s: "재발 방지.", eff:{ control:+10, risk:-8, pressure:-6, prog:+14 } },
            { t: "빨리 철수한다.", s: "뒷탈 위험.", eff:{ control:-8, risk:+8, pressure:+6, prog:+18 } },
          ]
        },
      ]
    }
  };

  // ---- Hidden state ----
  const st = {
    type: null,
    idx: 0,
    // hidden meters (0..100-ish)
    control: 55,
    risk: 35,
    pressure: 45,
    prog: 0,
    // used for deterministic ending
    safeCount: 0,
  };

  function clamp(n, a=0, b=100){ return Math.max(a, Math.min(b, n)); }

  function reset(type){
    st.type = type;
    st.idx = 0;
    st.control = 55;
    st.risk = 35;
    st.pressure = 45;
    st.prog = 0;
    st.safeCount = 0;
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function setDots(total, idx){
    const el = $('#sceneDots');
    el.innerHTML = '';
    for(let i=0;i<total;i++){
      const d = document.createElement('div');
      d.className = 'dot ' + (i < idx ? 'dot--done' : i===idx ? 'dot--on' : '');
      el.appendChild(d);
    }
  }

  function toast(msg, kind='info'){
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    el.style.borderColor = kind==='bad' ? 'rgba(239,68,68,.35)' : kind==='warn' ? 'rgba(245,158,11,.35)' : 'rgba(56,189,248,.30)';
    el.style.background = 'rgba(15,23,42,.92)';
    setTimeout(() => el.classList.add('hidden'), 1050);
  }

  function render(){
    const p = PROJECTS[st.type];
    const scene = p.scenes[st.idx];

    $('#projTitle').textContent = `배전가공 · ${p.title}`;
    setDots(p.scenes.length, st.idx);

    $('#sceneImg').src = scene.img;
    $('#sceneLine').textContent = scene.line;

    // Randomize choice order each scene (so "safe" isn't always #1)
    const choices = shuffle(scene.choices).map(c => ({
      ...c,
      // tag safe-ish for internal use (not shown)
      _isSafe: (c.eff.risk||0) <= -6 || (c.eff.control||0) >= 10
    }));

    const box = $('#choices');
    box.innerHTML = '';
    choices.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<div class="choice__t">${escapeHtml(c.t)}</div><div class="choice__s">${escapeHtml(c.s||'')}</div>`;
      b.addEventListener('click', () => pickChoice(c));
      box.appendChild(b);
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function pickChoice(choice){
    // apply effects
    const e = choice.eff || {};
    st.control = clamp(st.control + (e.control||0));
    st.risk = clamp(st.risk + (e.risk||0));
    st.pressure = clamp(st.pressure + (e.pressure||0));
    st.prog = clamp(st.prog + (e.prog||0));

    if(choice._isSafe) st.safeCount += 1;

    // feedback (minimal)
    const delta = (e.risk||0) + (e.control||0)*(-0.5) + (e.pressure||0)*0.2;
    if(delta <= -6){
      toast("✅ 통제 유지. 리스크가 내려갔다.", "info");
      audio.ok(); vibrate(30);
    } else if(delta <= 4){
      toast("⚠ 무난한 타협. 다음 선택이 중요.", "warn");
      audio.warn(); vibrate(20);
    } else {
      toast("🚨 통제 약화. 위험이 쌓인다.", "bad");
      audio.bad(); vibrate(60);
    }

    // next
    const p = PROJECTS[st.type];
    st.idx += 1;
    if(st.idx >= p.scenes.length){
      finish();
      return;
    }
    setTimeout(render, 250);
  }

  // Deterministic-ish ending:
  // - Safe choices lead to happy ending.
  // - Mixed leads to "barely safe" or minor incident.
  // - Risk-heavy leads to accident.
  function finish(){
    const total = PROJECTS[st.type].scenes.length;

    // final score
    // lower risk, lower pressure, higher control is better
    const score = Math.round((st.control*1.2) - (st.risk*1.4) - (st.pressure*0.6) + (st.prog*0.4));

    // classify
    let ending = 'happy';
    if(st.safeCount >= 4 && st.risk <= 45 && st.control >= 60){
      ending = 'happy';
    } else if(st.safeCount >= 3 && st.risk <= 55){
      ending = 'ok';
    } else if(st.risk <= 70){
      ending = 'minor';
    } else {
      ending = 'fatal';
    }

    // show result
    renderResult(ending, score);
    showScreen('result');
  }

  function renderResult(ending, score){
    const badge = $('#resultBadge');
    const img = $('#resultImg');
    const msg = $('#resultMsg');

    // praise/encourage text by ending
    const lines = [];
    if(ending === 'happy'){
      badge.textContent = "🏆 해피엔딩";
      img.src = IMG('ending_happy.svg');
      lines.push("칭찬합니다! 압박 속에서도 기준을 지켰습니다.");
      lines.push("현장은 ‘운’이 아니라 ‘통제’로 살아납니다.");
      lines.push(`(점수: ${score})`);
    } else if(ending === 'ok'){
      badge.textContent = "✅ 무사고(아슬아슬)";
      img.src = IMG('ending_ok.svg');
      lines.push("무사고로 마무리했습니다. 하지만 몇 번의 타협이 보였습니다.");
      lines.push("다음 현장은 ‘한 번 더 확인’이 승부입니다. 분발하세요!");
      lines.push(`(점수: ${score})`);
    } else if(ending === 'minor'){
      badge.textContent = "⚠ 일반재해";
      img.src = IMG('ending_minor.svg');
      lines.push("작은 생략이 사고로 이어졌습니다.");
      lines.push("통제(역할 지정/차폐/정리)를 한 단계만 더 올리면 바뀝니다. 다시 도전!");
      lines.push(`(점수: ${score})`);
    } else {
      badge.textContent = "🚨 사고 발생";
      img.src = IMG('ending_fatal.svg');
      lines.push("압박 속의 타협이 결국 사고로 이어졌습니다.");
      lines.push("다음 판에서는 ‘절차를 지키는 선택’을 끝까지 유지해 보세요. 반드시 해피엔딩 가능합니다.");
      lines.push(`(점수: ${score})`);
    }
    msg.innerHTML = `<div>${lines.map(l => escapeHtml(l)).join('<br/>')}</div>`;
  }

  function start(type){
    reset(type);

    // apply toggles
    audio.enabled = $('#chkSound') ? $('#chkSound').checked : true;

    showScreen('game');
    render();
  }

  // ---- Buttons wiring ----
  document.querySelectorAll('[data-start]').forEach(btn => {
    btn.addEventListener('click', () => start(btn.getAttribute('data-start')));
  });

  $('#btnHome').addEventListener('click', () => showScreen('start'));
  $('#btnRestart').addEventListener('click', () => start(st.type || 'relocate'));
  $('#btnAgain').addEventListener('click', () => start(st.type || 'relocate'));
  $('#btnBack').addEventListener('click', () => showScreen('start'));

  // URL auto start: index.html?type=relocate
  const params = new URLSearchParams(window.location.search);
  const t = params.get('type');
  if(t && PROJECTS[t]){
    // small delay to ensure DOM ready
    setTimeout(() => start(t), 80);
  }
})();