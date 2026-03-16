# Service Desk - Teste Tecnico (Angular + NestJS)

Sistema interno de gestao de solicitacoes para suporte, com:
- abertura de tickets por colaborador;
- board Kanban para suporte;
- autenticacao JWT com perfis `COLLABORATOR` e `SUPPORT`.

## Video de apresentacao
- Loom: [https://www.loom.com/share/d639acdc98a443f5b988ccdf37014720](https://www.loom.com/share/d639acdc98a443f5b988ccdf37014720)

## Documentos da entrega
- [PLANNING.md](./PLANNING.md)
- [AI_USAGE.md](./AI_USAGE.md)
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## Estrutura
```text
.
├── backend/
├── frontend/
├── PLANNING.md
├── AI_USAGE.md
└── README.md
```

## Como rodar localmente

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

API em `http://localhost:3001/api`.

### Frontend
```bash
cd frontend
npm install
npm start
```

Frontend em `http://localhost:4200`.

## Credenciais de teste
- Colaborador:
  - email: `colaborador@service-desk.local`
  - senha: `123456`
- Suporte:
  - email: `suporte@service-desk.local`
  - senha: `123456`

