/* Editor de diagramas ER (Oficina). */
(function () {
  const W = 2400, H = 1600;
  const EXPORT_CSS = 'text{font-family:Nunito,"Segoe UI",Arial,sans-serif;font-size:15px;fill:#1f1f1f}.name{font-weight:700}.shape{fill:#fff;stroke:#1f1f1f;stroke-width:1.6}.line{stroke:#1f1f1f;stroke-width:1.6;fill:none}.line.weak{stroke-width:6}.hit{stroke:transparent;fill:transparent}.attr text{fill:#1a56db;font-size:13.5px;font-weight:600}.dot{fill:#fff;stroke:#1a56db;stroke-width:1.6}.dot.k{fill:#1a56db}.card{fill:#3445d6;font-weight:800;font-size:14px}.card.empty{fill:#aaa}.role{fill:#d9480f;font-style:italic;font-size:13px}.tri{fill:#fff}';

  const ICON = {
    select: '<svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 2-2 6z" fill="currentColor"/></svg>',
    ent: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    rel: '<svg viewBox="0 0 24 24"><path d="M12 5l9 7-9 7-9-7z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    attr: '<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 12h10" stroke="currentColor" stroke-width="2"/></svg>',
    link: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2.5" fill="currentColor"/><circle cx="19" cy="12" r="2.5" fill="currentColor"/><path d="M7 12h10" stroke="currentColor" stroke-width="2"/></svg>',
    gen: '<svg viewBox="0 0 24 24"><path d="M12 5l7 12H5z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  };
  const TOOLS = [
    ['select', 'Selecionar / mover', 'V'],
    ['ent', 'Entidade', 'E'],
    ['rel', 'Relacionamento', 'R'],
    ['attr', 'Atributo', 'A'],
    ['link', 'Ligar', 'L'],
    ['gen', 'Especialização', 'G'],
  ];
  const TOOL_HINT = {
    select: 'Clique para selecionar, arraste para mover. Duplo clique edita o nome.',
    ent: 'Clique num espaço vazio para criar uma ENTIDADE.',
    rel: 'Clique num espaço vazio para criar um RELACIONAMENTO.',
    attr: 'Clique numa entidade, relacionamento ou atributo para adicionar um ATRIBUTO a ele.',
    link: 'Clique num relacionamento e depois numa entidade para LIGAR. (Para especialização: clique no triângulo e na entidade.)',
    gen: 'Clique na entidade GENÉRICA para criar uma especialização abaixo dela.',
  };

  let S = null; // estado do editor montado

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let idc = 0;
  const nid = (p) => p + Date.now().toString(36) + (idc++).toString(36);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function mount(container, opts) {
    unmount();
    S = {
      root: container, opts, model: clone(opts.model || { nodes: [], links: [] }),
      sel: null, tool: 'select', linkFrom: null, zoom: opts.zoom || (window.innerWidth < 700 ? 0.7 : 1), hist: [], fut: [],
      drag: null, editSnap: false, results: null, lint: null,
    };
    container.innerHTML = `
      <div class="ed">
        <div class="ed-top">
          <button class="btn small ghost" data-act="back" title="Voltar">←<span class="hide-sm"> Voltar</span></button>
          <div class="ed-title">${esc(opts.title || 'Diagrama')}</div>
          <div class="ed-actions">
            <button class="btn small ghost" data-act="undo" title="Desfazer (Ctrl+Z)">↶</button>
            <button class="btn small ghost" data-act="redo" title="Refazer (Ctrl+Y)">↷</button>
            <span class="sep"></span>
            <button class="btn small ghost" data-act="zout" title="Diminuir zoom">−</button>
            <span class="zoomv">100%</span>
            <button class="btn small ghost" data-act="zin" title="Aumentar zoom">+</button>
            <span class="sep"></span>
            <button class="btn small ghost" data-act="lint" title="Verifica regras gerais do modelo ER">Validar</button>
            <div class="menu">
              <button class="btn small ghost" data-act="menu">Arquivo ▾</button>
              <div class="menu-pop">
                <button data-act="png">Exportar imagem PNG</button>
                <button data-act="svg">Exportar SVG</button>
                <button data-act="json">Salvar arquivo .json</button>
                <button data-act="import">Abrir arquivo .json…</button>
                <button data-act="clear" class="danger">Limpar quadro</button>
              </div>
            </div>
            <input type="file" accept=".json,application/json" class="ed-file" hidden>
          </div>
        </div>
        <div class="ed-body">
          <div class="ed-tools">
            ${TOOLS.map(([t, n, k]) => `<button class="tool" data-tool="${t}" title="${n} (${k})">${ICON[t]}<span>${n}</span><kbd>${k}</kbd></button>`).join('')}
          </div>
          <div class="ed-main">
            <div class="ed-hint"></div>
            <div class="ed-canvas" tabindex="0"></div>
          </div>
          <aside class="ed-side">
            <div class="ed-props panel"></div>
            <div class="ed-lint"></div>
            <div class="ed-task"></div>
          </aside>
        </div>
      </div>`;
    S.canvas = $('.ed-canvas', container);
    container.addEventListener('click', onClick);
    S.canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    $('.ed-file', container).addEventListener('change', onImport);
    document.addEventListener('click', closeMenus);
    setTool('select');
    renderCanvas();
    renderProps();
    renderTask();
    // rola até o conteúdo
    requestAnimationFrame(() => fitScroll());
  }

  function unmount() {
    if (!S) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('click', closeMenus);
    S.root.removeEventListener('click', onClick);
    S = null;
  }

  function closeMenus(e) {
    if (!S) return;
    if (!e.target.closest('.menu')) S.root.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open'));
  }

  function fitScroll() {
    if (!S) return;
    const ns = S.model.nodes;
    if (!ns.length) { S.canvas.scrollLeft = 0; S.canvas.scrollTop = 0; return; }
    const minX = Math.min(...ns.map((n) => n.x)), minY = Math.min(...ns.map((n) => n.y));
    S.canvas.scrollLeft = Math.max(0, (minX - 120) * S.zoom);
    S.canvas.scrollTop = Math.max(0, (minY - 120) * S.zoom);
  }

  // ------------------------------------------------------------------ renderização
  function renderCanvas() {
    if (!S) return;
    const svg = ER.render(S.model, { fixed: { w: W, h: H }, zoom: S.zoom, sel: S.sel, pending: S.linkFrom, showEmpty: true, cls: 'editing' });
    const bg = ER.el('rect', { class: 'bg', x: 0, y: 0, width: W, height: H });
    svg.insertBefore(bg, svg.firstChild);
    const hl = S.lint ? new Set(S.lint.map((x) => x.id)) : null;
    if (hl) hl.forEach((id) => { const g = svg.querySelector(`[data-id="${CSS.escape(id)}"]`); if (g) g.classList.add('warn'); });
    S.canvas.innerHTML = '';
    S.canvas.appendChild(svg);
    S.svg = svg;
    $('.zoomv', S.root).textContent = Math.round(S.zoom * 100) + '%';
    changed();
  }

  let saveT = null;
  function changed() {
    clearTimeout(saveT);
    const m = S.model, cb = S.opts.onChange;
    saveT = setTimeout(() => cb && cb(clone(m)), 250);
  }

  function setTool(t) {
    S.tool = t;
    S.linkFrom = null;
    S.root.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    $('.ed-hint', S.root).textContent = TOOL_HINT[t];
    S.canvas.dataset.tool = t;
    renderCanvas();
  }

  function snap() {
    S.hist.push(JSON.stringify(S.model));
    if (S.hist.length > 150) S.hist.shift();
    S.fut = [];
  }
  function undo() {
    if (!S.hist.length) return toast('Nada para desfazer');
    S.fut.push(JSON.stringify(S.model));
    S.model = JSON.parse(S.hist.pop());
    S.sel = null; renderCanvas(); renderProps();
  }
  function redo() {
    if (!S.fut.length) return toast('Nada para refazer');
    S.hist.push(JSON.stringify(S.model));
    S.model = JSON.parse(S.fut.pop());
    S.sel = null; renderCanvas(); renderProps();
  }

  const node = (id) => S.model.nodes.find((n) => n.id === id);
  const link = (id) => S.model.links.find((l) => l.id === id);

  function pt(e) {
    const r = S.svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) / S.zoom, y: (e.clientY - r.top) / S.zoom };
  }

  function select(id) {
    S.sel = id;
    S.editSnap = false;
    renderCanvas();
    renderProps();
  }

  // ------------------------------------------------------------------ criação
  function addNode(t, p) {
    snap();
    const count = S.model.nodes.filter((n) => n.t === t).length + 1;
    const n = { id: nid(t[0]), t, name: t === 'ent' ? 'Entidade' + count : 'relac' + count, x: Math.round(p.x), y: Math.round(p.y) };
    S.model.nodes.push(n);
    setTool('select');
    select(n.id);
    focusName();
  }

  function freeSpot(o, cands) {
    for (const [dx, dy] of cands) {
      const x = o.x + dx, y = o.y + dy;
      if (!S.model.nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 26)) return { x, y };
    }
    const [dx, dy] = cands[0];
    return { x: o.x + dx + 14, y: o.y + dy + 14 };
  }

  function addAttr(owner) {
    snap();
    let p;
    if (owner.t === 'attr') p = freeSpot(owner, [[-30, 45], [0, 58], [30, 45], [-48, 22], [48, 22], [0, 85]]);
    else {
      const s = ER.size(owner);
      const hw = s.w / 2;
      p = freeSpot(owner, [[-hw + 12, -58], [hw - 12, -58], [0, -62], [-hw + 12, 58], [hw - 12, 58], [0, 62], [-hw - 40, 0], [hw + 40, 0], [-hw - 30, -40], [hw + 30, 40]]);
    }
    const a = { id: nid('a'), t: 'attr', name: 'atributo', x: Math.round(p.x), y: Math.round(p.y), owner: owner.id, key: false, card: '' };
    S.model.nodes.push(a);
    select(a.id);
    focusName();
  }

  function addGen(parent) {
    snap();
    const g = { id: nid('g'), t: 'gen', name: '', x: parent.x, y: parent.y + 70, parent: parent.id, children: [], total: false, disj: true };
    S.model.nodes.push(g);
    setTool('select');
    select(g.id);
    toast('Agora crie as entidades especializadas e marque-as no painel (ou use “Ligar” do triângulo até elas).');
  }

  function tryLink(a, b) {
    if (a.id === b.id && a.t !== 'ent') return toast('Escolha outro elemento para ligar.');
    if (a.t === 'attr' || b.t === 'attr') return toast('Atributos são criados com a ferramenta Atributo, não com Ligar.');
    if (a.t === 'gen' || b.t === 'gen') {
      const g = a.t === 'gen' ? a : b, e = a.t === 'gen' ? b : a;
      if (e.t !== 'ent') return toast('A especialização liga entidades.');
      snap();
      if (!g.parent) g.parent = e.id;
      else if (g.parent === e.id || g.children.includes(e.id)) return toast('Essa entidade já faz parte desta especialização.');
      else g.children.push(e.id);
      renderCanvas(); select(g.id);
      return;
    }
    let rel, ent;
    if (a.t === 'rel' && b.t === 'ent') { rel = a; ent = b; }
    else if (b.t === 'rel' && a.t === 'ent') { rel = b; ent = a; }
    else if (a.t === 'rel' && b.t === 'rel') {
      if (a.assoc && !b.assoc) { rel = b; ent = a; }
      else if (b.assoc && !a.assoc) { rel = a; ent = b; }
      else if (a.assoc && b.assoc) return toast('Ligue a entidade associativa a um relacionamento comum (losango).');
      else return toast('Relacionamento não se liga a relacionamento. Transforme um deles em ENTIDADE ASSOCIATIVA.');
    } else if (a.t === 'ent' && b.t === 'ent') {
      return toast('Entidades se ligam por meio de um relacionamento (losango): crie um losango entre elas.');
    }
    if (!rel) return;
    snap();
    const l = { id: nid('l'), a: rel.id, b: ent.id, min: '', max: '' };
    S.model.links.push(l);
    S.linkFrom = null;
    renderCanvas();
    S.sel = l.id; renderCanvas(); renderProps();
  }

  function del(id) {
    const n = node(id);
    snap();
    if (!n) {
      S.model.links = S.model.links.filter((l) => l.id !== id);
    } else {
      const kill = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        S.model.nodes.forEach((x) => { if (x.t === 'attr' && kill.has(x.owner) && !kill.has(x.id)) { kill.add(x.id); grew = true; } });
      }
      S.model.nodes.forEach((g) => {
        if (g.t !== 'gen') return;
        if (kill.has(g.parent)) kill.add(g.id);
        g.children = (g.children || []).filter((c) => !kill.has(c));
      });
      S.model.nodes = S.model.nodes.filter((x) => !kill.has(x.id));
      S.model.links = S.model.links.filter((l) => !kill.has(l.a) && !kill.has(l.b));
    }
    S.sel = null;
    renderCanvas(); renderProps();
  }

  // ------------------------------------------------------------------ eventos do quadro
  function onDown(e) {
    if (!S || e.button > 0) return;
    const g = e.target.closest('[data-id]');
    const id = g && g.dataset.id;
    const n = id && node(id), l = id && link(id);
    const p = pt(e);
    e.preventDefault(); // o foco é controlado aqui (evita roubar o foco do campo de nome)
    S.canvas.focus({ preventScroll: true });
    switch (S.tool) {
      case 'ent': case 'rel':
        if (n) { setTool('select'); select(id); startDrag(n, p); } else addNode(S.tool, p);
        break;
      case 'attr':
        if (n && n.t !== 'gen') addAttr(n); else toast('Clique numa entidade, relacionamento ou atributo.');
        break;
      case 'gen':
        if (n && n.t === 'ent') addGen(n); else toast('Clique na entidade genérica.');
        break;
      case 'link':
        if (!n) { S.linkFrom = null; renderCanvas(); break; }
        if (!S.linkFrom) { S.linkFrom = id; renderCanvas(); }
        else { const a = node(S.linkFrom); S.linkFrom = null; tryLink(a, n); }
        break;
      default:
        if (n) {
          const now = Date.now();
          const dbl = S.lastDown && S.lastDown.id === id && now - S.lastDown.t < 400;
          S.lastDown = { id, t: now };
          if (S.sel !== id) select(id);
          if (dbl && n.t !== 'gen') { focusName(); return; }
          startDrag(n, p);
        }
        else if (l) select(id);
        else if (S.sel) select(null);
    }
  }

  function startDrag(n, p) {
    const ids = [n.id];
    for (let i = 0; i < ids.length; i++) S.model.nodes.forEach((x) => { if (x.t === 'attr' && x.owner === ids[i]) ids.push(x.id); });
    const orig = {};
    ids.forEach((i) => { const x = node(i); orig[i] = { x: x.x, y: x.y }; });
    S.drag = { ids, p0: p, orig, moved: false };
  }

  function onMove(e) {
    if (!S || !S.drag) return;
    const p = pt(e), d = S.drag;
    const dx = p.x - d.p0.x, dy = p.y - d.p0.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    if (!d.moved) { snap(); d.moved = true; }
    d.ids.forEach((i) => { const x = node(i); if (x) { x.x = Math.round(d.orig[i].x + dx); x.y = Math.round(d.orig[i].y + dy); } });
    renderCanvas();
  }
  function onUp() { if (S) S.drag = null; }

  function onKey(e) {
    if (!S) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { if (S.tool !== 'select') setTool('select'); else select(null); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); del(S.sel); return; }
    const t = TOOLS.find((x) => x[2].toLowerCase() === e.key.toLowerCase());
    if (t) { setTool(t[0]); return; }
    if (S.sel && node(S.sel) && /^Arrow/.test(e.key)) {
      e.preventDefault();
      const d = e.shiftKey ? 20 : 5;
      const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
      snap();
      startDrag(node(S.sel), { x: 0, y: 0 });
      S.drag.ids.forEach((i) => { const x = node(i); x.x += dx; x.y += dy; });
      S.drag = null;
      renderCanvas();
    }
  }

  // ------------------------------------------------------------------ cliques nos botões
  function onClick(e) {
    const t = e.target.closest('[data-tool]');
    if (t) return setTool(t.dataset.tool);
    const b = e.target.closest('[data-act]');
    if (!b || !S) return;
    const act = b.dataset.act;
    const sel = S.sel && (node(S.sel) || link(S.sel));
    switch (act) {
      case 'back': S.opts.onBack && S.opts.onBack(); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'zin': S.zoom = Math.min(2, +(S.zoom + 0.1).toFixed(2)); renderCanvas(); break;
      case 'zout': S.zoom = Math.max(0.4, +(S.zoom - 0.1).toFixed(2)); renderCanvas(); break;
      case 'menu': b.parentElement.classList.toggle('open'); break;
      case 'png': exportImg('png'); break;
      case 'svg': exportImg('svg'); break;
      case 'json': download(fileBase() + '.json', new Blob([JSON.stringify(S.model, null, 1)], { type: 'application/json' })); break;
      case 'import': $('.ed-file', S.root).click(); break;
      case 'clear': if (confirm('Apagar tudo do quadro? (dá para desfazer com Ctrl+Z)')) { snap(); S.model = { nodes: [], links: [] }; S.sel = null; renderCanvas(); renderProps(); } break;
      case 'lint': runLint(); break;
      case 'lint-close': S.lint = null; $('.ed-lint', S.root).innerHTML = ''; renderCanvas(); break;
      case 'goto': select(b.dataset.id); break;
      case 'del': if (S.sel) del(S.sel); break;
      case 'add-attr': if (sel && sel.t) addAttr(sel); break;
      case 'add-gen': if (sel && sel.t === 'ent') addGen(sel); break;
      case 'card': if (sel && !sel.t) { snap(); const c = ER.parseCard(b.dataset.v); sel.min = c.min; sel.max = c.max; renderCanvas(); renderProps(); } break;
      case 'flip': if (sel && !sel.t) { snap(); sel.side = (sel.side || 1) * -1; renderCanvas(); } break;
      case 'check': runCheck(); break;
      case 'solution': S.opts.onSolution && S.opts.onSolution(); break;
      case 'reset': if (confirm('Recomeçar esta tarefa do zero?')) { snap(); S.model = clone(S.opts.task && S.opts.task.start ? S.opts.task.start() : { nodes: [], links: [] }); S.sel = null; S.results = null; renderCanvas(); renderProps(); renderTask(); } break;
      case 'toggle-text': $('.task-text', S.root).classList.toggle('collapsed'); break;
    }
  }

  function fileBase() {
    return (S.opts.title || 'diagrama').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase() || 'diagrama';
  }

  function onImport(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const m = JSON.parse(r.result);
        if (!m || !Array.isArray(m.nodes) || !Array.isArray(m.links)) throw new Error('formato');
        snap(); S.model = m; S.sel = null; renderCanvas(); renderProps(); fitScroll();
        toast('Diagrama carregado.');
      } catch (err) { toast('Arquivo inválido: esperava um .json exportado por esta Oficina.'); }
    };
    r.readAsText(f);
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function svgString(m) {
    const svg = ER.render(m, { pad: 24 });
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    const style = ER.el('style', null, null, EXPORT_CSS);
    svg.insertBefore(style, svg.firstChild);
    const bg = ER.el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: '#ffffff' });
    svg.insertBefore(bg, style.nextSibling);
    svg.removeAttribute('style');
    return { str: new XMLSerializer().serializeToString(svg), w: vb[2], h: vb[3] };
  }

  function exportImg(kind) {
    if (!S.model.nodes.length) return toast('O quadro está vazio.');
    const { str, w, h } = svgString(S.model);
    if (kind === 'svg') return download(fileBase() + '.svg', new Blob([str], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const k = 2;
      c.width = w * k; c.height = h * k;
      const g = c.getContext('2d');
      g.scale(k, k);
      g.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? download(fileBase() + '.png', b) : toast('Não foi possível gerar o PNG; use SVG.')), 'image/png');
    };
    img.onerror = () => toast('Não foi possível gerar o PNG; use SVG.');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
  }

  // ------------------------------------------------------------------ painel de propriedades
  function focusName() {
    const i = S && $('.ed-props input[name="name"]', S.root);
    if (i) { i.focus({ preventScroll: true }); i.select(); }
  }

  function nameOf(id) { const n = node(id); return n ? (n.name || '?') : '?'; }

  function renderProps() {
    if (!S) return;
    const box = $('.ed-props', S.root);
    const n = S.sel && node(S.sel), l = S.sel && link(S.sel);
    let h = '';
    if (!n && !l && S.opts.task && S.model.nodes.length) {
      h = '<p class="muted small" style="margin:0">Selecione um elemento para editá-lo aqui. Atalhos: <kbd>E</kbd> entidade, <kbd>R</kbd> relacionamento, <kbd>A</kbd> atributo, <kbd>L</kbd> ligar, <kbd>G</kbd> especialização, <kbd>Del</kbd> apagar.</p>';
    } else if (!n && !l) {
      h = `<h4>Como usar</h4>
        <ol class="howto">
          <li><b>Entidade</b> (E) e <b>Relacionamento</b> (R): escolha a ferramenta e clique no quadro.</li>
          <li><b>Ligar</b> (L): clique no losango e depois na entidade. Depois defina a cardinalidade no painel.</li>
          <li><b>Atributo</b> (A): clique no dono (entidade, losango ou atributo composto).</li>
          <li><b>Especialização</b> (G): clique na entidade genérica.</li>
          <li>Selecione algo para editar aqui. <kbd>Del</kbd> apaga, <kbd>Ctrl+Z</kbd> desfaz, setas movem.</li>
        </ol>
        <p class="muted small">Tudo é salvo automaticamente neste navegador.</p>`;
    } else if (l) {
      const r = node(l.a), e = node(l.b);
      const others = S.model.links.filter((x) => x.a === l.a && x.b !== l.b).map((x) => nameOf(x.b));
      const self = S.model.links.filter((x) => x.a === l.a && x.b === l.b).length > 1;
      let read;
      if (self) read = `No auto-relacionamento, a cardinalidade fica junto do <b>papel</b>: quantas ocorrências nesse papel se associam a uma ocorrência no outro papel.`;
      else if (others.length > 1) read = `Junto de <b>${esc(e && e.name)}</b>: quantas ocorrências de ${esc(e && e.name)} se associam a uma <b>combinação</b> de ${others.map(esc).join(' + ')}.`;
      else read = `Junto de <b>${esc(e && e.name)}</b>: quantas ocorrências de ${esc(e && e.name)} se associam a <b>uma</b> ocorrência de ${esc(others[0] || '?')}.`;
      const maxes = ['', '1', '2', '3', '4', '5', 'N'];
      h = `<h4>Ligação ${esc(r && r.name)} — ${esc(e && e.name)}</h4>
        <p class="small read">${read}</p>
        <div class="quick">${['(0,1)', '(1,1)', '(0,N)', '(1,N)'].map((c) => `<button class="chip${ER.cardText(l).toUpperCase() === c ? ' on' : ''}" data-act="card" data-v="${c}">${c}</button>`).join('')}</div>
        <div class="row2">
          <label>Mínima<select name="min"><option value="">?</option><option ${l.min === '0' ? 'selected' : ''}>0</option><option ${l.min === '1' ? 'selected' : ''}>1</option></select></label>
          <label>Máxima<select name="max">${maxes.map((v) => `<option value="${v}" ${String(l.max || '').toUpperCase() === v ? 'selected' : ''}>${v || '?'}</option>`).join('')}</select></label>
        </div>
        <label>Papel <span class="muted">(auto-relacionamento)</span><input name="role" value="${esc(l.role || '')}" placeholder="ex.: supervisor"></label>
        <label class="check"><input type="checkbox" name="weak" ${l.weak ? 'checked' : ''}> Relacionamento identificador (linha grossa — entidade fraca deste lado)</label>
        <div class="btns"><button class="btn small ghost" data-act="flip">Inverter lado do rótulo</button><button class="btn small danger" data-act="del">Excluir ligação</button></div>`;
    } else if (n.t === 'ent') {
      h = `<h4>Entidade</h4>
        <label>Nome<input name="name" value="${esc(n.name)}" placeholder="ex.: Empregados"></label>
        <div class="btns"><button class="btn small" data-act="add-attr">+ Atributo</button><button class="btn small ghost" data-act="add-gen">Criar especialização</button></div>
        <div class="btns"><button class="btn small danger" data-act="del">Excluir entidade</button></div>`;
    } else if (n.t === 'rel') {
      h = `<h4>${n.assoc ? 'Entidade associativa' : 'Relacionamento'}</h4>
        <label>Nome<input name="name" value="${esc(n.name)}" placeholder="ex.: lotação"></label>
        <label class="check"><input type="checkbox" name="assoc" ${n.assoc ? 'checked' : ''}> Entidade associativa (pode se ligar a outro relacionamento)</label>
        <div class="btns"><button class="btn small" data-act="add-attr">+ Atributo</button><button class="btn small danger" data-act="del">Excluir</button></div>`;
    } else if (n.t === 'attr') {
      const cards = [['', '(1,1) obrigatório — padrão'], ['(0,1)', '(0,1) opcional'], ['(1,N)', '(1,N) multivalorado'], ['(0,N)', '(0,N) opcional multivalorado']];
      h = `<h4>Atributo <span class="muted">de ${esc(nameOf(n.owner))}</span></h4>
        <label>Nome<input name="name" value="${esc(n.name)}" placeholder="ex.: Nome"></label>
        <label class="check"><input type="checkbox" name="key" ${n.key ? 'checked' : ''}> Identificador (●)</label>
        <label>Cardinalidade<select name="acard">${cards.map(([v, t]) => `<option value="${v}" ${(n.card || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Posição do nome<select name="lp">${[['', 'automática'], ['r', 'direita'], ['l', 'esquerda'], ['t', 'acima'], ['b', 'abaixo']].map(([v, t]) => `<option value="${v}" ${(n.lp || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <div class="btns"><button class="btn small" data-act="add-attr">+ Sub-atributo (composto)</button><button class="btn small danger" data-act="del">Excluir</button></div>`;
    } else if (n.t === 'gen') {
      const ents = S.model.nodes.filter((x) => x.t === 'ent');
      h = `<h4>Especialização</h4>
        <label>Entidade genérica<select name="gparent"><option value="">—</option>${ents.map((x) => `<option value="${x.id}" ${n.parent === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <div class="lbl">Especializadas</div>
        <div class="checks">${ents.filter((x) => x.id !== n.parent).map((x) => `<label class="check"><input type="checkbox" name="gchild" value="${x.id}" ${n.children.includes(x.id) ? 'checked' : ''}> ${esc(x.name)}</label>`).join('') || '<span class="muted small">Crie as entidades especializadas primeiro.</span>'}</div>
        <div class="row2">
          <label>Cobertura<select name="gtotal"><option value="p" ${!n.total ? 'selected' : ''}>p — parcial</option><option value="t" ${n.total ? 'selected' : ''}>t — total</option></select></label>
          <label>Sobreposição<select name="gdisj"><option value="d" ${n.disj ? 'selected' : ''}>d — disjunta</option><option value="c" ${!n.disj ? 'selected' : ''}>c — compartilhada</option></select></label>
        </div>
        <div class="btns"><button class="btn small danger" data-act="del">Excluir especialização</button></div>`;
    }
    box.innerHTML = h;
    box.querySelectorAll('input,select').forEach((inp) => {
      const ev = inp.type === 'checkbox' || inp.tagName === 'SELECT' ? 'change' : 'input';
      inp.addEventListener(ev, () => onProp(inp));
      if (inp.name === 'name') inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { inp.blur(); S.canvas.focus(); } });
    });
  }

  function onProp(inp) {
    const n = node(S.sel), l = link(S.sel);
    const v = inp.type === 'checkbox' ? inp.checked : inp.value;
    if (inp.name === 'name' || inp.name === 'role') {
      if (!S.editSnap) { snap(); S.editSnap = true; }
    } else snap();
    if (l) {
      if (inp.name === 'min') l.min = v;
      if (inp.name === 'max') l.max = v;
      if (inp.name === 'role') l.role = v;
      if (inp.name === 'weak') l.weak = v;
      renderCanvas();
      if (inp.name !== 'role') renderProps();
      return;
    }
    if (!n) return;
    if (inp.name === 'name') n.name = v;
    if (inp.name === 'assoc') { n.assoc = v; renderProps(); }
    if (inp.name === 'key') n.key = v;
    if (inp.name === 'acard') n.card = v;
    if (inp.name === 'lp') { if (v) n.lp = v; else delete n.lp; }
    if (inp.name === 'gparent') { n.parent = v || null; n.children = n.children.filter((c) => c !== v); renderProps(); }
    if (inp.name === 'gchild') { if (v) { if (!n.children.includes(inp.value)) n.children.push(inp.value); } else n.children = n.children.filter((c) => c !== inp.value); }
    if (inp.name === 'gtotal') n.total = v === 't';
    if (inp.name === 'gdisj') n.disj = v === 'd';
    renderCanvas();
  }

  // ------------------------------------------------------------------ validação e tarefa
  function runLint() {
    S.lint = WORKSHOP.lint(S.model);
    const box = $('.ed-lint', S.root);
    const errs = S.lint.filter((x) => x.lvl === 'erro').length;
    box.innerHTML = `<div class="panel lint">
      <div class="lint-head"><h4>Validação geral</h4><button class="btn small ghost" data-act="lint-close">Fechar</button></div>
      ${!S.model.nodes.length ? '<p class="muted small">O quadro está vazio.</p>' : S.lint.length === 0 ? '<p class="ok-msg">Nenhum problema encontrado pelas regras automáticas. 🎉</p>' :
        `<p class="small muted">${errs} erro(s), ${S.lint.length - errs} aviso(s). Clique para localizar.</p><ul class="lint-list">${S.lint.map((x) => `<li class="${x.lvl}"><button data-act="goto" data-id="${esc(x.id)}"><b>${x.lvl === 'erro' ? 'Erro' : 'Aviso'}:</b> ${esc(x.msg)}</button></li>`).join('')}</ul>`}
      <p class="small muted">As regras automáticas verificam a <i>forma</i> do diagrama (nomes, identificadores, cardinalidades, papéis…), não se ele atende ao enunciado.</p>
    </div>`;
    renderCanvas();
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function renderTask() {
    const box = $('.ed-task', S.root);
    const t = S.opts.task;
    if (!t) { box.innerHTML = ''; return; }
    const res = S.results;
    const allOk = res && res.every((r) => r.ok);
    box.innerHTML = `<div class="panel task">
      <div class="task-head"><span class="pill">${esc(t.concept)}</span></div>
      <div class="task-text"><p>${esc(t.text)}</p></div>
      <button class="linkbtn small" data-act="toggle-text">mostrar/ocultar enunciado</button>
      <ol class="steps">${t.steps.map((s, i) => {
        const r = res && res[i];
        const st = !r ? '' : r.ok ? 'ok' : 'no';
        return `<li class="${st}"><span class="mark">${!r ? '' : r.ok ? '✓' : '✗'}</span><div>${esc(s.d)}${r && !r.ok && (r.msg || s.h) ? `<div class="hint">💡 ${esc(r.msg || s.h)}</div>` : ''}</div></li>`;
      }).join('')}</ol>
      ${allOk ? '<div class="ok-msg big">Tarefa concluída! 🎉</div>' : ''}
      <div class="btns">
        <button class="btn primary" data-act="check">Verificar</button>
        <button class="btn ghost" data-act="solution">Ver solução sugerida</button>
        <button class="btn ghost small" data-act="reset">Recomeçar</button>
      </div>
    </div>`;
  }

  function runCheck() {
    const t = S.opts.task;
    S.results = WORKSHOP.check(t, S.model);
    renderTask();
    const ok = S.results.filter((r) => r.ok).length;
    if (ok === S.results.length) S.opts.onSolved && S.opts.onSolved(t);
    else toast(`${ok} de ${S.results.length} itens corretos`);
    if (S.opts.onCheck) S.opts.onCheck(ok, S.results.length);
  }

  function setModel(m) {
    if (!S) return;
    snap();
    S.model = clone(m);
    S.sel = null;
    renderCanvas(); renderProps(); fitScroll();
  }

  function toast(msg) { if (window.App && App.toast) App.toast(msg); else alert(msg); }

  window.Editor = { mount, unmount, setModel, svgString };
})();
