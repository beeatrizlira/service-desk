# PLANNING.md

## 1. Perguntas ao PO + Premissas

| # | Pergunta ao PO | Premissa adotada |
|---|---------------|------------------|
| 1 | Quais são as categorias das solicitações? São fixas ou o usuário pode criar novas? | Categorias fixas pré-definidas: TI, RH, Infraestrutura, Financeiro, Outros. |
| 2 | Existe controle de acesso? Colaborador e suporte são perfis distintos com login? | Autenticação básica com email + senha e JWT. Dois perfis: **colaborador** (abre e acompanha suas solicitações) e **suporte** (visualiza todas e gerencia status). Sem registro aberto — usuários criados via seed. |
| 3 | Quais são os status possíveis de uma solicitação e qual o fluxo de transição? | Fluxo linear: Aberta → Em andamento → Concluída. Suporte também pode marcar como "Cancelada". |
| 4 | O painel de acompanhamento é para o time de suporte, para os colaboradores, ou ambos? | Ambos, com visões diferentes. **Suporte:** Kanban board com todas as solicitações. **Colaborador:** lista das suas próprias solicitações com status atual. |
| 5 | O painel precisa ter métricas específicas ou um overview geral é suficiente? | Overview operacional para o suporte: visualização das solicitações organizadas por status (estilo Kanban), com contadores por status e categoria. |
| 6 | Existe SLA ou prioridade nas solicitações? | Não no MVP. Todas as solicitações têm a mesma prioridade. Prioridade fica como melhoria futura. |
| 7 | Solicitações podem ter anexos (prints, documentos)? | Não no MVP. Apenas texto (título + descrição). |
| 8 | O colaborador pode editar ou cancelar uma solicitação após aberta? | Não. Após criada, apenas o suporte interage com a solicitação. |

---

## 2. Escopo do MVP

A entrega segue uma estratégia incremental em duas fases, priorizando um sistema funcional de ponta a ponta antes de adicionar complexidade.

### Fase 1 — MVP funcional (prioridade absoluta)

- CRUD de solicitações (criar, listar, visualizar detalhes, atualizar status)
- Formulário para abrir solicitação (título, descrição, categoria)
- Visão do suporte estilo Kanban board — colunas por status (Aberta, Em Andamento, Concluída, Cancelada) com cards
- Mudança de status via clique no card
- Dashboard com contadores por status e por categoria
- Persistência com SQLite (zero config para rodar local)

### Fase 2 — Incrementos (se houver tempo)

- Autenticação com email + senha (JWT), dois perfis: colaborador e suporte
- Seed de usuários iniciais para facilitar testes
- Painel do colaborador: lista das suas próprias solicitações com status atual
- Proteção de rotas por perfil (guard de roles)
- Drag-and-drop no Kanban board

### Fora do escopo (melhorias futuras)

- Registro de novos usuários (auto-cadastro)
- Recuperação de senha
- Upload de anexos
- Notificações (email, push)
- SLA e prioridade
- Histórico/log de alterações de status
- Comentários nas solicitações
- Busca full-text

> **Decisão:** Optei por garantir primeiro um sistema funcional de ponta a ponta antes de adicionar autenticação. Um MVP rodando sem auth é mais valioso que um sistema com auth quebrado. A arquitetura foi pensada para que a auth seja adicionada como camada sem refatoração — o userId no Ticket já está previsto no modelo como nullable.

---

## 3. Modelo de Dados

### Entidade: Ticket (Fase 1)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | integer (PK, auto) | Identificador único |
| title | string (max 200) | Título da solicitação |
| description | text | Descrição detalhada |
| category | enum | TI, RH, INFRASTRUCTURE, FINANCIAL, OTHER |
| status | enum | OPEN, IN_PROGRESS, DONE, CANCELLED |
| userId | integer (FK → User, nullable) | Colaborador que abriu (nullable na Fase 1, obrigatório na Fase 2) |
| createdAt | datetime | Data de criação (automático) |
| updatedAt | datetime | Data da última atualização (automático) |

### Entidade: User (Fase 2)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | integer (PK, auto) | Identificador único |
| name | string (max 100) | Nome do usuário |
| email | string (unique) | Email para login |
| password | string (hash) | Senha (bcrypt) |
| role | enum | COLLABORATOR, SUPPORT |
| createdAt | datetime | Data de criação (automático) |

### Relacionamentos

- User 1 → N Ticket (um colaborador pode abrir várias solicitações)

> O campo userId já existe na Fase 1 como nullable, preparando a estrutura para receber auth na Fase 2 sem precisar de migration.

---

## 4. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Backend framework | **NestJS** | Framework opinado com arquitetura modular, decorators e DI — ideal para APIs escaláveis. Diferencial do teste. |
| Frontend framework | **Angular 17+** | Framework robusto com standalone components e boa integração com TypeScript. Diferencial do teste. |
| Banco de dados | **SQLite** (via TypeORM) | Zero configuração, sem Docker necessário, facilita rodar localmente. Aceito explicitamente no teste. |
| ORM | **TypeORM** | Integração nativa com NestJS, suporte a SQLite, decorators. |
| Estilização | **Angular Material** ou **Tailwind CSS** | Componentes prontos e responsivos sem precisar investir tempo em design. |
| Monorepo vs Multi-repo | **Monorepo simples** | Uma pasta `backend/` e uma `frontend/` na raiz. Simples de clonar e rodar. |
| Validação | **class-validator + class-transformer** | Padrão do NestJS para validação de DTOs via decorators. |
| Autenticação (Fase 2) | **JWT (@nestjs/jwt + @nestjs/passport)** | Stateless, simples de implementar, padrão de mercado. Senha com bcrypt. |
| Autorização (Fase 2) | **Guards + decorators customizados** | `@Roles('SUPPORT')` para proteger rotas específicas. Padrão do NestJS. |
| UX do suporte | **Kanban board** | Interface estilo Trello com colunas por status. Mais intuitivo que uma tabela — o suporte enxerga o fluxo de trabalho de uma vez. Mudança de status por clique no card; drag-and-drop fica como melhoria futura. |
| UX do colaborador | **Lista de "minhas solicitações" + formulário** | Colaborador vê só seus tickets com status atual, e pode abrir novos. Simples e direto. |
