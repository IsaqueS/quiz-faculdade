/* Matéria: Sistemas Operacionais — Prova 2 (INE5611/INE5412, UFSC).
   Fontes: slides de Gerência de Memória (Prof. Camilo), Memória física e espaços de endereçamento,
   Gerenciamento de memória livre, Paginação, Segmentação, Substituição de páginas e Projeto de
   paginação (Prof. Márcio Castro) + provas 2 de 2019-1, 2019-2 e 2022 (com gabarito).
   Formato geral em COMO-ADICIONAR-CONTEUDO.md. */
(function () {
  // ------------------------------------------------------------------ utilidades
  const T = (head, rows, cls) => `<table class="gt ${cls || ''}">` +
    (head ? '<tr>' + head.map((h) => `<th>${h}</th>`).join('') + '</tr>' : '') +
    rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>';
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtN = (n) => Number(n).toLocaleString('pt-BR');
  const human = (bytes) => {
    if (bytes >= 2 ** 30) return fmtN(bytes / 2 ** 30) + ' GB';
    if (bytes >= 2 ** 20) return fmtN(bytes / 2 ** 20) + ' MB';
    if (bytes >= 2 ** 10) return fmtN(bytes / 2 ** 10) + ' KB';
    return bytes + ' B';
  };
  const bin = (n, w) => n.toString(2).padStart(w, '0');
  const group4 = (s) => s.replace(/\B(?=(\d{4})+(?!\d))/g, ' ');

  // mapa de memória horizontal: [['P1', 20], ['livre', 10, true], ...]
  const mem = (blocks) => '<div class="memmap">' + blocks.map(([l, kb, free]) =>
    `<div class="mb ${free ? 'free' : ''}" style="flex:${kb}"><b>${l}</b><span>${kb} KB</span></div>`).join('') + '</div>';

  // ------------------------------------------------------------------ simulador de substituição de páginas
  const ALG_NAME = { fifo: 'FIFO', lru: 'LRU', opt: 'Ótimo', clock: 'Relógio (segunda chance)' };
  function simulate(alg, refs, n) {
    const fr = Array(n).fill(null), R = Array(n).fill(0), last = Array(n).fill(-1), loaded = Array(n).fill(-1);
    let ptr = 0, faults = 0;
    const steps = [], victims = [];
    refs.forEach((p, t) => {
      let i = fr.indexOf(p), fault = false, out = null;
      if (i >= 0) { R[i] = 1; last[i] = t; }
      else {
        fault = true; faults++;
        let v = fr.indexOf(null);
        if (alg === 'clock') {
          for (;;) {
            if (fr[ptr] === null || R[ptr] === 0) { v = ptr; ptr = (ptr + 1) % n; break; }
            R[ptr] = 0; ptr = (ptr + 1) % n;
          }
        } else if (v < 0) {
          const arg = (arr, better) => arr.reduce((b, x, k) => (better(x, arr[b]) ? k : b), 0);
          if (alg === 'fifo') v = arg(loaded, (a, b) => a < b);
          else if (alg === 'lru') v = arg(last, (a, b) => a < b);
          else {
            const nxt = fr.map((x) => { const k = refs.indexOf(x, t + 1); return k < 0 ? Infinity : k; });
            v = arg(nxt, (a, b) => a > b);
          }
        }
        out = fr[v];
        if (out !== null) victims.push(out);
        fr[v] = p; R[v] = 1; last[v] = t; loaded[v] = t; i = v;
      }
      steps.push({ ref: p, frames: fr.slice(), R: R.slice(), ptr, fault, out, slot: i });
    });
    return { faults, steps, victims, alg, refs, n };
  }
  function simTable(res) {
    const { steps, n, alg } = res;
    let h = '<div class="sim-scroll"><table class="gt sim"><tr><th>Quadro</th>' + steps.map((s) => `<th>${s.ref}</th>`).join('') + '</tr>';
    for (let k = 0; k < n; k++) {
      h += `<tr><th>${k}</th>` + steps.map((s) => {
        const v = s.frames[k];
        if (v === null) return '<td></td>';
        let c = String(v);
        if (alg === 'clock') c += `<sub>${s.R[k]}</sub>`;
        if (alg === 'clock' && s.ptr === k) c = '<span class="ptr">►</span>' + c;
        return `<td class="${s.fault && s.slot === k ? 'new' : ''}">${c}</td>`;
      }).join('') + '</tr>';
    }
    h += '<tr><th>Falta</th>' + steps.map((s) => `<td class="mark">${s.fault ? 'A' : ''}</td>`).join('') + '</tr></table></div>';
    return h + `<p class="small"><b>${res.faults} ausências de página</b> (${ALG_NAME[alg]}, ${n} quadros).${alg === 'clock' ? ' Número pequeno = bit R; ► = ponteiro depois da referência.' : ''}</p>`;
  }
  const parseRefs = (s) => String(s).split(/[\s,;]+/).filter(Boolean).map((x) => (isNaN(+x) ? x : +x));

  function simWidget(el) {
    el.innerHTML = `<div class="sim-form">
        <label>Sequência de referências<input type="text" data-k="refs" value="0 1 2 3 0 1 4 0 1 2 3 4"></label>
        <label>Quadros<input type="number" min="1" max="10" value="3" data-k="n"></label>
        <label>Algoritmo<select data-k="alg">${Object.keys(ALG_NAME).map((k) => `<option value="${k}" ${k === 'clock' ? 'selected' : ''}>${ALG_NAME[k]}</option>`).join('')}</select></label>
      </div><div class="sim-out"></div>`;
    const run = () => {
      const refs = parseRefs(el.querySelector('[data-k="refs"]').value);
      const n = Math.max(1, Math.min(10, +el.querySelector('[data-k="n"]').value || 1));
      const alg = el.querySelector('[data-k="alg"]').value;
      const out = el.querySelector('.sim-out');
      if (!refs.length) { out.innerHTML = '<p class="muted small">Digite a sequência (números separados por espaço).</p>'; return; }
      const cmp = Object.keys(ALG_NAME).map((a) => `${ALG_NAME[a].split(' ')[0]}: <b>${simulate(a, refs, n).faults}</b>`).join(' · ');
      const bel = ['fifo', 'clock'].filter((a) => simulate(a, refs, n + 1).faults > simulate(a, refs, n).faults).map((a) => ALG_NAME[a].split(' ')[0]);
      out.innerHTML = simTable(simulate(alg, refs, n)) +
        `<p class="small muted">Comparação com ${n} quadros — ${cmp}.</p>` +
        (bel.length ? `<p class="small"><b>Anomalia de Belady:</b> com ${n + 1} quadros, ${bel.join(' e ')} tem MAIS faltas que com ${n}.</p>` : '');
    };
    el.addEventListener('input', run);
    el.addEventListener('change', run);
    run();
  }

  // ------------------------------------------------------------------ calculadora de paginação
  const UNIT = { B: 1, KB: 2 ** 10, MB: 2 ** 20, GB: 2 ** 30 };
  function calcWidget(el) {
    const unitSel = (k, def) => `<select data-k="${k}">${Object.keys(UNIT).map((u) => `<option ${u === def ? 'selected' : ''}>${u}</option>`).join('')}</select>`;
    el.innerHTML = `<div class="sim-form">
        <label>Tamanho da página<span class="row"><input type="number" min="1" value="2" data-k="ps">${unitSel('psu', 'KB')}</span></label>
        <label>Bits do endereço virtual<input type="number" min="1" max="64" value="16" data-k="va"></label>
        <label>Memória física<span class="row"><input type="number" min="0.001" step="any" value="16" data-k="pm">${unitSel('pmu', 'MB')}</span></label>
        <label>Bits extras por entrada<input type="number" min="0" max="32" value="4" data-k="ctl" title="validade, referência, sujo, proteção…"></label>
        <label>Endereço virtual (opcional)<input type="text" placeholder="ex.: 4196 ou 0x1064" data-k="addr"></label>
      </div><div class="sim-out"></div>`;
    const v = (k) => el.querySelector(`[data-k="${k}"]`).value;
    const run = () => {
      const out = el.querySelector('.sim-out');
      const ps = +v('ps') * UNIT[v('psu')], pm = +v('pm') * UNIT[v('pmu')], va = +v('va'), ctl = +v('ctl') || 0;
      const lg = (x) => Math.log2(x);
      if (!(ps > 0 && pm > 0 && va > 0) || !Number.isInteger(lg(ps)) || !Number.isInteger(lg(pm))) {
        out.innerHTML = '<p class="small muted">Use potências de 2 (ex.: 2 KB, 4 KB, 16 MB, 0.5 MB).</p>'; return;
      }
      const off = lg(ps), pb = va - off, phys = lg(pm), fb = phys - off;
      if (pb < 0 || fb < 0) { out.innerHTML = '<p class="small muted">A página não pode ser maior que o espaço de endereços.</p>'; return; }
      const entries = 2 ** pb, entry = fb + ctl, tbits = entries * entry;
      let addr = '';
      const a = v('addr').trim().toLowerCase();
      if (a) {
        const x = a.startsWith('0x') ? parseInt(a, 16) : a.startsWith('0b') ? parseInt(a.slice(2), 2) : parseInt(a, 10);
        if (Number.isFinite(x) && x >= 0 && x < 2 ** va) {
          addr = T(['Endereço', 'Página', 'Deslocamento'], [[`${fmtN(x)}<br><code>${group4(bin(x, va))}</code>`, `${Math.floor(x / ps)}<br><code>${pb ? group4(bin(Math.floor(x / ps), pb)) : '—'}</code>`, `${x % ps}<br><code>${group4(bin(x % ps, off))}</code>`]]);
        } else addr = '<p class="small muted">Endereço fora do espaço virtual.</p>';
      }
      out.innerHTML = T(['Grandeza', 'Conta', 'Resultado'], [
        ['Bits de deslocamento', `log₂(${human(ps)})`, `<b>${off}</b>`],
        ['Bits do nº da página', `${va} − ${off}`, `<b>${pb}</b>`],
        ['Nº de páginas (entradas da tabela)', `2^${pb}`, `<b>${fmtN(entries)}</b>`],
        ['Bits do endereço físico', `log₂(${human(pm)})`, `<b>${phys}</b>`],
        ['Bits do nº do quadro', `${phys} − ${off}`, `<b>${fb}</b>`],
        ['Nº de quadros', `2^${fb}`, `<b>${fmtN(2 ** fb)}</b>`],
        ['Tamanho da entrada', `${fb} + ${ctl}`, `<b>${entry} bits</b>`],
        ['Tamanho da tabela de páginas', `${fmtN(entries)} × ${entry}`, `<b>${fmtN(tbits)} bits = ${fmtN(tbits / 8)} B</b>`],
      ]) + addr;
    };
    el.addEventListener('input', run);
    el.addEventListener('change', run);
    run();
  }

  // ------------------------------------------------------------------ perguntas geradas (números novos a cada vez)
  function genBits() {
    const off = rnd(10, 14);
    const va = pick([16, 20, 24, 32].filter((x) => x >= off + 3));
    const phys = rnd(off + 3, Math.min(off + 18, 32));
    const kind = pick(['page', 'frame', 'entries', 'off']);
    const base = `Páginas de ${human(2 ** off)}, endereços virtuais de ${va} bits e memória física de ${human(2 ** phys)}.`;
    const how = `Deslocamento = log₂(${human(2 ** off)}) = ${off} bits. Página = ${va} − ${off} = ${va - off} bits. Endereço físico = log₂(${human(2 ** phys)}) = ${phys} bits → quadro = ${phys} − ${off} = ${phys - off} bits.`;
    if (kind === 'page') return { t: 'input', q: `${base}\nQuantos bits identificam o NÚMERO DA PÁGINA?`, a: String(va - off), suf: 'bits', e: how };
    if (kind === 'frame') return { t: 'input', q: `${base}\nQuantos bits identificam o NÚMERO DO QUADRO (moldura)?`, a: String(phys - off), suf: 'bits', e: how };
    if (kind === 'off') return { t: 'input', q: `${base}\nQuantos bits tem o DESLOCAMENTO (offset)?`, a: String(off), suf: 'bits', e: how };
    return { t: 'input', q: `${base}\nQuantas entradas tem a tabela de páginas de um processo?`, a: [String(2 ** (va - off)), `2^${va - off}`], e: how + ` Entradas = 2^${va - off} = ${fmtN(2 ** (va - off))}.` };
  }
  function randRefs() {
    const len = 12, out = [];
    while (out.length < len) {
      if (out.length > 2 && Math.random() < 0.4) out.push(out[rnd(Math.max(0, out.length - 4), out.length - 1)]);
      else out.push(rnd(0, 5));
      if (out.length > 1 && out[out.length - 1] === out[out.length - 2]) out.pop();
    }
    return out;
  }
  const genFaults = (alg) => () => {
    const refs = randRefs(), n = pick([3, 3, 4]);
    const r = simulate(alg, refs, n);
    return {
      t: 'input', q: `Sequência de referências:\n${refs.join('  ')}\nCom ${n} quadros inicialmente vazios e o algoritmo ${ALG_NAME[alg]}, quantas ausências de página ocorrem?`,
      a: String(r.faults), suf: 'faltas',
      e: `${r.faults} ausências. Páginas expulsas, em ordem: ${r.victims.join(', ') || 'nenhuma'}. Monte a tabela no simulador da aba Resumo para conferir passo a passo.`,
    };
  };
  function genTranslate() {
    const off = pick([10, 11, 12]), size = 2 ** off;
    const frames = [];
    while (frames.length < 8) { const f = rnd(0, 15); if (!frames.includes(f)) frames.push(f); }
    const invalid = [rnd(0, 7)];
    let p;
    do { p = rnd(0, 7); } while (invalid.includes(p));
    const d = rnd(0, size - 1), vaddr = p * size + d, phys = frames[p] * size + d;
    return {
      t: 'input',
      q: `Páginas de ${human(size)}. Tabela de páginas do processo abaixo. Qual o endereço FÍSICO (decimal) do endereço virtual ${vaddr}?`,
      fig: T(['Página', 'Válida', 'Quadro'], frames.map((f, i) => [i, invalid.includes(i) ? 0 : 1, invalid.includes(i) ? '—' : f])),
      a: String(phys),
      e: `Página = ${vaddr} div ${size} = ${p}; deslocamento = ${vaddr} mod ${size} = ${d}. Página ${p} → quadro ${frames[p]}. Físico = ${frames[p]} × ${size} + ${d} = ${phys}.`,
    };
  }
  const EXAM_PT = [0b111, 0b000, 0b001, 0b010];
  const EXAM_PT_FIG = T(['Página', 'Validade', 'Quadro (frame)'], [['00', 1, '111'], ['01', 1, '000'], ['10', 1, '001'], ['11', 1, '010']]);
  function genHex() {
    const va = rnd(0, 2 ** 20 - 1), p = va >> 18, off = va & (2 ** 18 - 1), pa = (EXAM_PT[p] << 18) | off;
    const hx = pa.toString(16).toUpperCase();
    return {
      t: 'input', q: `MMU da prova (2 bits de página, 18 de deslocamento, quadros de 3 bits). Endereço lógico: 0x${va.toString(16).toUpperCase().padStart(5, '0')}\nQual o endereço físico em hexadecimal?`,
      fig: EXAM_PT_FIG, a: [hx, '0x' + hx], ph: 'ex.: 9AF30',
      e: `Binário: ${group4(bin(va, 20))}. Página = ${bin(p, 2)} → quadro ${bin(EXAM_PT[p], 3)}. Físico = ${bin(EXAM_PT[p], 3)} + ${bin(off, 18)} = ${group4(bin(pa, 21))} = 0x${hx}.`,
    };
  }

  // ------------------------------------------------------------------ figuras usadas nos guias/perguntas
  const SLIDE_PT = T(['Página', 'Faixa virtual', 'Presente', 'Moldura'], [[7, '28K–32K', 1, '2 (10)'], [6, '24K–28K', 1, '3 (11)'], [5, '20K–24K', 0, '—'], [4, '16K–20K', 0, '—'], [3, '12K–16K', 0, '—'], [2, '8K–12K', 0, '—'], [1, '4K–8K', 1, '0 (00)'], [0, '0K–4K', 1, '1 (01)']]);
  const REFS_19_1 = [0, 1, 2, 3, 0, 1, 4, 0, 1, 2, 3, 4];
  const REFS_19_2 = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
  const HOLES = 'Buracos livres, em ordem de endereço: <b>10 KB, 4 KB, 20 KB, 18 KB, 7 KB, 9 KB, 12 KB, 15 KB</b>.';
  const AFTER_VII = mem([['livre', 10, 1], ['P1', 20], ['livre', 30, 1], ['P3', 30], ['P4', 5], ['livre', 5, 1]]);
  const AFTER_VIII = mem([['livre', 10, 1], ['P1', 20], ['P5', 5], ['livre', 25, 1], ['P3', 30], ['P4', 5], ['livre', 5, 1]]);
  const BITMAP_STEPS = T(['Momento', 'Bitmap (bloco 15 … bloco 0)', 'Por quê'], [
    ['Formatado', '<code>0000 0000 0000 0001</code>', 'bloco 0 = diretório-raiz'],
    ['Após A (6 blocos)', '<code>0000 0000 0111 1111</code>', 'blocos 1–6'],
    ['B grava 5 blocos', '<code>0000 1111 1111 1111</code>', 'blocos 7–11'],
    ['A é apagado', '<code>0000 1111 1000 0001</code>', 'libera 1–6'],
    ['C de 30 KB', '<code>0011 1111 1111 1111</code>', '⌈30/4⌉ = 8 blocos: 1–6, 12, 13'],
    ['D de 64.000 bits', '<code>1111 1111 1111 1111</code>', '8.000 B → 2 blocos: 14, 15'],
  ]);
  const AGING = T(['Página', 'R nos períodos 0→5', 'Contador após o período 5'], [
    [0, '1 1 0 1 1 1', '<code>11101100</code>'], [1, '0 0 0 1 0 0', '<code>00100000</code> ← menor: sai'],
    [2, '0 1 1 1 1 1', '<code>11111000</code>'], [3, '0 0 1 0 1 0', '<code>01010000</code>'],
  ]);

  // ------------------------------------------------------------------ unidades
  const UNITS = [
    // ---------------------------------------------------------------- 1
    {
      id: 'mem', title: 'Memória: conceitos', sub: 'Hierarquia, lógico × físico, MMU', color: '#1cb0f6',
      guide: [
        '<p>O ideal seria uma memória <b>privada, infinita, extremamente rápida, não volátil e barata</b>. Nenhuma tecnologia faz tudo isso, então usamos uma <b>hierarquia de memória</b>:</p>',
        T(['Nível', 'Capacidade', 'Características'], [['Registradores / caches (L1, L2, L3)', 'alguns MB', 'voláteis, extremamente rápidas e caras'], ['Memória principal (RAM)', 'alguns GB', 'volátil, velocidade e custo médios; acessada diretamente pela CPU'], ['Memória secundária (disco/SSD)', 'alguns TB', 'não volátil, lenta e barata; guarda os programas']]),
        '<p>Para executar, o programa precisa ser trazido da memória <b>secundária</b> para a <b>principal</b>.</p>',
        '<p><b>Gerenciador de memória</b>: parte do SO que controla quais partes da memória estão livres ou em uso, aloca/desaloca memória dos processos e faz o swapping. Depende de recursos do hardware.</p>',
        T(['Memória lógica', 'Memória física'], [['Aquela que o processo consegue endereçar com suas instruções', 'A implementada pelos circuitos de memória'], ['Endereços manipulados pelo processo = <b>endereços lógicos</b>', 'Endereço usado para acessar uma posição real = <b>endereço físico</b>'], ['Espaço de endereçamento lógico: todos os endereços que o processo pode gerar', 'Espaço de endereçamento físico: todos os endereços aceitos pelos chips']]),
        '<p><b>MMU (Memory Management Unit)</b>: componente de <b>hardware</b>, geralmente no mesmo chip do processador, que traduz endereços lógicos em físicos <b>em tempo de execução</b> e dá suporte à proteção. CPU → (lógico) → MMU → (físico) → memória.</p>',
        '<p class="tip">Níveis de abstração: <b>sem abstração</b> (memória física exposta) → <b>espaços de endereçamento</b> (base e limite) → <b>memória virtual</b> (paginação/segmentação).</p>',
      ],
      lessons: [
        {
          title: 'Hierarquia e MMU', qs: [
            { t: 'mc', q: 'Por que os computadores usam uma hierarquia de memória?', o: ['Nenhuma tecnologia é ao mesmo tempo rápida, grande, não volátil e barata', 'Porque o SO não sabe gerenciar uma memória só', 'Para evitar a necessidade de MMU', 'Porque discos são mais rápidos que a RAM'], a: 0 },
            { t: 'order', q: 'Ordene da memória MAIS RÁPIDA para a MAIS LENTA', o: ['Registradores', 'Cache', 'Memória principal (RAM)', 'Disco'] },
            { t: 'cls', q: 'Classifique cada memória', buckets: ['Volátil', 'Não volátil'], items: [['Cache L1', 0], ['RAM', 0], ['Registradores', 0], ['Disco rígido', 1], ['SSD', 1], ['ROM', 1]] },
            { t: 'mc', q: 'Qual memória a CPU acessa DIRETAMENTE para buscar instruções?', o: ['Memória principal', 'Memória secundária', 'Disco de swap', 'Pendrive'], a: 0 },
            { t: 'fill', q: 'Complete', s: 'Para executar, um programa precisa ser transferido da memória {0} para a memória {1}.', b: ['secundária', 'principal', 'cache', 'virtual'], a: ['secundária', 'principal'] },
            { t: 'mc', q: 'Quem traduz endereços lógicos em físicos em tempo de execução?', o: ['A MMU (hardware)', 'O compilador', 'O usuário', 'O disco'], a: 0 },
            { t: 'tf', q: 'Programas de usuário enxergam apenas endereços lógicos.', a: true },
            { t: 'match', q: 'Ligue cada termo à sua definição', p: [['Endereço lógico', 'Gerado pelas instruções do processo'], ['Endereço físico', 'Posição real nos chips de memória'], ['MMU', 'Hardware de tradução e proteção'], ['Gerenciador de memória', 'Parte do SO que controla áreas livres e ocupadas']] },
            { t: 'mc', q: 'Uma memória com 1 byte por posição recebeu a string “INE5611\\n” a partir do endereço 000. Qual endereço guarda o “E”?', o: ['010', '011', '001', '100'], a: 0, e: 'I=000, N=001, E=010 (terceira posição).' },
          ],
        },
        {
          title: 'Sem abstração e base/limite', qs: [
            { t: 'mc', q: 'Gestão de memória SEM abstração: qual o principal problema?', o: ['Programas podem danificar o SO e é difícil rodar vários ao mesmo tempo', 'A memória fica mais lenta', 'Não é possível usar disco', 'Os endereços ficam virtuais'], a: 0 },
            { t: 'input', q: 'Dois programas A e B de 16 KB (16.384 B) carregados em sequência, sem abstração. Com realocação ESTÁTICA, a instrução “JMP 28” de B vira JMP …?', a: ['16412', '16.412'], e: 'Soma-se 16.384 (onde B começa) a cada endereço de B: 28 + 16.384 = 16.412.' },
            { t: 'match', q: 'Registradores de base e limite', p: [['Registrador base', 'Primeiro endereço físico do programa'], ['Registrador limite', 'Tamanho do programa'], ['Troca de contexto', 'Base e limite são recarregados']] },
            { t: 'input', q: 'Base = 16.384, limite = 16.384. O processo executa “JMP 28”. Qual endereço físico vai ao barramento?', a: ['16412', '16.412'], e: 'Verifica 28 < limite (16.384) e soma a base: 28 + 16.384 = 16.412.' },
            { t: 'mc', q: 'Base = 16.384, limite = 16.384. O processo acessa o endereço lógico 20.000. O que acontece?', o: ['Interrupção: endereço ilegal (fora do limite)', 'Acessa o físico 36.384 normalmente', 'Acessa o físico 20.000', 'O SO aumenta o limite automaticamente'], a: 0 },
            { t: 'tf', q: 'Base e limite fazem parte do contexto do processo.', a: true, e: 'Quando o processo é escalonado, seus valores são restaurados nos registradores.' },
            { t: 'tf', q: 'Com registradores base e limite, o carregador ainda precisa corrigir os endereços do programa (realocação estática).', a: false, e: 'A soma é feita pelo hardware em tempo de execução: o programa é carregado com carregador absoluto.' },
            { t: 'mc', q: 'Endereços IPv4 têm 32 bits. Seu espaço de endereçamento vai de 0 até…', o: ['2³² − 1', '2³²', '32', '2³¹'], a: 0 },
            { t: 'match', q: 'Partes de um processo na memória', p: [['Segmento de texto', 'Instruções do programa'], ['Segmento de dados', 'Alocação estática + dinâmica (heap)'], ['Pilha', 'Variáveis locais e endereços de retorno']] },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 2
    {
      id: 'cont', title: 'Alocação contígua', sub: 'Partições, fragmentação e swapping', color: '#58cc02',
      guide: [
        T(['Alocação', 'Tipos'], [['<b>Contígua</b>', 'Simples · Particionada estática · Particionada dinâmica'], ['<b>Não contígua</b>', 'Paginação · Segmentação · Segmentação paginada']]),
        '<p><b>Contígua simples</b>: memória dividida em duas partes, SO (parte baixa) e <b>um</b> processo de usuário no resto. O processo acessa tudo, até o SO (ex.: DOS). Evolução: proteção com MMU (base e limite).</p>',
        '<p><b>Particionada estática (partições fixas)</b>: a área de usuário é dividida em partições de tamanho fixo (iguais ou diferentes). O programa precisa caber numa partição livre. O grau de multiprogramação é limitado pelo <b>número de partições</b>.</p>',
        '<p><b>Particionada dinâmica (partições variáveis)</b>: cada partição tem o tamanho exato do processo → elimina a fragmentação <b>interna</b>, mas a <b>externa</b> fica grave.</p>',
        T(['', 'Fragmentação interna', 'Fragmentação externa'], [['O que é', 'Desperdício <b>dentro</b> da área alocada ao processo', 'Desperdício <b>fora</b> das áreas ocupadas: muitos buracos pequenos'], ['Exemplo', 'Processo de 50 KB numa partição fixa de 64 KB → 14 KB perdidos', '3 buracos de 10 KB não atendem um processo de 25 KB'], ['Aparece em', 'Partições fixas, paginação (última página)', 'Partições variáveis, segmentação']]),
        '<p>Contra a externa: <b>juntar</b> partições livres adjacentes e <b>compactar</b> (mover processos) — compactação é pouco usada: gasta muito processamento e exige relocação dinâmica.</p>',
        '<p><b>Swapping</b>: rodízio de processos entre RAM e uma área do disco. <b>Swap-out</b> = RAM → disco (processo suspenso); <b>swap-in</b> = disco → RAM. Vantagem: executar mais processos do que cabem na RAM. Desvantagem: E/S lenta; tempo de swap proporcional ao tamanho do processo.</p>',
      ],
      lessons: [
        {
          title: 'Partições e fragmentação', qs: [
            { t: 'cls', q: 'Classifique cada técnica de alocação', buckets: ['Contígua', 'Não contígua'], items: [['Particionada estática', 0], ['Particionada dinâmica', 0], ['Contígua simples', 0], ['Paginação', 1], ['Segmentação', 1], ['Segmentação paginada', 1]] },
            { t: 'mc', q: 'Fragmentação INTERNA é…', o: ['Desperdício dentro da área alocada a um processo', 'Desperdício entre áreas ocupadas', 'Perda de dados no swap', 'Excesso de páginas na TLB'], a: 0 },
            { t: 'mc', q: 'Fragmentação EXTERNA é…', o: ['Memória livre espalhada em buracos pequenos que, separados, não atendem um processo', 'Sobra dentro da última página', 'Um processo maior que a RAM', 'Erro de proteção de memória'], a: 0 },
            { t: 'input', q: 'Partição fixa de 64 KB recebe um processo de 50 KB. Quantos KB de fragmentação interna?', a: '14', suf: 'KB' },
            { t: 'mc', q: 'O particionamento DINÂMICO elimina qual problema?', o: ['Fragmentação interna', 'Fragmentação externa', 'Swapping', 'Necessidade de MMU'], a: 0 },
            { t: 'ms', q: 'Quais medidas combatem a fragmentação externa? (marque todas)', o: ['Juntar partições livres adjacentes', 'Compactar a memória', 'Usar partições fixas maiores', 'Desligar o swapping'], a: [0, 1] },
            { t: 'tf', q: 'A compactação de memória é muito usada porque é barata.', a: false, e: 'É pouco usada: gasta muito tempo de processamento e depende de relocação dinâmica.' },
            { t: 'mc', q: 'Sem swapping, o grau de multiprogramação na particionada estática é limitado por…', o: ['Número de partições', 'Tamanho do disco', 'Número de CPUs', 'Tamanho da TLB'], a: 0 },
            { t: 'mc', q: 'Na alocação contígua simples, quantos processos de usuário ficam na memória?', o: ['Um', 'Um por partição', 'Quantos couberem', 'Nenhum'], a: 0 },
          ],
        },
        {
          title: 'Swapping', qs: [
            { t: 'match', q: 'Ligue os termos', p: [['Swap-out', 'RAM → disco, processo suspenso'], ['Swap-in', 'Disco → RAM, execução pode continuar'], ['Área de swap', 'Reserva no disco para cópias dos processos']] },
            { t: 'mc', q: 'Principal VANTAGEM do swapping:', o: ['Executar mais processos do que cabem na RAM ao mesmo tempo', 'Acelerar todos os acessos à memória', 'Eliminar a fragmentação interna', 'Dispensar o disco'], a: 0 },
            { t: 'mc', q: 'Principal DESVANTAGEM do swapping:', o: ['Desempenho cai pela E/S no disco, muito mais lento', 'Gasta registradores', 'Impede a proteção de memória', 'Exige páginas de 4 KB'], a: 0 },
            { t: 'tf', q: 'O tempo de swap é proporcional ao tamanho do processo.', a: true },
            { t: 'fill', q: 'Complete', s: 'Quando falta espaço, o processo sofre swap-{0} e, depois, swap-{1} para voltar a executar.', b: ['out', 'in', 'up', 'down'], a: ['out', 'in'] },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 3
    {
      id: 'livre', title: 'Memória livre e algoritmos', sub: 'Bitmap, listas, first/best/worst fit', color: '#ff9600',
      guide: [
        '<p><b>Bitmap</b>: a memória é dividida em <b>unidades de alocação</b> de tamanho fixo; cada unidade tem 1 bit (1 = ocupada, 0 = livre). Unidade pequena → bitmap grande; unidade grande → desperdício na última unidade. Procurar k zeros consecutivos é <b>lento</b>.</p>',
        '<p class="tip">Tamanho do bitmap = (memória ÷ unidade) bits. Ex.: 32 MB com unidades de 4 KB → 2²⁵/2¹² = 2¹³ bits = 1 KB.</p>',
        '<p><b>Lista ligada</b>: segmentos alocados (P) e livres (L) ordenados por endereço; cada nó tem início, tamanho e ponteiro para o próximo. Ao liberar X, junta-se com vizinhos livres (4 casos: nenhum, à esquerda, à direita, ambos).</p>',
        T(['Algoritmo', 'Escolhe'], [['<b>First fit</b>', 'o primeiro buraco com tamanho suficiente'], ['<b>Next fit</b> (circular)', 'como o first fit, mas continua de onde parou'], ['<b>Best fit</b>', 'o buraco que deixa a <b>menor</b> sobra'], ['<b>Worst fit</b>', 'o <b>maior</b> buraco (maior sobra)']]),
        '<p>Best fit é mais lento que o first fit e deixa mais buracos minúsculos inúteis; first fit gera, na média, buracos maiores. Lista de buracos ordenada por tamanho acelera o best fit; listas separadas de processos e buracos aceleram a busca, mas encarecem a liberação.</p>',
        '<p><b>Questão de prova (2019-2 / 2022):</b> memória de 100 KB; I P0 10 KB, II P1 20, III P2 30, IV P3 30, V P4 5, VI P0 termina, VII P2 termina, VIII P5 5 KB, com <b>worst fit</b>.</p>',
        '<p class="small muted">Depois de VII:</p>' + AFTER_VII,
        '<p class="small muted">Depois de VIII (worst fit escolhe o buraco de 30 KB):</p>' + AFTER_VIII,
      ],
      lessons: [
        {
          title: 'Bitmap e lista ligada', qs: [
            { t: 'mc', q: 'Num bitmap de memória, cada bit representa…', o: ['Uma unidade de alocação (livre ou ocupada)', 'Um processo', 'Uma página da TLB', 'Um byte da memória'], a: 0 },
            { t: 'input', q: 'Memória de 32 MB com unidades de alocação de 4 KB. Quantos BYTES ocupa o bitmap?', a: ['1024', '1 KB', '1kb'], suf: 'bytes', e: '32 MB / 4 KB = 2²⁵/2¹² = 8.192 unidades = 8.192 bits = 1.024 B.' },
            { t: 'mc', q: 'Unidade de alocação muito PEQUENA faz…', o: ['O bitmap ficar grande', 'Desperdício grande na última unidade', 'A busca ficar mais rápida', 'A memória ficar não volátil'], a: 0 },
            { t: 'mc', q: 'Qual operação é lenta num bitmap?', o: ['Procurar k bits 0 consecutivos para alocar um processo', 'Marcar uma unidade como livre', 'Ler um bit', 'Calcular o tamanho do bitmap'], a: 0 },
            { t: 'tf', q: 'Na lista ligada ordenada por endereço, ao liberar um processo é fácil juntá-lo com buracos vizinhos.', a: true },
            { t: 'mc', q: 'Lista: [livre 5–7] [X 8–13] [livre 14–17]. X termina. Quantos segmentos livres sobram nessa região?', o: ['1 (tudo se junta: 5–17)', '2', '3', 'Nenhum'], a: 0 },
            { t: 'fill', q: 'Complete', s: 'Cada nó da lista guarda se é processo ou {0}, o endereço de {1}, o tamanho e o ponteiro para o próximo.', b: ['buraco', 'início', 'fim', 'página'], a: ['buraco', 'início'] },
          ],
        },
        {
          title: 'First, next, best e worst fit', qs: [
            { t: 'match', q: 'Ligue o algoritmo à regra', p: [['First fit', 'Primeiro buraco que serve'], ['Next fit', 'Como first fit, a partir de onde parou'], ['Best fit', 'Buraco que deixa a menor sobra'], ['Worst fit', 'Maior buraco disponível']] },
            { t: 'mc', q: `${HOLES.replace(/<[^>]+>/g, '')} Pedido de 12 KB com FIRST fit usa o buraco de…`, o: ['20 KB', '12 KB', '18 KB', '15 KB'], a: 0 },
            { t: 'mc', q: 'Mesmos buracos (10, 4, 20, 18, 7, 9, 12, 15 KB). Pedido de 12 KB com BEST fit usa…', o: ['12 KB', '15 KB', '20 KB', '10 KB'], a: 0 },
            { t: 'mc', q: 'Mesmos buracos (10, 4, 20, 18, 7, 9, 12, 15 KB). Pedido de 12 KB com WORST fit usa…', o: ['20 KB', '18 KB', '15 KB', '12 KB'], a: 0 },
            { t: 'mc', q: 'Buracos 10, 4, 20, 18, 7, 9, 12, 15 KB. Pedidos em sequência de 12, 10 e 9 KB com FIRST fit usam:', o: ['20, 10, 18', '12, 10, 9', '20, 18, 15', '20, 18, 9'], a: 0, e: '12 → 20 (sobra 8); 10 → 10; 9 → 18.' },
            { t: 'mc', q: 'Mesmos buracos e pedidos 12, 10, 9 KB com NEXT fit:', o: ['20, 18, 9', '20, 10, 18', '12, 10, 9', '20, 18, 15'], a: 0, e: '12 → 20 (para ali); 10 → próximo que serve: 18; 9 → 9.' },
            { t: 'mc', q: 'Qual algoritmo é mais lento e deixa mais buracos minúsculos inúteis?', o: ['Best fit', 'First fit', 'Next fit', 'Worst fit'], a: 0 },
            { t: 'tf', q: 'Na média, o first fit gera buracos maiores que o best fit.', a: true },
            { t: 'mc', q: 'Manter a lista de buracos ordenada por TAMANHO beneficia principalmente…', o: ['Best fit', 'Next fit', 'Bitmap', 'Swapping'], a: 0 },
          ],
        },
        {
          title: 'Prova: worst fit em 100 KB', qs: [
            { t: 'mc', q: 'Memória de 100 KB: P0 10, P1 20, P2 30, P3 30, P4 5 KB criados em ordem; depois P0 e P2 terminam. Quais buracos existem?', o: ['10 KB (início), 30 KB (onde estava P2) e 5 KB (fim)', '40 KB contínuos', '10 KB e 30 KB', '5 KB e 30 KB'], a: 0, fig: AFTER_VII },
            { t: 'mc', q: 'P5 de 5 KB chega. Com WORST fit, onde ele entra?', o: ['No buraco de 30 KB, sobrando 25 KB', 'No buraco de 10 KB', 'No buraco de 5 KB do fim', 'Não cabe'], a: 0, fig: AFTER_VII },
            { t: 'mc', q: 'Se fosse FIRST fit, P5 (5 KB) entraria…', o: ['No buraco de 10 KB do início', 'No de 30 KB', 'No de 5 KB do fim', 'Não cabe'], a: 0 },
            { t: 'mc', q: 'Se fosse BEST fit, P5 (5 KB) entraria…', o: ['No buraco de 5 KB do fim (sobra zero)', 'No de 10 KB', 'No de 30 KB', 'Não cabe'], a: 0 },
            { t: 'order', q: 'Monte o layout após VIII (worst fit), do endereço 0 para cima', o: ['Livre 10 KB', 'P1 (20 KB)', 'P5 (5 KB)', 'Livre 25 KB', 'P3 (30 KB)', 'P4 (5 KB)', 'Livre 5 KB'] },
            { t: 'input', q: 'Após VIII, quantos KB livres existem no total?', a: '40', suf: 'KB', e: '10 + 25 + 5 = 40 KB.' },
            { t: 'tf', q: 'Após VIII, mesmo com 40 KB livres, um processo de 30 KB NÃO pode ser criado.', a: true, e: 'Os buracos são 10, 25 e 5 KB: fragmentação externa.', fig: AFTER_VIII },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 4
    {
      id: 'pag', title: 'Paginação', sub: 'Páginas, molduras e page fault', color: '#ce82ff',
      guide: [
        '<p><b>Memória virtual</b>: os endereços gerados pelo processo são virtuais, num espaço contíguo começando em 0, e são mapeados para endereços físicos. O que não cabe na RAM fica no disco. Pode haver mais endereços virtuais que físicos.</p>',
        '<p><b>Paginação</b>: o espaço virtual é dividido em <b>páginas</b> de tamanho fixo; a RAM, em <b>molduras de página</b> (quadros, frames) do <b>mesmo tamanho</b>. O SO mantém uma <b>tabela de páginas por processo</b>, na RAM.</p>',
        T(['Campo da entrada', 'Para que serve'], [['Número da moldura', 'onde a página está na RAM'], ['Presente/ausente (validade)', 'se a página está na memória física'], ['Proteção', 'leitura, escrita ou ambos'], ['Modificada (M, “sujo”)', 'página foi escrita na RAM → precisa voltar ao disco'], ['Referenciada (R)', 'página foi usada recentemente']]),
        '<p><b>Tradução</b>: página = endereço ÷ tamanho; deslocamento = endereço mod tamanho; físico = moldura × tamanho + deslocamento. Em binário: troca-se os bits da página pelos da moldura e copia-se o deslocamento.</p>',
        '<p><b>Exemplo do slide</b>: endereços virtuais de 15 bits (32 KB = 8 páginas), RAM de 16 KB (4 molduras), páginas de 4 KB.</p>',
        SLIDE_PT,
        '<p>0 → página 0 → moldura 1 → <b>4096</b>. 4098 → página 1, desl. 2 → moldura 0 → <b>2</b>. 4196 → página 1, desl. 100 → <b>100</b>.</p>',
        '<p><b>Page fault (falta de página)</b>: a página referenciada não está na RAM. A MMU avisa o SO, a página é trazida do disco (se não há moldura livre, uma pouco usada sofre swap-out), a tabela é atualizada e a instrução é <b>reexecutada</b>.</p>',
        '<p><b>PTBR</b> (base) e <b>PTLR</b> (limite) apontam para a tabela de páginas do processo; ficam no descritor do processo e são trocados na troca de contexto.</p>',
      ],
      lessons: [
        {
          title: 'Conceitos', qs: [
            { t: 'match', q: 'Ligue os termos', p: [['Página', 'Unidade fixa do espaço virtual'], ['Moldura (quadro)', 'Unidade correspondente na RAM'], ['Tabela de páginas', 'Mapeia páginas em molduras'], ['Page fault', 'Página referenciada não está na RAM']] },
            { t: 'tf', q: 'Páginas e molduras de página têm o mesmo tamanho.', a: true },
            { t: 'mc', q: 'Qual bit da tabela de páginas indica se a página está na memória física?', o: ['Presente/ausente (validade)', 'Modificada', 'Referenciada', 'Proteção'], a: 0 },
            { t: 'match', q: 'Ligue o bit da entrada à função', p: [['Presente/ausente', 'Está na RAM?'], ['Modificada (M)', 'Foi escrita → salvar no disco ao sair'], ['Referenciada (R)', 'Foi usada recentemente'], ['Proteção', 'Leitura/escrita permitida']] },
            { t: 'order', q: 'Ordene o tratamento de uma falta de página', o: ['O processo referencia uma página ausente', 'A MMU gera a interrupção de falta de página', 'O SO escolhe uma moldura (expulsando uma página, se preciso)', 'A página é trazida do disco e a tabela é atualizada', 'A instrução que causou a falta é reexecutada'] },
            { t: 'input', q: 'Endereços virtuais de 15 bits e páginas de 4 KB. Quantas páginas virtuais?', a: '8', e: '2¹⁵ / 2¹² = 2³ = 8.' },
            { t: 'input', q: 'RAM de 16 KB e páginas de 4 KB. Quantas molduras?', a: '4' },
            { t: 'mc', q: 'Onde fica a tabela de páginas?', o: ['Na RAM, uma por processo (apontada por PTBR/PTLR)', 'No disco, uma para o sistema', 'Dentro da CPU, uma só', 'No cache L1'], a: 0 },
            { t: 'tf', q: 'Paginação sofre de fragmentação externa.', a: false, e: 'Qualquer moldura livre serve. Só há fragmentação interna (na última página do processo).' },
          ],
        },
        {
          title: 'Traduzindo endereços (slide)', qs: [
            { t: 'input', q: 'Páginas de 4 KB, tabela abaixo. Endereço virtual 0 → físico?', fig: SLIDE_PT, a: '4096', e: 'Página 0 → moldura 1: 1 × 4096 + 0 = 4096.' },
            { t: 'input', q: 'Páginas de 4 KB, tabela abaixo. Endereço virtual 4098 → físico?', fig: SLIDE_PT, a: '2', e: 'Página 1 (4096–8191), deslocamento 2 → moldura 0: 0 + 2 = 2.' },
            { t: 'input', q: 'Páginas de 4 KB, tabela abaixo. Endereço virtual 4196 → físico?', fig: SLIDE_PT, a: '100', e: 'Página 1, deslocamento 100 → moldura 0 → 100.' },
            { t: 'input', q: 'Páginas de 4 KB, tabela abaixo. Endereço virtual 24600 → físico?', fig: SLIDE_PT, a: ['12312', '12.312'], e: '24600 div 4096 = 6, resto 24. Página 6 → moldura 3: 3 × 4096 + 24 = 12.312.' },
            { t: 'input', q: 'Páginas de 4 KB, tabela abaixo. Endereço virtual 28677 → físico?', fig: SLIDE_PT, a: ['8197', '8.197'], e: '28677 = 7 × 4096 + 5. Página 7 → moldura 2: 8192 + 5 = 8197.' },
            { t: 'mc', q: 'Páginas de 4 KB, tabela abaixo. O processo acessa o endereço 8192. O que acontece?', fig: SLIDE_PT, o: ['Falta de página: a página 2 está ausente', 'Acessa o físico 8192', 'Acessa o físico 0', 'Erro de proteção'], a: 0 },
            { t: 'mc', q: 'No endereço de 15 bits com páginas de 4 KB, quantos bits são de deslocamento?', o: ['12', '3', '15', '4'], a: 0 },
            { gen: genTranslate, tag: 'calc' },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 5
    {
      id: 'calc', title: 'Contas de paginação', sub: 'Bits, tabela de páginas e hexadecimal', color: '#ff4b4b', kicker: 'Cai na prova',
      guide: [
        '<p>Roteiro que a prova cobra (sempre mostre as contas!):</p>',
        T(['Grandeza', 'Fórmula'], [['Bits de deslocamento', 'log₂(tamanho da página)'], ['Bits da página', 'bits do endereço virtual − deslocamento'], ['Nº de páginas = entradas da tabela', '2^(bits da página)'], ['Bits do endereço físico', 'log₂(tamanho da memória física)'], ['Bits do quadro', 'bits físicos − deslocamento'], ['Tamanho da entrada', 'bits do quadro + bits de controle (validade, R, M, proteção…)'], ['Tamanho da tabela', 'nº de entradas × tamanho da entrada']]),
        T(['Valor', 'Potência'], [['1 KB', '2¹⁰'], ['2 KB', '2¹¹'], ['4 KB', '2¹²'], ['8 KB', '2¹³'], ['0,5 MB (512 KB)', '2¹⁹'], ['1 MB', '2²⁰'], ['2 MB', '2²¹'], ['16 MB', '2²⁴'], ['1 GB', '2³⁰'], ['4 GB', '2³²']]),
        '<p><b>Prova 2019-1:</b> páginas de 2 KB, endereço virtual de 16 bits, memória física de 16 MB, entrada com validade, referência, sujo e só-leitura. Deslocamento = 11 bits; página = 16 − 11 = 5 bits → 32 entradas; físico = 24 bits → quadro = 13 bits; entrada = 13 + 4 = 17 bits; tabela = 32 × 17 = <b>544 bits = 68 B</b>.</p>',
        '<p><b>Prova 2019-2 / 2022:</b> páginas de 4 KB, endereço virtual de 16 bits, memória de 0,5 MB. Deslocamento 12 bits; página = 16 − 12 = <b>4 bits</b>; físico = 19 bits → quadro = 19 − 12 = <b>7 bits</b>.</p>',
        '<p><b>Tradução em binário (2019-2 / 2022):</b> 3 bits de quadro e a tabela abaixo; endereço lógico <code>1101 1010 1111 0011 0000</code> (20 bits). 4 entradas → 2 bits de página (os mais significativos: <b>11</b>) e 18 de deslocamento. Página 11 → quadro <b>010</b>: físico = <code>010</code> + <code>01 1010 1111 0011 0000</code> = <code>0 1001 1010 1111 0011 0000</code> = <b>0x9AF30</b>. Memória física máxima = 2^(3+18) = 2²¹ B = <b>2 MB</b>.</p>',
        EXAM_PT_FIG,
        '<p class="tip">Para converter em hexa, agrupe os bits de 4 em 4 <b>a partir da direita</b>.</p>',
      ],
      lessons: [
        {
          title: 'Bits de página e de quadro', qs: [
            { t: 'input', q: 'Páginas de 4 KB. Quantos bits de deslocamento?', a: '12', suf: 'bits' },
            { t: 'input', q: 'Páginas de 4 KB e endereços virtuais de 16 bits. Quantos bits identificam a página?', a: '4', suf: 'bits', e: '16 − 12 = 4 (prova 2019-2).' },
            { t: 'input', q: 'Memória física de 0,5 MB. Quantos bits tem o endereço físico?', a: '19', suf: 'bits', e: '0,5 MB = 2¹⁹ B.' },
            { t: 'input', q: 'Memória física de 0,5 MB e páginas de 4 KB. Quantos bits identificam o quadro?', a: '7', suf: 'bits', e: '19 − 12 = 7 (prova 2019-2).' },
            { t: 'input', q: 'Com 7 bits de quadro, quantos quadros existem?', a: '128' },
            { t: 'mc', q: 'Mesma MMU (páginas de 4 KB, 16 bits virtuais), mas a RAM dobra para 1 MB. O que muda?', o: ['Quadro passa a 8 bits; página continua com 4', 'Página passa a 5 bits', 'Deslocamento passa a 13 bits', 'Nada muda'], a: 0 },
            { gen: genBits, tag: 'calc' },
            { gen: genBits, tag: 'calc' },
          ],
        },
        {
          title: 'Tamanho da tabela (prova 2019-1)', qs: [
            { t: 'input', q: 'Páginas de 2 KB. Bits de deslocamento?', a: '11', suf: 'bits' },
            { t: 'input', q: 'Páginas de 2 KB, endereço virtual de 16 bits. Quantas entradas tem a tabela de páginas?', a: ['32', '2^5'], e: '16 − 11 = 5 bits de página → 2⁵ = 32 entradas.' },
            { t: 'input', q: 'Memória física de 16 MB e páginas de 2 KB. Bits do número do quadro?', a: '13', suf: 'bits', e: '16 MB = 2²⁴ → 24 − 11 = 13.' },
            { t: 'input', q: 'Quadro de 13 bits + validade, referência, sujo e só-leitura. Tamanho de cada entrada?', a: '17', suf: 'bits' },
            { t: 'input', q: '32 entradas de 17 bits. Tamanho da tabela em BYTES?', a: '68', suf: 'B', e: '32 × 17 = 544 bits = 68 B.' },
            { t: 'input', q: 'Mesmo cenário (16 bits virtuais, 16 MB, 4 bits de controle), mas páginas de 4 KB. Tamanho da tabela em BYTES?', a: '32', suf: 'B', e: '4 bits de página → 16 entradas; quadro = 24 − 12 = 12 bits; entrada = 16 bits; 16 × 16 = 256 bits = 32 B.' },
            { t: 'order', q: 'Ordem das contas para achar o tamanho da tabela de páginas', o: ['Deslocamento = log₂(tamanho da página)', 'Bits de página = bits virtuais − deslocamento', 'Bits de quadro = bits físicos − deslocamento', 'Entrada = quadro + bits de controle', 'Tabela = nº de entradas × entrada'] },
          ],
        },
        {
          title: 'Binário e hexadecimal (prova 2019-2)', qs: [
            { t: 'input', q: 'Tabela de páginas com 4 entradas e endereços lógicos de 20 bits. Quantos bits são de página?', fig: EXAM_PT_FIG, a: '2', suf: 'bits' },
            { t: 'input', q: 'E quantos bits são de deslocamento?', fig: EXAM_PT_FIG, a: '18', suf: 'bits' },
            { t: 'input', q: 'Endereço lógico 1101 1010 1111 0011 0000. Qual o endereço físico em HEXADECIMAL?', fig: EXAM_PT_FIG, a: ['9AF30', '0x9AF30'], ph: 'ex.: 1F2A0', e: 'Página 11 → quadro 010. Físico = 010 01 1010 1111 0011 0000 = 0 1001 1010 1111 0011 0000 = 0x9AF30.' },
            { t: 'input', q: 'Endereço lógico 0010 0000 0000 0000 0001. Endereço físico em hexadecimal?', fig: EXAM_PT_FIG, a: ['1E0001', '0x1E0001'], e: 'Página 00 → quadro 111. Físico = 111 + 10 0000 0000 0000 0001 = 1 1110 0000 0000 0000 0001 = 0x1E0001.' },
            { t: 'input', q: 'Quadros de 3 bits e 18 bits de deslocamento. Memória física máxima, em MB?', a: '2', suf: 'MB', e: '3 + 18 = 21 bits → 2²¹ B = 2 MB.' },
            { t: 'tf', q: 'Para converter binário em hexa, agrupa-se de 4 em 4 bits a partir da ESQUERDA.', a: false, e: 'Agrupa-se a partir da DIREITA (bit menos significativo).' },
            { gen: genHex, tag: 'calc' },
            { gen: genHex, tag: 'calc' },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 6
    {
      id: 'tlb', title: 'TLB e tabelas grandes', sub: 'TLB, multinível e invertida', color: '#2b70c9',
      guide: [
        '<p>Problema: com a tabela na RAM, cada acesso vira <b>dois</b> acessos à memória (tabela + dado). Solução: <b>TLB</b> (Translation Lookaside Buffer), uma cache em hardware, com <b>memória associativa</b>, que traduz páginas em molduras sem consultar a tabela. Guarda as páginas do <b>working set</b> (conjunto de páginas mais prováveis de serem acessadas, pela localidade temporal e espacial).</p>',
        '<ol><li><b>TLB hit</b>: moldura + deslocamento = endereço físico.</li><li><b>TLB miss</b>: consulta a tabela. Se está lá (<b>page hit</b>): monta o endereço e atualiza a TLB.</li><li>Se não está (<b>page fault</b>): swap-in, atualiza a tabela e reinicia a instrução.</li></ol>',
        '<p><b>Tabelas grandes</b>: com 32 bits e páginas de 4 KB, uma tabela de um nível tem 2²⁰ entradas (≈ 4 MB com entradas de 4 B) por processo!</p>',
        '<p><b>Multinível</b>: os bits de página são divididos em níveis (PT1, PT2, …). Só o último nível tem a moldura; os outros apontam para tabelas. Ex. 32 bits = <b>10 | 10 | 12</b>. Economiza memória porque a maioria dos processos não usa todo o espaço virtual: tabelas de 2º nível não usadas nem existem.</p>',
        '<p><b>Invertida</b>: <b>uma só</b> tabela para todo o sistema, com uma entrada por <b>moldura</b> (PID + página virtual). O índice achado é o número da moldura. Busca linear é péssima → <b>hash</b> h(PID, página), com tratamento de colisões.</p>',
      ],
      lessons: [
        {
          title: 'TLB', qs: [
            { t: 'mc', q: 'Que problema a TLB resolve?', o: ['Cada acesso precisaria de dois acessos à RAM (tabela + dado)', 'Falta de espaço no disco', 'Fragmentação externa', 'Proteção entre processos'], a: 0 },
            { t: 'tf', q: 'A TLB é uma cache em hardware que usa memória associativa.', a: true },
            { t: 'mc', q: 'Working set é…', o: ['O conjunto de páginas mais prováveis de serem acessadas num momento', 'Todas as páginas do processo', 'As páginas no disco', 'As molduras livres'], a: 0 },
            { t: 'match', q: 'O que acontece em cada caso?', p: [['TLB hit', 'Moldura vem direto da TLB'], ['TLB miss + page hit', 'Lê a tabela e atualiza a TLB'], ['Page fault', 'Swap-in e reinicia a instrução']] },
            { t: 'order', q: 'Ordem da tradução com TLB', o: ['Consulta a TLB com os bits de página', 'Se TLB miss, consulta a tabela de páginas', 'Se a página não está na tabela, page fault (swap-in)', 'Atualiza a tabela/TLB e reinicia a instrução'] },
            { t: 'mc', q: 'Localidade TEMPORAL significa…', o: ['O que foi acessado agora tende a ser acessado de novo em breve', 'Endereços vizinhos tendem a ser acessados juntos', 'O tempo de acesso é constante', 'Páginas antigas são removidas'], a: 0 },
          ],
        },
        {
          title: 'Multinível e invertida', qs: [
            { t: 'input', q: 'Endereços de 32 bits e páginas de 4 KB, tabela de UM nível. Quantas entradas?', a: ['1048576', '2^20', '1.048.576'], e: '32 − 12 = 20 bits → 2²⁰.' },
            { t: 'input', q: 'E se cada entrada tiver 4 bytes, quantos MB ocupa a tabela de cada processo?', a: '4', suf: 'MB', e: '2²⁰ × 4 B = 4 MB.' },
            { t: 'mc', q: 'Divisão 10 | 10 | 12 de um endereço de 32 bits: o endereço 0x00403004 tem PT1, PT2 e deslocamento iguais a…', o: ['1, 3 e 4', '4, 3 e 1', '0, 403 e 4', '1, 4 e 3'], a: 0, e: '0000000001 | 0000000011 | 000000000100.' },
            { t: 'mc', q: 'Por que a tabela multinível economiza memória?', o: ['Tabelas de 2º nível de regiões não usadas nem precisam existir', 'Porque usa menos bits de deslocamento', 'Porque elimina a TLB', 'Porque guarda as páginas no disco'], a: 0 },
            { t: 'mc', q: 'Quantas entradas tem a tabela de páginas INVERTIDA?', o: ['Uma por moldura de página da RAM', 'Uma por página virtual de cada processo', 'Uma por processo', '1024'], a: 0 },
            { t: 'tf', q: 'Cada processo tem a sua própria tabela invertida.', a: false, e: 'É uma única tabela para todos os processos (por isso guarda o PID).' },
            { t: 'input', q: 'RAM de 1 GB e páginas de 4 KB. Quantas entradas na tabela invertida?', a: ['262144', '2^18', '262.144'], e: '2³⁰ / 2¹² = 2¹⁸.' },
            { t: 'mc', q: 'Como evitar a busca linear na tabela invertida?', o: ['Função hash sobre (PID, página)', 'Mais níveis de tabela', 'Páginas maiores', 'Desligar a TLB'], a: 0 },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 7
    {
      id: 'seg', title: 'Segmentação', sub: 'Pura, paginada e Intel x86', color: '#a568cc',
      guide: [
        '<p>Na paginação o espaço virtual é <b>unidimensional</b> (0 a 2ⁿ−1). Na <b>segmentação</b>, o processo tem vários <b>segmentos</b> (código, dados, pilha…): blocos contíguos, <b>independentes</b> e de <b>tamanho variável</b>.</p>',
        '<p><b>Segmentação pura</b>: endereço = (segmento, deslocamento). Tabela de segmentos (na RAM, uma por processo) com <b>base</b> e <b>limite</b>. Se deslocamento &lt; limite → físico = base + deslocamento; senão, erro.</p>',
        T(['Vantagens', 'Desvantagens'], [['Estruturas que crescem/diminuem; ligação de módulos compilados separadamente; <b>sem fragmentação interna</b>; fácil compartilhar segmentos', '<b>Fragmentação externa</b>; segmentos grandes são difíceis de gerenciar']]),
        '<p><b>Segmentação com paginação</b>: cada segmento é dividido em páginas (tabela de segmentos → tabela de páginas do segmento). Resolve os segmentos muito grandes.</p>',
        '<p><b>Intel x86</b>: 8086 (1978) = segmentação pura (<i>real mode</i>); 80386 (1985) = paginação (<i>protected mode</i>). Virtual →(segmentação)→ <b>linear</b> →(paginação)→ físico.</p>',
        T(['', 'GDT', 'LDT'], [['Descreve', 'segmentos do sistema (inclusive do SO)', 'segmentos do processo'], ['Quantas', 'uma no sistema', 'uma por processo'], ['Registrador', 'gdtr', 'ldtr']]),
        '<p>Endereço virtual = seletor (16 bits) + offset (32). Seletor = <b>índice (13 bits)</b> | <b>tabela (1 bit: 0 = GDT, 1 = LDT)</b> | <b>privilégio (2 bits)</b>. Descritores têm 8 bytes → posição = índice × 8 (ex.: índice 5 → Addr + 40). O descritor dá a base linear + limite; o endereço linear de 32 bits é paginado em 10 | 10 | 12.</p>',
      ],
      lessons: [
        {
          title: 'Segmentação pura', qs: [
            { t: 'mc', q: 'Segmentos são…', o: ['Blocos contíguos, independentes e de tamanho variável', 'Blocos de tamanho fixo', 'Molduras da RAM', 'Entradas da TLB'], a: 0 },
            { t: 'input', q: 'Tabela de segmentos abaixo. Endereço (segmento 2, deslocamento 53) → físico?', fig: T(['Segmento', 'Base', 'Limite'], [[0, 1400, 1000], [1, 6300, 400], [2, 4300, 400], [3, 3200, 1100], [4, 4700, 1000]]), a: '4353', e: '53 < 400 → 4300 + 53.' },
            { t: 'input', q: 'Mesma tabela. Endereço (3, 852) → físico?', fig: T(['Segmento', 'Base', 'Limite'], [[0, 1400, 1000], [1, 6300, 400], [2, 4300, 400], [3, 3200, 1100], [4, 4700, 1000]]), a: '4052' },
            { t: 'mc', q: 'Mesma tabela. Endereço (0, 1222)?', fig: T(['Segmento', 'Base', 'Limite'], [[0, 1400, 1000], [1, 6300, 400], [2, 4300, 400], [3, 3200, 1100], [4, 4700, 1000]]), o: ['Erro: 1222 ≥ limite 1000', 'Físico 2622', 'Físico 1222', 'Page fault'], a: 0 },
            { t: 'tf', q: 'A segmentação pura não tem fragmentação interna.', a: true },
            { t: 'mc', q: 'Principal desvantagem da segmentação pura:', o: ['Fragmentação externa', 'Fragmentação interna', 'Não permite compartilhar código', 'Espaço unidimensional'], a: 0 },
            { t: 'cls', q: 'Paginação ou segmentação?', buckets: ['Paginação', 'Segmentação'], items: [['Unidades de tamanho fixo', 0], ['Unidades de tamanho variável', 1], ['Fragmentação interna (última página)', 0], ['Fragmentação externa', 1], ['Espaço de endereços unidimensional', 0], ['Espaços separados para código, dados e pilha', 1]] },
            { t: 'mc', q: 'A segmentação com paginação resolve…', o: ['O gerenciamento de segmentos muito grandes', 'A falta de TLB', 'A proteção de memória', 'A necessidade de tabela de segmentos'], a: 0 },
          ],
        },
        {
          title: 'Intel x86', qs: [
            { t: 'match', q: 'Ligue os termos do x86', p: [['GDT', 'Segmentos do sistema, uma só'], ['LDT', 'Segmentos de cada processo'], ['Seletor', 'Índice + bit de tabela + privilégio'], ['Endereço linear', 'Saída da segmentação, entrada da paginação']] },
            { t: 'mc', q: 'Como se dividem os 16 bits do seletor de segmento?', o: ['13 de índice, 1 de tabela (GDT/LDT), 2 de privilégio', '16 de índice', '10, 10 e 12', '8 de índice e 8 de privilégio'], a: 0 },
            { t: 'input', q: 'Seletor com índice 5 na LDT. O descritor está em Addr_LDT + quantos bytes?', a: '40', e: 'Cada descritor tem 8 bytes: 5 × 8 = 40.' },
            { t: 'order', q: 'Caminho de um endereço no modo protegido', o: ['Endereço virtual (seletor + offset)', 'Segmentação', 'Endereço linear (32 bits)', 'Paginação', 'Endereço físico'] },
            { t: 'tf', q: 'No seletor, o bit de tabela igual a 1 indica a LDT.', a: true },
            { t: 'mc', q: 'Em que processador a paginação (modo protegido) chegou ao x86?', o: ['80386, em 1985', '8086, em 1978', 'Pentium, em 1993', '80286, em 1982'], a: 0 },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 8
    {
      id: 'subs1', title: 'Substituição de páginas I', sub: 'Ótimo, FIFO, Relógio e NRU', color: '#e5a000',
      guide: [
        '<p>Na falta de página com a memória cheia, é preciso escolher uma página para sair. Bits ajudam: <b>R</b> (referenciada) e <b>M</b> (modificada) são postos em 1 pelo <b>hardware</b> e zerados pelo <b>SO</b>.</p>',
        T(['Algoritmo', 'Como funciona', 'Observação'], [
          ['<b>Ótimo</b>', 'sai a página que demorará MAIS para ser usada de novo', 'não implementável (o SO não conhece o futuro); serve de referência'],
          ['<b>FIFO</b>', 'fila por ordem de chegada; sai a mais antiga', 'pode remover páginas muito usadas; sofre a anomalia de Belady'],
          ['<b>Relógio / segunda chance</b>', 'lista circular com ponteiro na mais antiga. R = 1 → zera R e avança; R = 0 → substitui e avança', 'se todas têm R = 1, vira FIFO; não diferencia páginas modificadas'],
          ['<b>NRU</b>', 'zera R periodicamente; sai uma página aleatória da menor classe', 'aproximação rudimentar do LRU'],
        ]),
        T(['Classe NRU', 'R', 'M'], [[0, 0, 0], [1, 0, 1], [2, 1, 0], [3, 1, 1]]),
        '<p class="tip">A classe 1 (R = 0, M = 1) existe porque o R é zerado pela interrupção de relógio, mas o M não.</p>',
        '<p><b>Anomalia de Belady</b>: com MAIS quadros acontecem MAIS faltas. Pode ocorrer no FIFO e no Relógio; não ocorre no LRU nem no Ótimo.</p>',
        '<p><b>Prova 2019-1</b> — Relógio com a sequência 0 1 2 3 0 1 4 0 1 2 3 4:</p>',
        simTable(simulate('clock', REFS_19_1, 3)),
        simTable(simulate('clock', REFS_19_1, 4)),
        '<p>9 faltas com 3 quadros e 10 com 4 → <b>houve anomalia de Belady</b>.</p>',
      ],
      lessons: [
        {
          title: 'Conceitos', qs: [
            { t: 'mc', q: 'O algoritmo ÓTIMO substitui a página que…', o: ['Vai demorar mais para ser usada de novo', 'Chegou primeiro', 'Foi menos usada no passado', 'Tem R = 0'], a: 0 },
            { t: 'mc', q: 'Por que o ótimo não é usado na prática?', o: ['O SO não sabe quando cada página será acessada de novo', 'Gera muitas faltas', 'Precisa de TLB', 'Sofre de Belady'], a: 0 },
            { t: 'tf', q: 'Os bits R e M são colocados em 1 pelo hardware e zerados pelo SO.', a: true },
            { t: 'mc', q: 'Problema do FIFO:', o: ['Pode remover uma página muito usada só porque é antiga', 'É impossível de implementar', 'Precisa de contadores', 'Não usa fila'], a: 0 },
            { t: 'mc', q: 'No Relógio, o ponteiro encontra uma página com R = 1. O que faz?', o: ['Zera R e avança (segunda chance)', 'Substitui a página', 'Para e espera', 'Zera M'], a: 0 },
            { t: 'mc', q: 'No Relógio, se TODAS as páginas têm R = 1, ele se comporta como…', o: ['FIFO', 'LRU', 'Ótimo', 'NRU'], a: 0 },
            { t: 'match', q: 'Classes do NRU', p: [['Classe 0', 'R = 0, M = 0'], ['Classe 1', 'R = 0, M = 1'], ['Classe 2', 'R = 1, M = 0'], ['Classe 3', 'R = 1, M = 1']] },
            { t: 'mc', q: 'O NRU remove…', o: ['Uma página aleatória da classe mais baixa não vazia', 'A página da classe 3', 'A mais antiga', 'A de maior contador'], a: 0 },
            { t: 'tf', q: 'O Relógio diferencia páginas modificadas das não modificadas.', a: false, e: 'Ele só olha o bit R (conclusão do slide: “não diferencia páginas modificadas”).' },
            { t: 'mc', q: 'Anomalia de Belady é…', o: ['Ter MAIS faltas de página com MAIS quadros', 'Ter faltas com a memória vazia', 'A TLB errar sempre', 'Thrashing'], a: 0 },
          ],
        },
        {
          title: 'Simulando (prova 2019-1)', qs: [
            { t: 'input', q: 'Sequência: 0 1 2 3 0 1 4 0 1 2 3 4\nRelógio (segunda chance), 3 quadros vazios. Quantas ausências de página?', a: '9', suf: 'faltas', e: 'Gabarito da prova: 9 ausências.' },
            { t: 'input', q: 'Sequência: 0 1 2 3 0 1 4 0 1 2 3 4\nRelógio, 4 quadros vazios. Quantas ausências?', a: '10', suf: 'faltas' },
            { t: 'tf', q: 'Com 9 faltas em 3 quadros e 10 em 4, o Relógio apresentou anomalia de Belady.', a: true },
            { t: 'input', q: 'Sequência: 0 1 2 3 0 1 4 0 1 2 3 4\nFIFO, 3 quadros. Quantas ausências?', a: '9', suf: 'faltas' },
            { t: 'input', q: 'Sequência: 0 1 2 3 0 1 4 0 1 2 3 4\nFIFO, 4 quadros. Quantas ausências?', a: '10', suf: 'faltas' },
            { t: 'input', q: 'Sequência: 0 1 2 3 0 1 4 0 1 2 3 4\nÓTIMO, 3 quadros. Quantas ausências?', a: '7', suf: 'faltas', e: 'Faltas: 0, 1, 2, 3 (sai 2, usada mais tarde), 4 (sai 3), 2 (sai 0, não será mais usada), 3 (sai outra que não será mais usada) → 7.' },
            { t: 'mc', q: 'FIFO, 3 quadros, sequência 0 1 2 3: quando chega o 3, quem sai?', o: ['0', '1', '2', 'Ninguém'], a: 0 },
            { gen: genFaults('fifo'), tag: 'calc' },
            { gen: genFaults('clock'), tag: 'calc' },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 9
    {
      id: 'subs2', title: 'Substituição de páginas II', sub: 'LRU, NFU, Aging e WSClock', color: '#ff86d0',
      guide: [
        '<p><b>LRU</b> (Least Recently Used): sai a página não usada há mais tempo. Lista ordenada pelo último uso, atualizada a <b>cada referência</b> → excelente, mas muito custoso. Não sofre de Belady.</p>',
        '<p><b>Prova 2019-2 / 2022</b> — LRU, 4 quadros, sequência 1 2 3 4 1 2 5 1 2 3 4 5:</p>',
        simTable(simulate('lru', REFS_19_2, 4)),
        '<p><b>NFU</b>: contador por página; periodicamente soma R ao contador e zera R; sai o menor contador. Problema: <b>nunca esquece</b> o passado.</p>',
        '<p><b>Aging</b>: periodicamente desloca o contador 1 bit à direita e coloca R no bit <b>mais significativo</b>; sai o menor. Aproxima muito bem o LRU com custo baixo. Diferenças: não sabe a ordem dentro do mesmo período e os contadores têm bits limitados.</p>',
        AGING,
        '<p><b>WSClock</b>: usa o <b>working set</b> (páginas usadas nas últimas 𝒯 unidades do tempo virtual). Para cada página no ponteiro: R = 1 → R = 0, TLU = CVT, avança. R = 0 → idade = CVT − TLU; idade ≤ 𝒯 → avança; idade &gt; 𝒯 e M = 0 → <b>substitui</b>; idade &gt; 𝒯 e M = 1 → agenda escrita no disco e avança. Só funciona com política <b>local</b>.</p>',
        '<p><b>Paginação por demanda</b>: o processo começa sem páginas na RAM e elas chegam conforme as faltas. <b>Thrashing</b>: faltas de página frequentes e contínuas (memória insuficiente para o working set).</p>',
        T(['Algoritmo', 'Conclusão do slide'], [['Ótimo', 'não implementável, útil para comparação'], ['FIFO', 'pode substituir páginas importantes'], ['Relógio', 'bom, mas não diferencia modificadas'], ['LRU', 'excelente, mas muito custoso'], ['NRU', 'aproximação extremamente rudimentar do LRU'], ['NFU', 'aproximação rudimentar do LRU'], ['Aging', 'eficiente e aproxima muito bem o LRU'], ['WSClock', 'bom e eficiente']]),
      ],
      lessons: [
        {
          title: 'LRU (prova 2019-2)', qs: [
            { t: 'input', q: 'Sequência: 1 2 3 4 1 2 5 1 2 3 4 5\nLRU, 4 quadros vazios. Quantas ausências de página?', a: '8', suf: 'faltas', e: 'Gabarito: 8 ausências.' },
            { t: 'mc', q: 'LRU, 4 quadros, após 1 2 3 4 1 2 chega o 5. Quem sai?', o: ['3', '1', '4', '2'], a: 0, e: 'Último uso: 3 no passo 3 — o mais antigo.' },
            { t: 'mc', q: 'Continuando (1 2 3 4 1 2 5 1 2), chega o 3. Quem sai?', o: ['4', '5', '1', '2'], a: 0 },
            { t: 'input', q: 'Sequência: 1 2 3 4 1 2 5 1 2 3 4 5\nLRU com 3 quadros. Quantas ausências?', a: '10', suf: 'faltas' },
            { t: 'tf', q: 'O LRU pode sofrer a anomalia de Belady.', a: false, e: 'LRU e Ótimo são algoritmos de pilha: mais quadros nunca aumentam as faltas.' },
            { t: 'mc', q: 'Problema do LRU puro:', o: ['Atualizar a lista a cada referência à memória é caríssimo', 'Remove páginas muito usadas', 'Não é implementável', 'Esquece o passado rápido demais'], a: 0 },
            { t: 'input', q: 'Sequência: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1\nLRU, 3 quadros. Quantas ausências?', a: '12', suf: 'faltas' },
            { gen: genFaults('lru'), tag: 'calc' },
          ],
        },
        {
          title: 'NFU e Aging', qs: [
            { t: 'mc', q: 'Problema do NFU:', o: ['Nunca esquece o passado: páginas muito usadas antigamente ficam com contador alto', 'Precisa de lista atualizada a cada acesso', 'Não usa o bit R', 'Remove sempre a mais nova'], a: 0 },
            { t: 'mc', q: 'No Aging, a cada período…', o: ['O contador desloca 1 bit à direita e R entra no bit mais significativo', 'Soma R ao contador', 'Zera o contador', 'R entra no bit menos significativo'], a: 0 },
            { t: 'input', q: 'Aging com contador de 8 bits começando em 00000000. Bits R nos três períodos: 1, 0, 1. Qual o contador?', a: '10100000', e: '10000000 → 01000000 → 10100000.' },
            { t: 'mc', q: 'Pela tabela abaixo (exemplo do slide), qual página o Aging remove?', fig: AGING, o: ['Página 1', 'Página 0', 'Página 2', 'Página 3'], a: 0 },
            { t: 'ms', q: 'Em que o Aging difere do LRU? (marque todas)', o: ['Não sabe a ordem das referências dentro de um mesmo período', 'Contadores têm bits limitados: perde informação antiga', 'Precisa atualizar uma lista a cada acesso', 'Não usa o bit R'], a: [0, 1] },
            { t: 'tf', q: 'O Aging é melhor que o NFU porque penaliza páginas não acessadas recentemente.', a: true },
          ],
        },
        {
          title: 'WSClock e working set', qs: [
            { t: 'mc', q: 'Paginação por demanda é…', o: ['Começar sem páginas na RAM e trazê-las conforme as faltas', 'Carregar o processo inteiro antes de executar', 'Usar páginas de tamanho variável', 'Pré-carregar o working set'], a: 0 },
            { t: 'mc', q: 'Thrashing é…', o: ['Faltas de página frequentes e contínuas', 'Fragmentação externa', 'A TLB cheia', 'Excesso de memória livre'], a: 0 },
            { t: 'mc', q: 'No WSClock, o ponteiro acha uma página com R = 1. O que faz?', o: ['Zera R, copia o CVT para o TLU e avança', 'Substitui a página', 'Agenda escrita no disco', 'Calcula a idade'], a: 0 },
            { t: 'input', q: 'WSClock: CVT = 2204, TLU da página = 1983. Qual a idade?', a: '221' },
            { t: 'mc', q: 'Idade 221, 𝒯 = 200, R = 0, M = 1. O que o WSClock faz?', o: ['Agenda a escrita no disco e avança', 'Substitui a página', 'Zera R e avança', 'Avança sem fazer nada'], a: 0 },
            { t: 'mc', q: 'Idade 50, 𝒯 = 200, R = 0. O que o WSClock faz?', o: ['Avança (está no working set)', 'Substitui', 'Agenda escrita', 'Zera M'], a: 0 },
            { t: 'mc', q: 'Por que o WSClock só funciona com política LOCAL?', o: ['Não existe um working set global do sistema', 'Porque usa FIFO', 'Porque não usa bit R', 'Porque precisa de TLB'], a: 0 },
            { t: 'match', q: 'Conclusões do slide', p: [['Ótimo', 'Não implementável; referência'], ['LRU', 'Excelente, mas custoso'], ['Aging', 'Eficiente, aproxima bem o LRU'], ['NRU', 'Aproximação muito rudimentar']] },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 10
    {
      id: 'proj', title: 'Projeto de paginação', sub: 'Alocação, thrashing, tamanho e compartilhamento', color: '#00cd9c',
      guide: [
        T(['', 'Global', 'Local'], [['Alocação', 'nº de molduras de cada processo varia com o tempo', 'nº de molduras fixo por processo'], ['Substituição', 'pode tirar moldura de qualquer processo', 'só tira molduras do próprio processo']]),
        '<p><b>PFF (Page Fault Frequency)</b>: mede a taxa de faltas (PFR). PFR alta → dá mais molduras; PFR baixa → tira molduras.</p>',
        '<p>Algoritmos que funcionam nas duas políticas: FIFO, Relógio, NRU, LRU, NFU, Aging. Só local: <b>WSClock</b>.</p>',
        '<p><b>Controle de carga</b>: se os working sets somados não cabem na RAM → <b>thrashing</b>; o PFF diz que todos precisam de mais memória e ninguém de menos. Solução: fazer swap-out de processos, redistribuir as molduras e repetir; considerar CPU-bound × I/O-bound (tirar muitos CPU-bound pode deixar a CPU ociosa).</p>',
        T(['Páginas grandes', 'Páginas pequenas'], [['Menos faltas de página', 'Mais faltas de página'], ['Mais fragmentação interna', 'Menos fragmentação interna'], ['Tabelas com menos entradas', 'Tabelas com mais entradas'], ['Programas ocupam mais memória mesmo com working set pequeno', 'Maior ocupação de entradas da TLB']]),
        '<p><b>Compartilhamento</b>: bibliotecas, mesmo programa por vários usuários, fork(). Páginas somente leitura (texto) são fáceis de compartilhar. Expulsar uma página compartilhada pode gerar faltas em outros processos.</p>',
        '<p><b>Copy-on-write (fork)</b>: pai e filho compartilham as molduras (cada um com sua tabela), marcadas como <b>somente leitura</b>. Numa escrita: violação de proteção → SO copia a moldura, atualiza a tabela e marca leitura/escrita.</p>',
      ],
      lessons: [
        {
          title: 'Políticas e controle de carga', qs: [
            { t: 'match', q: 'Ligue as políticas', p: [['Alocação global', 'Nº de molduras varia com o tempo'], ['Alocação local', 'Nº de molduras fixo'], ['Substituição global', 'Pode tirar moldura de outro processo'], ['Substituição local', 'Só tira do próprio processo']] },
            { t: 'mc', q: 'No PFF, a taxa de faltas de um processo está ALTA. O que fazer?', o: ['Dar mais molduras a ele', 'Tirar molduras dele', 'Aumentar o tamanho da página', 'Nada'], a: 0 },
            { t: 'mc', q: 'LRU, processo A pede a página A6. Idades (último uso): A0=10, A1=7, A2=5, A3=4, A4=6, A5=3, B3=2… Com substituição LOCAL sai…', o: ['A5', 'B3', 'A0', 'A3'], a: 0, e: 'Local: menor último uso entre as páginas de A → A5 (3). Global: a menor do sistema → B3 (2).' },
            { t: 'mc', q: 'Mesmo cenário (A5=3, B3=2 é a menor de todas). Com substituição GLOBAL sai…', o: ['B3', 'A5', 'A6', 'C0'], a: 0 },
            { t: 'mc', q: 'Qual algoritmo só funciona com política local?', o: ['WSClock', 'FIFO', 'LRU', 'Aging'], a: 0 },
            { t: 'mc', q: 'Solução para thrashing quando todos os processos precisam de mais memória:', o: ['Fazer swap-out de alguns processos e redistribuir as molduras', 'Aumentar a TLB', 'Usar FIFO', 'Diminuir o tamanho das páginas'], a: 0 },
            { t: 'tf', q: 'Fazer swap-out de muitos processos CPU-bound pode deixar a CPU ociosa.', a: true },
          ],
        },
        {
          title: 'Tamanho de página e compartilhamento', qs: [
            { t: 'cls', q: 'Característica de páginas GRANDES ou PEQUENAS?', buckets: ['Grandes', 'Pequenas'], items: [['Menos faltas de página', 0], ['Mais fragmentação interna', 0], ['Tabela de páginas com mais entradas', 1], ['Menos fragmentação interna', 1], ['Maior ocupação de entradas da TLB', 1], ['Programa ocupa mais memória mesmo com working set pequeno', 0]] },
            { t: 'tf', q: 'Existe um tamanho de página ideal para todos os sistemas.', a: false },
            { t: 'mc', q: 'O SO pode usar páginas de 8 KB num hardware de 4 KB?', o: ['Sim, alocando sempre duas molduras consecutivas', 'Não, nunca', 'Só com segmentação', 'Só com TLB invertida'], a: 0 },
            { t: 'mc', q: 'Quais páginas são as mais fáceis de compartilhar?', o: ['Somente leitura, como o segmento de texto', 'Pilha', 'Heap', 'Páginas modificadas'], a: 0 },
            { t: 'order', q: 'Copy-on-write depois de um fork()', o: ['Pai e filho apontam para as mesmas molduras', 'As molduras são marcadas como somente leitura', 'Um dos processos escreve nos dados', 'Violação de proteção avisa o SO', 'O SO copia a moldura e marca leitura/escrita'] },
            { t: 'tf', q: 'Expulsar uma página compartilhada pode causar faltas de página em outros processos.', a: true },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 11
    {
      id: 'arq', title: 'Arquivos: alocação de blocos', sub: 'Contígua, encadeada, indexada e i-node', color: '#1899d6', kicker: 'Cai na prova (das provas antigas)',
      guide: [
        '<p class="tip">Este tema não está nos slides da pasta, mas caiu nas provas 2 de 2019 e 2022 (questão 1). Confira com o material do professor.</p>',
        T(['Esquema', 'Como funciona', 'Tamanho máximo do arquivo'], [
          ['<b>Contígua</b>', 'blocos consecutivos; acesso rápido; sofre fragmentação externa', '≈ o disco inteiro'],
          ['<b>Encadeada</b>', 'cada bloco aponta para o próximo; sem fragmentação externa; acesso aleatório lento', 'disco − espaço gasto com os ponteiros'],
          ['<b>Indexada</b>', 'um bloco de índices com os ponteiros para os blocos de dados', '(ponteiros por bloco) × tamanho do bloco'],
          ['<b>Multinível / i-node</b>', 'ponteiros diretos + blocos de indireção simples, dupla…', 'soma dos blocos alcançáveis × tamanho do bloco'],
        ]),
        T(['Conta', 'Fórmula'], [['Nº de blocos', 'disco ÷ bloco'], ['Bits por ponteiro', 'log₂(nº de blocos) (se não for dado)'], ['Ponteiros por bloco', '⌊bits do bloco ÷ bits do ponteiro⌋ ou bloco ÷ bytes do ponteiro']]),
        '<p><b>Prova 2019-1</b> (disco 16 MB, blocos 2 KB): 2²⁴/2¹¹ = 2¹³ blocos → ponteiro de 13 bits. Contígua ≈ 16 MB. Encadeada: 2¹³ × 13 bits = 106.496 bits = 13 KB de ponteiros → 16 MB − 13 KB. Indexada: 2 KB = 16.384 bits ÷ 13 = <b>1.260 ponteiros</b> → 1.260 × 2 KB = <b>2.520 KB</b>. Multinível com metade direta e metade para blocos de índices: 630 × 2 KB + 630 × 1.260 × 2 KB = 1.260 + 1.587.600 = <b>1.588.860 KB</b> (≈ 1,5 GB).</p>',
        '<p><b>Prova 2019-2 / 2022</b> (i-node 4.3 BSD: 12 diretos, 1 indireção simples, 1 dupla; ponteiro 4 B, bloco 2.048 B): 2.048/4 = 512 ponteiros por bloco. Blocos = 12 + 512 + 512² = 12 + 512 + 262.144 = <b>262.668</b> → × 2 KB = <b>525.336 KB</b> (≈ 525 MB).</p>',
        '<p class="small muted">Obs.: o gabarito digitou “262.207 × 2 KB”, mas o total de blocos é 262.668 e o resultado 525.336 KB confere.</p>',
      ],
      lessons: [
        {
          title: 'Esquemas de alocação', qs: [
            { t: 'match', q: 'Ligue o esquema à descrição', p: [['Contígua', 'Blocos consecutivos no disco'], ['Encadeada', 'Cada bloco aponta para o próximo'], ['Indexada', 'Bloco de índices com os ponteiros'], ['i-node', 'Diretos + indireção simples e dupla']] },
            { t: 'mc', q: 'Qual esquema sofre fragmentação externa?', o: ['Contígua', 'Encadeada', 'Indexada', 'i-node'], a: 0 },
            { t: 'mc', q: 'Em qual esquema o acesso aleatório (ir direto ao bloco 500) é mais lento?', o: ['Encadeada', 'Contígua', 'Indexada', 'i-node'], a: 0 },
            { t: 'mc', q: 'Na alocação indexada simples, o tamanho máximo do arquivo é limitado por…', o: ['Quantos ponteiros cabem no bloco de índices', 'O tamanho do disco apenas', 'O número de diretórios', 'A TLB'], a: 0 },
            { t: 'tf', q: 'No i-node, arquivos pequenos usam só os ponteiros diretos (acesso rápido).', a: true },
          ],
        },
        {
          title: 'Prova 2019-1: disco de 16 MB', qs: [
            { t: 'input', q: 'Disco de 16 MB com blocos de 2 KB. Quantos blocos?', a: ['8192', '2^13', '8.192'] },
            { t: 'input', q: 'Quantos bits são necessários para endereçar um bloco?', a: '13', suf: 'bits' },
            { t: 'mc', q: 'Tamanho máximo de um arquivo com alocação CONTÍGUA:', o: ['Praticamente o disco inteiro (≈ 16 MB)', '2.520 KB', '13 KB', '1,5 GB'], a: 0 },
            { t: 'input', q: 'Encadeada: quantos KB são gastos com os ponteiros de 13 bits de todos os blocos?', a: '13', suf: 'KB', e: '2¹³ × 13 bits = 106.496 bits = 13.312 B = 13 KB → máximo = 16 MB − 13 KB.' },
            { t: 'input', q: 'Indexada: quantos ponteiros de 13 bits cabem num bloco de 2 KB?', a: ['1260', '1.260'], e: '2.048 × 8 = 16.384 bits ÷ 13 = 1.260 (arredonda para baixo).' },
            { t: 'input', q: 'Indexada: tamanho máximo do arquivo em KB?', a: ['2520', '2.520'], suf: 'KB', e: '1.260 × 2 KB.' },
            { t: 'input', q: 'Multinível: metade dos 1.260 ponteiros vai direto a dados e metade a blocos de índices (que apontam só para dados). Tamanho máximo em KB?', a: ['1588860', '1.588.860'], suf: 'KB', e: '630 × 2 + 630 × 1.260 × 2 = 1.260 + 1.587.600 = 1.588.860 KB.' },
          ],
        },
        {
          title: 'Prova 2019-2/2022: i-node', qs: [
            { t: 'input', q: 'Blocos de 2.048 B e ponteiros de 4 B. Quantos ponteiros cabem num bloco?', a: '512' },
            { t: 'input', q: 'Quantos blocos de dados a indireção DUPLA alcança?', a: ['262144', '262.144', '512^2'] },
            { t: 'input', q: '12 diretos + indireção simples + dupla. Total de blocos de dados?', a: ['262668', '262.668'], e: '12 + 512 + 262.144.' },
            { t: 'input', q: 'Tamanho máximo do arquivo, em KB?', a: ['525336', '525.336'], suf: 'KB', e: '262.668 × 2 KB = 525.336 KB ≈ 525 MB.' },
            { t: 'input', q: 'Mesmo i-node, mas blocos de 4 KB (ponteiros de 4 B). Tamanho máximo em KB?', a: ['4198448', '4.198.448'], suf: 'KB', e: '1.024 ponteiros: 12 + 1.024 + 1.048.576 = 1.049.612 blocos × 4 KB = 4.198.448 KB (≈ 4 GB).' },
            { t: 'mc', q: 'Se houvesse também indireção TRIPLA (bloco 2 KB, ponteiro 4 B), quantos blocos ela somaria?', o: ['512³ = 134.217.728', '512 × 3', '3 × 262.144', '512⁴'], a: 0 },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 12
    {
      id: 'bmp', title: 'Espaço livre em disco: bitmap', sub: 'Prova 2019-1, questão 4', color: '#d97706', kicker: 'Cai na prova (das provas antigas)',
      guide: [
        '<p>Bitmap de blocos livres: 1 bit por bloco (na prova, <b>1 = ocupado</b>). O bitmap é lido da <b>direita para a esquerda</b>: o bit mais à direita é o bloco 0. A busca começa pelo bloco de <b>menor número</b>.</p>',
        '<p class="tip">Blocos necessários = ⌈tamanho do arquivo ÷ tamanho do bloco⌉. Atenção a bits × bytes: 64.000 bits = 8.000 B.</p>',
        BITMAP_STEPS,
      ],
      lessons: [
        {
          title: 'Bitmap passo a passo', qs: [
            { t: 'mc', q: 'No bitmap 0000 0000 0000 0001, onde está o bloco 0?', o: ['No bit mais à direita', 'No bit mais à esquerda', 'No meio', 'Fora do bitmap'], a: 0 },
            { t: 'input', q: 'Bitmap 0000 0000 0111 1111 (blocos 0–6 ocupados). B grava 5 blocos. Novo bitmap?', a: '0000 1111 1111 1111', ph: '0000 0000 0000 0000', e: 'Ocupa os blocos 7 a 11.' },
            { t: 'input', q: 'Bitmap 0000 1111 1111 1111. O arquivo A (blocos 1–6) é apagado. Novo bitmap?', a: '0000 1111 1000 0001', ph: '0000 0000 0000 0000' },
            { t: 'input', q: 'Blocos de 4 KB. Quantos blocos usa um arquivo de 30 KB?', a: '8', suf: 'blocos', e: '30/4 = 7,5 → 8 blocos.' },
            { t: 'input', q: 'Bitmap 0000 1111 1000 0001. C (8 blocos) é gravado a partir do menor bloco livre. Novo bitmap?', a: '0011 1111 1111 1111', ph: '0000 0000 0000 0000', e: 'Usa os blocos 1–6 e 12–13.' },
            { t: 'input', q: 'Blocos de 4 KB. Quantos blocos usa um arquivo de 64.000 BITS?', a: '2', suf: 'blocos', e: '64.000 bits = 8.000 B; 2 blocos = 8.192 B.' },
            { t: 'input', q: 'Bitmap 0011 1111 1111 1111. D (2 blocos) é gravado. Novo bitmap?', a: '1111 1111 1111 1111', ph: '0000 0000 0000 0000' },
            { t: 'input', q: 'Arquivo de 9 KB com blocos de 4 KB: quantos KB ficam desperdiçados no último bloco?', a: '3', suf: 'KB', e: '3 blocos = 12 KB; 12 − 9 = 3 KB (fragmentação interna).' },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 13
    {
      id: 'sim', title: 'Simulado da Prova 2', sub: 'Questões no estilo da prova, com números novos', color: '#3c3c3c', kicker: 'Simulado',
      guide: [
        '<p>Questões no formato das provas 2 (2019-1, 2019-2, 2022), com valores diferentes. Na prova, <b>mostre como chegou ao resultado</b> — resposta sem demonstração é desconsiderada.</p>',
        '<ul><li>Q1: tamanho máximo de arquivo (contígua/encadeada/indexada/i-node).</li><li>Q2: simular FIFO/LRU/Relógio e contar ausências (e Belady).</li><li>Q3: bits de página/quadro e tamanho da tabela de páginas.</li><li>Q4: first/best/worst fit em partições dinâmicas.</li><li>Q5: tradução de endereço com tabela de páginas (hexadecimal) e memória máxima.</li><li>Bitmap de blocos livres.</li></ul>',
      ],
      lessons: [
        {
          title: 'Simulado A', qs: [
            { t: 'input', q: 'Disco de 32 MB, blocos de 4 KB, alocação INDEXADA com ponteiros do tamanho mínimo necessário. Tamanho máximo do arquivo em KB?', a: ['10080', '10.080'], suf: 'KB', e: '2²⁵/2¹² = 2¹³ blocos → 13 bits. 4.096 × 8 / 13 = 2.520 ponteiros × 4 KB = 10.080 KB.' },
            { t: 'input', q: 'i-node com 10 ponteiros diretos, 1 indireção simples e 1 dupla. Bloco de 1 KB e ponteiro de 4 B. Tamanho máximo em KB?', a: ['65802', '65.802'], suf: 'KB', e: '256 ponteiros: 10 + 256 + 65.536 = 65.802 blocos × 1 KB.' },
            { t: 'input', q: 'Sequência: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1\nFIFO, 3 quadros. Quantas ausências?', a: '15', suf: 'faltas' },
            { t: 'input', q: 'Mesma sequência (7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1), ÓTIMO com 3 quadros. Ausências?', a: '9', suf: 'faltas' },
            { t: 'input', q: 'Sequência: 1 2 3 4 1 2 5 1 2 3 4 5\nRelógio, 3 quadros. Ausências?', a: '9', suf: 'faltas' },
            { t: 'input', q: 'Páginas de 1 KB, endereços virtuais de 16 bits, memória de 64 KB, entrada com quadro + validade + R + M. Tamanho da tabela em BYTES?', a: '72', suf: 'B', e: 'Desl. 10; página 6 bits → 64 entradas; físico 16 bits → quadro 6; entrada 9 bits; 64 × 9 = 576 bits = 72 B.' },
            { t: 'mc', q: 'Memória de 64 KB: P0 8, P1 16, P2 12, P3 20 KB criados em ordem a partir do endereço 0; P1 termina. P4 de 6 KB chega com BEST fit. Onde entra?', o: ['No buraco de 8 KB do fim (a partir de 56 KB)', 'No buraco de 16 KB (a partir de 8 KB)', 'Não cabe', 'No início da memória'], a: 0, fig: mem([['P0', 8], ['livre', 16, 1], ['P2', 12], ['P3', 20], ['livre', 8, 1]]) },
            { t: 'input', q: 'Bitmap 0000 0000 0000 0001 (bloco 0 = raiz). A grava 3 blocos, B grava 2 blocos, A é apagado e C (10 KB, blocos de 4 KB) é gravado. Bitmap final?', a: '0000 0000 0011 1111', ph: '0000 0000 0000 0000', e: 'A: 1–3; B: 4–5; apaga A; C usa 3 blocos: 1–3.' },
            { gen: genHex, tag: 'calc' },
            { gen: genBits, tag: 'calc' },
          ],
        },
        {
          title: 'Simulado B (gerado)', qs: [
            { gen: genFaults('lru'), tag: 'calc' },
            { gen: genFaults('fifo'), tag: 'calc' },
            { gen: genFaults('clock'), tag: 'calc' },
            { gen: genTranslate, tag: 'calc' },
            { gen: genHex, tag: 'calc' },
            { gen: genBits, tag: 'calc' },
            { gen: genBits, tag: 'calc' },
            { gen: genTranslate, tag: 'calc' },
          ],
        },
      ],
    },
  ];

  // ------------------------------------------------------------------ consulta: resumo, fórmulas e ferramentas
  const REFERENCE = {
    title: 'Resumo da Prova 2',
    nav: 'Resumo',
    icon: '📐',
    panel: 'Fórmulas, tabelas dos algoritmos, simulador de substituição de páginas e calculadora de paginação.',
    searchHint: 'LRU, i-node, worst fit…',
    intro: 'Fórmulas e tabelas para revisar antes da prova, e duas ferramentas para conferir suas contas.',
    sections: [
      {
        title: 'Ferramentas',
        items: [
          { name: 'Simulador de substituição de páginas', tags: 'fifo lru otimo relogio clock segunda chance belady simulador', widget: simWidget,
            desc: 'Digite a sequência de referências, o número de quadros e o algoritmo. Mostra a tabela no formato da prova, as faltas (A) e avisa se houve anomalia de Belady.' },
          { name: 'Calculadora de paginação', tags: 'bits pagina quadro deslocamento tabela de paginas calculadora', widget: calcWidget,
            desc: 'Calcula bits de deslocamento, página e quadro, número de entradas e tamanho da tabela de páginas. Opcional: quebra um endereço em página + deslocamento.' },
        ],
      },
      {
        title: 'Paginação: fórmulas',
        items: [
          { name: 'Bits e tamanho da tabela', wide: true, tags: 'formula offset deslocamento entradas',
            fig: T(['Grandeza', 'Fórmula'], [['Deslocamento', 'log₂(tam. página)'], ['Bits de página', 'bits virtuais − deslocamento'], ['Entradas da tabela', '2^(bits de página)'], ['Bits de quadro', 'log₂(memória física) − deslocamento'], ['Entrada', 'bits de quadro + bits de controle'], ['Tabela', 'entradas × entrada (÷ 8 para bytes)']]) },
          { name: 'Traduzir endereço', tags: 'traducao endereco fisico virtual hexadecimal',
            desc: '<b>Decimal:</b> página = end ÷ tam; desl = end mod tam; físico = quadro × tam + desl.<br><b>Binário:</b> troque os bits de página pelos do quadro e copie o deslocamento. Para hexa, agrupe de 4 em 4 a partir da direita.',
            read: '1101 1010 1111 0011 0000 → página 11 → quadro 010 → 0x9AF30.' },
          { name: 'Potências de 2', tags: 'kb mb gb potencia',
            fig: T(['', ''], [['1 KB = 2¹⁰', '1 MB = 2²⁰'], ['2 KB = 2¹¹', '0,5 MB = 2¹⁹'], ['4 KB = 2¹²', '16 MB = 2²⁴'], ['8 KB = 2¹³', '1 GB = 2³⁰'], ['16 KB = 2¹⁴', '4 GB = 2³²']]) },
          { name: 'TLB, multinível e invertida', tags: 'tlb multinivel invertida hash working set',
            desc: '<b>TLB</b>: cache associativa de traduções (evita 2 acessos à RAM). <b>Multinível</b>: 10 | 10 | 12 em 32 bits; só cria as tabelas usadas. <b>Invertida</b>: 1 tabela global, 1 entrada por moldura (PID + página), busca por hash.' },
        ],
      },
      {
        title: 'Alocação de memória',
        items: [
          { name: 'First, next, best e worst fit', tags: 'first fit next fit best fit worst fit circular',
            fig: T(['Algoritmo', 'Escolhe'], [['First', '1º buraco que serve'], ['Next (circular)', 'first fit a partir de onde parou'], ['Best', 'menor sobra'], ['Worst', 'maior buraco']]) },
          { name: 'Fragmentação', tags: 'fragmentacao interna externa compactacao',
            desc: '<b>Interna</b>: sobra dentro da área alocada (partição fixa, última página). <b>Externa</b>: buracos espalhados (partição dinâmica, segmentação). Combate: juntar buracos vizinhos, compactar.' },
          { name: 'Exemplo da prova (worst fit)', wide: true, tags: 'worst fit prova 100 kb', fig: AFTER_VIII,
            desc: 'Após I–VIII em 100 KB: P5 entra no buraco de 30 KB (o maior), sobrando 25 KB.' },
          { name: 'Bitmap × lista ligada', tags: 'bitmap lista ligada memoria livre',
            desc: '<b>Bitmap</b>: 1 bit por unidade; achar k zeros seguidos é lento. <b>Lista</b>: segmentos P/L ordenados por endereço; ao liberar, junta vizinhos livres.' },
        ],
      },
      {
        title: 'Substituição de páginas',
        items: [
          { name: 'Algoritmos', wide: true, tags: 'otimo fifo relogio clock nru lru nfu aging wsclock',
            fig: T(['Algoritmo', 'Regra', 'Nota'], [['Ótimo', 'sai a usada mais longe no futuro', 'irrealizável; referência'], ['FIFO', 'sai a mais antiga', 'Belady'], ['Relógio', 'R=1 → zera e avança; R=0 → sai', 'vira FIFO se todos R=1; Belady'], ['NRU', 'aleatória da menor classe (R,M)', 'rudimentar'], ['LRU', 'sai a usada há mais tempo', 'ótimo na prática, caro; sem Belady'], ['NFU', 'contador += R; sai o menor', 'nunca esquece'], ['Aging', 'contador ≫ 1, R no bit mais alto', 'aproxima bem o LRU'], ['WSClock', 'working set + relógio + bit M', 'só política local']]) },
          { name: 'Anomalia de Belady', tags: 'belady anomalia mais quadros mais faltas',
            desc: 'Mais quadros e MAIS faltas. Ocorre no FIFO/Relógio. Ex.: 0 1 2 3 0 1 4 0 1 2 3 4 → 9 faltas com 3 quadros, 10 com 4.' },
          { name: 'Regras do WSClock', tags: 'wsclock cvt tlu idade tau',
            desc: 'R=1: R=0, TLU=CVT, avança. R=0: idade = CVT − TLU. Idade ≤ 𝒯: avança. Idade > 𝒯 e M=0: substitui. Idade > 𝒯 e M=1: agenda escrita e avança.' },
        ],
      },
      {
        title: 'Segmentação e projeto',
        items: [
          { name: 'Segmentação', tags: 'segmento base limite gdt ldt seletor x86',
            desc: 'Físico = base + desl (se desl &lt; limite). Sem frag. interna; com frag. externa. x86: seletor = índice 13 | GDT/LDT 1 | privilégio 2; descritor em índice × 8.' },
          { name: 'Tamanho de página', tags: 'pagina grande pequena',
            fig: T(['Grande', 'Pequena'], [['menos faltas', 'mais faltas'], ['mais frag. interna', 'menos frag. interna'], ['tabela menor', 'tabela maior'], ['desperdiça memória', 'mais entradas na TLB']]) },
          { name: 'Políticas e thrashing', tags: 'global local pff thrashing copy on write cow',
            desc: '<b>Global</b>: nº de molduras varia / tira de qualquer processo. <b>Local</b>: fixo / só do próprio. <b>PFF</b>: taxa alta → mais molduras. <b>Thrashing</b>: swap-out de processos. <b>Copy-on-write</b>: compartilha somente leitura e copia na 1ª escrita.' },
        ],
      },
      {
        title: 'Sistemas de arquivos',
        items: [
          { name: 'Tamanho máximo de arquivo', wide: true, tags: 'contigua encadeada indexada inode i-node indirecao',
            fig: T(['Esquema', 'Máximo', 'Prova'], [['Contígua', '≈ disco', '≈ 16 MB'], ['Encadeada', 'disco − ponteiros', '16 MB − 13 KB'], ['Indexada', 'ptrs/bloco × bloco', '1.260 × 2 KB = 2.520 KB'], ['Multinível (½ + ½)', '(p/2)·B + (p/2)·p·B', '1.588.860 KB'], ['i-node 12 + 1 + 1', '(12 + p + p²) × B', '262.668 × 2 KB = 525.336 KB']]) },
          { name: 'Bitmap de blocos', tags: 'bitmap blocos livres disco',
            desc: '1 bit por bloco (1 = ocupado), bloco 0 à direita, procura do menor bloco livre. Blocos = ⌈tamanho ÷ bloco⌉ (cuidado: bits ÷ 8 = bytes).', fig: BITMAP_STEPS },
        ],
      },
    ],
  };

  QUIZ.addCourse({
    id: 'so',
    title: 'Sistemas Operacionais — Prova 2',
    short: 'Sist. Operacionais',
    subtitle: 'Gerência de memória, memória virtual, substituição de páginas e alocação de arquivos',
    icon: '🖥️',
    color: '#1cb0f6',
    reference: REFERENCE,
    practice: [
      { icon: '🧮', title: 'Contas da prova', text: 'Só questões de cálculo, com números novos a cada rodada (bits, tradução, faltas de página).', tags: ['calc'], count: 10, color: '#ff4b4b' },
      { icon: '⌨️', title: 'Respostas digitadas', text: 'Todas as perguntas em que você digita o resultado — como na prova.', types: ['input'], count: 12, color: '#ff9600' },
    ],
    units: UNITS,
  });
})();
