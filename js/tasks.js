/* Oficina de diagramas: tarefas guiadas com verificação automática + validação geral (lint). */
(function () {
  const mk = ER.mk;
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Biblioteca de consultas sobre o modelo, usada pelas verificações
  function K(m) {
    const by = {};
    m.nodes.forEach((n) => (by[n.id] = n));
    const entLike = (n) => n && (n.t === 'ent' || (n.t === 'rel' && n.assoc));
    const k = {
      m, by, norm,
      E: (re) => m.nodes.find((n) => entLike(n) && re.test(norm(n.name))),
      Ents: (re) => m.nodes.filter((n) => entLike(n) && re.test(norm(n.name))),
      linksOf: (r) => m.links.filter((l) => r && l.a === r.id),
      // relacionamentos que ligam x e y (x === y → auto-relacionamento)
      between: (x, y) => {
        if (!x || !y) return [];
        return m.nodes.filter((n) => {
          if (n.t !== 'rel' || n.id === x.id || n.id === y.id) return false;
          const ls = m.links.filter((l) => l.a === n.id);
          if (x === y) return ls.filter((l) => l.b === x.id).length >= 2;
          return ls.some((l) => l.b === x.id) && ls.some((l) => l.b === y.id);
        });
      },
      relAll: (xs) => m.nodes.filter((n) => n.t === 'rel' && xs.every((x) => x && m.links.some((l) => l.a === n.id && l.b === x.id))),
      link: (r, x) => r && x && m.links.find((l) => l.a === r.id && l.b === x.id),
      card: (r, x) => {
        const l = r && x && m.links.find((q) => q.a === r.id && q.b === x.id);
        return l ? ER.cardText(l).toUpperCase() : '';
      },
      max: (r, x) => {
        const l = r && x && m.links.find((q) => q.a === r.id && q.b === x.id);
        return l ? String(l.max || '').toUpperCase() : '';
      },
      min: (r, x) => {
        const l = r && x && m.links.find((q) => q.a === r.id && q.b === x.id);
        return l ? String(l.min == null ? '' : l.min) : '';
      },
      attrs: (n) => (n ? m.nodes.filter((a) => a.t === 'attr' && a.owner === n.id) : []),
      attr: (n, re) => k.attrs(n).find((a) => re.test(norm(a.name))),
      attrDeep: (n, re) => {
        const st = [...k.attrs(n)];
        while (st.length) { const a = st.shift(); if (re.test(norm(a.name))) return a; st.push(...k.attrs(a)); }
        return null;
      },
      keys: (n) => k.attrs(n).filter((a) => a.key),
      gens: (p) => (p ? m.nodes.filter((g) => g.t === 'gen' && g.parent === p.id) : []),
      // n (entidade, associativa ou relacionamento) está associado a x?
      connected: (n, x) => {
        if (!n || !x) return false;
        if (n.t === 'rel' && m.links.some((l) => l.a === n.id && l.b === x.id)) return true;
        return k.between(n, x).length > 0;
      },
      isMaxN: (c) => /N|[2-9]/.test(String(c)),
    };
    return k;
  }

  // atalhos de verificação
  const need = (cond, msg) => (cond ? true : msg || false);

  const TASKS = [
    {
      id: 't1', level: 1, title: 'Lotação', concept: 'Entidade, relacionamento, (mín,máx)',
      text: 'Modele: “Um empregado obrigatoriamente está lotado em no máximo 1 departamento. Um departamento pode ter até N empregados lotados nele.”',
      steps: [
        { d: 'Crie a entidade Empregados', h: 'Ferramenta “Entidade” e clique no quadro. Dê o nome no painel.', c: (k) => !!k.E(/^empregad/) },
        { d: 'Crie a entidade Departamentos', c: (k) => !!k.E(/^departament/) },
        { d: 'Ligue as duas por um relacionamento (ex.: lotação)', h: 'Crie um losango e use “Ligar” para conectar o losango a cada entidade.', c: (k) => k.between(k.E(/^empregad/), k.E(/^departament/)).length > 0 },
        { d: 'Cardinalidade junto de Departamentos: (1,1)', h: 'Lembre: junto de Departamentos vai “quantos departamentos por empregado”.', c: (k) => { const e = k.E(/^empregad/), d = k.E(/^departament/); const r = k.between(e, d)[0]; return need(k.card(r, d) === '(1,1)'); } },
        { d: 'Cardinalidade junto de Empregados: (0,N)', c: (k) => { const e = k.E(/^empregad/), d = k.E(/^departament/); const r = k.between(e, d)[0]; return k.card(r, e) === '(0,N)'; } },
      ],
      solution: () => mk([['ent', 'E', 'Empregados', 160, 200], ['rel', 'R', 'lotação', 380, 200], ['ent', 'D', 'Departamentos', 610, 200]], [['R', 'E', '(0,N)'], ['R', 'D', '(1,1)']]),
    },
    {
      id: 't2', level: 1, title: 'Atributos e identificadores', concept: 'Atributo, identificador simples e composto',
      text: 'Modele Empregados com Código (identificador), Nome e Salário. Modele também Estantes, identificadas pela combinação NúmeroCorredor + NúmeroEstante, com o atributo NúmeroPrateleiras.',
      steps: [
        { d: 'Empregados com o identificador Código', h: 'Selecione o atributo e marque “Identificador” (círculo preenchido).', c: (k) => { const e = k.E(/^empregad/); const a = k.attr(e, /codigo|cod/); return !!(a && a.key); } },
        { d: 'Empregados com Nome e Salário (não identificadores)', c: (k) => { const e = k.E(/^empregad/); const n = k.attr(e, /nome/), s = k.attr(e, /salario/); return !!(n && s && !n.key && !s.key); } },
        { d: 'Entidade Estantes', c: (k) => !!k.E(/^estante/) },
        { d: 'NúmeroCorredor e NúmeroEstante, ambos identificadores', h: 'Identificador composto = os dois com círculo preenchido.', c: (k) => { const e = k.E(/^estante/); const a = k.attr(e, /corredor/), b = k.attr(e, /numeroestante|nestante|numestante|^estante/); return !!(a && b && a.key && b.key); } },
        { d: 'NúmeroPrateleiras, que NÃO é identificador', c: (k) => { const e = k.E(/^estante/); const a = k.attr(e, /prateleira/); return !!(a && !a.key); } },
      ],
      solution: () => mk([
        ['ent', 'E', 'Empregados', 200, 200], ['attr', 'n', 'Nome', 160, 140, { o: 'E', lp: 'l' }], ['attr', 'c', 'Código', 240, 140, { o: 'E', k: 1 }], ['attr', 's', 'Salário', 200, 265, { o: 'E', lp: 'l' }],
        ['ent', 'T', 'Estantes', 520, 200], ['attr', 'np', 'NúmeroPrateleiras', 480, 140, { o: 'T', lp: 'l' }], ['attr', 'nc', 'NúmeroCorredor', 560, 140, { o: 'T', k: 1 }], ['attr', 'ne', 'NúmeroEstante', 540, 265, { o: 'T', k: 1 }],
      ], []),
    },
    {
      id: 't3', level: 1, title: 'Tipos de atributo', concept: 'Opcional, multivalorado, composto',
      text: 'Empregados têm Nome, CNH (opcional), TelefonesContato (pelo menos um, podendo vários) e Endereço formado por Rua, Número e Cidade.',
      steps: [
        { d: 'Empregados com Nome', c: (k) => !!k.attr(k.E(/^empregad/), /nome/) },
        { d: 'CNH opcional: (0,1)', h: 'Selecione o atributo e escolha a cardinalidade (0,1).', c: (k) => { const a = k.attr(k.E(/^empregad/), /cnh/); return !!(a && a.card === '(0,1)'); } },
        { d: 'TelefonesContato multivalorado obrigatório: (1,N)', c: (k) => { const a = k.attr(k.E(/^empregad/), /telefone/); return !!(a && a.card === '(1,N)'); } },
        { d: 'Endereço composto por Rua, Número e Cidade', h: 'Selecione Endereço e use “+ Sub-atributo” três vezes.', c: (k) => { const a = k.attr(k.E(/^empregad/), /endereco/); return !!(a && k.attr(a, /rua/) && k.attr(a, /numero|^n$|^num/) && k.attr(a, /cidade/)); } },
      ],
      solution: () => mk([
        ['ent', 'E', 'Empregados', 300, 220],
        ['attr', 'n', 'Nome', 255, 160, { o: 'E', lp: 'l' }], ['attr', 'cnh', 'CNH', 345, 160, { o: 'E', c: '(0,1)' }],
        ['attr', 'tel', 'TelefonesContato', 235, 280, { o: 'E', c: '(1,N)', lp: 'l' }],
        ['attr', 'end', 'Endereço', 360, 275, { o: 'E' }],
        ['attr', 'rua', 'Rua', 330, 330, { o: 'end', lp: 'l' }], ['attr', 'num', 'Número', 360, 350, { o: 'end', lp: 'b' }], ['attr', 'cid', 'Cidade', 395, 330, { o: 'end' }],
      ], []),
    },
    {
      id: 't4', level: 2, title: 'Supervisão', concept: 'Auto-relacionamento e papéis',
      text: '“Um empregado pode ser supervisionado por no máximo 1 empregado. Um empregado pode supervisionar no máximo N empregados.” Não esqueça dos papéis.',
      steps: [
        { d: 'Entidade Empregados', c: (k) => !!k.E(/^empregad/) },
        { d: 'Relacionamento ligado DUAS vezes a Empregados', h: 'Use “Ligar” duas vezes entre o losango e Empregados.', c: (k) => { const e = k.E(/^empregad/); return k.between(e, e).length > 0; } },
        { d: 'As duas ligações têm papéis (supervisor / supervisionado)', h: 'Selecione cada linha e preencha “Papel”.', c: (k) => { const e = k.E(/^empregad/); const r = k.between(e, e)[0]; const ls = k.linksOf(r).filter((l) => l.b === (e && e.id)); return ls.length >= 2 && ls.every((l) => (l.role || '').trim()); } },
        { d: 'Papel supervisor com (0,1)', c: (k) => { const e = k.E(/^empregad/); const r = k.between(e, e)[0]; const l = k.linksOf(r).find((x) => /^supervisor(a)?$/.test(norm(x.role))); return !!(l && ER.cardText(l) === '(0,1)'); } },
        { d: 'Papel supervisionado com (0,N)', c: (k) => { const e = k.E(/^empregad/); const r = k.between(e, e)[0]; const l = k.linksOf(r).find((x) => /supervisionad/.test(norm(x.role))); return !!(l && ER.cardText(l).toUpperCase() === '(0,N)'); } },
      ],
      solution: () => mk([['ent', 'E', 'Empregados', 200, 220], ['rel', 'R', 'supervisão', 440, 220]], [['R', 'E', '(0,N)', { role: 'supervisionado' }], ['R', 'E', '(0,1)', { role: 'supervisor' }]]),
    },
    {
      id: 't5', level: 2, title: 'Distribuição', concept: 'Relacionamento ternário',
      text: 'Cidades, Produtos e Distribuidores. “Um produto em uma cidade pode ser entregue por no máximo 1 distribuidor (e sempre há um).” Um distribuidor entrega um produto em uma ou mais cidades, e numa cidade entrega um ou mais produtos.',
      steps: [
        { d: 'Entidades Cidades, Produtos e Distribuidores', c: (k) => !!(k.E(/^cidade/) && k.E(/^produto/) && k.E(/^distribuidor/)) },
        { d: 'UM relacionamento ligado às três (ternário)', h: 'Um único losango com três ligações.', c: (k) => k.relAll([k.E(/^cidade/), k.E(/^produto/), k.E(/^distribuidor/)]).length > 0 },
        { d: 'Junto de Distribuidores: (1,1)', c: (k) => { const d = k.E(/^distribuidor/); const r = k.relAll([k.E(/^cidade/), k.E(/^produto/), d])[0]; return k.card(r, d) === '(1,1)'; } },
        { d: 'Junto de Cidades e de Produtos: (1,N)', c: (k) => { const c = k.E(/^cidade/), p = k.E(/^produto/); const r = k.relAll([c, p, k.E(/^distribuidor/)])[0]; return k.card(r, c) === '(1,N)' && k.card(r, p) === '(1,N)'; } },
      ],
      solution: () => mk([['ent', 'C', 'Cidades', 160, 200], ['rel', 'R', 'distribuição', 390, 200], ['ent', 'D', 'Distribuidores', 640, 200], ['ent', 'P', 'Produtos', 390, 340]],
        [['R', 'C', '(1,N)'], ['R', 'D', '(1,1)'], ['R', 'P', '(1,N)']]),
    },
    {
      id: 't6', level: 2, title: 'Pedidos e itens', concept: 'Entidade fraca',
      text: 'Pedidos (Número, Data) são compostos por Itens (NúmeroSeqüência, Quantidade). Um item só é identificado junto com o número do seu pedido. Cada item referencia exatamente 1 Produto (Código, Descrição); um produto aparece em 0 ou N itens. Um pedido tem pelo menos 1 item.',
      steps: [
        { d: 'Pedidos com Número ● e Data', c: (k) => { const p = k.E(/^pedido/); const a = k.attr(p, /numero/); return !!(a && a.key && k.attr(p, /data/)); } },
        { d: 'Itens com NúmeroSeqüência ● e Quantidade', c: (k) => { const p = k.E(/^iten|^item/); const a = k.attr(p, /seq/); return !!(a && a.key && k.attr(p, /quant/)); } },
        { d: 'Relacionamento Pedidos (1,1) — (1,N) Itens', c: (k) => { const p = k.E(/^pedido/), i = k.E(/^iten|^item/); const r = k.between(p, i)[0]; return k.card(r, p) === '(1,1)' && k.card(r, i) === '(1,N)'; } },
        { d: 'Ligação do lado de Itens marcada como identificadora (linha grossa)', h: 'Selecione a linha entre o losango e Itens e marque “Relacionamento identificador”.', c: (k) => { const p = k.E(/^pedido/), i = k.E(/^iten|^item/); const r = k.between(p, i)[0]; const l = k.link(r, i); return !!(l && l.weak); } },
        { d: 'Produtos com Código ● e Descrição', c: (k) => { const p = k.E(/^produto/); const a = k.attr(p, /codigo|cod/); return !!(a && a.key && k.attr(p, /descri/)); } },
        { d: 'Itens (0,N) — referência — (1,1) Produtos', c: (k) => { const i = k.E(/^iten|^item/), p = k.E(/^produto/); const r = k.between(i, p)[0]; return k.card(r, p) === '(1,1)' && k.card(r, i) === '(0,N)'; } },
      ],
      solution: () => mk([
        ['ent', 'P', 'Pedidos', 160, 220], ['attr', 'pn', 'Número', 125, 165, { o: 'P', k: 1, lp: 'l' }], ['attr', 'pd', 'Data', 140, 280, { o: 'P', lp: 'l' }],
        ['rel', 'C', 'composição', 360, 220],
        ['ent', 'I', 'Itens', 560, 220], ['attr', 'is', 'NúmeroSeqüência', 580, 165, { o: 'I', k: 1 }], ['attr', 'iq', 'Quantidade', 540, 280, { o: 'I', lp: 'l' }],
        ['rel', 'F', 'referência', 760, 220],
        ['ent', 'D', 'Produtos', 760, 370], ['attr', 'dc', 'Código', 690, 370, { o: 'D', k: 1, lp: 'l' }], ['attr', 'dd', 'Descrição', 800, 425, { o: 'D' }],
      ], [['C', 'P', '(1,1)'], ['C', 'I', '(1,N)', { weak: true }], ['F', 'I', '(0,N)'], ['F', 'D', '(1,1)']]),
    },
    {
      id: 't7', level: 3, title: 'Engenheiros e motoristas', concept: 'Generalização/especialização',
      text: 'Empregados (CPF ●, Nome, Salário) estão lotados em exatamente 1 Departamento (Código ●, Nome); um departamento tem 0..N empregados. Alguns empregados são Engenheiros (com CREA), outros Motoristas (com CNH); ninguém é os dois, e há empregados que não são nenhum. Só engenheiros participam de Projetos (Código ●, Título): N:N, ambos opcionais.',
      steps: [
        { d: 'Empregados (CPF ●) e Departamentos (Código ●)', c: (k) => { const e = k.E(/^empregad/), d = k.E(/^departament/); const a = k.attr(e, /cpf/), b = k.attr(d, /codigo|cod/); return !!(a && a.key && b && b.key); } },
        { d: 'lotação: (0,N) junto de Empregados e (1,1) junto de Departamentos', c: (k) => { const e = k.E(/^empregad/), d = k.E(/^departament/); const r = k.between(e, d)[0]; return k.card(r, e) === '(0,N)' && k.card(r, d) === '(1,1)'; } },
        { d: 'Especialização de Empregados em Engenheiros e Motoristas', h: 'Selecione Empregados → “Criar especialização”; depois marque as especializadas no painel.', c: (k) => { const g = k.gens(k.E(/^empregad/))[0]; const en = k.E(/^engenheir/), mo = k.E(/^motorist/); return !!(g && en && mo && g.children.includes(en.id) && g.children.includes(mo.id)); } },
        { d: 'Tipo correto: (p,d)', h: 'Pode não ser nenhum → parcial. Não pode ser os dois → disjunta.', c: (k) => { const g = k.gens(k.E(/^empregad/))[0]; return !!(g && !g.total && g.disj); } },
        { d: 'CREA em Engenheiros e CNH em Motoristas', c: (k) => !!(k.attr(k.E(/^engenheir/), /crea/) && k.attr(k.E(/^motorist/), /cnh/)) },
        { d: 'participação entre ENGENHEIROS e Projetos, (0,N) e (0,N)', h: 'O relacionamento deve ligar a especializada, não Empregados.', c: (k) => { const en = k.E(/^engenheir/), p = k.E(/^projeto/); const r = k.between(en, p)[0]; return k.card(r, en) === '(0,N)' && k.card(r, p) === '(0,N)'; } },
      ],
      solution: () => mk([
        ['ent', 'PJ', 'Projetos', 140, 250], ['attr', 'pc', 'Código', 105, 195, { o: 'PJ', k: 1, lp: 'l' }], ['attr', 'pt', 'Título', 175, 195, { o: 'PJ' }],
        ['rel', 'PA', 'participação', 140, 420],
        ['ent', 'E', 'Empregados', 420, 250], ['attr', 'sal', 'Salário', 345, 200, { o: 'E', lp: 'l' }], ['attr', 'nome', 'Nome', 405, 195, { o: 'E', lp: 'l' }], ['attr', 'cpf', 'CPF', 465, 195, { o: 'E', k: 1 }],
        ['gen', 'G', '', 420, 320, { p: 'E', ch: ['EN', 'MO'], kind: 'p,d' }],
        ['ent', 'EN', 'Engenheiros', 340, 420], ['attr', 'crea', 'CREA', 300, 480, { o: 'EN', lp: 'l' }],
        ['ent', 'MO', 'Motoristas', 510, 420], ['attr', 'cnh', 'CNH', 540, 480, { o: 'MO' }],
        ['rel', 'LO', 'lotação', 660, 250], ['ent', 'D', 'Departamentos', 890, 250],
        ['attr', 'dn', 'Nome', 860, 195, { o: 'D', lp: 'l' }], ['attr', 'dc', 'Código', 925, 195, { o: 'D', k: 1 }],
      ], [['PA', 'PJ', '(0,N)'], ['PA', 'EN', '(0,N)'], ['LO', 'E', '(0,N)'], ['LO', 'D', '(1,1)']]),
    },
    {
      id: 't8', level: 3, title: 'Prescrições', concept: 'Entidade associativa',
      start: () => mk([['ent', 'M', 'Médicos', 160, 200], ['rel', 'R', 'consulta', 400, 200], ['ent', 'P', 'Pacientes', 640, 200], ['ent', 'X', 'Medicamentos', 400, 380]], [['R', 'M', '(0,N)'], ['R', 'P', '(0,N)']]),
      text: 'O diagrama já começa com Médicos —consulta— Pacientes. Agora deseja-se saber os medicamentos prescritos em cada consulta: uma consulta prescreve 0..N medicamentos, e um medicamento aparece em 0..N consultas.',
      steps: [
        { d: 'consulta continua ligando Médicos e Pacientes', c: (k) => { const m = k.E(/^medico/), p = k.E(/^paciente/); return k.between(m, p).length > 0; } },
        { d: 'consulta virou entidade associativa', h: 'Selecione o losango consulta e marque “Entidade associativa”.', c: (k) => { const m = k.E(/^medico/), p = k.E(/^paciente/); const r = k.between(m, p)[0]; return !!(r && r.assoc); } },
        { d: 'Relacionamento (ex.: prescrição) entre a associativa e Medicamentos', c: (k) => { const m = k.E(/^medico/), p = k.E(/^paciente/); const c = k.between(m, p).find((r) => r.assoc); return !!(c && k.between(c, k.E(/^medicament/)).length); } },
        { d: 'Cardinalidades (0,N) dos dois lados da prescrição', c: (k) => { const m = k.E(/^medico/), p = k.E(/^paciente/); const c = k.between(m, p).find((r) => r.assoc); const x = k.E(/^medicament/); const r = c && k.between(c, x)[0]; return k.card(r, c) === '(0,N)' && k.card(r, x) === '(0,N)'; } },
      ],
      solution: () => mk([['ent', 'M', 'Médicos', 160, 200], ['rel', 'R', 'consulta', 400, 200, { assoc: true }], ['ent', 'P', 'Pacientes', 640, 200], ['rel', 'PR', 'prescrição', 400, 360], ['ent', 'X', 'Medicamentos', 650, 360]],
        [['R', 'M', '(0,N)'], ['R', 'P', '(0,N)'], ['PR', 'R', '(0,N)'], ['PR', 'X', '(0,N)']]),
    },
    {
      id: 't9', level: 3, title: 'Consultas repetidas', concept: 'Identificação de relacionamentos',
      text: 'Médicos (Codm ●, Nome) consultam Pacientes (Codp ●, Nome), N:N opcional dos dois lados. O mesmo médico pode atender o mesmo paciente em datas diferentes, mas no máximo uma vez por dia. Registre também a Hora da consulta.',
      steps: [
        { d: 'Médicos com Codm ● e Pacientes com Codp ●', c: (k) => { const a = k.attr(k.E(/^medico/), /codm|crm|cod/), b = k.attr(k.E(/^paciente/), /codp|cod/); return !!(a && a.key && b && b.key); } },
        { d: 'consulta com (0,N) dos dois lados', c: (k) => { const m = k.E(/^medico/), p = k.E(/^paciente/); const r = k.between(m, p)[0]; return k.card(r, m) === '(0,N)' && k.card(r, p) === '(0,N)'; } },
        { d: 'Data no relacionamento, como identificador', h: 'Adicione o atributo no LOSANGO e marque “Identificador”.', c: (k) => { const r = k.between(k.E(/^medico/), k.E(/^paciente/))[0]; const a = k.attr(r, /data/); return !!(a && a.key); } },
        { d: 'Hora no relacionamento, sem ser identificador', h: 'Se Hora fosse identificador, o médico poderia atender o paciente 2x no mesmo dia.', c: (k) => { const r = k.between(k.E(/^medico/), k.E(/^paciente/))[0]; const a = k.attr(r, /hora/); return !!(a && !a.key); } },
      ],
      solution: () => mk([
        ['ent', 'M', 'Médicos', 160, 220], ['attr', 'cm', 'Codm', 140, 165, { o: 'M', k: 1, lp: 'l' }], ['attr', 'mn', 'Nome', 140, 280, { o: 'M', lp: 'l' }],
        ['rel', 'R', 'consulta', 400, 220], ['attr', 'h', 'Hora', 390, 160, { o: 'R' }], ['attr', 'd', 'Data', 425, 285, { o: 'R', k: 1 }],
        ['ent', 'P', 'Pacientes', 640, 220], ['attr', 'cp', 'Codp', 660, 165, { o: 'P', k: 1 }], ['attr', 'pn', 'Nome', 660, 280, { o: 'P' }],
      ], [['R', 'M', '(0,N)'], ['R', 'P', '(0,N)']]),
    },
    // ---------------------------------------------------------------- exercícios do slide
    {
      id: 'e1', level: 4, title: 'Exercício I — Administradora de Imóveis', concept: 'Exercício do slide',
      text: 'A administradora gerencia condomínios compostos por diversos lotes. Cada condomínio tem um nome e um código. Cada lote possui um número de identificação, uma área em m², e pode pertencer a uma ou mais pessoas. Uma pessoa pode ter diversos lotes. Para cada pessoa registra-se o CPF, nome e celular de contato. Cada lote pode estar alugado para no máximo uma pessoa, que paga um determinado preço por este aluguel, com uma data de vencimento pré-estabelecida. Uma pessoa pode alugar diversos lotes.',
      steps: [
        { d: 'Entidades Condomínios, Lotes e Pessoas', c: (k) => !!(k.E(/^condomini/) && k.E(/^lote/) && k.E(/^pessoa|^proprietari|^cliente/)) },
        { d: 'Condomínios: Código ● e Nome', c: (k) => { const c = k.E(/^condomini/); const a = k.attr(c, /codigo|cod/); return !!(a && a.key && k.attr(c, /nome/)); } },
        { d: 'Lotes: Número ● e Área', c: (k) => { const l = k.E(/^lote/); const a = k.attr(l, /numero|^num|^id/); return !!(a && a.key && k.attr(l, /area/)); } },
        { d: 'Pessoas: CPF ●, Nome e Celular', c: (k) => { const p = k.E(/^pessoa|^proprietari|^cliente/); const a = k.attr(p, /cpf/); return !!(a && a.key && k.attr(p, /nome/) && k.attr(p, /celular|telefone|fone/)); } },
        { d: 'Condomínios —(1,1)/(1,N)— Lotes: todo lote está em 1 condomínio', h: 'Junto de Condomínios vai (1,1); junto de Lotes, (1,N).', c: (k) => { const c = k.E(/^condomini/), l = k.E(/^lote/); const r = k.between(c, l)[0]; if (!r) return false; if (k.card(r, c) !== '(1,1)') return 'Junto de Condomínios deveria ser (1,1).'; return k.isMaxN(k.max(r, l)) ? true : 'Junto de Lotes o máximo deveria ser N.'; } },
        { d: 'Propriedade Pessoas–Lotes: um lote tem (1,N) donos; uma pessoa tem (0,N) lotes', h: 'Junto de Pessoas: quantas pessoas são donas de UM lote.', c: (k) => { const p = k.E(/^pessoa|^proprietari|^cliente/), l = k.E(/^lote/); return k.between(p, l).some((r) => k.card(r, p) === '(1,N)' && k.isMaxN(k.max(r, l))); } },
        { d: 'Aluguel Pessoas–Lotes: no máximo 1 locatário por lote (0,1); uma pessoa aluga (0,N)', c: (k) => { const p = k.E(/^pessoa|^proprietari|^cliente/), l = k.E(/^lote/); return k.between(p, l).some((r) => k.card(r, p) === '(0,1)' && k.isMaxN(k.max(r, l))); } },
        { d: 'O aluguel tem Preço e Vencimento como atributos do relacionamento', h: 'Preço e data de vencimento são da locação (pessoa + lote), não do lote.', c: (k) => { const p = k.E(/^pessoa|^proprietari|^cliente/), l = k.E(/^lote/); return k.between(p, l).some((r) => k.max(r, p) === '1' && k.attr(r, /preco|valor/) && k.attr(r, /venc/)); } },
      ],
      solution: () => mk([
        ['ent', 'C', 'Condomínios', 170, 150], ['attr', 'cc', 'Código', 130, 95, { o: 'C', k: 1, lp: 'l' }], ['attr', 'cn', 'Nome', 210, 95, { o: 'C' }],
        ['rel', 'CO', 'composição', 170, 300],
        ['ent', 'L', 'Lotes', 170, 450], ['attr', 'ln', 'Número', 120, 510, { o: 'L', k: 1, lp: 'l' }], ['attr', 'la', 'Área', 210, 510, { o: 'L' }],
        ['rel', 'PR', 'propriedade', 470, 370],
        ['rel', 'AL', 'aluguel', 470, 530], ['attr', 'ap', 'Preço', 430, 600, { o: 'AL', lp: 'l' }], ['attr', 'av', 'Vencimento', 510, 600, { o: 'AL' }],
        ['ent', 'P', 'Pessoas', 770, 450], ['attr', 'pc', 'CPF', 810, 390, { o: 'P', k: 1 }], ['attr', 'pn', 'Nome', 730, 390, { o: 'P', lp: 'l' }], ['attr', 'pf', 'Celular', 810, 510, { o: 'P' }],
      ], [['CO', 'C', '(1,1)'], ['CO', 'L', '(1,N)'], ['PR', 'L', '(0,N)'], ['PR', 'P', '(1,N)'], ['AL', 'L', '(0,N)'], ['AL', 'P', '(0,1)']]),
    },
    {
      id: 'e2', level: 4, title: 'Exercício II — Clínica Particular', concept: 'Exercício do slide',
      text: 'Em uma clínica trabalham médicos e existem pacientes internados. Cada médico é identificado pelo seu CRM, possui um nome e recebe um salário na clínica. Um médico tem formação em diversas especialidades (ortopedia, traumatologia, etc), mas só exerce uma delas na clínica. Para todo paciente internado na clínica são cadastrados alguns dados: nome, RG, CPF, endereço, telefone(s) para contato, data do nascimento e um código (codp). Um paciente tem sempre um determinado médico como responsável (com um horário de visita diário pré-determinado). Pacientes estão sempre internados em quartos individuais, que são identificados por um número e ficam em um andar da clínica.',
      steps: [
        { d: 'Médicos: CRM ●, Nome, Salário', c: (k) => { const m = k.E(/^medico/); const a = k.attr(m, /crm/); return !!(a && a.key && k.attr(m, /nome/) && k.attr(m, /salario/)); } },
        { d: 'Entidade Especialidades (com identificador)', h: 'Especialidades são compartilhadas por vários médicos e participam de dois relacionamentos.', c: (k) => { const e = k.E(/^especialidad/); return !!(e && k.keys(e).length); } },
        { d: 'Formação: Médicos N — N Especialidades', c: (k) => { const m = k.E(/^medico/), e = k.E(/^especialidad/); return k.between(m, e).some((r) => k.isMaxN(k.max(r, e)) && k.isMaxN(k.max(r, m))); } },
        { d: 'Exerce: cada médico exerce exatamente 1 especialidade — (1,1) junto de Especialidades', c: (k) => { const m = k.E(/^medico/), e = k.E(/^especialidad/); return k.between(m, e).some((r) => k.card(r, e) === '(1,1)'); } },
        { d: 'Pacientes: Codp ●, Nome, RG, CPF, DataNascimento, Endereço', c: (k) => { const p = k.E(/^paciente/); const a = k.attr(p, /codp|cod/); return !!(a && a.key && k.attr(p, /nome/) && k.attr(p, /^rg/) && k.attr(p, /cpf/) && k.attr(p, /nasc/) && k.attr(p, /endereco/)); } },
        { d: 'Telefones do paciente: multivalorado (1,N)', c: (k) => { const a = k.attr(k.E(/^paciente/), /telefone|fone/); return !!(a && /N/i.test(a.card || '')); } },
        { d: 'Responsável: (1,1) junto de Médicos, (0,N) junto de Pacientes, com HorárioVisita no relacionamento', h: 'O horário é da relação médico–paciente.', c: (k) => { const m = k.E(/^medico/), p = k.E(/^paciente/); return k.between(m, p).some((r) => k.card(r, m) === '(1,1)' && k.isMaxN(k.max(r, p)) && k.attr(r, /horar|visita/)); } },
        { d: 'Quartos: Número ● e Andar', c: (k) => { const q = k.E(/^quarto/); const a = k.attr(q, /numero|^num/); return !!(a && a.key && k.attr(q, /andar/)); } },
        { d: 'Internação: (1,1) junto de Quartos e (0,1) junto de Pacientes', h: 'Quarto individual → no máximo 1 paciente por quarto.', c: (k) => { const p = k.E(/^paciente/), q = k.E(/^quarto/); return k.between(p, q).some((r) => k.card(r, q) === '(1,1)' && k.card(r, p) === '(0,1)'); } },
      ],
      solution: () => mk([
        ['ent', 'M', 'Médicos', 220, 200], ['attr', 'crm', 'CRM', 175, 145, { o: 'M', k: 1, lp: 'l' }], ['attr', 'mn', 'Nome', 265, 145, { o: 'M' }], ['attr', 'ms', 'Salário', 145, 215, { o: 'M', lp: 'l' }],
        ['rel', 'FO', 'formação', 120, 360], ['rel', 'EX', 'exerce', 320, 360],
        ['ent', 'S', 'Especialidades', 220, 510], ['attr', 'sn', 'Nome', 220, 570, { o: 'S', k: 1, lp: 'r' }],
        ['rel', 'RE', 'responsável', 500, 200], ['attr', 'hv', 'HorárioVisita', 500, 135, { o: 'RE', lp: 'r' }],
        ['ent', 'P', 'Pacientes', 780, 200],
        ['attr', 'cp', 'Codp', 820, 140, { o: 'P', k: 1 }], ['attr', 'pn', 'Nome', 740, 140, { o: 'P', lp: 'l' }],
        ['attr', 'rg', 'RG', 870, 165, { o: 'P' }], ['attr', 'cpf', 'CPF', 880, 205, { o: 'P' }], ['attr', 'en', 'Endereço', 870, 245, { o: 'P' }],
        ['attr', 'dn', 'DataNascimento', 815, 280, { o: 'P' }], ['attr', 'tel', 'Telefones', 735, 270, { o: 'P', c: '(1,N)', lp: 'l' }],
        ['rel', 'IN', 'internação', 780, 400],
        ['ent', 'Q', 'Quartos', 780, 560], ['attr', 'qn', 'Número', 735, 615, { o: 'Q', k: 1, lp: 'l' }], ['attr', 'qa', 'Andar', 825, 615, { o: 'Q' }],
      ], [['FO', 'M', '(0,N)'], ['FO', 'S', '(1,N)'], ['EX', 'M', '(0,N)'], ['EX', 'S', '(1,1)'], ['RE', 'M', '(1,1)'], ['RE', 'P', '(0,N)'], ['IN', 'P', '(0,1)'], ['IN', 'Q', '(1,1)']]),
    },
    {
      id: 'e3', level: 4, title: 'Exercício III — Biblioteca', concept: 'Exercício do slide',
      text: 'Uma biblioteca mantém um conjunto de livros. Um livro tem vários exemplares na biblioteca. São mantidos dados detalhados sobre autores e editoras dos livros para fins de consulta. Na biblioteca trabalham vários bibliotecários. Além disso, existem clientes que podem retirar exemplares para leitura em casa. Essas retiradas (empréstimos) devem ser cadastradas no BD e devem conter a data da devolução e o valor diário da multa. O bibliotecário que cadastrou o empréstimo de um exemplar para um cliente também deve ser mantido no BD. Bibliotecários são estagiários ou efetivos. Um bibliotecário estagiário está sempre sob a responsabilidade de um bibliotecário efetivo. Deve-se saber também a instituição de ensino da qual o estagiário vem. Defina os atributos que julgares relevantes.',
      steps: [
        { d: 'Livros e Exemplares: um livro tem N exemplares, cada exemplar é de exatamente 1 livro', c: (k) => { const l = k.E(/^livro/), x = k.E(/^exemplar/); return k.between(l, x).some((r) => k.card(r, l) === '(1,1)' && k.isMaxN(k.max(r, x))); } },
        { d: 'Autores e Editoras, cada um com identificador', c: (k) => { const a = k.E(/^autor/), e = k.E(/^editora/); return !!(a && e && k.keys(a).length && k.keys(e).length); } },
        { d: 'Autoria: Livros N — N Autores', c: (k) => { const l = k.E(/^livro/), a = k.E(/^autor/); return k.between(l, a).some((r) => k.isMaxN(k.max(r, l)) && k.isMaxN(k.max(r, a))); } },
        { d: 'Livros — Editoras: cada livro tem no máximo 1 editora', c: (k) => { const l = k.E(/^livro/), e = k.E(/^editora/); return k.between(l, e).some((r) => k.max(r, e) === '1'); } },
        { d: 'Bibliotecários especializados em Estagiários e Efetivos, (t,d)', h: '“São estagiários OU efetivos”: todo bibliotecário é um dos dois, e não os dois.', c: (k) => { const g = k.gens(k.E(/^bibliotecari/))[0]; const s = k.E(/^estagiari/), f = k.E(/^efetiv/); return !!(g && s && f && g.children.includes(s.id) && g.children.includes(f.id) && g.total && g.disj); } },
        { d: 'Estagiário sob responsabilidade de 1 efetivo: (1,1) junto de Efetivos', c: (k) => { const s = k.E(/^estagiari/), f = k.E(/^efetiv/); return k.between(s, f).some((r) => k.card(r, f) === '(1,1)'); } },
        { d: 'Instituição de ensino do estagiário (atributo ou entidade ligada a Estagiários)', c: (k) => { const s = k.E(/^estagiari/); if (k.attr(s, /institui|escola|faculdade|universidade/)) return true; const i = k.E(/^institui/); return !!(i && k.between(s, i).length); } },
        { d: 'Clientes com identificador', c: (k) => { const c = k.E(/^cliente|^leitor|^usuario/); return !!(c && k.keys(c).length); } },
        { d: 'Empréstimo associando Clientes e Exemplares', h: 'Pode ser entidade associativa, relacionamento ternário ou entidade Empréstimos.', c: (k) => !!findLoan(k) },
        { d: 'Empréstimo com data de devolução e valor diário da multa', c: (k) => { const e = findLoan(k); return !!(e && k.attrDeep(e, /devol/) && k.attrDeep(e, /multa/)); } },
        { d: 'Empréstimo ligado ao bibliotecário que o cadastrou', c: (k) => { const e = findLoan(k); const b = k.E(/^bibliotecari/), f = k.E(/^efetiv/), s = k.E(/^estagiari/); return !!(e && (k.connected(e, b) || k.connected(e, f) || k.connected(e, s))); } },
      ],
      solution: () => mk([
        ['ent', 'AU', 'Autores', 120, 120], ['attr', 'ac', 'Código', 85, 65, { o: 'AU', k: 1, lp: 'l' }], ['attr', 'an', 'Nome', 155, 65, { o: 'AU' }],
        ['rel', 'AT', 'autoria', 320, 120],
        ['ent', 'LI', 'Livros', 520, 120], ['attr', 'li', 'ISBN', 485, 65, { o: 'LI', k: 1, lp: 'l' }], ['attr', 'lt', 'Título', 555, 65, { o: 'LI' }],
        ['rel', 'PU', 'publicação', 730, 120],
        ['ent', 'ED', 'Editoras', 940, 120], ['attr', 'ec', 'Código', 905, 65, { o: 'ED', k: 1, lp: 'l' }], ['attr', 'en', 'Nome', 975, 65, { o: 'ED' }],
        ['rel', 'PO', 'possui', 520, 270],
        ['ent', 'EX', 'Exemplares', 520, 420], ['attr', 'xn', 'NúmeroExemplar', 470, 480, { o: 'EX', k: 1, lp: 'l' }],
        ['rel', 'EM', 'empréstimo', 770, 420, { assoc: true }],
        ['attr', 'dr', 'DataRetirada', 740, 350, { o: 'EM', k: 1, lp: 'l' }], ['attr', 'dd', 'DataDevolução', 800, 350, { o: 'EM' }], ['attr', 'vm', 'MultaDiária', 850, 480, { o: 'EM' }],
        ['ent', 'CL', 'Clientes', 1020, 420], ['attr', 'cc', 'Código', 1060, 365, { o: 'CL', k: 1 }], ['attr', 'cn', 'Nome', 1060, 475, { o: 'CL' }],
        ['rel', 'CA', 'cadastro', 770, 580],
        ['ent', 'BI', 'Bibliotecários', 770, 720], ['attr', 'bm', 'Matrícula', 870, 690, { o: 'BI', k: 1 }], ['attr', 'bn', 'Nome', 870, 745, { o: 'BI' }],
        ['gen', 'G', '', 770, 790, { p: 'BI', ch: ['ES', 'EF'], kind: 't,d' }],
        ['ent', 'ES', 'Estagiários', 660, 880], ['attr', 'ei', 'InstituiçãoEnsino', 600, 935, { o: 'ES', lp: 'l' }],
        ['ent', 'EF', 'Efetivos', 890, 880],
        ['rel', 'RS', 'responsabilidade', 775, 1000],
      ], [
        ['AT', 'AU', '(1,N)'], ['AT', 'LI', '(1,N)'], ['PU', 'LI', '(1,N)'], ['PU', 'ED', '(1,1)'],
        ['PO', 'LI', '(1,1)'], ['PO', 'EX', '(1,N)', { weak: true }],
        ['EM', 'EX', '(0,N)'], ['EM', 'CL', '(0,N)'],
        ['CA', 'EM', '(0,N)'], ['CA', 'BI', '(1,1)'],
        ['RS', 'ES', '(0,N)'], ['RS', 'EF', '(1,1)'],
      ]),
    },
  ];

  // Localiza o "empréstimo" no modelo do aluno, aceitando várias modelagens
  function findLoan(k) {
    const c = k.E(/^cliente|^leitor|^usuario/), x = k.E(/^exemplar/);
    if (!c || !x) return null;
    const named = k.m.nodes.find((n) => (n.t === 'rel' || n.t === 'ent') && /empresti|retirada/.test(norm(n.name)) && k.connected(n, c) && k.connected(n, x));
    if (named) return named;
    return k.relAll([c, x])[0] || null;
  }

  // ------------------------------------------------------------ validação geral (para o seu projeto)
  function lint(m) {
    const k = K(m);
    const out = [];
    const add = (lvl, msg, id) => out.push({ lvl, msg, id });
    const ents = m.nodes.filter((n) => n.t === 'ent');
    const rels = m.nodes.filter((n) => n.t === 'rel');
    const specialized = new Set();
    m.nodes.filter((n) => n.t === 'gen').forEach((g) => (g.children || []).forEach((c) => specialized.add(c)));
    const names = {};
    ents.concat(rels.filter((r) => r.assoc)).forEach((n) => {
      const key = norm(n.name);
      if (!key) add('erro', 'Entidade sem nome.', n.id);
      else if (names[key]) add('erro', `Duas entidades chamadas “${n.name}”.`, n.id);
      names[key] = 1;
    });
    ents.forEach((e) => {
      const weakLink = m.links.find((l) => l.b === e.id && l.weak);
      if (!specialized.has(e.id) && !k.keys(e).length) add('aviso', `“${e.name}” não tem atributo identificador (●).`, e.id);
      const used = m.links.some((l) => l.b === e.id) || m.nodes.some((g) => g.t === 'gen' && (g.parent === e.id || (g.children || []).includes(e.id)));
      if (!used) add('aviso', `“${e.name}” está isolada (sem relacionamentos).`, e.id);
      if (specialized.has(e.id) && !k.attrs(e).length && !m.links.some((l) => l.b === e.id) && !m.nodes.some((g) => g.t === 'gen' && g.parent === e.id)) add('aviso', `A especialização “${e.name}” não tem atributos nem relacionamentos próprios — por que especializar?`, e.id);
      if (weakLink) {
        const r = by(m, weakLink.a);
        const strong = m.links.filter((l) => l.a === r.id && l.b !== e.id);
        strong.forEach((s) => { if (ER.cardText(s) !== '(1,1)') add('aviso', `Em “${r.name}”, a entidade forte deveria ter (1,1): a fraca “${e.name}” depende de exatamente uma ocorrência dela.`, s.id); });
      }
    });
    rels.forEach((r) => {
      const ls = m.links.filter((l) => l.a === r.id);
      if (!norm(r.name)) add('erro', 'Relacionamento sem nome.', r.id);
      if (ls.length < 2) add('erro', `O relacionamento “${r.name || '?'}” precisa de pelo menos 2 participações (tem ${ls.length}).`, r.id);
      const cnt = {};
      ls.forEach((l) => (cnt[l.b] = (cnt[l.b] || 0) + 1));
      Object.keys(cnt).forEach((b) => {
        if (cnt[b] > 1 && ls.filter((l) => l.b === b).some((l) => !(l.role || '').trim())) add('erro', `Auto-relacionamento “${r.name}”: identifique os papéis nas ligações.`, r.id);
      });
    });
    m.links.forEach((l) => {
      const r = by(m, l.a), e = by(m, l.b);
      if (!l.max) add('erro', `Ligação ${r ? r.name : '?'} — ${e ? e.name : '?'} sem cardinalidade.`, l.id);
      else if (l.min === '' || l.min == null) add('aviso', `Ligação ${r ? r.name : '?'} — ${e ? e.name : '?'} sem cardinalidade mínima.`, l.id);
    });
    m.nodes.filter((n) => n.t === 'attr').forEach((a) => {
      if (!norm(a.name)) add('erro', 'Atributo sem nome.', a.id);
      if (a.key && /^\(0|N\)$/.test(a.card || '')) add('erro', `O identificador “${a.name}” não pode ser opcional nem multivalorado.`, a.id);
    });
    m.nodes.filter((n) => n.t === 'gen').forEach((g) => {
      if (!g.parent || !by(m, g.parent)) add('erro', 'Especialização sem entidade genérica.', g.id);
      if (!(g.children || []).length) add('erro', 'Especialização sem entidades especializadas.', g.id);
    });
    return out;
  }
  function by(m, id) { return m.nodes.find((n) => n.id === id); }

  function check(task, m) {
    const k = K(m);
    return task.steps.map((s) => {
      let r;
      try { r = s.c(k); } catch (e) { r = false; }
      return { ok: r === true, msg: typeof r === 'string' ? r : '' };
    });
  }

  window.WORKSHOP = { TASKS, check, lint, K };
})();
