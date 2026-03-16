# AI_USAGE.md

## Contexto
Usei IA como assistente de desenvolvimento para acelerar tarefas repetitivas e scaffolding inicial, mantendo revisão manual em todas as etapas.

## Ferramentas de IA utilizadas
- Codex/Claude Code no terminal:
  - geracao inicial de estrutura do backend NestJS (entity, DTOs, service, controller, module, TypeORM);
  - geracao inicial de componentes do frontend Angular (formulario, board, servico HTTP, rotas);
  - apoio na criacao e ajuste de testes.
- Chat com IA:
  - refinamento de prompts por etapa;
  - analise de bugs de runtime/UX;
  - revisao de mensagens de commit e criterio de entrega.

## Como eu usei os prompts
Em vez de um prompt unico, quebrei em blocos pequenos e verificaveis. Exemplos reais que usei:

1. Backend Fase 1 completo (NestJS + TypeORM + SQLite) com ordem de implementacao definida.
2. Validacao de query de `GET /tickets` via `FindTicketsQueryDto`.
3. Frontend por etapas: models/service, depois rotas/navbar, depois TicketForm, depois Board.
4. Refinos de UX apos teste manual: feedback de erro, loading, toasts, filtros e modal de detalhes.

Essa estrategia evitou retrabalho grande e facilitou validar cada passo com commit pequeno.

## Exemplos concretos onde corrigi a saida da IA

### 1) Validacao de filtros no backend (status/category)
- Saida inicial da IA:
  - leitura de query como string crua no controller.
- Problema:
  - aceitava valores invalidos e quebrava consistencia de validacao.
- Correcao aplicada:
  - criei `FindTicketsQueryDto` com `@IsOptional()` + `@IsEnum()` e passei a usar `@Query() query`.
- Motivo tecnico:
  - centralizar validacao em DTO e manter contrato forte da API.

### 2) Tailwind carregava, mas classes não aplicavam no Angular
- Saida inicial da IA:
  - configuracao incompleta da pipeline de estilos.
- Problema observado:
  - CSS do Tailwind aparecia no DevTools, mas utilitarios não refletiam na tela.
- Correcao aplicada:
  - ajuste da configuracao PostCSS para `@tailwindcss/postcss`;
  - ajuste do arquivo global de estilos com `@source` para `index.html` e templates em `app/**/*.{html,ts}`;
  - restart do servidor e limpeza de cache do Angular.
- Motivo tecnico:
  - sem a configuracao correta, o build não gerava/utilizava os utilitarios esperados.

### 3) Submit do formulario ficava travado sem API
- Saida inicial da IA:
  - fluxo de submit sem cobertura robusta para timeout/offline.
- Problema observado:
  - botao ficava em loading e usuario sem feedback quando o backend estava offline.
- Correcao aplicada:
  - adicionei `timeout` + `finalize` no fluxo de submit;
  - adicionei toast de erro com mensagem especifica para `status=0` (sem conexao);
  - adicionei botao `X` para fechar toast manualmente.
- Motivo tecnico:
  - garantir recuperacao de estado da UI em qualquer falha de rede.

### 4) Ajuste de escopo de testes gerados pela IA
- Saida inicial da IA:
  - sugestoes de e2e alem do que eu tinha pedido naquele momento.
- Problema:
  - desviava do escopo imediato e do objetivo de entrega incremental.
- Correcao aplicada:
  - priorizei testes de unidade/controller no backend e testes de componente no frontend;
  - deixei e2e como complemento, não como bloqueador.
- Motivo tecnico:
  - maximizar cobertura util no tempo do teste tecnico.

## Exemplo onde a IA acelerou significativamente
Maior ganho: bootstrap da Fase 1 do backend.

- Sem IA:
  - estimativa de ~2h a ~3h para montar estrutura completa com CRUD, DTOs e validacoes.
- Com IA:
  - primeira versao funcional em ~45-60 min.
- Resultado:
  - sobrou tempo para revisao critica, ajustes de UX no frontend e ampliacao de testes.

## Senso critico aplicado (como revisei o output)
- Conferi aderencia ao `PLANNING.md` antes de aceitar qualquer trecho.
- Testei fluxos reais no navegador (inclusive cenarios de erro/offline).
- Ajustei nomenclatura para aderir ao enunciado (`categoria` em vez de `area`).
- Priorizei experiencia do usuario quando output da IA ficava tecnicamente correto, mas ruim de uso.
- Mantive historico de commits incremental, sem squash unico, para demonstrar evolucao e revisoes.

## Conclusao
A IA acelerou bastante a execucao, principalmente no codigo repetitivo e no scaffolding inicial. A qualidade final veio da revisao manual, validacao de comportamento real e correcoes tecnicas apos cada iteracao.

## Critérios para aceitar ou rejeitar sugestões da IA

Durante o desenvolvimento utilizei três critérios antes de aceitar qualquer sugestão da IA:

- aderência ao escopo definido no `PLANNING.md`
- consistência com a arquitetura escolhida
- clareza e manutenção do código gerado

Quando a sugestão da IA introduzia complexidade desnecessária ou se afastava do escopo do MVP, optei por simplificar ou reescrever manualmente.