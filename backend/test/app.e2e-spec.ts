import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { TicketCategory } from '../src/tickets/enums/ticket-category.enum';
import { TicketStatus } from '../src/tickets/enums/ticket-status.enum';

type LoginResponseBody = {
  accessToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

const parseLoginResponseBody = (body: unknown): LoginResponseBody => {
  if (!body || typeof body !== 'object') {
    throw new Error('Expected login response body to be an object');
  }

  const bodyRecord = body as Record<string, unknown>;
  const accessToken = bodyRecord.accessToken;
  const user = bodyRecord.user;

  if (typeof accessToken !== 'string') {
    throw new Error('Expected accessToken to be a string');
  }

  if (!user || typeof user !== 'object') {
    throw new Error('Expected user to be an object');
  }

  const userRecord = user as Record<string, unknown>;
  const id = userRecord.id;
  const name = userRecord.name;
  const email = userRecord.email;
  const role = userRecord.role;
  if (typeof id !== 'number') {
    throw new Error('Expected user.id to be a number');
  }
  if (typeof name !== 'string') {
    throw new Error('Expected user.name to be a string');
  }
  if (typeof email !== 'string') {
    throw new Error('Expected user.email to be a string');
  }
  if (typeof role !== 'string') {
    throw new Error('Expected user.role to be a string');
  }

  return {
    accessToken,
    user: {
      id,
      name,
      email,
      role,
    },
  };
};

type TicketResponseBody = {
  id: number;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  userId: number | null;
};

const parseTicketResponseBody = (body: unknown): TicketResponseBody => {
  if (!body || typeof body !== 'object') {
    throw new Error('Expected ticket response body to be an object');
  }

  const bodyRecord = body as Record<string, unknown>;
  const id = bodyRecord.id;
  const title = bodyRecord.title;
  const description = bodyRecord.description;
  const category = bodyRecord.category;
  const status = bodyRecord.status;
  const userId = bodyRecord.userId;

  if (typeof id !== 'number') {
    throw new Error('Expected ticket.id to be a number');
  }
  if (typeof title !== 'string') {
    throw new Error('Expected ticket.title to be a string');
  }
  if (typeof description !== 'string') {
    throw new Error('Expected ticket.description to be a string');
  }
  if (!Object.values(TicketCategory).includes(category as TicketCategory)) {
    throw new Error('Expected ticket.category to be a valid category');
  }
  if (!Object.values(TicketStatus).includes(status as TicketStatus)) {
    throw new Error('Expected ticket.status to be a valid status');
  }
  if (!(typeof userId === 'number' || userId === null)) {
    throw new Error('Expected ticket.userId to be a number or null');
  }

  return {
    id,
    title,
    description,
    category: category as TicketCategory,
    status: status as TicketStatus,
    userId,
  };
};

describe('Service Desk API (e2e)', () => {
  let app: INestApplication;
  const httpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as unknown as Parameters<typeof request>[0];

  const collaboratorCredentials = {
    email: 'colaborador@service-desk.local',
    password: '123456',
  };
  const supportCredentials = {
    email: 'suporte@service-desk.local',
    password: '123456',
  };

  const loginAndGetToken = async (credentials: {
    email: string;
    password: string;
  }): Promise<string> => {
    const response = await request(httpServer())
      .post('/api/auth/login')
      .send(credentials)
      .expect(201);

    const loginBody = parseLoginResponseBody(response.body as unknown);
    return loginBody.accessToken;
  };

  const createTicketAsCollaborator = async (): Promise<TicketResponseBody> => {
    const collaboratorToken = await loginAndGetToken(collaboratorCredentials);
    const createResponse = await request(httpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({
        title: `Ticket e2e ${Date.now()}-${Math.round(Math.random() * 1000)}`,
        description: 'Fluxo e2e para validar permissoes e status',
        category: TicketCategory.TI,
      })
      .expect(201);

    return parseTicketResponseBody(createResponse.body as unknown);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/auth/health should return auth module health check', () => {
    return request(httpServer())
      .get('/api/auth/health')
      .expect(200)
      .expect({ ok: true });
  });

  it('POST /api/auth/login should return access token for predefined user', async () => {
    const response = await request(httpServer())
      .post('/api/auth/login')
      .send(supportCredentials)
      .expect(201);

    const loginBody = parseLoginResponseBody(response.body as unknown);
    expect(loginBody.accessToken).toBeTruthy();
    expect(loginBody.user.email).toBe('suporte@service-desk.local');
    expect(loginBody.user.role).toBe('SUPPORT');
  });

  it('POST /api/auth/login should return 401 for invalid credentials', () => {
    return request(httpServer())
      .post('/api/auth/login')
      .send({
        email: supportCredentials.email,
        password: 'wrong-password',
      })
      .expect(401);
  });

  it('GET /api/tickets should return 401 without token', () => {
    return request(httpServer()).get('/api/tickets').expect(401);
  });

  it('POST /api/tickets should create a ticket for collaborator and set OPEN status', async () => {
    const collaboratorToken = await loginAndGetToken(collaboratorCredentials);
    const createResponse = await request(httpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({
        title: `Abertura ${Date.now()}`,
        description: 'Novo chamado criado no fluxo e2e',
        category: TicketCategory.RH,
      })
      .expect(201);

    const createdTicket = parseTicketResponseBody(createResponse.body as unknown);
    expect(createdTicket.status).toBe(TicketStatus.OPEN);
    expect(createdTicket.userId).toBe(1);
  });

  it('POST /api/tickets should return 403 when support tries to create ticket', async () => {
    const supportToken = await loginAndGetToken(supportCredentials);
    await request(httpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${supportToken}`)
      .send({
        title: 'Tentativa de abertura por suporte',
        description: 'Nao deve ser permitido',
        category: TicketCategory.TI,
      })
      .expect(403);
  });

  it('GET /api/tickets should return 403 for collaborator role', async () => {
    const collaboratorToken = await loginAndGetToken(collaboratorCredentials);
    await request(httpServer())
      .get('/api/tickets')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(403);
  });

  it('GET /api/tickets should return 200 for support and include created ticket', async () => {
    const createdTicket = await createTicketAsCollaborator();
    const supportToken = await loginAndGetToken(supportCredentials);

    const ticketsResponse = await request(httpServer())
      .get('/api/tickets')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(200);

    const tickets = ticketsResponse.body as unknown;
    expect(Array.isArray(tickets)).toBe(true);
    const ticketIds = (tickets as Array<{ id?: unknown }>).map((ticket) => ticket.id);
    expect(ticketIds).toContain(createdTicket.id);
  });

  it('GET /api/tickets/me should return only collaborator tickets and include own ticket', async () => {
    const createdTicket = await createTicketAsCollaborator();
    const collaboratorToken = await loginAndGetToken(collaboratorCredentials);

    const myTicketsResponse = await request(httpServer())
      .get('/api/tickets/me')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);

    const myTickets = myTicketsResponse.body as unknown;
    expect(Array.isArray(myTickets)).toBe(true);
    const ticketIds = (myTickets as Array<{ id?: unknown }>).map((ticket) => ticket.id);
    expect(ticketIds).toContain(createdTicket.id);
  });

  it('GET /api/tickets/me should return 403 for support role', async () => {
    const supportToken = await loginAndGetToken(supportCredentials);
    await request(httpServer())
      .get('/api/tickets/me')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(403);
  });

  it('PATCH /api/tickets/:id/status should update ticket status when user is support', async () => {
    const createdTicket = await createTicketAsCollaborator();
    const supportToken = await loginAndGetToken(supportCredentials);

    const updateResponse = await request(httpServer())
      .patch(`/api/tickets/${createdTicket.id}/status`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ status: TicketStatus.DONE })
      .expect(200);

    const updatedTicket = parseTicketResponseBody(updateResponse.body as unknown);
    expect(updatedTicket.status).toBe(TicketStatus.DONE);
  });

  it('PATCH /api/tickets/:id/status should return 403 when user is collaborator', async () => {
    const createdTicket = await createTicketAsCollaborator();
    const collaboratorToken = await loginAndGetToken(collaboratorCredentials);

    await request(httpServer())
      .patch(`/api/tickets/${createdTicket.id}/status`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ status: TicketStatus.CANCELLED })
      .expect(403);
  });

  it('GET /api/tickets/:id should return 200 for collaborator when ticket belongs to them', async () => {
    const createdTicket = await createTicketAsCollaborator();
    const collaboratorToken = await loginAndGetToken(collaboratorCredentials);

    const response = await request(httpServer())
      .get(`/api/tickets/${createdTicket.id}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);

    const ticket = parseTicketResponseBody(response.body as unknown);
    expect(ticket.id).toBe(createdTicket.id);
    expect(ticket.userId).toBe(1);
  });
});
