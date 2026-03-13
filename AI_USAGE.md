# AI_USAGE.md

## Contexto
Este projeto (Fase 1) foi desenvolvido com apoio de IA para acelerar a implementação inicial, mas com revisão manual em cada arquivo antes de considerar pronto.

Prompt principal que usei com a IA:

> Leia o arquivo PLANNING.md na raiz do projeto. Implemente o backend (Fase 1) do sistema de gestão de solicitações com NestJS + TypeORM + SQLite. Siga esta ordem: 1) TypeORM no app.module.ts, 2) enums, 3) entity Ticket, 4) DTOs com class-validator, 5) TicketsService, 6) TicketsController, 7) TicketsModule, 8) main.ts com prefixo /api, CORS e ValidationPipe. Use simple-enum no TypeORM (compatibilidade com SQLite). Cada arquivo em sua pasta dentro de src/tickets/.

## Ferramenta de IA utilizada e tarefas
- Claude code (assistente de código):
  - gerar o esqueleto inicial do módulo `tickets` (entity, enums, DTOs, service, controller e module);
  - sugerir configuração base do NestJS com TypeORM + SQLite;
  - acelerar a criação das assinaturas de métodos CRUD e filtros por query.
  - apoiar a implementação e refinos de UI/UX do Kanban Board no frontend (filtros, ações de status, modal de detalhes e organização visual).

## Exemplos concretos em que precisei corrigir/ajustar a saída da IA

### 1) Compatibilidade de enum no SQLite (TypeORM)
- O ponto de atenção era usar `simple-enum` (não `enum`) para evitar incompatibilidade com SQLite.
- Revisão feita: confirmei e ajustei os campos `category` e `status` da entidade para `type: 'simple-enum'`.
- Motivo: no SQLite, `enum` costuma gerar comportamento inconsistente dependendo da versão/driver; `simple-enum` é a opção segura nesse cenário.

### 2) Semântica HTTP no endpoint de remoção
- A implementação inicial do `DELETE` estava funcional, mas sem garantir resposta sem corpo.
- Ajuste feito: adição de `@HttpCode(HttpStatus.NO_CONTENT)` no `DELETE /tickets/:id`.
- Motivo: alinhar com prática REST (204 para deleção bem-sucedida sem payload).

### 3) Validação de entrada mais restritiva
- A IA gerou os DTOs, mas eu revisei para garantir regras de negócio do enunciado (ex.: título obrigatório e máximo de 200 caracteres).
- Ajuste feito: reforço com `@IsNotEmpty()` e `@MaxLength(200)` no `CreateTicketDto`, além de `@IsEnum(...)` para `category` e `status`.
- Motivo: evitar aceitar payload inválido e reduzir erro em runtime.

### 4) Validação de query no GET /tickets (ajuste posterior)
- Inicialmente, os filtros `status` e `category` eram lidos como query string direta no controller.
- Ajuste feito: criei `FindTicketsQueryDto` com `@IsOptional()` + `@IsEnum()` e passei a usar `@Query() query: FindTicketsQueryDto` no `GET /tickets`.
- Motivo: impedir valores inválidos de filtro e manter a validação consistente com os demais DTOs da API.

### 5) Tailwind no frontend carregava, mas utilities não aplicavam
- Sintoma: o CSS do Tailwind aparecia no DevTools, porém classes utilitárias do template (ex.: título vermelho e grande) não refletiam na tela.
- Diagnóstico: a pipeline de PostCSS/Tailwind não estava sendo interpretada corretamente no build (diretivas do Tailwind permaneciam no CSS final sem gerar utilities usadas nos templates).
- Ajuste feito:
  - padronizei o estilo global em `src/styles.css`;
  - adicionei `@source "./index.html"` e `@source "./app/**/*.{html,ts}"`;
  - troquei a configuração para `.postcssrc.json` com `@tailwindcss/postcss`.
- Resultado: após reiniciar o `ng serve` e limpar cache do Angular (`.angular`), as classes do Tailwind passaram a ser aplicadas normalmente.

### 6) Ajustes importantes após o prompt do TicketForm (frontend)
- O prompt inicial pedia redirecionar para `/board` após criar ticket, mas mudei o fluxo para ficar mais útil no estágio atual do projeto: ao criar com sucesso, o formulário é limpo e exibe toast de confirmação, mantendo o usuário na mesma tela.
- Refatorei os componentes para separar template e lógica (`.html` e `.ts`), porque o markup cresceu e a manutenção ficou melhor do que manter template inline.
- Depois de testar sem servidor, identifiquei um bug de UX (botão ficava em loading). Ajustei com `finalize` + `timeout` no submit e toast de erro com fechamento manual (`X`), cobrindo cenário offline e falhas da API.

### 7) Implementação do Board (Kanban) e refinos pós-prompt
- A IA ajudou a montar a primeira versão do quadro com colunas por status, filtros e atualização de status dos cards.
- Em seguida, eu refinei com validação visual e foco em usabilidade:
  - mantive o botão de atualizar com ícone de reload e estado de loading explícito;
  - simplifiquei o bloco de filtros (sem informações redundantes) e mantive labels claros;
  - padronizei a nomenclatura para "categoria" (em vez de "area"), alinhando com o enunciado;
  - adicionei tratamento de erro na troca de status dos cards, com feedback visual e bloqueio de clique repetido durante a requisição;
  - adicionei botão `Detalhes` em cada card e modal para leitura completa da descrição.
- Também ajustei decisões de UI ao longo da revisão (ex.: remover card de contagem no topo para reduzir ruído visual).
- Motivo: deixar o board mais claro para operação diária, sem perder ações principais (iniciar, concluir, cancelar, filtrar e consultar detalhes).

## Exemplo onde a IA acelerou significativamente uma tarefa
A maior aceleração foi na montagem do backend da Fase 1 em bloco (estrutura de arquivos + CRUD completo + configuração global do Nest).

- Sem IA: eu estimaria ~2h a ~3h para montar tudo do zero com o mesmo nível de organização.
- Com IA: cheguei a uma primeira versão funcional em ~40-60 min, ficando o restante do tempo para revisão, ajustes finos e validação.

## Como mantive senso crítico
Eu usei a IA como acelerador de implementação, não como fonte final de verdade. A cada trecho gerado, revisei:
- aderência ao enunciado do teste;
- compatibilidade técnica com SQLite/TypeORM;
- semântica de API (status codes, validação e tratamento de erro);
- build e testes básicos do backend.

Resumo: o ganho foi real em velocidade, mas a qualidade final veio da revisão manual e dos ajustes feitos após a geração inicial.
