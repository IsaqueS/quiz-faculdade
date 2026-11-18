/* Renderizador de diagramas ER na notação usada nos slides (Heuser):
   entidade = retângulo, relacionamento = losango, atributo = círculo (● identificador),
   cardinalidade (mín,máx) junto à entidade, linha grossa = relacionamento identificador
   (entidade fraca), triângulo = generalização/especialização, losango dentro de retângulo
   = entidade associativa.

   Modelo:
   nodes: {id,t:'ent',name,x,y} | {id,t:'rel',name,x,y,assoc} |
          {id,t:'attr',name,x,y,owner,key,card,lp} | {id,t:'gen',x,y,parent,children:[],total,disj}
   links: {id,a:relId,b:entId,min,max,role,weak,side,slot}  (b = lado da entidade; a cardinalidade fica junto de b)
*/
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const FONT = '"Nunito","Segoe UI",system-ui,-apple-system,sans-serif';
  const ctx = document.createElement('canvas').getContext('2d');

  function tw(s, px = 15, w = 700) {
    ctx.font = `${w} ${px}px ${FONT}`;
    return ctx.measureText(s || '').width;
  }

  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function hasKids(m, n) {
    return m.nodes.some((x) => x.t === 'attr' && x.owner === n.id);
  }

  function size(n) {
    if (n.t === 'ent') return { w: Math.max(72, tw(n.name) + 28), h: 36 };
    if (n.t === 'rel') return { w: Math.max(100, tw(n.name) + 62), h: 56 };
    if (n.t === 'gen') return { w: 30, h: 24 };
    return { w: 12, h: 12 };
  }

  // Testa se o ponto está dentro da forma do nó
  function inside(m, n, x, y) {
    const s = size(n);
    const dx = Math.abs(x - n.x), dy = Math.abs(y - n.y);
    if (n.t === 'ent') return dx <= s.w / 2 && dy <= s.h / 2;
    if (n.t === 'rel') {
      if (n.assoc) return dx <= s.w / 2 + 9 && dy <= s.h / 2 + 8;
      return dx / (s.w / 2) + dy / (s.h / 2) <= 1;
    }
    if (n.t === 'attr') {
      if (hasKids(m, n)) return (dx / 12) ** 2 + (dy / 6) ** 2 <= 1;
      return dx * dx + dy * dy <= 36;
    }
    if (n.t === 'gen') return dx <= 15 && dy <= 12;
    return false;
  }

  // Ponto onde o segmento p0->p1 sai da forma de n (p0 dentro de n)
  function exitPoint(m, n, p0, p1) {
    if (!inside(m, n, p0.x, p0.y)) return { x: p0.x, y: p0.y };
    if (inside(m, n, p1.x, p1.y)) return { x: p1.x, y: p1.y };
    let lo = 0, hi = 1;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      const x = p0.x + (p1.x - p0.x) * mid, y = p0.y + (p1.y - p0.y) * mid;
      if (inside(m, n, x, y)) lo = mid; else hi = mid;
    }
    return { x: p0.x + (p1.x - p0.x) * hi, y: p0.y + (p1.y - p0.y) * hi };
  }

  function cardText(l) {
    if (l.min != null && l.min !== '' && l.max != null && l.max !== '') return `(${l.min},${l.max})`;
    if (l.max != null && l.max !== '') return String(l.max);
    return '';
  }

  function parseCard(s) {
    s = String(s || '').trim();
    let m = s.match(/^\(?\s*([0-9])\s*,\s*([0-9]+|[nN])\s*\)?$/);
    if (m) return { min: m[1], max: m[2].toUpperCase() };
    m = s.match(/^([0-9]+|[nN])$/);
    if (m) return { min: '', max: m[1].toUpperCase() };
    return { min: '', max: '' };
  }

  // Monta um modelo a partir de tuplas compactas
  // nodes: ['ent',id,name,x,y] | ['rel',id,name,x,y,{assoc}] | ['attr',id,name,x,y,{o,k,c,lp}] | ['gen',id,'',x,y,{p,ch,kind:'p,d'}]
  // links: [relId, entId, card('(0,N)'|'N'|'?A'), {role,weak,side}]
  function mk(nodes, links) {
    const m = { nodes: [], links: [] };
    nodes.forEach((t) => {
      const [type, id, name, x, y, o = {}] = t;
      const n = { id, t: type, name: name || '', x, y };
      if (type === 'rel' && o.assoc) n.assoc = true;
      if (type === 'attr') {
        n.owner = o.o; n.key = !!o.k; n.card = o.c || ''; if (o.lp) n.lp = o.lp;
      }
      if (type === 'gen') {
        n.parent = o.p || null; n.children = o.ch || [];
        const [a, b] = (o.kind || 'p,d').split(',');
        n.total = a === 't'; n.disj = b !== 'c';
      }
      m.nodes.push(n);
    });
    links.forEach((t, i) => {
      const [a, b, card, o = {}] = t;
      const l = { id: 'l' + i + '_' + a + '_' + b, a, b };
      if (card && card[0] === '?') l.slot = card.slice(1);
      else Object.assign(l, parseCard(card));
      if (o.role) l.role = o.role;
      if (o.weak) l.weak = true;
      if (o.side) l.side = o.side;
      m.links.push(l);
    });
    return m;
  }

  function render(m, o = {}) {
    const svg = el('svg', { class: 'er' + (o.cls ? ' ' + o.cls : ''), xmlns: NS });
    const gLinks = el('g', { class: 'er-links' }, svg);
    const gNodes = el('g', { class: 'er-nodes' }, svg);
    const gLabels = el('g', { class: 'er-labels' }, svg);
    const by = {};
    m.nodes.forEach((n) => (by[n.id] = n));
    const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const grow = (x0, y0, x1, y1) => {
      bb.x0 = Math.min(bb.x0, x0); bb.y0 = Math.min(bb.y0, y0);
      bb.x1 = Math.max(bb.x1, x1); bb.y1 = Math.max(bb.y1, y1);
    };
    const cls = (id, base) => {
      let c = base;
      if (o.sel === id) c += ' sel';
      if (o.pending === id) c += ' pending';
      if (o.hl && o.hl.has(id)) c += ' hl';
      if (o.picked && o.picked.has(id)) c += ' picked';
      if (o.good && o.good.has(id)) c += ' good';
      if (o.bad && o.bad.has(id)) c += ' bad';
      if (o.clickable) c += ' ck';
      return c;
    };

    // --- ligações entre relacionamentos e entidades
    const pairCount = {}, pairIdx = {};
    m.links.forEach((l) => {
      const k = l.a + '|' + l.b;
      pairCount[k] = (pairCount[k] || 0) + 1;
    });
    m.links.forEach((l) => {
      const A = by[l.a], B = by[l.b];
      if (!A || !B) return;
      const k = l.a + '|' + l.b;
      const idx = (pairIdx[k] = (pairIdx[k] || 0) + 1) - 1;
      const cnt = pairCount[k];
      let dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const px = -dy, py = dx;
      const off = (idx - (cnt - 1) / 2) * 18;
      const a0 = { x: A.x + px * off, y: A.y + py * off };
      const b0 = { x: B.x + px * off, y: B.y + py * off };
      const pA = exitPoint(m, A, a0, b0);
      const pB = exitPoint(m, B, b0, a0);
      const g = el('g', { class: cls(l.id, 'er-link'), 'data-id': l.id }, gLinks);
      el('line', { class: 'hit', x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y }, g);
      el('line', { class: 'line' + (l.weak ? ' weak' : ''), x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y }, g);

      // posição do rótulo de cardinalidade, junto da entidade (lado b)
      let vx = pA.x - pB.x, vy = pA.y - pB.y;
      const vl = Math.hypot(vx, vy) || 1;
      vx /= vl; vy /= vl;
      let side = l.side || (cnt > 1 ? (idx === 0 ? 1 : -1) : 1);
      if (cnt > 1 && !l.side) {
        // em auto-relacionamentos, rótulo de cima vai para cima e o de baixo para baixo
        const horiz = Math.abs(vx) >= Math.abs(vy);
        if (horiz) side = (b0.y < B.y) ? 1 : -1; else side = (b0.x > B.x) ? 1 : -1;
      }
      const horiz = Math.abs(vx) >= Math.abs(vy);
      const along = horiz ? 26 : 20;
      const bx = pB.x + vx * along, by_ = pB.y + vy * along;
      let txt = cardText(l);
      const emptyCard = !txt && o.showEmpty;
      if (emptyCard) txt = '(?,?)';
      let tx, ty, anchor;
      if (horiz) { tx = bx; ty = side > 0 ? by_ - 7 : by_ + 18; anchor = 'middle'; }
      else { tx = side > 0 ? bx + 7 : bx - 7; ty = by_ + 5; anchor = side > 0 ? 'start' : 'end'; }

      if (l.slot) {
        const val = o.slotValues && o.slotValues[l.slot];
        const w = Math.max(44, val ? tw(val, 14) + 16 : 44);
        let cx = tx, cy = ty - 5;
        if (!horiz) cx = side > 0 ? tx + w / 2 : tx - w / 2;
        const sg = el('g', { class: 'slot' + (val ? ' filled' : '') + (o.slotState && o.slotState[l.slot] ? ' ' + o.slotState[l.slot] : ''), 'data-slot': l.slot }, gLabels);
        el('rect', { x: cx - w / 2, y: cy - 12, width: w, height: 24, rx: 7 }, sg);
        el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle' }, sg, val || l.slot);
        grow(cx - w / 2, cy - 12, cx + w / 2, cy + 12);
      } else if (txt) {
        el('text', { class: 'card' + (emptyCard ? ' empty' : ''), x: tx, y: ty, 'text-anchor': anchor }, gLabels, txt);
        const w = tw(txt, 14);
        const x0 = anchor === 'middle' ? tx - w / 2 : anchor === 'start' ? tx : tx - w;
        grow(x0, ty - 14, x0 + w, ty + 4);
      }
      if (l.role) {
        let rx = tx, ry, ra = anchor;
        if (horiz) ry = side > 0 ? ty - 17 : ty + 17;
        else { ry = ty + 17; }
        el('text', { class: 'role', x: rx, y: ry, 'text-anchor': ra }, gLabels, l.role);
        const w = tw(l.role, 13);
        const x0 = ra === 'middle' ? rx - w / 2 : ra === 'start' ? rx : rx - w;
        grow(x0, ry - 13, x0 + w, ry + 4);
      }
      grow(Math.min(pA.x, pB.x), Math.min(pA.y, pB.y), Math.max(pA.x, pB.x), Math.max(pA.y, pB.y));
    });

    // --- generalizações
    m.nodes.filter((n) => n.t === 'gen').forEach((n) => {
      const g = el('g', { class: cls(n.id, 'er-node gen'), 'data-id': n.id }, gNodes);
      const apex = { x: n.x, y: n.y - 12 }, base = { x: n.x, y: n.y + 12 };
      const P = by[n.parent];
      if (P) {
        const p = exitPoint(m, P, { x: P.x, y: P.y }, apex);
        el('line', { class: 'line', x1: p.x, y1: p.y, x2: apex.x, y2: apex.y }, gLinks);
      }
      (n.children || []).forEach((cid) => {
        const C = by[cid];
        if (!C) return;
        const p = exitPoint(m, C, { x: C.x, y: C.y }, base);
        el('line', { class: 'line', x1: base.x, y1: base.y, x2: p.x, y2: p.y }, gLinks);
      });
      el('circle', { class: 'hit', cx: n.x, cy: n.y, r: 20 }, g);
      el('polygon', { class: 'shape tri', points: `${n.x},${n.y - 12} ${n.x - 14},${n.y + 12} ${n.x + 14},${n.y + 12}` }, g);
      const lab = `(${n.total ? 't' : 'p'},${n.disj ? 'd' : 'c'})`;
      el('text', { class: 'card', x: n.x + 18, y: n.y + 5 }, g, lab);
      grow(n.x - 16, n.y - 14, n.x + 20 + tw(lab, 14), n.y + 14);
    });

    // --- atributos (linhas primeiro)
    m.nodes.filter((n) => n.t === 'attr').forEach((n) => {
      const O = by[n.owner];
      if (!O) return;
      const p1 = exitPoint(m, O, { x: O.x, y: O.y }, n);
      const p2 = exitPoint(m, n, { x: n.x, y: n.y }, O);
      el('line', { class: 'line attr-line', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }, gLinks);
    });

    // --- entidades e relacionamentos
    m.nodes.forEach((n) => {
      if (n.t !== 'ent' && n.t !== 'rel') return;
      const s = size(n);
      const g = el('g', { class: cls(n.id, 'er-node ' + n.t + (n.assoc ? ' assoc' : '')), 'data-id': n.id }, gNodes);
      if (n.t === 'ent') {
        el('rect', { class: 'shape', x: n.x - s.w / 2, y: n.y - s.h / 2, width: s.w, height: s.h, rx: 2 }, g);
        grow(n.x - s.w / 2, n.y - s.h / 2, n.x + s.w / 2, n.y + s.h / 2);
      } else {
        if (n.assoc) {
          el('rect', { class: 'shape assoc-box', x: n.x - s.w / 2 - 9, y: n.y - s.h / 2 - 8, width: s.w + 18, height: s.h + 16, rx: 2 }, g);
          grow(n.x - s.w / 2 - 9, n.y - s.h / 2 - 8, n.x + s.w / 2 + 9, n.y + s.h / 2 + 8);
        }
        el('polygon', { class: 'shape', points: `${n.x},${n.y - s.h / 2} ${n.x + s.w / 2},${n.y} ${n.x},${n.y + s.h / 2} ${n.x - s.w / 2},${n.y}` }, g);
        grow(n.x - s.w / 2, n.y - s.h / 2, n.x + s.w / 2, n.y + s.h / 2);
      }
      el('text', { class: 'name', x: n.x, y: n.y + 5, 'text-anchor': 'middle' }, g, n.name || (n.t === 'ent' ? 'Entidade' : 'relac.'));
    });

    // --- atributos (formas e rótulos)
    m.nodes.filter((n) => n.t === 'attr').forEach((n) => {
      const g = el('g', { class: cls(n.id, 'er-node attr'), 'data-id': n.id }, gNodes);
      const comp = hasKids(m, n);
      if (comp) el('ellipse', { class: 'dot' + (n.key ? ' k' : ''), cx: n.x, cy: n.y, rx: 12, ry: 6 }, g);
      else el('circle', { class: 'dot' + (n.key ? ' k' : ''), cx: n.x, cy: n.y, r: 5.5 }, g);
      el('circle', { class: 'hit', cx: n.x, cy: n.y, r: 13 }, g);
      const O = by[n.owner];
      let lp = n.lp;
      if (!lp) lp = O && n.x < O.x - 2 ? 'l' : 'r';
      const label = (n.name || 'atributo') + (n.card ? ' ' + n.card : '');
      const w = tw(label, 13.5, 600);
      const off = comp ? 16 : 10;
      let x, y, a;
      if (lp === 'l') { x = n.x - off; y = n.y + 5; a = 'end'; }
      else if (lp === 't') { x = n.x; y = n.y - 11; a = 'middle'; }
      else if (lp === 'b') { x = n.x; y = n.y + 21; a = 'middle'; }
      else { x = n.x + off; y = n.y + 5; a = 'start'; }
      el('text', { x, y, 'text-anchor': a }, g, label);
      const x0 = a === 'middle' ? x - w / 2 : a === 'start' ? x : x - w;
      grow(Math.min(x0, n.x - 8), Math.min(y - 14, n.y - 8), Math.max(x0 + w, n.x + 8), Math.max(y + 4, n.y + 8));
    });

    const pad = o.pad == null ? 14 : o.pad;
    if (o.fixed) {
      svg.setAttribute('viewBox', `0 0 ${o.fixed.w} ${o.fixed.h}`);
      svg.setAttribute('width', o.fixed.w * (o.zoom || 1));
      svg.setAttribute('height', o.fixed.h * (o.zoom || 1));
    } else {
      if (!isFinite(bb.x0)) { bb.x0 = 0; bb.y0 = 0; bb.x1 = 100; bb.y1 = 40; }
      const w = bb.x1 - bb.x0 + pad * 2, h = bb.y1 - bb.y0 + pad * 2;
      svg.setAttribute('viewBox', `${bb.x0 - pad} ${bb.y0 - pad} ${w} ${h}`);
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
    }
    svg.__bbox = bb;
    return svg;
  }

  window.ER = { render, mk, size, tw, cardText, parseCard, el, NS };
})();
