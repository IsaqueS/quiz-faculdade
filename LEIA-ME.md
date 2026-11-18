# Trilha de Estudos — quiz no estilo Duolingo para várias matérias

Abra o **index.html** com dois cliques (Chrome, Edge ou Firefox). Não precisa de servidor nem de internet (sem internet, só a fonte muda).
O progresso fica salvo no navegador; use **Perfil → Exportar progresso** para levar a outro PC.

## Matérias incluídas

| Matéria | Destaques |
|---|---|
| **Banco de Dados — Modelo ER** | 13 unidades / 175 perguntas · aba **Símbolos** com todos os símbolos da notação ER (desenho, significado e como ler) · **Oficina** de diagramas com correção automática |
| **Sistemas Operacionais — Prova 2** | 13 unidades / 220+ perguntas (gerência de memória, paginação, TLB, segmentação, substituição de páginas, alocação de arquivos, bitmap e simulado) · aba **Resumo** com fórmulas, **simulador de substituição de páginas** (FIFO, LRU, Ótimo, Relógio) e **calculadora de paginação** · perguntas geradas com números novos a cada rodada |

Link direto para uma matéria: `index.html?materia=bd` ou `index.html?materia=so`.

## O que tem em cada matéria

- **Trilha**: lições curtas em sequência, com um **Guia** (resumo) por unidade.
  Tipos de pergunta: múltipla escolha, V/F, marcar várias, completar, ligar pares, ordenar, classificar, **resposta digitada** (para contas) e, no Modelo ER, definir cardinalidades e tocar no diagrama.
- **Consulta** (Símbolos / Resumo): material de referência com busca.
- **Revisar**: treina o que você errou, treino aleatório e treinos especiais de cada matéria.
- **Perfil**: vidas infinitas, liberar todas as lições, tema escuro, backup.

## Adicionar uma matéria nova

Veja **[COMO-ADICIONAR-CONTEUDO.md](COMO-ADICIONAR-CONTEUDO.md)**. Resumo: copie o prompt (também disponível no app em **Matérias → Adicionar matéria**), cole numa IA junto com o material, salve o arquivo em `conteudos/` e adicione uma linha `<script>` no `index.html`.

## Estrutura

```
index.html                 página (lista de conteúdos no bloco CONTEÚDOS)
css/style.css              visual
js/quiz.js                 registro de matérias (QUIZ.addCourse)
js/app.js                  motor: trilha, lições, consulta, revisão, perfil
js/er-render.js            desenho de diagramas ER
js/tasks.js, js/editor.js  Oficina de diagramas ER
js/prompt-ia.js            prompt do botão "Adicionar matéria"
conteudos/*.js             uma matéria por arquivo
```

## Atalhos

- Lição: teclas `1`–`9` escolhem a opção e `Enter` verifica ou continua.
- Editor ER: `E` entidade, `R` relacionamento, `A` atributo, `L` ligar, `G` especialização, `Del` apaga, `Ctrl+Z`/`Ctrl+Y`, `Esc`, setas movem.
