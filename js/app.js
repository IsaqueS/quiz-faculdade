/* Aplicativo genérico: matérias, trilha de lições, motor de perguntas, consulta,
   oficina (só para matérias com workshop: true), revisão e perfil.
   O conteúdo vem de conteudos/*.js via QUIZ.addCourse — veja COMO-ADICIONAR-CONTEUDO.md. */
(function () {
  const COURSES = QUIZ.courses;
  const TASKS = (window.WORKSHOP && WORKSHOP.TASKS) || [];
  const KEY = 'erquiz.v1';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = (s) => String(s).trim().toLowerCase();
  const plain = (s) => String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // ------------------------------------------------------------------ estado salvo
  const defaults = () => ({
    xp: 0, streak: 0, lastDay: null, daily: { day: null, xp: 0 }, goal: 30, course: null,
    done: {}, missed: {}, tasks: {}, diagrams: {}, projects: [], answered: 0, correct: 0,
    settings: { sound: true, unlockAll: false, infinite: false, theme: 'auto' },
  });
  let st = load();
  // progresso antigo (só Modelo ER) usava ids sem prefixo de matéria
  function migrate(s) {
    ['done', 'missed'].forEach((k) => {
      const o = s[k];
      if (!o) return;
      Object.keys(o).forEach((id) => { if (!id.includes('/')) { o['bd/' + id] = o[id]; delete o[id]; } });
    });
    return s;
  }
  function load() {
    try {
      const s = migrate(JSON.parse(localStorage.getItem(KEY) || 'null') || {});
      const d = defaults();
      return Object.assign(d, s, { settings: Object.assign(d.settings, s.settings || {}) });
    } catch (e) { return defaults(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast('Não foi possível salvar o progresso neste navegador.'); }
  }
  const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function addXp(n) {
    const t = day();
    const y = day(new Date(Date.now() - 864e5));
    if (st.lastDay !== t) st.streak = st.lastDay === y ? st.streak + 1 : 1;
    st.lastDay = t;
    if (st.daily.day !== t) st.daily = { day: t, xp: 0 };
    st.daily.xp += n;
    st.xp += n;
    save();
  }
  function streakNow() {
    const t = day(), y = day(new Date(Date.now() - 864e5));
    return st.lastDay === t || st.lastDay === y ? st.streak : 0;
  }
  const dailyXp = () => (st.daily.day === day() ? st.daily.xp : 0);

  // ------------------------------------------------------------------ índices (todas as matérias)
  // ids: "<matéria>/<unidade>-l<n>" para lições e "...-q<n>" para perguntas (pela posição)
  const QINDEX = {};
  const LESSON_BY_ID = {};
  COURSES.forEach((c) => {
    c._lessons = [];
    c.color = c.color || '#58cc02';
    c.units.forEach((u, ui) => {
      if (!u.id) u.id = 'u' + (ui + 1);
      if (!u.color) u.color = c.color;
      (u.lessons || []).forEach((l, li) => {
        l.id = `${c.id}/${u.id}-l${li + 1}`;
        const entry = { course: c, unit: u, ui, li, lesson: l };
        c._lessons.push(entry);
        LESSON_BY_ID[l.id] = entry;
        (l.qs || (l.qs = [])).forEach((q, qi) => {
          q.id = `${l.id}-q${qi + 1}`;
          QINDEX[q.id] = { q, unit: u, lesson: l, course: c };
        });
      });
    });
    c._main = c._lessons.filter((x) => !x.unit.extra);
    c._nq = c._lessons.reduce((n, e) => n + e.lesson.qs.length, 0);
  });

  // matéria atual
  let C = null;
  function setCourse(id) {
    C = COURSES.find((c) => c.id === id) || COURSES[0] || null;
    if (C && st.course !== C.id) { st.course = C.id; save(); }
  }
  // link direto para uma matéria: index.html?materia=so
  const URL_COURSE = new URLSearchParams(location.search).get('materia');
  const FIRST_VISIT = !st.course && !URL_COURSE;
  setCourse(URL_COURSE && COURSES.some((c) => c.id === URL_COURSE) ? URL_COURSE : st.course);
  const UNITS_ = () => (C ? C.units : []);
  const LESSONS_ = () => (C ? C._lessons : []);
  const MAIN_ = () => (C ? C._main : []);
  const missedHere = () => Object.keys(st.missed).filter((k) => QINDEX[k] && QINDEX[k].course === C);

  function unlocked(entry) {
    if (st.settings.unlockAll || entry.unit.extra) return true;
    const main = entry.course._main;
    const i = main.indexOf(entry);
    return i <= 0 || !!st.done[main[i - 1].lesson.id];
  }

  // perguntas geradas: { gen: () => ({ t, q, ... }) } — cada vez sai uma versão nova
  function materialize(q) {
    if (typeof q.gen !== 'function') return q;
    try { return Object.assign({ tag: q.tag }, q.gen(), { id: q.id }); } catch (e) { console.error('Erro em gen()', q.id, e); return null; }
  }

  // ------------------------------------------------------------------ som
  let actx = null;
  function beep(kind) {
    if (!st.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = { ok: [[660, 0], [990, 0.09]], bad: [[200, 0], [150, 0.12]], win: [[523, 0], [659, 0.1], [784, 0.2], [1046, 0.3]] }[kind];
      seq.forEach(([f, t]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = kind === 'bad' ? 'sawtooth' : 'sine';
        o.frequency.value = f;
        const t0 = actx.currentTime + t;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.05 : 0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g).connect(actx.destination);
        o.start(t0); o.stop(t0 + 0.2);
      });
    } catch (e) { /* sem áudio */ }
  }

  // ------------------------------------------------------------------ utilidades de UI
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function modal(html, cls) {
    const m = $('#modal');
    m.innerHTML = `<div class="modal-back" data-close></div><div class="modal-card ${cls || ''}" role="dialog" aria-modal="true"><button class="modal-x" data-close aria-label="Fechar">✕</button>${html}</div>`;
    m.hidden = false;
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
    return m.querySelector('.modal-card');
  }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

  function applyTheme() {
    const t = st.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  const MASCOT = '<svg class="mascot" viewBox="0 0 80 80" aria-hidden="true"><path d="M40 6 L74 40 L40 74 L6 40Z" fill="#58cc02" stroke="#46a302" stroke-width="4" stroke-linejoin="round"/><circle cx="30" cy="36" r="7" fill="#fff"/><circle cx="50" cy="36" r="7" fill="#fff"/><circle cx="32" cy="37" r="3.4" fill="#222"/><circle cx="52" cy="37" r="3.4" fill="#222"/><path d="M31 50 Q40 58 49 50" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';

  // ------------------------------------------------------------------ navegação
  const TABS = { materias: renderCourses, trilha: renderPath, consulta: renderRef, oficina: renderWorkshop, revisar: renderReview, perfil: renderProfile };
  function navItems() {
    const it = [['materias', '📚', 'Matérias'], ['trilha', '🏠', 'Trilha']];
    if (C && C.reference) it.push(['consulta', C.reference.icon || '📖', C.reference.nav || 'Consulta']);
    if (C && C.workshop && TASKS.length) it.push(['oficina', '✏️', 'Oficina']);
    it.push(['revisar', '↺', 'Revisar'], ['perfil', '👤', 'Perfil']);
    return it;
  }
  function tabOk(tab) {
    if (!TABS[tab]) return false;
    if (!C) return tab === 'materias' || tab === 'perfil';
    if (tab === 'consulta') return !!C.reference;
    if (tab === 'oficina') return !!(C.workshop && TASKS.length);
    return true;
  }
  function renderNav(tab) {
    $('#navItems').innerHTML = navItems().map(([t, i, l]) => `<button class="nav-item ${t === tab ? 'on' : ''}" data-tab="${t}"><span class="ni">${i}</span><span>${esc(l)}</span></button>`).join('');
    $('#courseChip').innerHTML = C ? `<button class="course-chip" data-tab="materias" title="Trocar de matéria" style="--uc:${C.color}"><span class="cc-ic">${C.icon || '📘'}</span><span class="cc-name">${esc(C.short || C.title)}</span><span class="cc-sw">trocar</span></button>` : '';
  }
  function go(tab) {
    if (!tabOk(tab)) tab = C ? 'trilha' : 'materias';
    renderNav(tab);
    $('#shell').hidden = false;
    $('#lessonView').hidden = true;
    $('#editorView').hidden = true;
    if (window.Editor) Editor.unmount();
    TABS[tab]();
    renderStats();
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
    $('#view').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function renderStats() {
    const s = streakNow(), d = dailyXp();
    const pct = Math.min(100, Math.round((d / st.goal) * 100));
    const missed = missedHere().length;
    const html = `
      <div class="stat-row"><span class="st fire" title="Ofensiva (dias seguidos)">🔥 ${s}</span><span class="st xp" title="XP total">⚡ ${st.xp}</span></div>
      <div class="panel goal"><h4>Meta diária</h4><div class="gbar"><div style="width:${pct}%"></div></div><div class="small muted">${d} / ${st.goal} XP hoje</div></div>
      ${missed ? `<div class="panel"><h4>Para revisar</h4><p class="small">Você tem <b>${missed}</b> pergunta(s) que errou em ${esc(C.short || C.title)}.</p><button class="btn small" data-go="revisar">Treinar erros</button></div>` : ''}
      ${C && C.reference ? `<div class="panel"><h4>${esc(C.reference.title)}</h4><p class="small">${esc(C.reference.panel || 'Consulta rápida do conteúdo para ter sempre à mão.')}</p><button class="btn small" data-go="consulta">Abrir ${esc(C.reference.nav || 'Consulta')}</button></div>` : ''}
      ${C && C.workshop && TASKS.length ? '<div class="panel"><h4>Oficina de diagramas</h4><p class="small">Desenhe diagramas ER com correção automática e monte o do seu trabalho.</p><button class="btn small" data-go="oficina">Abrir Oficina</button></div>' : ''}`;
    $('#stats').innerHTML = html;
    $('#mstats').innerHTML = `${C ? `<button class="st course-mini" data-tab="materias">${C.icon || '📘'} ${esc(C.short || C.title)}</button>` : ''}<span class="st fire">🔥 ${s}</span><span class="st xp">⚡ ${st.xp}</span><span class="st goal-mini">${d}/${st.goal}</span>`;
  }

  // ------------------------------------------------------------------ matérias
  function renderCourses() {
    const cards = COURSES.map((c) => {
      const tot = c._main.length, done = c._main.filter((e) => st.done[e.lesson.id]).length;
      const pct = tot ? Math.round((done / tot) * 100) : 0;
      return `<button class="ccard ${c === C ? 'on' : ''}" data-course="${esc(c.id)}" style="--uc:${c.color}">
        <div class="cc-big">${c.icon || '📘'}</div>
        <div class="cc-body">
          <div class="tc-top"><span class="tc-title">${esc(c.title)}</span>${c === C ? '<span class="badge ok">atual</span>' : ''}</div>
          <div class="tc-text">${esc(c.subtitle || '')}</div>
          <div class="gbar"><div style="width:${pct}%"></div></div>
          <div class="tc-foot">${done}/${tot} lições · ${c.units.length} unidades · ${c._nq} perguntas</div>
        </div>
      </button>`;
    }).join('');
    $('#view').innerHTML = `
      <div class="hero small-hero">${MASCOT}<div><h1>Matérias</h1><p class="muted">Escolha o que estudar. Cada matéria tem sua trilha, guias, consulta e revisão; XP e ofensiva são somados.</p></div></div>
      <div class="course-grid">${cards || '<p class="muted">Nenhuma matéria carregada. Veja COMO-ADICIONAR-CONTEUDO.md.</p>'}
        <button class="ccard add" data-act="add-course"><div class="cc-big">＋</div><div class="cc-body"><div class="tc-title">Adicionar matéria</div><div class="tc-text">Copie o prompt pronto e peça para qualquer IA gerar o arquivo da nova matéria.</div></div></button>
      </div>`;
  }

  function showAddCourse() {
    const prompt = window.QUIZ_PROMPT || '';
    const card = modal(`<h2>Adicionar matéria com IA</h2>
      <ol class="howto">
        <li>Clique em <b>Copiar prompt</b> e cole numa IA (ChatGPT, Claude, Gemini…).</li>
        <li>No fim do prompt, descreva a matéria e cole/anexe o material (slides, provas, resumo).</li>
        <li>A IA devolve um arquivo <code>.js</code>. Salve em <code>conteudos/</code> (ex.: <code>conteudos/calculo.js</code>).</li>
        <li>No <code>index.html</code>, adicione a linha <code>&lt;script src="conteudos/calculo.js"&gt;&lt;/script&gt;</code> no bloco de conteúdos.</li>
        <li>Recarregue a página. Se a IA tiver acesso ao projeto (Claude Code, Cursor…), basta pedir: <i>“siga o COMO-ADICIONAR-CONTEUDO.md e crie a matéria X”</i>.</li>
      </ol>
      <textarea class="prompt-box" readonly>${esc(prompt)}</textarea>
      <div class="btns"><button class="btn primary" data-act="copy-prompt">Copiar prompt</button><button class="btn ghost" data-close>Fechar</button></div>`, 'wide');
    $('[data-act="copy-prompt"]', card).addEventListener('click', () => {
      const ta = $('.prompt-box', card);
      const done = () => toast('Prompt copiado!');
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(prompt).then(done, () => { ta.select(); document.execCommand('copy'); done(); });
      else { ta.select(); document.execCommand('copy'); done(); }
    });
  }

  // ------------------------------------------------------------------ consulta (símbolos, fórmulas, ferramentas)
  function renderRef() {
    const R = C.reference;
    $('#view').innerHTML = `
      <div class="hero small-hero"><div><h1>${esc(R.title)}</h1>${R.intro ? `<p class="muted">${R.intro}</p>` : ''}</div></div>
      <div class="ref-bar"><input type="search" class="ref-search" placeholder="Buscar (ex.: ${esc(R.searchHint || 'nome, conceito…')})" data-ref-search aria-label="Buscar na consulta"></div>
      <div class="ref-toc">${R.sections.map((s, i) => `<button class="pill" data-ref-jump="${i}">${esc(s.title)}</button>`).join('')}</div>
      <div class="ref-secs"></div><p class="muted small ref-empty" hidden>Nada encontrado.</p>`;
    const box = $('.ref-secs');
    R.sections.forEach((s, si) => {
      const sec = document.createElement('section');
      sec.className = 'ref-sec';
      sec.id = 'ref-' + si;
      sec.innerHTML = `<h3 class="sec">${esc(s.title)}</h3>${s.intro ? `<p class="muted small">${s.intro}</p>` : ''}<div class="ref-grid"></div>`;
      const grid = $('.ref-grid', sec);
      (s.items || []).forEach((it) => {
        const card = document.createElement('article');
        card.className = 'ref-card' + (it.wide || it.widget ? ' wide' : '');
        card.innerHTML = `<div class="ref-fig"></div><div class="ref-txt"><h4>${esc(it.name)}</h4>${it.desc ? `<div class="ref-desc">${it.desc}</div>` : ''}${it.read ? `<div class="ref-read"><b>Como ler:</b> ${it.read}</div>` : ''}${it.warn ? `<div class="ref-warn"><b>Cuidado:</b> ${it.warn}</div>` : ''}</div>`;
        const fig = $('.ref-fig', card);
        try {
          if (it.dg) {
            fig.classList.add('diagram');
            const svg = ER.render(it.dg());
            fig.appendChild(svg);
            if (+svg.getAttribute('width') > 300) card.classList.add('wide'); // diagramas largos ocupam a linha toda para não ficarem minúsculos
          }
          else if (it.fig) fig.innerHTML = it.fig;
          else if (it.widget) { fig.classList.add('widget'); it.widget(fig); }
          else fig.remove();
        } catch (e) { console.error('Erro no item da consulta', it.name, e); fig.remove(); }
        card.dataset.text = plain([it.name, it.desc, it.read, it.warn, it.tags].join(' '));
        grid.appendChild(card);
      });
      box.appendChild(sec);
    });
  }
  function filterRef(qs) {
    const q = plain(qs).trim();
    let any = false;
    $$('.ref-sec').forEach((sec) => {
      let n = 0;
      $$('.ref-card', sec).forEach((c) => { const ok = !q || c.dataset.text.includes(q); c.hidden = !ok; if (ok) n++; });
      sec.hidden = n === 0;
      if (n) any = true;
    });
    const e = $('.ref-empty');
    if (e) e.hidden = any;
  }

  // ------------------------------------------------------------------ trilha
  function renderPath() {
    const UNITS = UNITS_(), MAIN = MAIN_(), LESSONS = LESSONS_();
    const offs = [0, 44, 66, 44, 0, -44, -66, -44];
    let k = 0;
    let current = MAIN.find((e) => !st.done[e.lesson.id] && unlocked(e));
    let un = 0;
    const html = UNITS.map((u) => {
      if (!u.extra) un++;
      const nodes = u.lessons.map((l) => {
        const e = LESSONS.find((x) => x.lesson === l);
        const done = !!st.done[l.id], open = unlocked(e), cur = e === current;
        const off = offs[k++ % offs.length];
        const icon = done ? '✓' : open ? '★' : '🔒';
        return `<div class="node-wrap" style="--off:${off}px">
          ${cur ? '<div class="bubble">COMEÇAR</div>' : ''}
          <button class="lnode ${done ? 'done' : open ? 'open' : 'locked'} ${cur ? 'cur' : ''}" data-lesson="${l.id}" ${open ? '' : 'aria-disabled="true"'} title="${esc(l.title)}">${icon}</button>
          <div class="lname">${esc(l.title)}${done ? ` <span class="muted">· ${st.done[l.id].best}%</span>` : ''}</div>
        </div>`;
      }).join('');
      return `<section class="unit" style="--uc:${u.color}">
        <header class="unit-banner">
          <div><div class="u-kicker">${esc(u.kicker || (u.extra ? 'Extra' : 'Unidade ' + un))}</div><h2>${esc(u.title)}</h2><p>${esc(u.sub || '')}</p></div>
          ${u.guide && u.guide.length ? `<button class="btn guide" data-guide="${u.id}">📖 Guia</button>` : ''}
        </header>
        <div class="nodes">${nodes}</div>
      </section>`;
    }).join('');
    const doneN = MAIN.filter((e) => st.done[e.lesson.id]).length;
    $('#view').innerHTML = `
      <div class="hero">
        ${MASCOT}
        <div><h1>${esc(C.title)}</h1><p class="muted">${C.subtitle ? esc(C.subtitle) + ' · ' : ''}${doneN}/${MAIN.length} lições concluídas</p>
        ${!st.settings.unlockAll && doneN === 0 ? '<button class="linkbtn small" data-act="unlock">Já estudei antes — desbloquear todas as lições</button>' : ''}</div>
      </div>
      <div class="path">${html}</div>`;
    const cur = $('.lnode.cur');
    if (cur && doneN > 0) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  }

  function showGuide(uid) {
    const u = UNITS_().find((x) => x.id === uid);
    if (!u) return;
    const card = modal(`<div class="guide" style="--uc:${u.color}"><div class="u-kicker">Guia</div><h2>${esc(u.title)}</h2><div class="gbody"></div></div>`, 'wide');
    const body = $('.gbody', card);
    (u.guide || []).forEach((b) => {
      if (typeof b === 'string') body.insertAdjacentHTML('beforeend', b);
      else if (b && b.dg) { const d = document.createElement('div'); d.className = 'diagram'; d.appendChild(ER.render(b.dg())); body.appendChild(d); }
    });
  }

  // ------------------------------------------------------------------ lição
  let L = null;
  const TYPE_LABEL = { mc: 'Escolha a resposta correta', tf: 'Verdadeiro ou falso?', ms: 'Marque todas as corretas', fill: 'Complete a frase', match: 'Toque nos pares correspondentes', order: 'Coloque na ordem certa', cls: 'Classifique cada item', card: 'Defina as cardinalidades', click: 'Toque no diagrama', input: 'Digite a resposta' };

  function startLesson(opts) {
    const qs = opts.qs.map(materialize).filter((q) => q && RENDER[q.t]);
    if (!qs.length) return toast('Esta lição ainda não tem perguntas válidas.');
    L = {
      title: opts.title, lessonId: opts.lessonId || null, practice: !!opts.practice, color: opts.color || '#58cc02',
      queue: qs, total: qs.length, solved: 0, hearts: st.settings.infinite ? Infinity : 5,
      mistakes: 0, wrong: new Set(), wrongQs: [], first: 0, t0: Date.now(), cur: null, ctrl: null, phase: 'answer',
    };
    $('#shell').hidden = true;
    $('#editorView').hidden = true;
    $('#lessonView').hidden = false;
    $('#lessonView').style.setProperty('--uc', L.color);
    nextQuestion();
  }

  function lessonTop() {
    const pct = Math.round((L.solved / L.total) * 100);
    return `<div class="l-top">
      <button class="iconbtn" data-act="quit" aria-label="Sair da lição">✕</button>
      <div class="pbar"><div style="width:${pct}%"></div></div>
      <div class="hearts" title="Vidas">❤️ ${L.hearts === Infinity ? '∞' : L.hearts}</div>
    </div>`;
  }

  function nextQuestion() {
    if (!L.queue.length) return finishLesson(true);
    const q = L.queue.shift();
    L.cur = q;
    L.phase = 'answer';
    const v = $('#lessonView');
    v.innerHTML = `${lessonTop()}
      <div class="l-body"><div class="q-wrap">
        <div class="q-type">${esc(q.label || TYPE_LABEL[q.t])}${L.wrong.has(q.id) ? ' · <span class="again">revisando</span>' : ''}</div>
        <h2 class="q-text">${esc(q.q)}</h2>
        ${q.fig ? `<div class="q-fig">${q.fig}</div>` : ''}
        ${q.d && q.t !== 'card' && q.t !== 'click' ? '<div class="diagram q-dg"></div>' : ''}
        <div class="q-body"></div>
      </div></div>
      <div class="l-foot"><div class="foot-inner"><div class="fb"></div><button class="btn primary big" data-act="check" disabled>Verificar</button></div></div>`;
    if (q.d && q.t !== 'card' && q.t !== 'click') $('.q-dg', v).appendChild(ER.render(q.d()));
    L.ctrl = RENDER[q.t](q, $('.q-body', v), () => { $('[data-act="check"]', v).disabled = !L.ctrl.ready(); });
    $('.l-body', v).scrollTop = 0;
  }

  function checkAnswer() {
    if (!L || L.phase !== 'answer' || !L.ctrl || !L.ctrl.ready()) return;
    const q = L.cur;
    const r = L.ctrl.check();
    L.phase = 'feedback';
    st.answered++;
    if (r.ok) {
      L.solved++;
      st.correct++;
      if (L.practice) delete st.missed[q.id];
      beep('ok');
    } else {
      L.mistakes++;
      if (!L.wrong.has(q.id)) L.wrongQs.push(q);
      L.wrong.add(q.id);
      st.missed[q.id] = (st.missed[q.id] || 0) + 1;
      if (L.hearts !== Infinity) L.hearts--;
      L.queue.push(q);
      beep('bad');
    }
    save();
    const v = $('#lessonView');
    $('.l-top', v).outerHTML = lessonTop();
    const foot = $('.l-foot', v);
    foot.classList.add(r.ok ? 'ok' : 'bad');
    const praise = ['Muito bem!', 'Mandou bem!', 'Isso aí!', 'Perfeito!', 'Excelente!'][Math.floor(Math.random() * 5)];
    $('.fb', foot).innerHTML = `<div class="fb-title">${r.ok ? '✔ ' + praise : '✘ Não foi dessa vez'}</div>
      ${!r.ok && r.answer ? `<div class="fb-ans"><b>Resposta correta:</b> ${r.answer}</div>` : ''}
      ${q.e ? `<div class="fb-exp">${esc(q.e)}</div>` : ''}`;
    const b = $('[data-act="check"]', foot);
    b.textContent = 'Continuar';
    b.disabled = false;
    b.dataset.act = 'continue';
    b.focus({ preventScroll: true });
    if (L.ctrl.lock) L.ctrl.lock();
  }

  function onContinue() {
    if (!L) return;
    if (L.hearts !== Infinity && L.hearts <= 0) return finishLesson(false);
    nextQuestion();
  }

  function finishLesson(ok) {
    const v = $('#lessonView');
    const secs = Math.round((Date.now() - L.t0) / 1000);
    const acc = Math.round((L.total / (L.total + L.mistakes)) * 100);
    let xp = 0;
    if (ok) {
      xp = 10 + (L.mistakes === 0 ? 5 : 0);
      addXp(xp);
      if (L.lessonId) {
        const prev = st.done[L.lessonId];
        st.done[L.lessonId] = { best: Math.max(prev ? prev.best : 0, acc), times: (prev ? prev.times : 0) + 1 };
        save();
      }
      beep('win');
    }
    const wrongList = L.wrongQs.slice(0, 6);
    v.innerHTML = `<div class="l-body"><div class="q-wrap end">
      ${MASCOT}
      <h1>${ok ? (L.mistakes === 0 ? 'Lição perfeita!' : 'Lição concluída!') : 'Acabaram as vidas'}</h1>
      <p class="muted">${esc(L.title)}</p>
      <div class="end-stats">
        <div class="es xp"><div>XP</div><b>+${xp}</b></div>
        <div class="es acc"><div>Precisão</div><b>${ok ? acc : Math.round((L.solved / Math.max(1, L.solved + L.mistakes)) * 100)}%</b></div>
        <div class="es time"><div>Tempo</div><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b></div>
      </div>
      ${wrongList.length ? `<div class="panel review-box"><h4>Para revisar</h4><ul>${wrongList.map((q) => `<li>${esc(q.q)}${q.e ? `<div class="small muted">${esc(q.e)}</div>` : ''}</li>`).join('')}</ul></div>` : ''}
    </div></div>
    <div class="l-foot"><div class="foot-inner end-btns">
      ${ok ? '' : '<button class="btn ghost big" data-act="retry">Tentar de novo</button>'}
      <button class="btn primary big" data-act="exit">Continuar</button>
    </div></div>`;
    L.retry = ok ? null : { title: L.title, lessonId: L.lessonId, practice: L.practice, color: L.color, qs: L.retryQs };
    $('[data-act="exit"]', v).focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ tipos de pergunta
  function optBtns(items, multi) {
    return `<div class="opts">${items.map((t, i) => `<button class="opt" data-i="${i}"><span class="kbd">${i + 1}</span><span class="otxt">${esc(t)}</span></button>`).join('')}</div>`;
  }

  const RENDER = {
    mc(q, box, upd) {
      const order = shuffle(q.o.map((_, i) => i));
      box.innerHTML = optBtns(order.map((i) => q.o[i]));
      let pick = null;
      const bs = $$('.opt', box);
      bs.forEach((b) => b.addEventListener('click', () => { pick = +b.dataset.i; bs.forEach((x) => x.classList.toggle('sel', x === b)); upd(); }));
      const c = {
        ready: () => pick != null,
        key: (n) => { if (bs[n]) bs[n].click(); },
        check: () => {
          const ok = order[pick] === q.a;
          bs.forEach((b, i) => { if (order[i] === q.a) b.classList.add('good'); else if (i === pick) b.classList.add('bad'); });
          return { ok, answer: esc(q.o[q.a]) };
        },
        lock: () => bs.forEach((b) => (b.disabled = true)),
      };
      return c;
    },
    tf(q, box, upd) {
      box.innerHTML = `<div class="opts two">${['Verdadeiro', 'Falso'].map((t, i) => `<button class="opt big" data-i="${i}"><span class="kbd">${i + 1}</span><span class="otxt">${t}</span></button>`).join('')}</div>`;
      let pick = null;
      const bs = $$('.opt', box);
      bs.forEach((b) => b.addEventListener('click', () => { pick = +b.dataset.i; bs.forEach((x) => x.classList.toggle('sel', x === b)); upd(); }));
      return {
        ready: () => pick != null,
        key: (n) => { if (bs[n]) bs[n].click(); },
        check: () => {
          const val = pick === 0;
          const ok = val === q.a;
          bs[q.a ? 0 : 1].classList.add('good');
          if (!ok) bs[pick].classList.add('bad');
          return { ok, answer: q.a ? 'Verdadeiro' : 'Falso' };
        },
        lock: () => bs.forEach((b) => (b.disabled = true)),
      };
    },
    ms(q, box, upd) {
      const order = shuffle(q.o.map((_, i) => i));
      box.innerHTML = optBtns(order.map((i) => q.o[i]), true);
      const picked = new Set();
      const bs = $$('.opt', box);
      bs.forEach((b) => { b.classList.add('multi'); b.addEventListener('click', () => { const i = +b.dataset.i; picked.has(i) ? picked.delete(i) : picked.add(i); b.classList.toggle('sel', picked.has(i)); upd(); }); });
      return {
        ready: () => picked.size > 0,
        key: (n) => { if (bs[n]) bs[n].click(); },
        check: () => {
          const want = new Set(q.a);
          let ok = true;
          bs.forEach((b, i) => {
            const isRight = want.has(order[i]);
            if (isRight) b.classList.add(picked.has(i) ? 'good' : 'missed');
            else if (picked.has(i)) b.classList.add('bad');
            if (isRight !== picked.has(i)) ok = false;
          });
          return { ok, answer: q.a.map((i) => esc(q.o[i])).join(' · ') };
        },
        lock: () => bs.forEach((b) => (b.disabled = true)),
      };
    },
    fill(q, box, upd) {
      const parts = q.s.split(/(\{\d+\})/);
      const slots = q.a.map(() => null);
      const bank = shuffle(q.b.map((w, i) => ({ w, i })));
      box.innerHTML = `<div class="sentence">${parts.map((p) => { const m = p.match(/^\{(\d+)\}$/); return m ? `<button class="blank" data-s="${m[1]}"></button>` : `<span>${esc(p)}</span>`; }).join('')}</div>
        <div class="bank">${bank.map((x) => `<button class="chip word" data-w="${x.i}">${esc(x.w)}</button>`).join('')}</div>`;
      const paint = () => {
        $$('.blank', box).forEach((b) => { const s = slots[+b.dataset.s]; b.textContent = s == null ? '' : q.b[s]; b.classList.toggle('filled', s != null); });
        $$('.word', box).forEach((b) => b.classList.toggle('used', slots.includes(+b.dataset.w)));
        upd();
      };
      let locked = false;
      $$('.word', box).forEach((b) => b.addEventListener('click', () => {
        if (locked) return;
        const w = +b.dataset.w;
        if (slots.includes(w)) { slots[slots.indexOf(w)] = null; return paint(); }
        const i = slots.indexOf(null);
        if (i >= 0) { slots[i] = w; paint(); }
      }));
      $$('.blank', box).forEach((b) => b.addEventListener('click', () => { if (!locked) { slots[+b.dataset.s] = null; paint(); } }));
      return {
        ready: () => slots.every((s) => s != null),
        check: () => {
          let ok = true;
          $$('.blank', box).forEach((b) => { const i = +b.dataset.s; const good = norm(q.b[slots[i]]) === norm(q.a[i]); b.classList.add(good ? 'good' : 'bad'); if (!good) ok = false; });
          let n = 0;
          return { ok, answer: esc(q.s.replace(/\{\d+\}/g, () => '«' + q.a[n++] + '»')) };
        },
        lock: () => { locked = true; },
      };
    },
    match(q, box, upd) {
      const left = shuffle(q.p.map((p, i) => ({ t: p[0], i }))), right = shuffle(q.p.map((p, i) => ({ t: p[1], i })));
      box.innerHTML = `<div class="match"><div class="mcol">${left.map((x) => `<button class="chip mt" data-side="l" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>
        <div class="mcol">${right.map((x) => `<button class="chip mt" data-side="r" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div>`;
      let sel = null, done = 0, errs = 0;
      $$('.mt', box).forEach((b) => b.addEventListener('click', () => {
        if (b.classList.contains('matched')) return;
        if (!sel || sel.dataset.side === b.dataset.side) {
          if (sel) sel.classList.remove('sel');
          sel = b; b.classList.add('sel'); return;
        }
        if (sel.dataset.i === b.dataset.i) {
          [sel, b].forEach((x) => { x.classList.remove('sel'); x.classList.add('matched'); });
          done++; beep('ok');
        } else {
          errs++;
          const a = sel;
          [a, b].forEach((x) => x.classList.add('wrong'));
          setTimeout(() => [a, b].forEach((x) => x.classList.remove('wrong', 'sel')), 450);
        }
        sel = null;
        upd();
        if (done === q.p.length) setTimeout(() => checkAnswer(), 250);
      }));
      return {
        ready: () => done === q.p.length,
        check: () => ({ ok: true, answer: '' }),
      };
    },
    order(q, box, upd) {
      const pool = shuffle(q.o.map((t, i) => ({ t, i })));
      const seq = [];
      box.innerHTML = '<div class="answer-line"></div><div class="bank pool"></div>';
      let locked = false;
      const paint = () => {
        $('.answer-line', box).innerHTML = seq.map((i, k) => `<button class="chip seq" data-k="${k}"><span class="num">${k + 1}</span>${esc(q.o[i])}</button>`).join('') || '<span class="muted small">Toque nos itens abaixo na ordem certa</span>';
        $('.pool', box).innerHTML = pool.map((x) => `<button class="chip word ${seq.includes(x.i) ? 'used' : ''}" data-i="${x.i}">${esc(x.t)}</button>`).join('');
        $$('.seq', box).forEach((b) => b.addEventListener('click', () => { if (!locked) { seq.splice(+b.dataset.k, 1); paint(); } }));
        $$('.pool .word', box).forEach((b) => b.addEventListener('click', () => { if (locked) return; const i = +b.dataset.i; if (!seq.includes(i)) { seq.push(i); paint(); } }));
        upd();
      };
      paint();
      return {
        ready: () => seq.length === q.o.length,
        check: () => {
          const ok = seq.every((i, k) => i === k);
          $$('.seq', box).forEach((b, k) => b.classList.add(seq[k] === k ? 'good' : 'bad'));
          return { ok, answer: q.o.map((t, i) => `${i + 1}. ${esc(t)}`).join('<br>') };
        },
        lock: () => { locked = true; },
      };
    },
    cls(q, box, upd) {
      const items = shuffle(q.items.map((x, i) => ({ t: x[0], b: x[1], i })));
      const ans = {};
      box.innerHTML = `<div class="cls">${items.map((x) => `<div class="cls-row" data-i="${x.i}"><span class="cls-item">${esc(x.t)}</span><div class="seg">${q.buckets.map((b, bi) => `<button data-b="${bi}">${esc(b)}</button>`).join('')}</div></div>`).join('')}</div>`;
      let locked = false;
      $$('.cls-row', box).forEach((row) => $$('button', row).forEach((b) => b.addEventListener('click', () => {
        if (locked) return;
        ans[row.dataset.i] = +b.dataset.b;
        $$('button', row).forEach((x) => x.classList.toggle('on', x === b));
        upd();
      })));
      return {
        ready: () => Object.keys(ans).length === items.length,
        check: () => {
          let ok = true;
          $$('.cls-row', box).forEach((row) => {
            const it = q.items[+row.dataset.i];
            const good = ans[row.dataset.i] === it[1];
            row.classList.add(good ? 'good' : 'bad');
            if (!good) { ok = false; row.querySelector(`[data-b="${it[1]}"]`).classList.add('right'); }
          });
          return { ok, answer: 'veja os itens marcados em verde acima.' };
        },
        lock: () => { locked = true; },
      };
    },
    card(q, box, upd) {
      const model = q.d();
      const slots = model.links.filter((l) => l.slot).map((l) => l.slot).sort();
      const vals = {};
      const opts = q.opts || ['(0,1)', '(1,1)', '(0,N)', '(1,N)'];
      box.innerHTML = `<div class="diagram q-dg"></div>
        <p class="small muted tip-line">Lembre: o valor junto de uma entidade diz quantas ocorrências <b>dela</b> se associam a uma ocorrência do outro lado.</p>
        <div class="slots">${slots.map((s) => `<div class="slot-row" data-s="${s}"><span class="slot-tag">${s}</span><div class="seg">${opts.map((o) => `<button data-v="${o}">${o}</button>`).join('')}</div></div>`).join('')}</div>`;
      let state = null, locked = false;
      const draw = () => { const dg = $('.q-dg', box); dg.innerHTML = ''; dg.appendChild(ER.render(model, { slotValues: vals, slotState: state })); };
      draw();
      $$('.slot-row', box).forEach((row) => $$('button', row).forEach((b) => b.addEventListener('click', () => {
        if (locked) return;
        vals[row.dataset.s] = b.dataset.v;
        $$('button', row).forEach((x) => x.classList.toggle('on', x === b));
        draw(); upd();
      })));
      return {
        ready: () => slots.every((s) => vals[s]),
        check: () => {
          state = {};
          let ok = true;
          slots.forEach((s) => {
            const good = vals[s] === q.a[s];
            state[s] = good ? 'good' : 'bad';
            if (!good) ok = false;
            const row = box.querySelector(`.slot-row[data-s="${s}"]`);
            row.classList.add(good ? 'good' : 'bad');
            if (!good) { const r = row.querySelector(`[data-v="${CSS.escape(q.a[s])}"]`); if (r) r.classList.add('right'); }
          });
          draw();
          return { ok, answer: slots.map((s) => `${s} = ${q.a[s]}`).join(', ') };
        },
        lock: () => { locked = true; },
      };
    },
    click(q, box, upd) {
      const model = q.d();
      const multi = q.a.length > 1;
      const picked = new Set();
      let good = null, bad = null, locked = false;
      box.innerHTML = '<div class="diagram q-dg clickable"></div>';
      const draw = () => {
        const dg = $('.q-dg', box);
        dg.innerHTML = '';
        const svg = ER.render(model, { clickable: true, picked, good, bad });
        svg.addEventListener('click', (e) => {
          if (locked) return;
          const g = e.target.closest('[data-id]');
          if (!g) return;
          const id = g.dataset.id;
          if (multi) picked.has(id) ? picked.delete(id) : picked.add(id);
          else { picked.clear(); picked.add(id); }
          draw(); upd();
        });
        dg.appendChild(svg);
      };
      draw();
      return {
        ready: () => picked.size > 0,
        check: () => {
          const want = new Set(q.a);
          const ok = picked.size === want.size && [...picked].every((x) => want.has(x));
          good = want; bad = new Set([...picked].filter((x) => !want.has(x)));
          draw();
          const names = q.a.map((id) => { const n = model.nodes.find((x) => x.id === id); return n ? esc(n.name) : id; });
          return { ok, answer: names.join(', ') + ' (destacado em verde)' };
        },
        lock: () => { locked = true; },
      };
    },
    // resposta digitada: a = 'texto' ou ['aceita 1', 'aceita 2', ...]
    input(q, box, upd) {
      box.innerHTML = `<div class="ans-wrap">${q.pre ? `<span class="ans-fix">${esc(q.pre)}</span>` : ''}<input class="ans-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(q.ph || 'Sua resposta')}" aria-label="Resposta">${q.suf ? `<span class="ans-fix">${esc(q.suf)}</span>` : ''}</div>
        ${q.hint ? `<p class="small muted tip-line">${esc(q.hint)}</p>` : ''}`;
      const inp = $('.ans-input', box);
      inp.addEventListener('input', upd);
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault(); e.stopPropagation();
        if (inp.value.trim()) checkAnswer();
      });
      setTimeout(() => inp.focus({ preventScroll: true }), 40);
      return {
        ready: () => inp.value.trim() !== '',
        check: () => {
          const ok = answerMatches(inp.value, q.a);
          inp.classList.add(ok ? 'good' : 'bad');
          return { ok, answer: esc([].concat(q.a)[0]) + (q.suf ? ' ' + esc(q.suf) : '') };
        },
        lock: () => { inp.readOnly = true; },
      };
    },
  };

  // normaliza respostas digitadas: ignora maiúsculas, acentos, espaços, "0x", separador de milhar e unidade no fim
  function canon(s) {
    let x = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
    x = x.replace(/^0x/, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(x)) x = x.replace(/\./g, '');
    x = x.replace(/,/g, '.');
    const m = x.match(/^(-?\d+(?:\.\d+)?)(kbytes|kib|kb|mib|mb|gib|gb|bytes|byte|bits|bit|b|blocos|bloco|entradas|quadros|paginas|ausencias|faltas|apontadores|enderecos)$/);
    if (m) x = m[1];
    return x;
  }
  function answerMatches(v, a) {
    const u = canon(v);
    return [].concat(a).some((x) => {
      const c = canon(x);
      if (c === u) return true;
      const num = /^-?\d+(\.\d+)?$/;
      return num.test(c) && num.test(u) && Number(c) === Number(u);
    });
  }

  // ------------------------------------------------------------------ oficina
  function renderWorkshop() {
    const lv = { 1: 'Aquecimento', 2: 'Intermediário', 3: 'Avançado', 4: 'Exercícios do slide' };
    const groups = [1, 2, 3, 4].map((l) => {
      const ts = TASKS.filter((t) => t.level === l);
      return `<h3 class="sec">${lv[l]}</h3><div class="cards">${ts.map((t) => {
        const done = st.tasks[t.id], started = st.diagrams[t.id] && st.diagrams[t.id].nodes.length;
        return `<button class="tcard ${done ? 'done' : ''}" data-task="${t.id}">
          <div class="tc-top"><span class="pill">${esc(t.concept)}</span>${done ? '<span class="badge ok">✓ feito</span>' : started ? '<span class="badge">em andamento</span>' : ''}</div>
          <div class="tc-title">${esc(t.title)}</div>
          <div class="tc-text">${esc(t.text.length > 130 ? t.text.slice(0, 127) + '…' : t.text)}</div>
          <div class="tc-foot">${t.steps.length} verificações · +${t.level === 4 ? 40 : 20} XP</div>
        </button>`;
      }).join('')}</div>`;
    }).join('');
    const projs = st.projects.slice().sort((a, b) => b.updated - a.updated);
    $('#view').innerHTML = `
      <div class="hero small-hero"><div><h1>Oficina de diagramas</h1><p class="muted">Desenhe diagramas ER na notação do slide. As tarefas são corrigidas automaticamente, passo a passo.</p></div></div>
      <div class="panel flow">
        <h4>Fluxo para modelar qualquer enunciado</h4>
        <ol class="flow-steps"><li><b>Entidades</b><span>substantivos com dados próprios</span></li><li><b>Relacionamentos</b><span>verbos / associações</span></li><li><b>Cardinalidades</b><span>(mín,máx) dos dois lados</span></li><li><b>Atributos</b><span>e identificadores ●</span></li><li><b>Casos especiais</b><span>fraca, n-ário, especialização, associativa</span></li><li><b>Validar</b><span>botão “Validar” no editor</span></li></ol>
      </div>
      <h3 class="sec">Meus diagramas <span class="muted small">— use para o diagrama do seu trabalho</span></h3>
      <div class="cards">
        <button class="tcard new" data-act="new-proj"><div class="plus">+</div><div class="tc-title">Novo diagrama</div><div class="tc-text">Quadro livre com validação automática e exportação PNG/SVG/JSON.</div></button>
        ${projs.map((p) => `<div class="tcard proj" data-proj="${p.id}">
          <div class="tc-title">${esc(p.name)}</div>
          <div class="tc-text">${p.model.nodes.filter((n) => n.t === 'ent').length} entidades · ${p.model.nodes.filter((n) => n.t === 'rel').length} relacionamentos</div>
          <div class="tc-foot">Editado ${new Date(p.updated).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div class="btns"><button class="btn small" data-act="open-proj">Abrir</button><button class="btn small ghost" data-act="ren-proj">Renomear</button><button class="btn small ghost" data-act="dup-proj">Duplicar</button><button class="btn small ghost danger" data-act="del-proj">Excluir</button></div>
        </div>`).join('')}
      </div>
      ${groups}`;
  }

  function openTask(id) {
    const t = TASKS.find((x) => x.id === id);
    const model = st.diagrams[id] || (t.start ? t.start() : { nodes: [], links: [] });
    openEditor({
      title: t.title, task: t, model,
      onChange: (m) => { st.diagrams[id] = m; save(); },
      onSolved: () => {
        if (!st.tasks[id]) {
          st.tasks[id] = true;
          const xp = t.level === 4 ? 40 : 20;
          addXp(xp);
          beep('win');
          modal(`<div class="center">${MASCOT}<h2>Diagrama correto!</h2><p>+${xp} XP · ${esc(t.title)}</p><p class="small muted">Compare com a solução sugerida: pode haver diferenças de nomes ou posição que também estão corretas.</p><button class="btn primary" data-close>Ótimo</button></div>`);
        } else toast('Tudo certo de novo! ✓');
      },
      onSolution: () => showSolution(t),
    });
  }

  function showSolution(t) {
    const card = modal(`<h2>Solução sugerida — ${esc(t.title)}</h2>
      <p class="small muted">É <b>uma</b> solução possível. Nomes e posições podem variar; a verificação aceita variações razoáveis.</p>
      <div class="diagram sol"></div>
      <div class="btns"><button class="btn ghost" data-close>Fechar</button><button class="btn" data-act="load-sol">Carregar no editor (substitui o seu)</button></div>`, 'wide');
    $('.sol', card).appendChild(ER.render(t.solution()));
    $('[data-act="load-sol"]', card).addEventListener('click', () => {
      if (!confirm('Substituir o seu diagrama pela solução? (Ctrl+Z desfaz)')) return;
      Editor.setModel(t.solution());
      closeModal();
    });
  }

  function openProject(id) {
    const p = st.projects.find((x) => x.id === id);
    if (!p) return;
    openEditor({
      title: p.name, model: p.model,
      onChange: (m) => { p.model = m; p.updated = Date.now(); save(); },
    });
  }

  function openEditor(opts) {
    $('#shell').hidden = true;
    $('#lessonView').hidden = true;
    const v = $('#editorView');
    v.hidden = false;
    Editor.mount(v, Object.assign({ onBack: () => go('oficina') }, opts));
  }

  // ------------------------------------------------------------------ revisão
  function renderReview() {
    const UNITS = UNITS_();
    const missed = missedHere().sort((a, b) => st.missed[b] - st.missed[a]);
    $('#view').innerHTML = `
      <div class="hero small-hero"><div><h1>Revisar</h1><p class="muted">Treine o que errou e consulte os guias de cada unidade.</p></div></div>
      <div class="cards">
        <button class="tcard" data-act="practice-missed" ${missed.length ? '' : 'disabled'}>
          <div class="plus">↺</div><div class="tc-title">Treinar erros</div>
          <div class="tc-text">${missed.length ? `${missed.length} pergunta(s) que você errou. Acertando aqui, elas saem da lista.` : 'Nenhum erro guardado ainda. Faça algumas lições!'}</div>
        </button>
        <button class="tcard" data-act="practice-random"><div class="plus">🎲</div><div class="tc-title">Treino aleatório</div><div class="tc-text">10 perguntas sorteadas das lições liberadas.</div></button>
        ${(C.practice || []).map((p, i) => `<button class="tcard" data-act="practice-custom" data-i="${i}"><div class="plus">${esc(p.icon || '★')}</div><div class="tc-title">${esc(p.title)}</div><div class="tc-text">${esc(p.text || '')}</div></button>`).join('')}
      </div>
      <h3 class="sec">Guias das unidades</h3>
      <div class="guide-list">${(() => { let n = 0; return UNITS.filter((u) => u.guide && u.guide.length).map((u) => `<button class="gl" data-guide="${u.id}" style="--uc:${u.color}"><span class="dot"></span><span><b>${u.extra ? 'Extra' : ++n}. ${esc(u.title)}</b><br><span class="small muted">${esc(u.sub || '')}</span></span></button>`).join(''); })()}</div>`;
  }

  function practice(kind, idx) {
    const LESSONS = LESSONS_();
    let qs = [];
    if (kind === 'missed') {
      qs = missedHere().sort((a, b) => st.missed[b] - st.missed[a]).slice(0, 12).map((k) => QINDEX[k].q);
      if (!qs.length) return toast('Nenhum erro para treinar.');
      return startLesson({ title: 'Treino de erros', qs: shuffle(qs), practice: true, color: '#ff4b4b' });
    }
    if (kind === 'custom') {
      const p = (C.practice || [])[idx];
      if (!p) return;
      qs = LESSONS.flatMap((e) => e.lesson.qs).filter((q) => (!p.types || p.types.includes(q.t)) && (!p.tags || p.tags.includes(q.tag)));
      qs = shuffle(qs).slice(0, p.count || 10);
      if (!qs.length) return toast('Nenhuma pergunta para este treino.');
      return startLesson({ title: p.title, qs, practice: true, color: p.color || '#ce82ff' });
    }
    const pool = LESSONS.filter((e) => unlocked(e)).flatMap((e) => e.lesson.qs);
    qs = shuffle(pool).slice(0, 10);
    startLesson({ title: 'Treino aleatório', qs, practice: true, color: '#1cb0f6' });
  }

  // ------------------------------------------------------------------ perfil
  function renderProfile() {
    const MAIN = MAIN_();
    const doneL = MAIN.filter((e) => st.done[e.lesson.id]).length;
    const doneT = TASKS.filter((t) => st.tasks[t.id]).length;
    const acc = st.answered ? Math.round((st.correct / st.answered) * 100) : 0;
    const s = st.settings;
    $('#view').innerHTML = `
      <div class="hero small-hero">${MASCOT}<div><h1>Perfil</h1><p class="muted">Seu progresso fica salvo neste navegador.</p></div></div>
      <div class="kpis">
        <div class="kpi"><b>🔥 ${streakNow()}</b><span>dias seguidos</span></div>
        <div class="kpi"><b>⚡ ${st.xp}</b><span>XP total</span></div>
        ${C ? `<div class="kpi"><b>${doneL}/${MAIN.length}</b><span>lições · ${esc(C.short || C.title)}</span></div>` : ''}
        ${C && C.workshop && TASKS.length ? `<div class="kpi"><b>${doneT}/${TASKS.length}</b><span>diagramas</span></div>` : ''}
        <div class="kpi"><b>${acc}%</b><span>acertos (${st.answered} respostas)</span></div>
      </div>
      <div class="panel settings">
        <h4>Configurações</h4>
        <label class="switch"><input type="checkbox" data-set="sound" ${s.sound ? 'checked' : ''}><span></span> Efeitos sonoros</label>
        <label class="switch"><input type="checkbox" data-set="infinite" ${s.infinite ? 'checked' : ''}><span></span> Vidas infinitas (modo estudo)</label>
        <label class="switch"><input type="checkbox" data-set="unlockAll" ${s.unlockAll ? 'checked' : ''}><span></span> Desbloquear todas as lições</label>
        <label class="row-set">Tema <select data-set="theme"><option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Automático</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Claro</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Escuro</option></select></label>
        <label class="row-set">Meta diária <select data-set="goal">${[10, 20, 30, 50, 80].map((g) => `<option ${st.goal === g ? 'selected' : ''}>${g}</option>`).join('')}</select> XP</label>
      </div>
      <div class="panel">
        <h4>Backup</h4>
        <p class="small muted">Exporte para levar seu progresso e diagramas para outro computador/navegador.</p>
        <div class="btns"><button class="btn small" data-act="backup">Exportar progresso</button><button class="btn small ghost" data-act="restore">Importar progresso</button><button class="btn small ghost danger" data-act="reset-all">Apagar progresso</button></div>
        <input type="file" id="restoreFile" accept=".json" hidden>
      </div>`;
  }

  // ------------------------------------------------------------------ eventos globais
  document.addEventListener('click', (e) => {
    const t = e.target;
    const nav = t.closest('[data-tab]');
    if (nav) return go(nav.dataset.tab);
    const g = t.closest('[data-go]');
    if (g) return go(g.dataset.go);
    const crs = t.closest('[data-course]');
    if (crs) { setCourse(crs.dataset.course); return go('trilha'); }
    const rj = t.closest('[data-ref-jump]');
    if (rj) { const s = $('#ref-' + rj.dataset.refJump); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const gd = t.closest('[data-guide]');
    if (gd) return showGuide(gd.dataset.guide);
    const ln = t.closest('[data-lesson]');
    if (ln) {
      const e2 = LESSON_BY_ID[ln.dataset.lesson];
      if (!e2) return;
      if (!unlocked(e2)) return toast('Conclua a lição anterior para desbloquear (ou desbloqueie tudo no Perfil).');
      return startLesson({ title: `${e2.unit.title} · ${e2.lesson.title}`, lessonId: e2.lesson.id, qs: e2.lesson.qs, color: e2.unit.color });
    }
    const tk = t.closest('[data-task]');
    if (tk) return openTask(tk.dataset.task);
    const a = t.closest('[data-act]');
    if (!a || a.closest('#editorView')) return;
    const act = a.dataset.act;
    const proj = a.closest('[data-proj]');
    switch (act) {
      case 'check': return checkAnswer();
      case 'continue': return onContinue();
      case 'quit':
        if (confirm('Sair da lição? O progresso desta lição será perdido.')) { L = null; go('trilha'); }
        return;
      case 'exit': { const was = L && L.practice; L = null; return go(was ? 'revisar' : 'trilha'); }
      case 'retry': {
        const r = L; L = null;
        if (!r) return go('trilha');
        const e2 = r.lessonId && LESSON_BY_ID[r.lessonId];
        if (e2) return startLesson({ title: r.title, lessonId: r.lessonId, qs: e2.lesson.qs, color: r.color });
        return go('revisar');
      }
      case 'unlock': st.settings.unlockAll = true; save(); return renderPath();
      case 'new-proj': {
        const name = prompt('Nome do diagrama:', 'Diagrama do trabalho');
        if (name == null) return;
        const p = { id: 'p' + Date.now().toString(36), name: name.trim() || 'Diagrama', model: { nodes: [], links: [] }, updated: Date.now() };
        st.projects.push(p); save();
        return openProject(p.id);
      }
      case 'open-proj': return openProject(proj.dataset.proj);
      case 'ren-proj': {
        const p = st.projects.find((x) => x.id === proj.dataset.proj);
        const name = prompt('Novo nome:', p.name);
        if (name && name.trim()) { p.name = name.trim(); save(); renderWorkshop(); }
        return;
      }
      case 'dup-proj': {
        const p = st.projects.find((x) => x.id === proj.dataset.proj);
        st.projects.push({ id: 'p' + Date.now().toString(36), name: p.name + ' (cópia)', model: JSON.parse(JSON.stringify(p.model)), updated: Date.now() });
        save(); return renderWorkshop();
      }
      case 'del-proj': {
        const p = st.projects.find((x) => x.id === proj.dataset.proj);
        if (confirm(`Excluir “${p.name}”? Isso não pode ser desfeito (exporte o .json antes, se quiser guardar).`)) { st.projects = st.projects.filter((x) => x !== p); save(); renderWorkshop(); }
        return;
      }
      case 'practice-missed': return practice('missed');
      case 'practice-random': return practice('random');
      case 'practice-custom': return practice('custom', +a.dataset.i);
      case 'add-course': return showAddCourse();
      case 'backup': {
        const blob = new Blob([JSON.stringify(st, null, 1)], { type: 'application/json' });
        const el = document.createElement('a');
        el.href = URL.createObjectURL(blob); el.download = 'progresso_quiz.json';
        document.body.appendChild(el); el.click(); setTimeout(() => el.remove(), 300);
        return;
      }
      case 'restore': return $('#restoreFile').click();
      case 'reset-all':
        if (confirm('Apagar TODO o progresso (de todas as matérias), XP e diagramas salvos? Isso não pode ser desfeito.')) { const c = st.course; st = defaults(); st.course = c; save(); applyTheme(); go('trilha'); }
        return;
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'restoreFile') {
      const f = t.files[0]; t.value = '';
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const s = JSON.parse(r.result);
          if (typeof s !== 'object' || s.xp == null) throw new Error();
          const d = defaults();
          st = Object.assign(d, migrate(s), { settings: Object.assign(d.settings, s.settings || {}) });
          setCourse(st.course);
          save(); applyTheme(); toast('Progresso importado.'); go('perfil');
        } catch (err) { toast('Arquivo de progresso inválido.'); }
      };
      r.readAsText(f);
      return;
    }
    const k = t.dataset && t.dataset.set;
    if (!k) return;
    if (k === 'goal') st.goal = +t.value;
    else st.settings[k] = t.type === 'checkbox' ? t.checked : t.value;
    save();
    if (k === 'theme') applyTheme();
    renderStats();
  });

  document.addEventListener('keydown', (e) => {
    if ($('#lessonView').hidden || !L) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const b = $('#lessonView .l-foot .btn.primary');
      if (b && !b.disabled) b.click();
      return;
    }
    if (L.phase === 'answer' && L.ctrl && L.ctrl.key && /^[1-9]$/.test(e.key)) L.ctrl.key(+e.key - 1);
  });

  document.addEventListener('input', (e) => {
    if (e.target.matches && e.target.matches('[data-ref-search]')) filterRef(e.target.value);
  });

  window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (TABS[t]) go(t); });

  window.App = { toast, go, esc };
  applyTheme();
  go(location.hash.slice(1) || (FIRST_VISIT ? 'materias' : 'trilha'));
})();
