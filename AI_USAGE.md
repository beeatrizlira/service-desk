# AI_USAGE.md

## Contexto
Este backend (Fase 1) foi desenvolvido com apoio de IA para acelerar a implementação inicial, mas com revisão manual em cada arquivo antes de considerar pronto.

Prompt principal que usei com a IA:

> Leia o arquivo PLANNING.md na raiz do projeto. Implemente o backend (Fase 1) do sistema de gestão de solicitações com NestJS + TypeORM + SQLite. Siga esta ordem: 1) TypeORM no app.module.ts, 2) enums, 3) entity Ticket, 4) DTOs com class-validator, 5) TicketsService, 6) TicketsController, 7) TicketsModule, 8) main.ts com prefixo /api, CORS e ValidationPipe. Use simple-enum no TypeORM (compatibilidade com SQLite). Cada arquivo em sua pasta dentro de src/tickets/.

## Ferramenta de IA utilizada e tarefas
- Claude code (assistente de código):
  - gerar o esqueleto inicial do módulo `tickets` (entity, enums, DTOs, service, controller e module);
  - sugerir configuração base do NestJS com TypeORM + SQLite;
  - acelerar a criação das assinaturas de métodos CRUD e filtros por query.

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
