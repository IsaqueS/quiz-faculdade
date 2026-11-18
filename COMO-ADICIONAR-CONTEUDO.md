# Como adicionar uma matéria (com qualquer IA)

Cada matéria é **um arquivo `.js`** dentro de `conteudos/`. O app (motor) é o mesmo para todas.

## Passo a passo

1. Copie o **prompt** abaixo (ou, no app, vá em **Matérias → Adicionar matéria → Copiar prompt**).
2. Cole numa IA (ChatGPT, Claude, Gemini…) e, no fim, descreva a matéria e cole/anexe o material (slides, provas, resumo).
3. Salve a resposta como `conteudos/<id>.js` (ex.: `conteudos/calculo.js`).
4. No `index.html`, no bloco **CONTEÚDOS**, adicione uma linha:
   ```html
   <script src="conteudos/calculo.js"></script>
   ```
5. Recarregue a página. A matéria aparece em **Matérias**.

Se a IA tem acesso ao projeto (Claude Code, Cursor, Copilot…), basta pedir:
> Siga o COMO-ADICIONAR-CONTEUDO.md e crie a matéria *X* a partir dos arquivos da pasta *Y*.

### Se algo não aparecer

Abra o console do navegador (F12). Erros de sintaxe no arquivo da matéria aparecem lá, com a linha. Os casos mais comuns são aspa simples dentro de texto (`'d'água'` → use `'d\'água'` ou crases) e vírgula faltando.

### Editar uma matéria que já existe

O progresso é salvo pela **posição** das unidades, lições e perguntas. Para não bagunçar o progresso de quem já estudou, **acrescente** perguntas, lições e unidades **no fim** das listas e não mude o `id` da matéria nem os `id` das unidades.

---

## Prompt para a IA

<!-- PROMPT:INICIO -->
Você vai criar uma matéria para um app de quiz no estilo Duolingo (HTML/JS puro, sem build, abre direto no navegador). Gere UM arquivo JavaScript completo, `conteudos/<id-da-materia>.js`, seguindo EXATAMENTE o formato abaixo. Responda só com o código do arquivo.

### 1. Estrutura do arquivo

```js
(function () {
  const UNITS = [ /* unidades (seção 2) */ ];
  const REFERENCE = { /* opcional: página de consulta (seção 5) */ };

  QUIZ.addCourse({
    id: 'calculo',            // único, minúsculas, sem espaços; nunca mude depois (o progresso usa este id)
    title: 'Cálculo I — Prova 1',
    short: 'Cálculo I',       // nome curto para o menu
    subtitle: 'Limites, derivadas e aplicações',
    icon: '📈',               // um emoji
    color: '#ff9600',         // cor da matéria (hex)
    reference: REFERENCE,     // opcional
    practice: [ /* opcional: treinos extras (seção 6) */ ],
    units: UNITS,
  });
})();
```

### 2. Unidade

```js
{
  id: 'limites',                 // único dentro da matéria, sem espaços
  title: 'Limites',
  sub: 'Definição e propriedades',
  color: '#1cb0f6',              // cada unidade com uma cor diferente
  kicker: 'Cai na prova',        // opcional: texto pequeno acima do título
  extra: true,                   // opcional: unidade bônus, não bloqueia a trilha
  guide: [                       // resumo da unidade (HTML), aberto no botão "Guia"
    '<p>Texto com <b>destaques</b>.</p>',
    '<table class="gt"><tr><th>Coluna</th><th>Coluna</th></tr><tr><td>…</td><td>…</td></tr></table>',
    '<p class="tip">Dica importante em caixa azul.</p>',
  ],
  lessons: [
    { title: 'Nome da lição', qs: [ /* perguntas (seção 3) */ ] },
  ],
}
```

Recomendado: 8 a 14 unidades na ordem do conteúdo; 1 a 3 lições por unidade; 6 a 10 perguntas por lição; misture os tipos e vá do fácil ao difícil. Se houver provas antigas, crie unidades/lições com as questões delas (e variações com outros números) e uma unidade final "Simulado".

### 3. Tipos de pergunta (campo `t`)

```js
{ t: 'mc', q: 'Pergunta?', o: ['certa', 'errada', 'errada', 'errada'], a: 0, e: 'Explicação.' }
// múltipla escolha; a = índice da opção certa (as opções são embaralhadas na tela)

{ t: 'tf', q: 'Afirmação.', a: true, e: 'Por quê.' }            // verdadeiro ou falso

{ t: 'ms', q: 'Marque todas as corretas', o: ['a', 'b', 'c', 'd'], a: [0, 2] }

{ t: 'fill', q: 'Complete', s: 'A {0} de x² é {1}.', b: ['derivada', '2x', 'integral', 'x³/3'], a: ['derivada', '2x'] }
// lacunas {0}, {1}…; b = banco de palavras (inclua distratores); a = palavra certa de cada lacuna

{ t: 'match', q: 'Ligue os pares', p: [['termo', 'definição'], ['termo', 'definição'], ['termo', 'definição']] }   // 3 a 5 pares

{ t: 'order', q: 'Coloque na ordem', o: ['primeiro', 'segundo', 'terceiro'] }   // escreva JÁ na ordem certa

{ t: 'cls', q: 'Classifique', buckets: ['Grupo A', 'Grupo B'], items: [['item', 0], ['item', 1], ['item', 0]] }

{ t: 'input', q: 'Quanto vale…?', a: ['42', 'quarenta e dois'], suf: 'KB', ph: 'ex.: 10', e: 'Conta: …' }
// resposta digitada; a = respostas aceitas. A comparação ignora maiúsculas, acentos, espaços,
// prefixo 0x, separador de milhar (1.260 = 1260), vírgula decimal e unidade no fim (12 KB = 12).
```

Campos opcionais em qualquer pergunta:
- `e`: explicação mostrada depois de responder (curta, ensina o porquê) — use em quase todas.
- `fig`: HTML exibido abaixo da pergunta (ex.: uma tabela `<table class="gt">`).
- `tag`: rótulo para filtrar em treinos (ex.: `'calc'`).
- `label`: troca o título do tipo (ex.: `'Questão da prova 2019'`).
- Use `\n` dentro de `q` para quebrar linha.

### 4. Pergunta gerada (opcional, ótima para contas)

```js
{ tag: 'calc', gen: () => {
    const x = 2 + Math.floor(Math.random() * 8);
    return { t: 'input', q: `Quanto é ${x}²?`, a: String(x * x), e: `${x} × ${x} = ${x * x}` };
} }
```
A função roda toda vez que a pergunta aparece, gerando números novos. Ela deve devolver uma pergunta normal (qualquer tipo).

### 5. Consulta (opcional): resumo, fórmulas, símbolos

```js
const REFERENCE = {
  title: 'Resumo de Cálculo',      // título da página
  nav: 'Resumo',                   // nome no menu
  icon: '📐',
  intro: 'Fórmulas para revisar antes da prova.',
  searchHint: 'derivada, limite…',
  sections: [
    { title: 'Derivadas', items: [
      { name: 'Regra da cadeia',
        desc: '(f∘g)′ = f′(g(x))·g′(x)',          // HTML
        read: 'Deriva a de fora e multiplica pela derivada da de dentro.',  // caixa "Como ler" (opcional)
        warn: 'Não esqueça a derivada interna.',  // caixa "Cuidado" (opcional)
        fig: '<table class="gt">…</table>',      // figura/tabela (opcional)
        wide: true,                               // ocupa a linha inteira (opcional)
        tags: 'cadeia composta' },                // palavras extras para a busca (opcional)
    ] },
  ],
};
```

### 6. Treinos extras (opcional, aparecem em "Revisar")

```js
practice: [
  { icon: '🧮', title: 'Só contas', text: 'Questões de cálculo com números novos.', tags: ['calc'], count: 10 },
  { icon: '⌨️', title: 'Respostas digitadas', text: 'Como na prova.', types: ['input'], count: 12 },
]
```

### 7. Regras

- Use SOMENTE o material fornecido. Se completar com conhecimento geral, avise no guia (`<p class="tip">…</p>`) ou marque a unidade com `extra: true`.
- Confira todas as contas e respostas. Em `input`, liste as variações aceitáveis em `a`.
- HTML permitido em `guide`, `desc`, `read`, `warn` e `fig`: `<p>`, `<b>`, `<i>`, `<br>`, `<ul>/<ol>/<li>`, `<code>`, `<table class="gt">`, `<p class="tip">`. Nada de `<script>`.
- Strings JS com aspas simples: escape apóstrofos (`\'`) ou use crases. Vírgula depois de cada item.
- Não use bibliotecas nem `import`; tudo dentro do `(function () { … })();`.

### 8. Material da matéria

(Descreva aqui: nome da matéria, foco — ex.: "prova 2" —, e cole ou anexe slides, provas antigas com gabarito, listas de exercícios ou resumos.)
<!-- PROMPT:FIM -->

---

## Observações sobre recursos especiais

- **Diagramas ER** (só a matéria Banco de Dados usa): perguntas `t: 'card'` (definir cardinalidades) e `t: 'click'` (tocar no elemento), e `{ dg: () => modelo }` nos guias, usam o renderizador `js/er-render.js`. Veja exemplos em `conteudos/banco-de-dados.js`.
- **Oficina de diagramas**: ativada com `workshop: true` na matéria (tarefas em `js/tasks.js`).
- **Ferramentas interativas** na consulta: um item pode ter `widget: (el) => { … }` em vez de `fig`, recebendo o elemento onde desenhar. Exemplos: simulador de substituição de páginas e calculadora de paginação em `conteudos/sistemas-operacionais.js`.
- Se você mudar o prompt acima, gere de novo o `js/prompt-ia.js` (o texto entre `PROMPT:INICIO` e `PROMPT:FIM`) para o botão **Copiar prompt** do app ficar igual.
