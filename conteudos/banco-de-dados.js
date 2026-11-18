/* Matéria: Banco de Dados — Modelo ER (projeto conceitual).
   Baseado no slide "Modelo ER" (notação de Heuser).
   Diagramas: { dg: () => modelo } nos guias, d: () => modelo nas perguntas, tipos 'card' e 'click'
   usam o renderizador js/er-render.js. Formato geral em COMO-ADICIONAR-CONTEUDO.md. */
(function () {
  const S = (t, n) => ER.size({ t, name: n }).w;

  // Diagrama binário: A — R — B. Cardinalidade ca fica junto de A, cb junto de B.
  function bin(A, R, B, ca, cb, o = {}) {
    const gap = o.gap || 88;
    const wa = S('ent', A), wr = S('rel', R), wb = S('ent', B);
    const xa = wa / 2, xr = wa + gap + wr / 2, xb = wa + gap + wr + gap + wb / 2;
    const pos = { A: [xa, 0], R: [xr, 0], B: [xb, 0] };
    const nodes = [['ent', 'A', A, xa, 0], ['rel', 'R', R, xr, 0, { assoc: o.assoc }], ['ent', 'B', B, xb, 0]];
    (o.attrs || []).forEach(([own, id, name, dx, dy, f]) => {
      const p = pos[own] || pos[own.charAt(0)];
      nodes.push(['attr', id, name, p[0] + dx, p[1] + dy, Object.assign({ o: own }, f || {})]);
    });
    const links = [['R', 'A', ca, o.la || {}], ['R', 'B', cb, o.lb || {}]];
    return ER.mk(nodes, links);
  }

  const DG = {
    lot: (a = 'N', b = '1') => bin('Empregados', 'lotação', 'Departamentos', a, b),
    ger: (a = '1', b = '1') => bin('Empregados', 'gerência', 'Departamentos', a, b),
    part: (a = 'N', b = 'N') => bin('Empregados', 'participação', 'Projetos', a, b),
    coord: (a = '1', b = '2') => bin('Empregados', 'coordenação', 'Projetos', a, b),
    slide11: () => bin('Empregados', 'participação', 'Projetos', '(0,N)', '(0,N)', {
      attrs: [['A', 'nome', 'Nome', -20, -48], ['A', 'sal', 'Salário', 0, 46], ['B', 'tit', 'Título', 26, -48], ['R', 'di', 'DataInício', 18, 50]],
    }),
    slide12: () => ER.mk([
      ['ent', 'E', 'Empregados', 70, 60], ['attr', 'nome', 'Nome', 40, 8, { o: 'E', lp: 'l' }], ['attr', 'cod', 'Código', 100, 8, { o: 'E', k: 1 }],
      ['attr', 'sal', 'Salário', 70, 112, { o: 'E', lp: 'l' }],
      ['ent', 'T', 'Estantes', 330, 60], ['attr', 'np', 'NúmeroPrateleiras', 300, 8, { o: 'T', lp: 'l' }],
      ['attr', 'nc', 'NúmeroCorredor', 360, 8, { o: 'T', k: 1 }], ['attr', 'ne', 'NúmeroEstante', 345, 112, { o: 'T', k: 1 }],
    ], []),
    slide14: () => ER.mk([
      ['ent', 'E', 'Empregados', 150, 70],
      ['attr', 'nome', 'Nome', 110, 18, { o: 'E', lp: 'l' }],
      ['attr', 'cnh', 'CNH', 190, 18, { o: 'E', c: '(0,1)' }],
      ['attr', 'tel', 'TelefonesContato', 90, 120, { o: 'E', c: '(1,N)', lp: 'l' }],
      ['attr', 'end', 'Endereço', 200, 118, { o: 'E' }],
      ['attr', 'rua', 'Rua', 175, 162, { o: 'end', lp: 'l' }],
      ['attr', 'num', 'Número', 200, 182, { o: 'end', lp: 'b' }],
      ['attr', 'cid', 'Cidade', 228, 162, { o: 'end' }],
    ], []),
    sup: (c1 = '(0,1)', c2 = '(0,N)', r1 = 'supervisor', r2 = 'supervisionado', E = 'Empregados', R = 'supervisão') => {
      const we = S('ent', E), wr = S('rel', R);
      return ER.mk([['ent', 'E', E, we / 2, 0], ['rel', 'R', R, we + 110 + wr / 2, 0]],
        [['R', 'E', c2, { role: r2 }], ['R', 'E', c1, { role: r1 }]]);
    },
    tern: (cc = '(1,N)', cd = '(1,1)', cp = '(1,N)') => {
      const wc = S('ent', 'Cidades'), wr = S('rel', 'distribuição'), wd = S('ent', 'Distribuidores');
      const xr = wc + 90 + wr / 2;
      return ER.mk([
        ['ent', 'C', 'Cidades', wc / 2, 0], ['rel', 'R', 'distribuição', xr, 0],
        ['ent', 'D', 'Distribuidores', xr + wr / 2 + 90 + wd / 2, 0], ['ent', 'P', 'Produtos', xr, 120],
      ], [['R', 'C', cc], ['R', 'D', cd], ['R', 'P', cp]]);
    },
    weak: (c = ['(1,1)', '(1,N)', '(0,N)', '(1,1)']) => ER.mk([
      ['ent', 'P', 'Pedidos', 60, 60], ['attr', 'num', 'Número', 30, 10, { o: 'P', k: 1, lp: 'l' }], ['attr', 'data', 'Data', 40, 112, { o: 'P', lp: 'l' }],
      ['rel', 'C', 'composição', 250, 60],
      ['ent', 'I', 'Itens', 430, 60], ['attr', 'seq', 'NúmeroSeqüência', 450, 10, { o: 'I', k: 1 }], ['attr', 'qtd', 'Quantidade', 410, 112, { o: 'I', lp: 'l' }],
      ['rel', 'F', 'referência', 610, 60],
      ['ent', 'D', 'Produtos', 610, 200], ['attr', 'cod', 'Código', 550, 200, { o: 'D', k: 1, lp: 'l' }], ['attr', 'desc', 'Descrição', 640, 250, { o: 'D' }],
    ], [['C', 'P', c[0]], ['C', 'I', c[1], { weak: true }], ['F', 'I', c[2]], ['F', 'D', c[3]]]),
    slide19: () => bin('Empregados', 'participação', 'Projetos', '(0,N)', '(0,N)', {
      attrs: [['A', 'nome', 'Nome', -30, -48, { lp: 'l' }], ['A', 'cod', 'Código', 30, -48, { k: 1 }], ['A', 'sal', 'Salário', -20, 46, { lp: 'l' }],
        ['B', 'pcod', 'Código', -10, -48, { k: 1, lp: 'l' }], ['B', 'tit', 'Título', 30, -48], ['R', 'fun', 'Função', 20, 50]],
    }),
    slide20: () => bin('Médicos', 'consulta', 'Pacientes', '(0,N)', '(0,N)', {
      attrs: [['A', 'codm', 'Codm', 20, -48, { k: 1, lp: 'l' }], ['A', 'nome', 'Nome', 0, 46, { lp: 'l' }], ['R', 'hora', 'Hora', -10, -50, { lp: 'r' }],
        ['R', 'data', 'Data', 22, 50, { k: 1 }], ['B', 'codp', 'Codp', 20, -48, { k: 1, lp: 'l' }], ['B', 'pnome', 'Nome', 0, 46, { lp: 'l' }]],
    }),
    slide22: () => ER.mk([
      ['ent', 'PJ', 'Projetos', 90, 70], ['attr', 'pc', 'Código', 60, 25, { o: 'PJ', k: 1, lp: 'l' }], ['attr', 'pt', 'Título', 120, 25, { o: 'PJ' }],
      ['rel', 'PA', 'participação', 90, 210],
      ['ent', 'E', 'Empregados', 330, 120], ['attr', 'sal', 'Salário', 262, 74, { o: 'E', lp: 'l' }], ['attr', 'nome', 'Nome', 322, 72, { o: 'E', lp: 'l' }],
      ['attr', 'cpf', 'CPF', 380, 72, { o: 'E', k: 1 }],
      ['gen', 'G', '', 330, 190, { p: 'E', ch: ['EN', 'MO'], kind: 'p,d' }],
      ['ent', 'EN', 'Engenheiros', 260, 280], ['attr', 'crea', 'CREA', 235, 330, { o: 'EN', lp: 'l' }],
      ['ent', 'MO', 'Motoristas', 420, 280], ['attr', 'cnh', 'CNH', 445, 330, { o: 'MO' }],
      ['rel', 'LO', 'lotação', 560, 120], ['ent', 'D', 'Departamentos', 560, 10],
      ['attr', 'dn', 'Nome', 530, -40, { o: 'D', lp: 'l' }], ['attr', 'dc', 'Código', 595, -40, { o: 'D', k: 1 }],
    ], [['PA', 'PJ', '(0,N)'], ['PA', 'EN', '(0,N)'], ['LO', 'E', '(0,N)'], ['LO', 'D', '(1,1)']]),
    gen: (P, a, b, kind) => {
      const wa = S('ent', a), wb = S('ent', b);
      return ER.mk([
        ['ent', 'P', P, (wa + wb + 40) / 2, 0], ['gen', 'G', '', (wa + wb + 40) / 2, 70, { p: 'P', ch: ['A', 'B'], kind }],
        ['ent', 'A', a, wa / 2, 150], ['ent', 'B', b, wa + 40 + wb / 2, 150],
      ], []);
    },
    slide25: () => {
      const m = bin('Médicos', 'consulta', 'Pacientes', '(0,N)', '(0,N)');
      m.nodes.push({ id: 'M', t: 'ent', name: 'Medicamentos', x: m.nodes[1].x, y: 110 });
      return m;
    },
    slide27: (c1 = '(0,N)', c2 = '(0,N)') => {
      const m = bin('Médicos', 'consulta', 'Pacientes', '(0,N)', '(0,N)', { assoc: true });
      const xr = m.nodes[1].x;
      m.nodes.push({ id: 'PR', t: 'rel', name: 'prescrição', x: xr, y: 150 });
      m.nodes.push({ id: 'M', t: 'ent', name: 'Medicamentos', x: xr + 240, y: 150 });
      const a = ER.parseCard(c1), b = ER.parseCard(c2);
      m.links.push(Object.assign({ id: 'lpr1', a: 'PR', b: 'R' }, c1[0] === '?' ? { slot: c1.slice(1) } : a));
      m.links.push(Object.assign({ id: 'lpr2', a: 'PR', b: 'M' }, c2[0] === '?' ? { slot: c2.slice(1) } : b));
      return m;
    },
  };

  const CARD4 = ['(0,1)', '(1,1)', '(0,N)', '(1,N)'];

  const UNITS = [
    // ------------------------------------------------------------------ 1
    {
      id: 'u1', title: 'Projeto de Banco de Dados', sub: 'Níveis de abstração', color: '#58cc02',
      guide: [
        '<p>O projeto de BD é uma atividade de <b>modelagem em vários níveis de abstração</b>:</p>',
        '<table class="gt"><tr><th>Nível</th><th>O que é</th><th>Ênfase</th></tr>' +
        '<tr><td><b>Conceitual</b></td><td>Abstração de mais alto nível: representa os requisitos de dados do domínio. <b>Independente de modelo de BD.</b></td><td>Semântica / compreensão</td></tr>' +
        '<tr><td><b>Lógico</b></td><td>Representa o modelo conceitual em um <b>modelo de BD</b> (ex.: relacional).</td><td>Eficiência de <b>armazenamento</b>: evitar muitas tabelas (e junções), tabelas subutilizadas…</td></tr>' +
        '<tr><td><b>Físico</b></td><td>Esquema <b>SQL</b> do modelo lógico. <b>Dependente de SGBD.</b></td><td>Eficiência de <b>acesso</b>: consultas, índices…</td></tr></table>',
        '<p><b>Vantagens da modelagem conceitual</b>: independe de detalhes de implementação (facilita entender a semântica dos dados e é melhor compreendida por leigos); pode ser mapeada para <b>qualquer</b> modelo lógico; facilita manutenção e migração (e o processo inverso: <b>engenharia reversa</b>).</p>',
      ],
      lessons: [
        {
          title: 'Os três níveis', qs: [
            { t: 'mc', q: 'Qual nível de modelagem é a abstração de MAIS ALTO nível?', o: ['Conceitual', 'Lógico', 'Físico', 'Relacional'], a: 0, e: 'A modelagem conceitual é a de mais alto nível: representa os requisitos de dados do domínio, independente de modelo de BD.' },
            { t: 'match', q: 'Ligue cada nível à sua descrição', p: [['Conceitual', 'Requisitos de dados do domínio'], ['Lógico', 'Representação em um modelo de BD'], ['Físico', 'Esquema SQL para um SGBD']] },
            { t: 'tf', q: 'A modelagem conceitual depende do SGBD que será usado.', a: false, e: 'Falso. O conceitual é independente até do modelo de BD. Quem depende do SGBD é o nível físico.' },
            { t: 'mc', q: 'Criar índices para acelerar consultas é preocupação de qual nível?', o: ['Físico', 'Lógico', 'Conceitual', 'Nenhum deles'], a: 0, e: 'O nível físico tem ênfase na eficiência de ACESSO: implementação de consultas, índices…' },
            { t: 'mc', q: 'O projeto LÓGICO tem ênfase em…', o: ['Eficiência de armazenamento', 'Eficiência de acesso', 'Compreensão por usuários leigos', 'Representação gráfica'], a: 0, e: 'Lógico → eficiência de armazenamento (evitar muitas tabelas/junções e tabelas subutilizadas). Acesso é o físico.' },
            { t: 'order', q: 'Ordene as etapas do projeto de BD, da mais abstrata para a mais concreta', o: ['Modelagem conceitual', 'Modelagem lógica', 'Modelagem física'] },
            { t: 'fill', q: 'Complete a frase', s: 'A modelagem {0} gera o esquema SQL e é {1} de SGBD.', b: ['física', 'lógica', 'dependente', 'independente'], a: ['física', 'dependente'] },
            { t: 'ms', q: 'Segundo o slide, o que o projeto lógico procura EVITAR? (marque todas)', o: ['Muitas tabelas (e junções)', 'Tabelas subutilizadas', 'Índices', 'Diagramas gráficos'], a: [0, 1], e: 'O slide cita: evitar muitas tabelas (e junções) e tabelas subutilizadas.' },
          ],
        },
        {
          title: 'Por que modelar no conceitual?', qs: [
            { t: 'ms', q: 'Quais são vantagens da modelagem conceitual? (marque todas)', o: ['Independe de detalhes de implementação', 'É melhor compreendida por usuários leigos', 'Pode ser mapeada para qualquer modelo lógico', 'Garante o melhor desempenho das consultas'], a: [0, 1, 2], e: 'Desempenho de consultas é assunto do nível físico.' },
            { t: 'tf', q: 'Um esquema conceitual pode ser mapeado para qualquer modelo lógico de BD.', a: true, e: 'Sim — por ser independente de modelo de BD, ele pode virar relacional, objeto-relacional, documentos etc.' },
            { t: 'mc', q: 'Obter um modelo conceitual a partir de um BD que já existe é chamado de…', o: ['Engenharia reversa', 'Normalização', 'Indexação', 'Especialização'], a: 0, e: 'O slide cita o processo de engenharia reversa como algo facilitado pelo modelo conceitual.' },
            { t: 'mc', q: 'Sua equipe vai migrar um sistema de BD relacional para um BD de documentos. Que artefato mais ajuda?', o: ['O esquema conceitual (diagrama ER)', 'Os índices do SGBD atual', 'O plano de execução das consultas', 'Os scripts de backup'], a: 0, e: 'O conceitual facilita a manutenção do modelo lógico e a migração para outro modelo lógico.' },
            { t: 'cls', q: 'Em que nível do projeto cada atividade acontece?', buckets: ['Conceitual', 'Lógico', 'Físico'], items: [['Desenhar o diagrama ER', 0], ['Decidir quais tabelas e chaves estrangeiras existirão', 1], ['Escrever CREATE INDEX', 2], ['Escolher VARCHAR(80) no PostgreSQL', 2], ['Descobrir que Clientes fazem Pedidos', 0], ['Evitar tabelas cheias de valores nulos', 1]] },
            { t: 'tf', q: 'Escrever os comandos CREATE TABLE faz parte da modelagem LÓGICA.', a: false, e: 'Pelo slide, o esquema SQL é a modelagem FÍSICA (implementação). O lógico é o modelo de tabelas, ainda sem a sintaxe do SGBD.' },
            { t: 'mc', q: 'Por que o modelo conceitual é melhor compreendido por usuários leigos?', o: ['Porque não tem detalhes de implementação e foca no significado dos dados', 'Porque é escrito em SQL', 'Porque mostra os índices', 'Porque é gerado automaticamente pelo SGBD'], a: 0 },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      id: 'u2', title: 'Entidades e relacionamentos', sub: 'O básico do Modelo ER', color: '#1cb0f6',
      guide: [
        '<p>O <b>Modelo Entidade-Relacionamento</b> foi definido por <b>Peter Chen em 1976</b> e é o padrão para modelagem conceitual: poucos conceitos e representação gráfica. Um esquema conceitual também é chamado de <b>esquema ER</b> ou <b>diagrama ER</b>.</p>',
        '<p><b>Entidade</b>: abstração de um fato do mundo real cujos dados queremos manter. Símbolo: <b>retângulo nomeado</b>. Denota um <i>conjunto de ocorrências</i> (e1, e2, e3…).</p>',
        '<p><b>Relacionamento</b>: abstração de uma associação entre (ocorrências de) entidades. Símbolo: <b>losango nomeado</b>. Denota um conjunto de ocorrências de associações.</p>',
        { dg: () => DG.lot('', '') },
        '<p>Interpretação: LOTAÇÃO = {(e1,d1), (e2,d1), (e4,d2), (e5,d3)} — cada par é uma ocorrência do relacionamento. Para quem já viu álgebra relacional: é um subconjunto de Empregados × Departamentos.</p>',
      ],
      lessons: [
        {
          title: 'Símbolos', qs: [
            { t: 'mc', q: 'Quem definiu o Modelo Entidade-Relacionamento, e quando?', o: ['Peter Chen, em 1976', 'Edgar F. Codd, em 1970', 'Peter Chen, em 1986', 'Carlos Heuser, em 1998'], a: 0 },
            { t: 'tf', q: '“Esquema conceitual”, “esquema ER” e “diagrama ER” se referem à mesma coisa.', a: true },
            { t: 'match', q: 'Ligue o símbolo ao conceito', p: [['Retângulo nomeado', 'Entidade'], ['Losango nomeado', 'Relacionamento'], ['Linha do losango ao retângulo', 'Participação da entidade no relacionamento']] },
            { t: 'mc', q: 'Uma ENTIDADE é…', o: ['A abstração de um fato do mundo real para o qual se deseja manter dados no BD', 'Uma linha de uma tabela', 'Um valor de um campo', 'Uma consulta SQL'], a: 0 },
            { t: 'click', q: 'Toque no RELACIONAMENTO do diagrama.', d: () => DG.lot('', ''), a: ['R'] },
            { t: 'mc', q: 'No diagrama, o retângulo “Empregados” denota…', o: ['Um conjunto de ocorrências (e1, e2, e3…)', 'Um único empregado', 'Uma coluna de tabela', 'Um arquivo do SGBD'], a: 0, e: 'A entidade denota o CONJUNTO de ocorrências daquele fato.' },
            { t: 'tf', q: 'O Modelo ER é o padrão para modelagem conceitual por ser simples (poucos conceitos) e ter representação gráfica.', a: true },
            { t: 'fill', q: 'Complete', s: 'Um relacionamento é desenhado como um {0} e uma entidade como um {1}.', b: ['losango', 'retângulo', 'círculo', 'triângulo'], a: ['losango', 'retângulo'] },
          ],
        },
        {
          title: 'Ocorrências', qs: [
            { t: 'mc', q: 'Em LOTAÇÃO = {(e1,d1), (e2,d1), (e4,d2), (e5,d3)}, cada par representa…', o: ['Uma ocorrência do relacionamento', 'Uma entidade', 'Um atributo', 'Uma cardinalidade'], a: 0 },
            { t: 'mc', q: 'Em LOTAÇÃO = {(e1,d1), (e2,d1), (e4,d2), (e5,d3)}, quantos empregados estão lotados em d1?', o: ['2', '1', '3', '4'], a: 0, e: 'e1 e e2 estão em d1.' },
            { t: 'mc', q: 'Ponte com álgebra relacional: o conjunto de ocorrências de um relacionamento binário entre E1 e E2 é um subconjunto de…', o: ['E1 × E2 (produto cartesiano)', 'E1 ∪ E2', 'E1 − E2', 'σ(E1)'], a: 0, e: 'Cada ocorrência é um par (e, d) com e ∈ E1 e d ∈ E2, logo o relacionamento ⊆ E1 × E2.' },
            { t: 'cls', q: 'Leia: “Alunos se matriculam em Disciplinas. Professores ministram Turmas.” Classifique:', buckets: ['Entidade', 'Relacionamento'], items: [['Alunos', 0], ['matrícula', 1], ['Disciplinas', 0], ['Professores', 0], ['ministra', 1], ['Turmas', 0]] },
            { t: 'mc', q: 'Num sistema de RH, qual destes NÃO deveria ser uma entidade?', o: ['Salário de um empregado', 'Empregados', 'Departamentos', 'Projetos'], a: 0, e: 'Salário é uma propriedade de Empregados → atributo (assunto das próximas unidades).' },
            { t: 'tf', q: 'Duas entidades podem ter MAIS DE UM relacionamento entre elas (ex.: lotação e gerência entre Empregados e Departamentos).', a: true, e: 'Sim. O slide mostra lotação e gerência ligando Empregados e Departamentos — cada um com significado e cardinalidades próprias.' },
            { t: 'tf', q: 'Um relacionamento é a abstração de uma associação entre (ocorrências de) entidades.', a: true },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      id: 'u3', title: 'Cardinalidade máxima', sub: '1 ou N', color: '#ce82ff',
      guide: [
        '<p><b>Cardinalidade máxima</b>: quantidade máxima de ocorrências de entidades que podem estar associadas a UMA ocorrência da outra entidade (1 ou N).</p>',
        { dg: () => DG.lot('N', '1') },
        '<p class="tip"><b>Regra de leitura:</b> o número escrito junto de uma entidade X diz quantas ocorrências de <b>X</b> se associam a <b>uma</b> ocorrência da entidade do outro lado. Aqui o <b>1</b> junto de Departamentos: “um empregado está lotado no máximo em <b>1</b> departamento”. O <b>N</b> junto de Empregados: “um departamento tem até <b>N</b> empregados”.</p>',
        '<p>Exemplos do slide: gerência 1:1, participação N:N e coordenação 1:2 (um empregado coordena no máximo 2 projetos).</p>',
        { dg: () => DG.coord('1', '2') },
      ],
      lessons: [
        {
          title: 'Lendo 1 e N', qs: [
            { t: 'mc', q: 'A cardinalidade máxima indica…', o: ['O número máximo de ocorrências de uma entidade associadas a uma ocorrência da outra', 'Se a participação é obrigatória ou opcional', 'O número de atributos da entidade', 'Quantas tabelas serão criadas'], a: 0 },
            { t: 'mc', q: 'Como se lê este diagrama?', d: () => DG.lot('N', '1'), o: ['Um empregado está lotado em no máximo 1 departamento; um departamento tem até N empregados', 'Um departamento está em no máximo 1 empregado; um empregado tem N departamentos', 'Cada empregado está lotado em N departamentos', 'É um relacionamento 1:1'], a: 0 },
            { t: 'tf', q: 'O número escrito junto de uma entidade X diz quantas ocorrências de X podem se associar a UMA ocorrência da entidade do outro lado.', a: true, e: 'Essa é a regra de leitura da notação do slide. Ex.: o “1” junto de Departamentos = cada empregado em no máximo 1 departamento.' },
            { t: 'card', q: '“Um empregado gerencia no máximo um departamento, e um departamento é gerenciado por no máximo um empregado.”', d: () => DG.ger('?A', '?B'), opts: ['1', 'N'], a: { A: '1', B: '1' } },
            { t: 'card', q: '“Um empregado participa de vários projetos e um projeto tem vários empregados.”', d: () => DG.part('?A', '?B'), opts: ['1', 'N'], a: { A: 'N', B: 'N' } },
            { t: 'card', q: '“Um empregado coordena no máximo 2 projetos. Cada projeto é coordenado por no máximo 1 empregado.”', d: () => DG.coord('?A', '?B'), opts: ['1', '2', 'N'], a: { A: '1', B: '2' }, e: 'Junto de Projetos fica quantos projetos um empregado coordena (2). Junto de Empregados, quantos empregados coordenam um projeto (1).' },
            { t: 'mc', q: 'Em “Empregados N — lotação — 1 Departamentos”, por que o “1” fica junto de Departamentos?', o: ['Porque cada empregado se associa a no máximo 1 departamento', 'Porque cada departamento tem 1 empregado', 'Porque Departamentos tem 1 atributo', 'Porque Departamentos é a chave primária'], a: 0 },
            { t: 'mc', q: 'Na notação do slide, os valores usados para cardinalidade máxima são…', o: ['1 ou N (ou um número, como 2)', '0 ou 1', '0 ou N', 'Apenas N'], a: 0 },
          ],
        },
        {
          title: 'Ocorrências e SQL', qs: [
            { t: 'card', q: '“Um cliente pode realizar muitos pedidos. Cada pedido é de um único cliente.”', d: () => bin('Clientes', 'realiza', 'Pedidos', '?A', '?B'), opts: ['1', 'N'], a: { A: '1', B: 'N' } },
            { t: 'mc', q: 'Com “Empregados N — lotação — 1 Departamentos”, qual conjunto de ocorrências é INVÁLIDO?', o: ['{(e1,d1), (e1,d2)}', '{(e1,d1), (e2,d1)}', '{(e1,d1), (e2,d2)}', '{(e3,d2)}'], a: 0, e: 'e1 aparece em dois departamentos, mas o máximo junto de Departamentos é 1.' },
            { t: 'mc', q: 'Com “Empregados 1 — coordenação — 2 Projetos”, qual conjunto VIOLA a cardinalidade?', o: ['{(e1,p1), (e1,p2), (e1,p3)}', '{(e1,p1), (e1,p2)}', '{(e1,p1), (e2,p2)}', '{(e2,p3)}'], a: 0, e: 'e1 coordenaria 3 projetos; o máximo é 2.' },
            { t: 'mc', q: 'Se LOTAÇÃO fosse uma tabela lotacao(emp, depto), qual consulta encontra violações de “cada empregado em no máximo 1 departamento”?', o: ['SELECT emp FROM lotacao GROUP BY emp HAVING COUNT(*) > 1', 'SELECT depto FROM lotacao GROUP BY depto HAVING COUNT(*) > 1', 'SELECT COUNT(*) FROM lotacao', 'SELECT DISTINCT emp FROM lotacao'], a: 0, e: 'Agrupando por empregado, qualquer grupo com mais de 1 linha é um empregado em 2+ departamentos. Agrupar por depto é normal (N empregados por depto).' },
            { t: 'tf', q: 'Um relacionamento 1:N lido da esquerda para a direita é N:1 lido da direita para a esquerda — é o mesmo relacionamento.', a: true },
            { t: 'ms', q: 'Quais relacionamentos são N:N (muitos-para-muitos)? (marque todos)', o: ['Alunos cursam Disciplinas', 'Pedido pertence a um Cliente', 'Atores atuam em Filmes', 'País tem uma capital'], a: [0, 2] },
            { t: 'card', q: '“Cada aluno de TCC tem exatamente um orientador; um professor orienta vários alunos.”', d: () => bin('Professores', 'orientação', 'Alunos', '?A', '?B'), opts: ['1', 'N'], a: { A: '1', B: 'N' } },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      id: 'u4', title: 'Cardinalidade mínima', sub: 'Par (mínima, máxima)', color: '#ff9600',
      guide: [
        '<p><b>Cardinalidade mínima</b>: indica se a participação das ocorrências no relacionamento é <b>obrigatória (1)</b> ou <b>opcional (0)</b>. Notação: par <b>(mínima, máxima)</b>.</p>',
        { dg: () => DG.lot('(0,N)', '(1,1)') },
        '<p>“Um empregado <b>obrigatoriamente</b> está lotado no máximo em 1 departamento (1,1). Um departamento <b>pode ter</b> até N empregados (0,N).”</p>',
        '<table class="gt"><tr><th>Par</th><th>Leitura</th></tr><tr><td>(0,1)</td><td>opcional, no máximo um</td></tr><tr><td>(1,1)</td><td>obrigatório, exatamente um</td></tr><tr><td>(0,N)</td><td>opcional, vários</td></tr><tr><td>(1,N)</td><td>obrigatório, pelo menos um</td></tr></table>',
        { dg: () => DG.coord('(1,1)', '(0,2)') },
        '<p>Coordenação: todo projeto tem exatamente 1 coordenador (1,1); um empregado coordena de 0 a 2 projetos (0,2).</p>',
      ],
      lessons: [
        {
          title: 'Obrigatório × opcional', qs: [
            { t: 'mc', q: 'A cardinalidade mínima indica…', o: ['Se a participação no relacionamento é obrigatória ou opcional', 'O número máximo de associações', 'O identificador da entidade', 'O tipo do atributo'], a: 0 },
            { t: 'fill', q: 'Complete', s: 'Mínima 0 indica participação {0}; mínima 1 indica participação {1}.', b: ['opcional', 'obrigatória', 'total', 'parcial'], a: ['opcional', 'obrigatória'] },
            { t: 'mc', q: 'Qual frase descreve corretamente o diagrama?', d: () => DG.lot('(0,N)', '(1,1)'), o: ['Todo empregado está lotado em exatamente 1 departamento; um departamento tem de 0 a N empregados', 'Todo departamento tem pelo menos 1 empregado', 'Um empregado pode não estar lotado', 'Cada departamento tem exatamente 1 empregado'], a: 0 },
            { t: 'mc', q: 'Na notação do slide, o par de cardinalidades é escrito como…', o: ['(mínima, máxima)', '(máxima, mínima)', 'máxima..mínima', '[mínima | máxima]'], a: 0 },
            { t: 'card', q: '“Nem todo empregado gerencia um departamento, e quem gerencia gerencia apenas um. Um departamento pode estar sem gerente e tem no máximo um.”', d: () => DG.ger('?A', '?B'), opts: CARD4, a: { A: '(0,1)', B: '(0,1)' } },
            { t: 'card', q: '“Todo projeto é coordenado por exatamente um empregado. Um empregado coordena no máximo 2 projetos (ou nenhum).”', d: () => DG.coord('?A', '?B'), opts: ['(0,1)', '(1,1)', '(0,2)', '(1,2)', '(0,N)', '(1,N)'], a: { A: '(1,1)', B: '(0,2)' } },
            { t: 'tf', q: 'Em “Empregados (1,1) — coordenação — (0,2) Projetos”, todo empregado é OBRIGADO a coordenar um projeto.', a: false, e: 'O (1,1) junto de Empregados diz que cada PROJETO tem exatamente 1 coordenador. Já o (0,2) junto de Projetos diz que um empregado coordena de 0 a 2 projetos — ou seja, é opcional.' },
            { t: 'mc', q: 'Qual par expressa “opcional, no máximo um”?', o: ['(0,1)', '(1,1)', '(0,N)', '(1,N)'], a: 0 },
          ],
        },
        {
          title: 'Do requisito ao par', qs: [
            { t: 'card', q: '“Todo aluno deve estar matriculado em pelo menos uma disciplina (podendo em várias). Uma disciplina pode não ter alunos, ou ter muitos.”', d: () => bin('Alunos', 'matrícula', 'Disciplinas', '?A', '?B'), opts: CARD4, a: { A: '(0,N)', B: '(1,N)' }, e: 'Junto de Disciplinas: quantas disciplinas por aluno → (1,N). Junto de Alunos: quantos alunos por disciplina → (0,N).' },
            { t: 'card', q: '“Todo pedido é feito por exatamente um cliente; um cliente pode ainda não ter feito nenhum pedido.”', d: () => bin('Clientes', 'realiza', 'Pedidos', '?A', '?B'), opts: CARD4, a: { A: '(1,1)', B: '(0,N)' } },
            { t: 'card', q: '“Cada país tem exatamente uma cidade como capital; uma cidade é capital de no máximo um país (a maioria não é capital de nenhum).”', d: () => bin('Países', 'capital', 'Cidades', '?A', '?B'), opts: CARD4, a: { A: '(0,1)', B: '(1,1)' } },
            { t: 'mc', q: 'Empregados (0,N) lotação (1,1) Departamentos. Empregados = {e1,e2,e3,e4}, Departamentos = {d1,d2}. Qual conjunto é VÁLIDO?', o: ['{(e1,d1), (e2,d1), (e3,d2), (e4,d2)}', '{(e1,d1), (e2,d1), (e3,d2)}', '{(e1,d1), (e1,d2), (e2,d1), (e3,d1), (e4,d2)}', '{ } (vazio)'], a: 0, e: 'Com (1,1) junto de Departamentos, TODO empregado precisa aparecer exatamente uma vez. Na 2ª falta e4; na 3ª e1 aparece duas vezes; na 4ª ninguém está lotado.' },
            { t: 'tf', q: 'Com (0,N) junto de Empregados, um departamento sem nenhum empregado é permitido.', a: true },
            { t: 'mc', q: 'Ponte com SQL: “todo empregado está em exatamente 1 departamento” costuma virar, no relacional…', o: ['Coluna depto em Empregados, FK para Departamentos, com NOT NULL', 'Coluna depto em Empregados permitindo NULL', 'Uma tabela separada Lotacao com chave (emp, depto)', 'Um índice UNIQUE em Departamentos'], a: 0, e: 'Máximo 1 → a FK fica do lado do empregado; mínimo 1 → NOT NULL. (Mapeamento para o lógico não está neste slide, mas ajuda a fixar.)' },
            { t: 'match', q: 'Ligue o par à leitura', p: [['(0,1)', 'opcional, no máximo um'], ['(1,1)', 'obrigatório, exatamente um'], ['(0,N)', 'opcional, vários'], ['(1,N)', 'obrigatório, pelo menos um']] },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      id: 'u5', title: 'Atributos e identificadores', sub: 'Propriedades e chaves', color: '#ff4b4b',
      guide: [
        '<p><b>Atributo</b>: abstração de uma propriedade de uma <b>entidade</b> ou de um <b>relacionamento</b>. Símbolo: círculo ligado por uma linha.</p>',
        { dg: () => DG.slide11() },
        '<p>DataInício pertence ao relacionamento: depende do PAR (empregado, projeto).</p>',
        '<p><b>Atributos identificadores</b> (círculo <b>preenchido ●</b>) distinguem as ocorrências de uma entidade umas das outras e garantem o acesso individualizado a uma ocorrência. O identificador pode ser <b>composto</b>: em Estantes, é a combinação NúmeroCorredor + NúmeroEstante.</p>',
        { dg: () => DG.slide12() },
      ],
      lessons: [
        {
          title: 'Atributos', qs: [
            { t: 'mc', q: 'Atributo é a abstração de uma propriedade de…', o: ['Uma entidade ou um relacionamento', 'Somente entidades', 'Somente relacionamentos', 'Somente identificadores'], a: 0 },
            { t: 'tf', q: 'Relacionamentos também podem ter atributos.', a: true, e: 'Ex. do slide: DataInício no relacionamento participação.' },
            { t: 'click', q: 'Toque no atributo identificador de Empregados.', d: () => DG.slide12(), a: ['cod'] },
            { t: 'mc', q: 'Na notação do slide, o atributo identificador é desenhado como…', o: ['Círculo preenchido (●)', 'Círculo vazio (○)', 'Losango pequeno', 'Nome sublinhado duas vezes'], a: 0 },
            { t: 'mc', q: 'Para que serve o atributo identificador?', o: ['Distinguir as ocorrências da entidade, garantindo acesso individualizado', 'Indicar que o atributo é opcional', 'Indicar que o atributo tem vários valores', 'Ligar duas entidades'], a: 0 },
            { t: 'click', q: 'Toque no atributo que pertence ao RELACIONAMENTO.', d: () => DG.slide11(), a: ['di'] },
            { t: 'mc', q: 'Em Estantes, NúmeroCorredor e NúmeroEstante estão preenchidos (●). Isso significa…', d: () => DG.slide12(), o: ['O identificador é a combinação NúmeroCorredor + NúmeroEstante', 'Existem dois identificadores independentes', 'NúmeroPrateleiras também identifica', 'É um erro de modelagem'], a: 0, e: 'Vários atributos preenchidos formam juntos um identificador composto (como uma PK composta).' },
            { t: 'mc', q: 'Ponte com SQL: no relacional, o identificador de uma entidade normalmente vira…', o: ['A chave primária da tabela', 'Uma chave estrangeira', 'Um índice não-único', 'Uma view'], a: 0 },
          ],
        },
        {
          title: 'Identificando bem', qs: [
            { t: 'mc', q: 'Por que DataInício fica no relacionamento participação e não em Empregados?', d: () => DG.slide11(), o: ['Porque depende do par (empregado, projeto): cada participação tem sua data', 'Porque é identificador', 'Porque datas sempre ficam em relacionamentos', 'Porque Empregados já tem muitos atributos'], a: 0 },
            { t: 'mc', q: 'Projetos tem Código ● e Título ○. Qual afirmação é correta?', o: ['Dois projetos não podem ter o mesmo Código', 'Dois projetos não podem ter o mesmo Título', 'Título identifica o projeto', 'Código pode se repetir'], a: 0 },
            { t: 'cls', q: 'Biblioteca: classifique cada item', buckets: ['Entidade', 'Atributo', 'Relacionamento'], items: [['Livros', 0], ['ISBN', 1], ['Autores', 0], ['escreve', 2], ['Título', 1], ['Leitores', 0], ['retira', 2]] },
            { t: 'tf', q: 'Um identificador pode ser formado por mais de um atributo.', a: true },
            { t: 'mc', q: 'Melhor candidato a identificador de Pessoas:', o: ['CPF', 'Nome', 'DataNascimento', 'Cidade'], a: 0 },
            { t: 'ms', q: 'Estantes(NúmeroCorredor ●, NúmeroEstante ●, NúmeroPrateleiras). Quais pares de ocorrências podem coexistir? (marque todos)', o: ['(corredor 1, estante 1) e (corredor 1, estante 2)', '(corredor 1, estante 1) e (corredor 2, estante 1)', '(corredor 1, estante 1, 5 prat.) e (corredor 1, estante 1, 6 prat.)'], a: [0, 1], e: 'Só não pode repetir a COMBINAÇÃO corredor + estante.' },
            { t: 'fill', q: 'Complete', s: 'Atributos {0} distinguem as ocorrências de uma entidade; no diagrama aparecem com o círculo {1}.', b: ['identificadores', 'opcionais', 'preenchido', 'vazio'], a: ['identificadores', 'preenchido'] },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      id: 'u6', title: 'Classificação de atributos', sub: 'Opcional, multivalorado, composto', color: '#00cd9c',
      guide: [
        '<ul><li><b>obrigatório × opcional</b> — opcional leva (0,1): ex. CNH (0,1)</li><li><b>monovalorado × multivalorado</b> — multivalorado leva máximo N: ex. TelefonesContato (1,N)</li><li><b>simples × composto</b> — composto tem sub-atributos: ex. Endereço (Rua, Número, Cidade)</li></ul>',
        { dg: () => DG.slide14() },
        '<p class="tip">Sem cardinalidade escrita, o atributo é (1,1): obrigatório e monovalorado (convenção da notação).</p>',
      ],
      lessons: [
        {
          title: 'Tipos de atributo', qs: [
            { t: 'match', q: 'Ligue o atributo à sua classificação', p: [['CNH (0,1)', 'Opcional'], ['TelefonesContato (1,N)', 'Multivalorado'], ['Endereço (Rua, Número, Cidade)', 'Composto'], ['Nome', 'Obrigatório, mono e simples']] },
            { t: 'mc', q: 'Na notação do slide, um atributo OPCIONAL é indicado por…', o: ['(0,1) ao lado do nome', 'Círculo preenchido', 'Linha grossa', 'Triângulo'], a: 0 },
            { t: 'mc', q: '“TelefonesContato (1,N)” significa…', o: ['Todo empregado tem pelo menos 1 telefone e pode ter vários', 'O telefone é opcional', 'Um telefone pertence a N empregados', 'O telefone é identificador'], a: 0 },
            { t: 'tf', q: 'Atributo sem cardinalidade escrita é considerado (1,1): obrigatório e monovalorado.', a: true },
            { t: 'click', q: 'Toque no atributo COMPOSTO.', d: () => DG.slide14(), a: ['end'] },
            { t: 'click', q: 'Toque no atributo MULTIVALORADO.', d: () => DG.slide14(), a: ['tel'] },
            { t: 'mc', q: '“Apelidos”: uma pessoa pode não ter apelido ou ter vários. Cardinalidade?', o: ['(0,N)', '(1,N)', '(0,1)', '(1,1)'], a: 0 },
            { t: 'mc', q: '“E-mail secundário”: pode não existir, e no máximo um. Cardinalidade?', o: ['(0,1)', '(1,1)', '(0,N)', '(1,N)'], a: 0 },
          ],
        },
        {
          title: 'Na prática', qs: [
            { t: 'cls', q: 'Classifique cada atributo', buckets: ['Simples', 'Composto', 'Multivalorado'], items: [['CPF', 0], ['Endereço (rua, nº, cidade)', 1], ['Telefones', 2], ['Nome completo (prenome, sobrenome)', 1], ['Idiomas falados', 2], ['Salário', 0]] },
            { t: 'mc', q: 'Ponte com SQL: ao ir para o relacional (1FN), um atributo multivalorado como Telefones normalmente vira…', o: ['Uma tabela separada com FK para a entidade', 'Colunas Telefone1, Telefone2, … Telefone10', 'Uma coluna com valores separados por vírgula', 'Um índice'], a: 0, e: 'As outras opções quebram a 1FN ou limitam artificialmente a quantidade.' },
            { t: 'tf', q: 'Um atributo composto também pode ser opcional — ex.: Endereço (0,1).', a: true },
            { t: 'mc', q: 'Quando vale modelar Endereço como COMPOSTO?', o: ['Quando é preciso acessar as partes individualmente (ex.: consultar por cidade)', 'Sempre que for identificador', 'Quando for opcional', 'Nunca, é sempre simples'], a: 0 },
            { t: 'fill', q: 'Complete com as cardinalidades', s: 'CNH {0} é opcional e TelefonesContato {1} é multivalorado.', b: ['(0,1)', '(1,N)', '(1,1)', '(N,N)'], a: ['(0,1)', '(1,N)'] },
            { t: 'ms', q: 'Empregados(Nome, CNH (0,1), TelefonesContato (1,N), Endereço(Rua, Número, Cidade)). Quais afirmações estão corretas? (marque todas)', d: () => DG.slide14(), o: ['Um empregado pode não ter CNH', 'Um empregado pode ter 3 telefones', 'Um empregado pode não ter telefone', 'Cidade é parte de Endereço'], a: [0, 1, 3] },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      id: 'u7', title: 'Auto-relacionamento', sub: 'Papéis', color: '#2b70c9',
      guide: [
        '<p><b>Auto-relacionamento</b>: associação entre ocorrências de uma <b>mesma</b> entidade. Exige a identificação de <b>papéis</b>.</p>',
        { dg: () => DG.sup() },
        '<p>“Um empregado pode ser <b>supervisionado</b> por no máximo 1 empregado (0,1 junto de <i>supervisor</i>). Um empregado pode <b>supervisionar</b> no máximo N empregados (0,N junto de <i>supervisionado</i>).”</p>',
        '<p>Interpretação: SUPERVISÃO = {(p1,p3), (p6,p8), …} — no par, p1 atua como supervisor e p3 como supervisionado.</p>',
      ],
      lessons: [
        {
          title: 'Papéis', qs: [
            { t: 'mc', q: 'Auto-relacionamento é…', o: ['Uma associação entre ocorrências de uma mesma entidade', 'Um relacionamento sem atributos', 'Um relacionamento ternário', 'Uma entidade fraca'], a: 0 },
            { t: 'mc', q: 'O que o auto-relacionamento EXIGE no diagrama?', o: ['Identificação de papéis', 'Atributo identificador no losango', 'Linha grossa', 'Cardinalidade (1,1) nos dois lados'], a: 0 },
            { t: 'mc', q: 'Pelo diagrama, um empregado pode ser supervisionado por no máximo…', d: () => DG.sup(), o: ['1 empregado', 'N empregados', '0 empregados', '2 empregados'], a: 0 },
            { t: 'tf', q: 'Em SUPERVISÃO, o par (p1,p3) significa: p1 no papel de supervisor e p3 no papel de supervisionado.', a: true },
            { t: 'card', q: '“Um empregado tem no máximo um supervisor (pode não ter). Um supervisor supervisiona vários empregados (ou nenhum).”', d: () => DG.sup('?A', '?B'), opts: CARD4, a: { A: '(0,1)', B: '(0,N)' } },
            { t: 'ms', q: 'Quais são exemplos naturais de auto-relacionamento? (marque todos)', o: ['Disciplina é pré-requisito de Disciplina', 'Pessoa é casada com Pessoa', 'Empregado lotado em Departamento', 'Aluno cursa Disciplina'], a: [0, 1] },
            { t: 'fill', q: 'Complete', s: 'No auto-relacionamento, “supervisor” e “supervisionado” são chamados de {0}.', b: ['papéis', 'atributos', 'identificadores', 'especializações'], a: ['papéis'] },
          ],
        },
        {
          title: 'Auto-relacionamento avançado', qs: [
            { t: 'card', q: '“Uma disciplina pode ter vários pré-requisitos (ou nenhum) e pode ser pré-requisito de várias disciplinas (ou de nenhuma).”', d: () => DG.sup('?A', '?B', 'pré-requisito', 'dependente', 'Disciplinas', 'requisito'), opts: CARD4, a: { A: '(0,N)', B: '(0,N)' } },
            { t: 'mc', q: 'Qual conjunto de ocorrências (supervisor, supervisionado) VIOLA “no máximo 1 supervisor”?', o: ['{(p1,p3), (p2,p3)}', '{(p1,p3), (p1,p4)}', '{(p6,p8)}', '{(p1,p3), (p3,p5)}'], a: 0, e: 'p3 teria dois supervisores. Já p1 supervisionar vários é permitido (0,N).' },
            { t: 'tf', q: 'Uma mesma ocorrência pode atuar nos dois papéis (ex.: p3 é supervisionado por p1 e supervisiona p5).', a: true },
            { t: 'mc', q: 'Ponte com SQL: supervisão (0,1)/(0,N) costuma ser implementada como…', o: ['Coluna supervisor em Empregados, FK para a própria tabela, aceitando NULL', 'Uma segunda tabela Empregados2', 'Uma coluna NOT NULL obrigatória', 'Não é possível no relacional'], a: 0 },
            { t: 'mc', q: 'Para listar cada empregado com o nome do seu supervisor, você precisa de…', o: ['Junção da tabela Empregados com ela mesma (com apelidos / renomeação ρ)', 'UNION', 'Apenas GROUP BY', 'Divisão relacional'], a: 0, e: 'Auto-junção: FROM empregados e JOIN empregados s ON e.supervisor = s.cod. Em álgebra: renomeação ρ + junção.' },
            { t: 'card', q: '“Uma pessoa é casada com no máximo uma pessoa (ou com nenhuma).”', d: () => DG.sup('?A', '?B', 'cônjuge 1', 'cônjuge 2', 'Pessoas', 'casamento'), opts: CARD4, a: { A: '(0,1)', B: '(0,1)' } },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      id: 'u8', title: 'Relacionamento N-ário', sub: 'Ternários', color: '#a568cc',
      guide: [
        '<p><b>Relacionamento “N”-ário</b>: associação entre N (ocorrências de) entidades. Exemplo: <b>ternário</b>.</p>',
        { dg: () => DG.tern() },
        '<p class="tip">Para achar a cardinalidade junto de uma entidade, fixe uma combinação das <b>outras</b>: “um produto em uma cidade pode ser entregue por no máximo <b>1</b> distribuidor” → (1,1) junto de Distribuidores.</p>',
      ],
      lessons: [
        {
          title: 'Ternário', qs: [
            { t: 'mc', q: 'Um relacionamento ternário associa…', o: ['Três entidades', 'Três atributos', 'Uma entidade com ela mesma três vezes', 'Três relacionamentos'], a: 0 },
            { t: 'mc', q: 'O (1,1) junto de Distribuidores significa…', d: () => DG.tern(), o: ['Para um par (cidade, produto) há exatamente 1 distribuidor', 'Cada distribuidor atende 1 cidade', 'Cada distribuidor distribui 1 produto', 'Distribuidores é identificador'], a: 0 },
            { t: 'tf', q: 'Num n-ário, a cardinalidade junto de uma entidade é determinada fixando uma combinação das OUTRAS entidades.', a: true },
            { t: 'mc', q: 'Leitura do (1,N) junto de Cidades:', d: () => DG.tern(), o: ['Um distribuidor entrega um produto em pelo menos 1 cidade, podendo em várias', 'Cada cidade tem N distribuidores', 'Uma cidade tem pelo menos 1 produto', 'Cidades é opcional'], a: 0 },
            { t: 'fill', q: 'Complete a frase do slide', s: '“Um {0} em uma {1} pode ser entregue por no máximo 1 distribuidor.”', b: ['produto', 'cidade', 'distribuidor', 'empregado'], a: ['produto', 'cidade'] },
            { t: 'tf', q: 'Um relacionamento n-ário pode ter atributos.', a: true },
          ],
        },
        {
          title: 'Ternário avançado', qs: [
            { t: 'mc', q: 'Por que “distribuição” ternária não equivale a três binários (Cidade–Produto, Produto–Distribuidor, Cidade–Distribuidor)?', o: ['Os binários perdem qual distribuidor entrega qual produto em qual cidade (a combinação dos três)', 'Binários são proibidos no ER', 'O ternário ocupa menos espaço', 'Não há diferença'], a: 0 },
            { t: 'mc', q: 'Com (1,1) junto de Distribuidores, qual conjunto (cidade, produto, distribuidor) VIOLA a regra?', o: ['{(c1,p1,d1), (c1,p1,d2)}', '{(c1,p1,d1), (c2,p1,d2)}', '{(c1,p1,d1), (c1,p2,d1)}', '{(c1,p1,d1), (c2,p2,d1)}'], a: 0, e: 'O par (c1,p1) teria dois distribuidores.' },
            { t: 'card', q: '“Um produto, numa cidade, é entregue por exatamente 1 distribuidor. Um distribuidor entrega um produto em uma ou mais cidades. Um distribuidor, numa cidade, entrega um ou mais produtos.”', d: () => DG.tern('?A', '?B', '?C'), opts: CARD4, a: { A: '(1,N)', B: '(1,1)', C: '(1,N)' } },
            { t: 'mc', q: 'Ponte com SQL: no relacional, distribuicao(cidade, produto, distribuidor) com (1,1) junto de Distribuidores teria chave primária…', o: ['(cidade, produto)', '(distribuidor)', '(cidade)', '(cidade, produto, distribuidor) obrigatoriamente'], a: 0, e: 'Como (cidade, produto) determina um único distribuidor, o par já é único.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      id: 'u9', title: 'Entidades fracas', sub: 'E identificação de relacionamentos', color: '#e5a000',
      guide: [
        '<p><b>Entidade fraca</b>: a identificação de suas ocorrências <b>depende</b> da identificação de outra(s) entidade(s). Na notação, a ligação com o relacionamento identificador é uma <b>linha grossa</b>.</p>',
        { dg: () => DG.weak() },
        '<p>Itens é identificado por NúmeroSeqüência <b>+</b> Número do pedido.</p>',
        '<p><b>Identificação de relacionamentos</b>: um relacionamento é identificado implicitamente pelo conjunto de identificadores das entidades participantes — ex.: (e1, p1, coordenador), (e1, p2, analista), (e2, p1, programador). Atributos adicionais podem ser necessários: em consulta, <b>Data ●</b> entra na identificação, permitindo (m1,p1,23/5/25) e (m1,p1,01/6/25).</p>',
        { dg: () => DG.slide20() },
      ],
      lessons: [
        {
          title: 'Entidade fraca', qs: [
            { t: 'mc', q: 'Entidade fraca é aquela cuja identificação…', o: ['Depende da identificação de outra(s) entidade(s)', 'Não tem atributos', 'Tem cardinalidade (0,1)', 'É opcional'], a: 0 },
            { t: 'click', q: 'Toque na entidade FRACA.', d: () => DG.weak(), a: ['I'] },
            { t: 'mc', q: 'Como uma ocorrência de Itens é identificada?', d: () => DG.weak(), o: ['Número do pedido + NúmeroSeqüência', 'Só NúmeroSeqüência', 'Código do produto', 'Quantidade'], a: 0 },
            { t: 'mc', q: 'Na notação, a dependência de identificação aparece como…', o: ['Linha grossa entre o relacionamento e a entidade fraca', 'Retângulo duplo', 'Círculo vazio', 'Losango dentro de retângulo'], a: 0, e: 'Nesta notação (Heuser) é a linha grossa. Em outras notações (Chen original) aparece retângulo duplo — cuidado na prova!' },
            { t: 'tf', q: 'Dois pedidos diferentes podem ter, cada um, um item com NúmeroSeqüência = 1.', a: true },
            { t: 'mc', q: 'Um relacionamento é identificado implicitamente por…', o: ['Identificadores das ocorrências das entidades que participam dele', 'Seu nome', 'Um atributo obrigatório', 'Sua cardinalidade'], a: 0 },
            { t: 'mc', q: 'participação contém (e1,p1,coordenador), (e1,p2,analista), (e2,p1,programador). Qual NÃO poderia ser inserida?', d: () => DG.slide19(), o: ['(e1, p1, analista)', '(e2, p2, analista)', '(e3, p1, coordenador)', '(e2, p3, programador)'], a: 0, e: 'O par (e1,p1) já existe; como o relacionamento é identificado por (empregado, projeto), não pode repetir.' },
          ],
        },
        {
          title: 'Identificação avançada', qs: [
            { t: 'mc', q: 'consulta é identificada por Codm, Codp e Data. Já existe (m1, p1, 23/5/25, 14:00). Qual ocorrência é PERMITIDA?', d: () => DG.slide20(), o: ['(m1, p1, 24/5/25, 09:00)', '(m1, p1, 23/5/25, 16:00)', '(m1, p1, 23/5/25, 14:00)', '(m1, p1, 23/5/25, 18:30)'], a: 0, e: 'Hora não faz parte do identificador: o mesmo médico, paciente e data não pode se repetir.' },
            { t: 'tf', q: 'Se Hora também fosse identificador de consulta, o médico poderia atender o mesmo paciente duas vezes no mesmo dia.', a: true },
            { t: 'mc', q: 'Por que foi preciso incluir Data na identificação de consulta?', o: ['Porque o mesmo médico atende o mesmo paciente várias vezes', 'Porque Data é obrigatória', 'Porque Médicos é entidade fraca', 'Para ordenar as consultas'], a: 0 },
            { t: 'card', q: '“Todo item pertence a exatamente um pedido; um pedido tem pelo menos um item. Cada item referencia exatamente um produto; um produto pode aparecer em vários itens ou em nenhum.”', d: () => DG.weak(['?A', '?B', '?C', '?D']), opts: CARD4, a: { A: '(1,1)', B: '(1,N)', C: '(0,N)', D: '(1,1)' } },
            { t: 'mc', q: 'Ponte com SQL: a tabela itens teria chave primária…', o: ['(num_pedido, num_sequencia), com num_pedido FK para pedidos', '(num_sequencia)', '(cod_produto)', '(quantidade)'], a: 0 },
            { t: 'mc', q: 'No relacionamento identificador, qual cardinalidade fica junto da entidade FORTE (Pedidos)?', o: ['(1,1)', '(0,N)', '(0,1)', '(1,N)'], a: 0, e: 'A fraca sempre depende de exatamente uma ocorrência da forte.' },
            { t: 'ms', q: 'Bons candidatos a entidade fraca: (marque todos)', o: ['Dependentes de um empregado (nome + empregado)', 'Parcelas de um financiamento (nº + financiamento)', 'Clientes (identificados por CPF)', 'Salas de um prédio (nº da sala + prédio)'], a: [0, 1, 3] },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      id: 'u10', title: 'Generalização / Especialização', sub: 'Herança, (t/p, d/c)', color: '#ff86d0',
      guide: [
        '<p>Define atributos e/ou relacionamentos <b>particulares a um subconjunto</b> de ocorrências (especializações) de uma entidade <b>genérica</b>. Há <b>herança de propriedades</b>.</p>',
        { dg: () => DG.slide22() },
        '<ul><li><b>t</b> = total: toda ocorrência da genérica deve se especializar · <b>p</b> = parcial</li><li><b>d</b> = disjunta: no máximo uma especialização · <b>c</b> = compartilhada: pode ter mais de uma</li></ul>',
        { dg: () => DG.gen('Pessoas', 'Professores', 'Alunos', 'p,c') },
      ],
      lessons: [
        {
          title: 'Herança', qs: [
            { t: 'mc', q: 'Generalização/especialização serve para…', o: ['Definir atributos/relacionamentos particulares a um subconjunto de ocorrências de uma entidade genérica', 'Ligar três entidades', 'Identificar entidades fracas', 'Representar atributos multivalorados'], a: 0 },
            { t: 'mc', q: 'No slide, o que Engenheiros herda de Empregados?', d: () => DG.slide22(), o: ['CPF, Nome, Salário e o relacionamento lotação', 'Só o CREA', 'Nada', 'O relacionamento participação'], a: 0 },
            { t: 'click', q: 'Toque no relacionamento que é exclusivo dos engenheiros.', d: () => DG.slide22(), a: ['PA'] },
            { t: 'match', q: 'Ligue o tipo ao significado', p: [['(t,d)', 'Toda ocorrência em exatamente uma'], ['(t,c)', 'Toda ocorrência em uma ou mais'], ['(p,d)', 'Pode não estar em nenhuma; no máx. uma'], ['(p,c)', 'Pode não estar em nenhuma; pode em várias']] },
            { t: 'tf', q: '(p,d) em Empregados → Engenheiros/Motoristas permite um empregado que não é engenheiro nem motorista.', a: true },
            { t: 'mc', q: 'Pessoas → Professores, Alunos com (…,c). Isso significa…', d: () => DG.gen('Pessoas', 'Professores', 'Alunos', 'p,c'), o: ['Uma pessoa pode ser professor e aluno ao mesmo tempo', 'Toda pessoa é professor ou aluno', 'Ninguém pode ser os dois', 'Professores e Alunos são entidades fracas'], a: 0 },
            { t: 'fill', q: 'Complete', s: 'Em (t,d), t significa {0} e d significa {1}.', b: ['total', 'parcial', 'disjunta', 'compartilhada'], a: ['total', 'disjunta'] },
          ],
        },
        {
          title: 'Escolhendo t/p e d/c', qs: [
            { t: 'mc', q: 'Clientes → PessoaFísica, PessoaJurídica. Todo cliente é exatamente um dos dois.', o: ['(t,d)', '(t,c)', '(p,d)', '(p,c)'], a: 0 },
            { t: 'mc', q: 'Pessoas da universidade → Professores, Alunos, Técnicos. Há visitantes que não são nenhum dos três, e um professor pode ser aluno de pós.', o: ['(p,c)', '(p,d)', '(t,c)', '(t,d)'], a: 0 },
            { t: 'mc', q: 'Atletas → Nadadores, Corredores. Todo atleta pratica pelo menos uma das modalidades e pode praticar as duas.', o: ['(t,c)', '(t,d)', '(p,c)', '(p,d)'], a: 0 },
            { t: 'tf', q: 'Os atributos da entidade genérica precisam ser repetidos nas especializadas.', a: false, e: 'Não — há herança de propriedades.' },
            { t: 'ms', q: 'Com Empregados (p,d) → Engenheiros, Motoristas, quais situações são válidas? (marque todas)', o: ['e1 é só empregado', 'e2 é engenheiro', 'e3 é engenheiro e motorista', 'e4 é motorista'], a: [0, 1, 3], e: 'e3 violaria a disjunção (d).' },
            { t: 'mc', q: 'Por que CREA fica em Engenheiros e não em Empregados?', o: ['Porque só se aplica a engenheiros', 'Porque é identificador', 'Porque é multivalorado', 'Porque Empregados não pode ter atributos'], a: 0 },
            { t: 'mc', q: 'Ponte com SQL: uma forma comum de mapear Empregados → Engenheiros, Motoristas para tabelas é…', o: ['Tabela Empregados + tabelas Engenheiros e Motoristas com PK que também é FK para Empregados', 'Uma tabela só com CREA', 'Três bancos de dados diferentes', 'Não é possível mapear'], a: 0, e: 'Há outras estratégias (tabela única com colunas opcionais, ou só tabelas das especializadas), mas essa é a mais direta.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      id: 'u11', title: 'Entidade associativa', sub: 'Relacionamento que vira entidade', color: '#1899d6',
      guide: [
        '<p><b>Problema</b>: queremos saber os medicamentos prescritos em uma consulta — mas consulta é um <b>relacionamento</b>, e relacionamento não se liga a relacionamento.</p>',
        { dg: () => DG.slide25() },
        '<p><b>Solução</b>: consulta vira uma <b>entidade associativa</b> — entidade que representa uma associação entre entidades através de um relacionamento. Desenho: o losango dentro de um retângulo.</p>',
        { dg: () => DG.slide27() },
      ],
      lessons: [
        {
          title: 'O problema e a solução', qs: [
            { t: 'mc', q: 'Como associar Medicamentos a uma consulta, se consulta é um relacionamento?', d: () => DG.slide25(), o: ['Transformando consulta em entidade associativa', 'Ligando Medicamentos direto ao losango, sem mudanças', 'Colocando Medicamentos como atributo de Médicos', 'Não é possível no modelo ER'], a: 0 },
            { t: 'mc', q: 'Entidade associativa é…', o: ['Uma entidade que representa uma associação entre entidades através de um relacionamento', 'Uma entidade sem identificador', 'Uma especialização', 'Um atributo composto'], a: 0 },
            { t: 'tf', q: 'No modelo ER, um relacionamento não pode se ligar diretamente a outro relacionamento — daí a entidade associativa.', a: true },
            { t: 'click', q: 'Toque na entidade associativa.', d: () => DG.slide27(), a: ['R'] },
            { t: 'mc', q: 'Graficamente, a entidade associativa é…', o: ['Um losango envolvido por um retângulo', 'Um retângulo com linha grossa', 'Um triângulo', 'Um círculo preenchido'], a: 0 },
            { t: 'mc', q: 'No slide, o relacionamento prescrição associa…', d: () => DG.slide27(), o: ['A entidade associativa Consultas e Medicamentos', 'Médicos e Medicamentos', 'Pacientes e Medicamentos', 'Médicos e Pacientes'], a: 0 },
          ],
        },
        {
          title: 'Usando bem', qs: [
            { t: 'card', q: '“Numa consulta podem ser prescritos vários medicamentos (ou nenhum); um medicamento pode ser prescrito em várias consultas (ou em nenhuma).”', d: () => DG.slide27('?A', '?B'), opts: CARD4, a: { A: '(0,N)', B: '(0,N)' } },
            { t: 'mc', q: 'Alternativa: transformar consulta numa entidade comum “Consultas”. Que relacionamentos seriam necessários?', o: ['Médicos–Consultas, Pacientes–Consultas e Consultas–Medicamentos', 'Apenas Consultas–Medicamentos', 'Nenhum', 'Apenas Médicos–Pacientes'], a: 0, e: 'O slide mostra as duas formas de desenhar; ambas representam a mesma ideia.' },
            { t: 'ms', q: 'Quando faz sentido usar entidade associativa? (marque todas)', o: ['Quando um relacionamento precisa se relacionar com outra entidade', 'Matrícula (Aluno–Turma) que precisa se ligar a Avaliações', 'Para representar um atributo multivalorado', 'Para todo relacionamento 1:1'], a: [0, 1] },
            { t: 'tf', q: 'Uma entidade associativa pode ter atributos.', a: true },
            { t: 'mc', q: 'Ponte com SQL: prescrição costuma virar…', o: ['Tabela prescricao com FK para a consulta (codm, codp, data) e para o medicamento', 'Coluna medicamento em medicos', 'Coluna consulta em medicamentos', 'Uma view'], a: 0 },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      id: 'u12', title: 'Desafio: exercícios do slide', sub: 'Imóveis · Clínica · Biblioteca', color: '#3c3c3c',
      guide: [
        '<p>Revisão com os três exercícios do slide. Roteiro para modelar a partir de um enunciado:</p>',
        '<ol><li>Sublinhe os <b>substantivos</b> com dados próprios → entidades.</li><li>Ache os <b>verbos/associações</b> → relacionamentos.</li><li>Para cada relacionamento, leia as frases e defina <b>(mín,máx)</b> dos dois lados.</li><li>Liste <b>atributos</b> e marque o <b>identificador</b>; veja se algum é opcional, multivalorado ou composto.</li><li>Procure casos especiais: auto-relacionamento, n-ário, entidade fraca, especialização, entidade associativa.</li></ol>',
        '<p>Depois, faça os mesmos exercícios desenhando na <b>Oficina</b>.</p>',
      ],
      lessons: [
        {
          title: 'Exercício I — Imóveis', qs: [
            { t: 'cls', q: '“A administradora gerencia condomínios compostos por lotes… cada lote tem número e área e pertence a pessoas (CPF, nome, celular)… um lote pode estar alugado para uma pessoa, que paga um preço.” Classifique:', buckets: ['Entidade', 'Atributo', 'Relacionamento'], items: [['Condomínios', 0], ['Lotes', 0], ['Pessoas', 0], ['Área', 1], ['CPF', 1], ['aluguel', 2], ['propriedade', 2], ['Preço do aluguel', 1]] },
            { t: 'mc', q: 'Onde deve ficar o atributo “preço” do aluguel?', o: ['No relacionamento aluguel (Pessoas–Lotes)', 'Em Lotes', 'Em Pessoas', 'Em Condomínios'], a: 0, e: 'O preço é de uma locação específica (aquela pessoa, aquele lote).' },
            { t: 'card', q: '“Cada lote pode estar alugado para no máximo uma pessoa. Uma pessoa pode alugar diversos lotes (ou nenhum).”', d: () => bin('Pessoas', 'aluguel', 'Lotes', '?A', '?B'), opts: CARD4, a: { A: '(0,1)', B: '(0,N)' } },
            { t: 'card', q: '“Um lote pertence a uma ou mais pessoas. Uma pessoa pode ter diversos lotes (ou nenhum, se só aluga).”', d: () => bin('Pessoas', 'propriedade', 'Lotes', '?A', '?B'), opts: CARD4, a: { A: '(1,N)', B: '(0,N)' } },
            { t: 'card', q: '“Condomínios são compostos por diversos lotes; todo lote fica em um condomínio.”', d: () => bin('Condomínios', 'composição', 'Lotes', '?A', '?B'), opts: CARD4, a: { A: '(1,1)', B: '(1,N)' } },
            { t: 'tf', q: 'Pessoas e Lotes terão dois relacionamentos distintos: propriedade e aluguel.', a: true },
          ],
        },
        {
          title: 'Exercício II — Clínica', qs: [
            { t: 'mc', q: '“Um médico tem formação em diversas especialidades, mas só exerce uma delas na clínica.” Melhor modelagem:', o: ['Entidade Especialidades com dois relacionamentos: formação (N:N) e exerce (cada médico exerce exatamente 1)', 'Atributo simples Especialidade em Médicos', 'Especialização de Médicos em Ortopedistas, Traumatologistas…', 'Relacionamento ternário Médicos–Especialidades–Pacientes'], a: 0 },
            { t: 'mc', q: '“Telefone(s) para contato” do paciente é um atributo…', o: ['Multivalorado (1,N)', 'Opcional (0,1)', 'Identificador', 'Composto'], a: 0 },
            { t: 'card', q: '“Um paciente tem sempre um médico responsável; um médico pode ser responsável por vários pacientes (ou nenhum).”', d: () => bin('Médicos', 'responsável', 'Pacientes', '?A', '?B'), opts: CARD4, a: { A: '(1,1)', B: '(0,N)' } },
            { t: 'mc', q: 'Onde fica o “horário de visita diário pré-determinado”?', o: ['No relacionamento responsável (médico–paciente)', 'Em Médicos', 'Em Quartos', 'Em Pacientes, como identificador'], a: 0 },
            { t: 'card', q: '“Pacientes estão sempre internados em quartos individuais.”', d: () => bin('Pacientes', 'internação', 'Quartos', '?A', '?B'), opts: CARD4, a: { A: '(0,1)', B: '(1,1)' }, e: 'Junto de Quartos: cada paciente está em exatamente 1 quarto. Junto de Pacientes: quarto individual → no máximo 1 paciente (pode estar vazio).' },
            { t: 'mc', q: 'Se cada andar numerasse seus quartos a partir de 1, o identificador de Quartos seria…', o: ['Andar + Número (composto)', 'Só Número', 'Só Andar', 'O paciente internado'], a: 0 },
          ],
        },
        {
          title: 'Exercício III — Biblioteca', qs: [
            { t: 'mc', q: '“Um livro tem vários exemplares na biblioteca.” Como modelar?', o: ['Livros e Exemplares como entidades: 1 livro tem N exemplares', 'Exemplares como atributo multivalorado de Livros, sem dados próprios', 'Uma entidade só: Livros', 'Especialização de Livros'], a: 0, e: 'Exemplar é a cópia física: é ele que é emprestado. Pode até ser entidade fraca (nº do exemplar + livro).' },
            { t: 'mc', q: '“Bibliotecários são estagiários ou efetivos.” Isso é…', o: ['Generalização/especialização (t,d)', 'Auto-relacionamento', 'Entidade associativa', 'Atributo composto'], a: 0 },
            { t: 'card', q: '“Um estagiário está sempre sob a responsabilidade de um efetivo; um efetivo pode ser responsável por vários estagiários (ou nenhum).”', d: () => bin('Estagiários', 'responsabilidade', 'Efetivos', '?A', '?B'), opts: CARD4, a: { A: '(0,N)', B: '(1,1)' } },
            { t: 'ms', q: 'O empréstimo envolve cliente, exemplar e o bibliotecário que o cadastrou, com data de devolução e multa diária. Boas modelagens: (marque todas)', o: ['Entidade associativa Empréstimo (Clientes–Exemplares) ligada a Bibliotecários', 'Relacionamento ternário Clientes–Exemplares–Bibliotecários com atributos', 'Atributo multivalorado “Empréstimos” em Clientes', 'Especialização de Clientes'], a: [0, 1] },
            { t: 'mc', q: 'Um cliente pode retirar o MESMO exemplar em dias diferentes. Para identificar o empréstimo, além de cliente e exemplar, é preciso…', o: ['Incluir a data de retirada como atributo identificador do relacionamento', 'Nada, cliente + exemplar bastam', 'Tornar Clientes entidade fraca', 'Usar a multa como identificador'], a: 0, e: 'É o mesmo caso de consulta + Data no slide de identificação de relacionamentos.' },
            { t: 'mc', q: '“Deve-se saber a instituição de ensino da qual o estagiário vem.” Onde fica?', o: ['Em Estagiários (atributo, ou entidade Instituições ligada a Estagiários)', 'Em Bibliotecários', 'Em Efetivos', 'No empréstimo'], a: 0, e: 'É particular dos estagiários — por isso a especialização existe.' },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13 (extra)
    {
      id: 'u13', extra: true, kicker: 'Extra · fora do slide', title: 'Extra: do ER para tabelas', sub: 'Fora do slide — ponte com SQL', color: '#777777',
      guide: [
        '<p class="tip"><b>Atenção:</b> esta unidade NÃO está no slide de Modelo ER. É uma ponte com o que você já sabe de SQL (projeto lógico). Confira com o material da disciplina quando ele chegar nessa parte.</p>',
        '<table class="gt"><tr><th>No ER</th><th>Vira (abordagem usual)</th></tr>' +
        '<tr><td>Entidade</td><td>Tabela; identificador → PK</td></tr>' +
        '<tr><td>Relacionamento 1:N</td><td>FK no lado N</td></tr>' +
        '<tr><td>Relacionamento N:N</td><td>Tabela própria, PK = FKs das entidades (+ atributos do relac.)</td></tr>' +
        '<tr><td>1:1</td><td>FK com UNIQUE em um dos lados (ou fusão das tabelas)</td></tr>' +
        '<tr><td>Atributo multivalorado</td><td>Tabela própria</td></tr>' +
        '<tr><td>Atributo composto</td><td>Uma coluna por sub-atributo</td></tr>' +
        '<tr><td>Entidade fraca</td><td>PK = PK da forte + identificador parcial</td></tr></table>',
      ],
      lessons: [
        {
          title: 'Mapeamento básico', qs: [
            { t: 'mc', q: 'Empregados N — lotação — 1 Departamentos. Onde fica a FK?', o: ['Em Empregados (lado N), apontando para Departamentos', 'Em Departamentos, apontando para Empregados', 'Numa tabela nova obrigatória', 'Não há FK'], a: 0 },
            { t: 'mc', q: 'Empregados N — participação — N Projetos (com DataInício). Vira…', o: ['Tabela participacao(emp, proj, data_inicio) com PK (emp, proj)', 'FK proj em Empregados', 'FK emp em Projetos', 'Coluna data_inicio em Projetos'], a: 0 },
            { t: 'mc', q: 'TelefonesContato (1,N) em Empregados vira…', o: ['Tabela telefones(emp, telefone) com PK (emp, telefone)', 'Coluna telefones em Empregados', 'Colunas tel1, tel2, tel3', 'Uma FK em Departamentos'], a: 0 },
            { t: 'mc', q: 'Endereço(Rua, Número, Cidade) vira…', o: ['Colunas rua, numero, cidade na própria tabela', 'Tabela endereços obrigatória', 'Uma coluna JSON', 'Nada, é ignorado'], a: 0 },
            { t: 'order', q: 'Ordem típica de mapeamento ER → relacional', o: ['Entidades viram tabelas (identificador → PK)', 'Relacionamentos 1:1 e 1:N viram FKs', 'Relacionamentos N:N viram tabelas', 'Atributos multivalorados viram tabelas'] },
            { t: 'mc', q: 'Em álgebra relacional, “nomes dos empregados do departamento Vendas” precisa de…', o: ['π nome (σ nomeDepto=\'Vendas\' (Empregados ⋈ Departamentos))', 'π nome (Empregados ∪ Departamentos)', 'σ nome (Departamentos)', 'Empregados − Departamentos'], a: 0 },
          ],
        },
      ],
    },
  ];

  // ------------------------------------------------------------------ Consulta: símbolos do Modelo ER
  const E0 = (name) => ['ent', 'E', name || 'Empregados', 0, 0];
  const REFERENCE = {
    title: 'Símbolos do Modelo ER',
    nav: 'Símbolos',
    icon: '🔣',
    panel: 'Todos os símbolos da notação do slide, com o significado e como ler cada um.',
    searchHint: 'losango, fraca, (0,N)…',
    intro: 'Notação usada no slide (Heuser). Cada cartão mostra o desenho, o que ele significa e como ler. Use a busca ou os atalhos abaixo.',
    sections: [
      {
        title: 'Elementos básicos',
        items: [
          { name: 'Entidade', tags: 'retangulo conjunto ocorrencias', dg: () => ER.mk([E0()], []),
            desc: '<b>Retângulo</b> com o nome. Abstração de um fato do mundo real sobre o qual se quer guardar dados. Denota um <b>conjunto de ocorrências</b> (e1, e2, e3…).',
            read: '“Empregados” = o conjunto de todos os empregados da empresa.' },
          { name: 'Relacionamento', tags: 'losango associacao ocorrencias', dg: () => bin('Empregados', 'lotação', 'Departamentos', '', ''),
            desc: '<b>Losango</b> com o nome, ligado por linhas às entidades que associa. Denota um conjunto de associações entre ocorrências.',
            read: 'LOTAÇÃO = {(e1,d1), (e2,d1), (e4,d2)} — cada par é uma ocorrência do relacionamento.' },
          { name: 'Atributo', tags: 'circulo vazio propriedade', dg: () => ER.mk([E0(), ['attr', 'n', 'Nome', -30, -48, { o: 'E', lp: 'l' }], ['attr', 's', 'Salário', 30, -48, { o: 'E' }]], []),
            desc: '<b>Círculo vazio ○</b> ligado por uma linha a uma entidade (ou relacionamento). Representa uma propriedade.',
            read: 'Sem cardinalidade escrita, o atributo é (1,1): obrigatório e com um único valor.' },
          { name: 'Atributo identificador', tags: 'circulo preenchido chave primaria pk', dg: () => ER.mk([E0(), ['attr', 'k', 'Código', -30, -48, { o: 'E', k: 1, lp: 'l' }], ['attr', 'n', 'Nome', 30, -48, { o: 'E' }]], []),
            desc: '<b>Círculo preenchido ●</b>. Distingue uma ocorrência das demais e garante acesso individual. No relacional vira a <b>chave primária</b>.',
            read: 'Dois empregados nunca têm o mesmo Código.' },
          { name: 'Identificador composto', tags: 'varios circulos preenchidos chave composta', dg: () => ER.mk([E0('Estantes'), ['attr', 'c', 'NúmeroCorredor', -30, -48, { o: 'E', k: 1, lp: 'l' }], ['attr', 'e', 'NúmeroEstante', 30, -48, { o: 'E', k: 1 }], ['attr', 'p', 'NúmeroPrateleiras', 10, 50, { o: 'E' }]], []),
            desc: 'Vários círculos <b>preenchidos</b> na mesma entidade: juntos formam <b>um</b> identificador.',
            read: 'Não pode repetir a combinação corredor + estante; cada um sozinho pode repetir.' },
          { name: 'Atributo de relacionamento', tags: 'atributo no losango', dg: () => DG.slide11(),
            desc: 'Atributo ligado ao <b>losango</b>. Depende do par de ocorrências associadas, não de uma entidade só.',
            read: 'DataInício: data em que AQUELE empregado começou NAQUELE projeto.' },
        ],
      },
      {
        title: 'Tipos de atributo',
        items: [
          { name: 'Atributo opcional (0,1)', tags: 'opcional zero um', dg: () => ER.mk([E0(), ['attr', 'n', 'Nome', -30, -48, { o: 'E', lp: 'l' }], ['attr', 'c', 'CNH', 30, -48, { o: 'E', c: '(0,1)' }]], []),
            desc: 'Cardinalidade <b>(0,1)</b> escrita ao lado do nome: o valor pode não existir.',
            read: 'Um empregado pode não ter CNH; se tiver, tem uma.' },
          { name: 'Atributo multivalorado (1,N)', tags: 'multivalorado varios valores', dg: () => ER.mk([E0(), ['attr', 't', 'TelefonesContato', 0, -48, { o: 'E', c: '(1,N)' }]], []),
            desc: 'Máximo <b>N</b> ao lado do nome: o atributo pode ter vários valores. (0,N) = opcional e multivalorado.',
            read: 'Todo empregado tem pelo menos 1 telefone e pode ter vários.' },
          { name: 'Atributo composto', tags: 'composto sub-atributos elipse', dg: () => ER.mk([E0(), ['attr', 'end', 'Endereço', 0, 52, { o: 'E' }], ['attr', 'r', 'Rua', -34, 96, { o: 'end', lp: 'l' }], ['attr', 'nu', 'Número', 0, 116, { o: 'end', lp: 'b' }], ['attr', 'ci', 'Cidade', 34, 96, { o: 'end' }]], []),
            desc: 'Atributo com <b>sub-atributos</b> ligados a ele (o círculo vira uma elipse).',
            read: 'Endereço é formado por Rua, Número e Cidade.' },
          { name: 'Resumo: cardinalidade de atributos', tags: 'tabela atributo', wide: true,
            fig: '<table class="gt"><tr><th>Escrito</th><th>Significado</th><th>Exemplo</th></tr><tr><td>(nada)</td><td>(1,1): obrigatório, monovalorado</td><td>Nome</td></tr><tr><td>(0,1)</td><td>opcional, monovalorado</td><td>CNH</td></tr><tr><td>(1,N)</td><td>obrigatório, multivalorado</td><td>Telefones</td></tr><tr><td>(0,N)</td><td>opcional, multivalorado</td><td>Apelidos</td></tr></table>' },
        ],
      },
      {
        title: 'Cardinalidades',
        items: [
          { name: 'Cardinalidade máxima (1 ou N)', tags: 'maxima um muitos 1:n', dg: () => DG.lot('N', '1'),
            desc: 'Número máximo de ocorrências de uma entidade associadas a <b>uma</b> ocorrência da outra.',
            read: '“1” junto de Departamentos → cada empregado está em no máximo 1 departamento. “N” junto de Empregados → um departamento tem até N empregados.',
            warn: 'o número fica junto da entidade que está sendo <b>contada</b>, não da que você “parte”.' },
          { name: 'Par (mínima, máxima)', tags: 'minima obrigatoria opcional par', dg: () => DG.lot('(0,N)', '(1,1)'),
            desc: 'Mínima <b>0 = opcional</b>, mínima <b>1 = obrigatória</b>. Escreve-se (mín,máx) junto da entidade.',
            read: '(1,1) junto de Departamentos: todo empregado está em exatamente 1 departamento. (0,N) junto de Empregados: um departamento pode ter de 0 a N empregados.' },
          { name: 'Os quatro pares', tags: 'tabela pares 0,1 1,1 0,n 1,n', wide: true,
            fig: '<table class="gt"><tr><th>Par</th><th>Leitura</th><th>Exemplo (junto de Pedidos, em Clientes—realiza—Pedidos)</th></tr><tr><td><b>(0,1)</b></td><td>opcional, no máximo um</td><td>cada cliente fez 0 ou 1 pedido</td></tr><tr><td><b>(1,1)</b></td><td>obrigatório, exatamente um</td><td>cada cliente fez exatamente 1 pedido</td></tr><tr><td><b>(0,N)</b></td><td>opcional, vários</td><td>cada cliente fez 0 ou mais pedidos</td></tr><tr><td><b>(1,N)</b></td><td>obrigatório, pelo menos um</td><td>cada cliente fez 1 ou mais pedidos</td></tr></table>' },
          { name: 'Classes 1:1, 1:N e N:N', tags: 'um para um um para muitos muitos para muitos', wide: true,
            fig: '<table class="gt"><tr><th>Classe</th><th>Máximos</th><th>Exemplo do slide</th></tr><tr><td>1:1</td><td>1 dos dois lados</td><td>gerência (Empregados–Departamentos)</td></tr><tr><td>1:N</td><td>1 de um lado, N do outro</td><td>lotação</td></tr><tr><td>N:N</td><td>N dos dois lados</td><td>participação (Empregados–Projetos)</td></tr><tr><td>1:2</td><td>máximo numérico</td><td>coordenação: um empregado coordena no máx. 2 projetos</td></tr></table>' },
        ],
      },
      {
        title: 'Casos especiais',
        items: [
          { name: 'Auto-relacionamento (papéis)', tags: 'auto relacionamento papeis recursivo mesma entidade', dg: () => DG.sup(),
            desc: 'Relacionamento entre ocorrências da <b>mesma</b> entidade. Cada linha recebe um <b>papel</b> (texto em itálico).',
            read: 'Um empregado é supervisionado por no máximo 1 supervisor (0,1); um supervisor supervisiona de 0 a N empregados (0,N).' },
          { name: 'Relacionamento ternário (n-ário)', tags: 'ternario n-ario tres entidades', dg: () => DG.tern(),
            desc: 'Losango ligado a <b>três ou mais</b> entidades. Guarda a combinação das três.',
            read: 'Para achar a cardinalidade junto de X, fixe uma combinação das OUTRAS: “um produto, numa cidade, é entregue por no máximo 1 distribuidor” → (1,1) junto de Distribuidores.' },
          { name: 'Entidade fraca (linha grossa)', tags: 'fraca linha grossa relacionamento identificador dependente', dg: () => DG.weak(),
            desc: 'Entidade cuja identificação <b>depende</b> de outra. A linha entre ela e o relacionamento identificador é <b>grossa</b>.',
            read: 'Itens é identificado por NúmeroSeqüência + Número do pedido.',
            warn: 'na notação de Chen a fraca é desenhada como retângulo duplo; no slide (Heuser) é a linha grossa.' },
          { name: 'Identificador de relacionamento', tags: 'atributo identificador no relacionamento data', dg: () => DG.slide20(),
            desc: 'Um relacionamento é identificado pelos identificadores das entidades. Um atributo <b>●</b> no losango entra nessa identificação.',
            read: 'consulta = (Codm, Codp, Data): o mesmo médico pode atender o mesmo paciente em datas diferentes.' },
          { name: 'Generalização / especialização', tags: 'especializacao generalizacao heranca triangulo t p d c', dg: () => DG.gen('Clientes', 'PessoasFísicas', 'PessoasJurídicas', 't,d'),
            desc: '<b>Triângulo</b> ligando a entidade genérica (em cima) às especializadas (embaixo). As especializadas <b>herdam</b> atributos e relacionamentos.',
            read: '(t,d): todo cliente é exatamente um dos dois — pessoa física ou jurídica.' },
          { name: 'Rótulos (t/p, d/c)', tags: 'total parcial disjunta compartilhada', wide: true,
            fig: '<table class="gt"><tr><th>Rótulo</th><th>Significa</th></tr><tr><td><b>t</b> — total</td><td>toda ocorrência da genérica pertence a alguma especializada</td></tr><tr><td><b>p</b> — parcial</td><td>pode haver ocorrência só na genérica</td></tr><tr><td><b>d</b> — disjunta</td><td>no máximo uma especialização por ocorrência</td></tr><tr><td><b>c</b> — compartilhada</td><td>pode estar em mais de uma especialização</td></tr></table>' },
          { name: 'Entidade associativa', tags: 'associativa losango dentro de retangulo', dg: () => DG.slide27(),
            desc: '<b>Losango dentro de um retângulo</b>: um relacionamento tratado como entidade para poder se ligar a outros relacionamentos.',
            read: 'consulta (Médicos–Pacientes) vira entidade associativa e participa de prescrição com Medicamentos.' },
        ],
      },
      {
        title: 'Cola rápida',
        items: [
          { name: 'Todos os símbolos em uma tabela', tags: 'resumo cola tabela', wide: true,
            fig: '<table class="gt"><tr><th>Desenho</th><th>Conceito</th></tr>' +
              '<tr><td>▭ retângulo</td><td>Entidade</td></tr><tr><td>◇ losango</td><td>Relacionamento</td></tr>' +
              '<tr><td>○ círculo vazio</td><td>Atributo</td></tr><tr><td>● círculo preenchido</td><td>Atributo identificador</td></tr>' +
              '<tr><td>○ com sub-círculos</td><td>Atributo composto</td></tr><tr><td>(0,1) ao lado do atributo</td><td>Atributo opcional</td></tr>' +
              '<tr><td>(1,N) ao lado do atributo</td><td>Atributo multivalorado</td></tr><tr><td>(mín,máx) junto da entidade</td><td>Cardinalidade do relacionamento</td></tr>' +
              '<tr><td>texto em itálico na linha</td><td>Papel (auto-relacionamento)</td></tr><tr><td>━ linha grossa</td><td>Entidade fraca / relacionamento identificador</td></tr>' +
              '<tr><td>△ triângulo com (t/p,d/c)</td><td>Generalização / especialização</td></tr><tr><td>◇ dentro de ▭</td><td>Entidade associativa</td></tr></table>' },
        ],
      },
    ],
  };

  QUIZ.addCourse({
    id: 'bd',
    title: 'Banco de Dados — Modelo ER',
    short: 'Banco de Dados',
    subtitle: 'Projeto conceitual com o Modelo Entidade-Relacionamento',
    icon: '🗂️',
    color: '#58cc02',
    workshop: true,
    reference: REFERENCE,
    practice: [
      { icon: '(1,N)', title: 'Maratona de cardinalidades', text: 'Só perguntas de definir (mín,máx) em diagramas — o ponto mais cobrado.', types: ['card'], color: '#ce82ff' },
      { icon: '👆', title: 'Reconhecer símbolos', text: 'Perguntas de tocar no elemento certo do diagrama.', types: ['click'], color: '#1cb0f6' },
    ],
    units: UNITS,
  });
})();
