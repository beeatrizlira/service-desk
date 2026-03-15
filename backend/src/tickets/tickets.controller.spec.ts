import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../auth/enums/user-role.enum';
import { TicketCategory } from './enums/ticket-category.enum';
import { TicketPeriod } from './enums/ticket-period.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

const makeTicket = () => ({
  id: 1,
  title: 'Problema no sistema',
  description: 'Nao consigo acessar o ERP',
  category: TicketCategory.TI,
  status: TicketStatus.OPEN,
  userId: null,
  createdAt: new Date('2024-01-10T10:00:00Z'),
  updatedAt: new Date('2024-01-10T10:00:00Z'),
});

describe('TicketsController (HTTP)', () => {
  let app: INestApplication;
  let collaboratorAuthHeader: string;
  let supportAuthHeader: string;

  const httpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as unknown as Parameters<typeof request>[0];
  const withCollaboratorAuth = (req: request.Test): request.Test =>
    req.set('Authorization', collaboratorAuthHeader);
  const withSupportAuth = (req: request.Test): request.Test =>
    req.set('Authorization', supportAuthHeader);

  const ticketsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findMine: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async (): Promise<void> => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'service-desk-dev-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: ticketsServiceMock,
        },
      ],
    }).compile();

    const jwtService = moduleRef.get<JwtService>(JwtService);
    collaboratorAuthHeader = `Bearer ${await jwtService.signAsync({
      sub: 1,
      email: 'colaborador@service-desk.local',
      role: UserRole.COLLABORATOR,
      name: 'Ana Colaboradora',
    })}`;

    supportAuthHeader = `Bearer ${await jwtService.signAsync({
      sub: 2,
      email: 'suporte@service-desk.local',
      role: UserRole.SUPPORT,
      name: 'Caio Suporte',
    })}`;

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async (): Promise<void> => {
    await app.close();
  });

  it('POST /tickets should create a ticket when payload is valid', async () => {
    const payload = {
      title: 'Problema no sistema',
      description: 'Nao consigo acessar o ERP',
      category: TicketCategory.TI,
    };
    const ticket = makeTicket();
    ticketsServiceMock.create.mockResolvedValue(ticket);

    const response = await withCollaboratorAuth(
      request(httpServer()).post('/tickets'),
    )
      .send(payload)
      .expect(201);

    expect(ticketsServiceMock.create).toHaveBeenCalledWith(payload, 1);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: ticket.id,
        title: ticket.title,
        category: ticket.category,
      }),
    );
  });

  it('POST /tickets should return 400 when payload is invalid', async () => {
    await withCollaboratorAuth(request(httpServer()).post('/tickets'))
      .send({
        title: '',
        description: 'descricao valida',
        category: TicketCategory.TI,
      })
      .expect(400);

    expect(ticketsServiceMock.create).not.toHaveBeenCalled();
  });

  it('POST /tickets should return 403 when user role is support', async () => {
    const payload = {
      title: 'Problema no sistema',
      description: 'Nao consigo acessar o ERP',
      category: TicketCategory.TI,
    };

    await request(httpServer())
      .post('/tickets')
      .set('Authorization', supportAuthHeader)
      .send(payload)
      .expect(403);

    expect(ticketsServiceMock.create).not.toHaveBeenCalled();
  });

  it('GET /tickets should return 400 when query enum is invalid', async () => {
    await withSupportAuth(request(httpServer()).get('/tickets'))
      .query({ status: 'INVALID_STATUS' })
      .expect(400);

    expect(ticketsServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('GET /tickets should return 400 when category enum is invalid', async () => {
    await withSupportAuth(request(httpServer()).get('/tickets'))
      .query({ category: 'INVALID_CATEGORY' })
      .expect(400);

    expect(ticketsServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('GET /tickets should return 400 when period enum is invalid', async () => {
    await withSupportAuth(request(httpServer()).get('/tickets'))
      .query({ period: '90d' })
      .expect(400);

    expect(ticketsServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('GET /tickets should pass valid status and category filters to service', async () => {
    ticketsServiceMock.findAll.mockResolvedValue([]);

    await withSupportAuth(request(httpServer()).get('/tickets'))
      .query({ status: TicketStatus.OPEN, category: TicketCategory.TI })
      .expect(200);

    expect(ticketsServiceMock.findAll).toHaveBeenCalledWith({
      status: TicketStatus.OPEN,
      category: TicketCategory.TI,
    });
  });

  it('GET /tickets should return 403 when user role is collaborator', async () => {
    await withCollaboratorAuth(request(httpServer()).get('/tickets')).expect(
      403,
    );

    expect(ticketsServiceMock.findAll).not.toHaveBeenCalled();
  });

  it('GET /tickets/me should return current user tickets', async () => {
    const myTickets = [makeTicket()];
    ticketsServiceMock.findMine.mockResolvedValue(myTickets);

    const response = await withCollaboratorAuth(
      request(httpServer()).get('/tickets/me'),
    ).expect(200);

    expect(ticketsServiceMock.findMine).toHaveBeenCalledTimes(1);
    expect(ticketsServiceMock.findMine).toHaveBeenCalledWith(1, {});
    expect(response.body).toHaveLength(1);
  });

  it('GET /tickets/me should pass q, status and category filters to service', async () => {
    ticketsServiceMock.findMine.mockResolvedValue([]);

    await withCollaboratorAuth(request(httpServer()).get('/tickets/me'))
      .query({
        q: 'erp',
        status: TicketStatus.OPEN,
        category: TicketCategory.TI,
      })
      .expect(200);

    expect(ticketsServiceMock.findMine).toHaveBeenCalledWith(1, {
      q: 'erp',
      status: TicketStatus.OPEN,
      category: TicketCategory.TI,
    });
  });

  it('GET /tickets/me should pass period filter to service', async () => {
    ticketsServiceMock.findMine.mockResolvedValue([]);

    await withCollaboratorAuth(request(httpServer()).get('/tickets/me'))
      .query({ period: TicketPeriod.LAST_30_DAYS })
      .expect(200);

    expect(ticketsServiceMock.findMine).toHaveBeenCalledWith(1, {
      period: TicketPeriod.LAST_30_DAYS,
    });
  });

  it('GET /tickets/me should return 403 when user role is support', async () => {
    await withSupportAuth(request(httpServer()).get('/tickets/me')).expect(403);

    expect(ticketsServiceMock.findMine).not.toHaveBeenCalled();
  });

  it('GET /tickets/:id should return 400 when id is not numeric', async () => {
    await withSupportAuth(
      request(httpServer()).get('/tickets/not-a-number'),
    ).expect(400);

    expect(ticketsServiceMock.findOne).not.toHaveBeenCalled();
  });

  it('GET /tickets/:id should return 404 when ticket is not found', async () => {
    ticketsServiceMock.findOne.mockRejectedValue(
      new NotFoundException('Ticket #99 not found'),
    );

    await withSupportAuth(request(httpServer()).get('/tickets/99')).expect(404);

    expect(ticketsServiceMock.findOne).toHaveBeenCalledWith(99);
  });

  it('GET /tickets/:id should return ticket for support user', async () => {
    const ticket = makeTicket();
    ticketsServiceMock.findOne.mockResolvedValue(ticket);

    const response = await withSupportAuth(
      request(httpServer()).get('/tickets/1'),
    ).expect(200);

    expect(ticketsServiceMock.findOne).toHaveBeenCalledWith(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: ticket.id,
      }),
    );
  });

  it('GET /tickets/:id should return ticket for collaborator when it belongs to them', async () => {
    const myTicket = { ...makeTicket(), userId: 1 };
    ticketsServiceMock.findOne.mockResolvedValue(myTicket);

    await withCollaboratorAuth(request(httpServer()).get('/tickets/1')).expect(
      200,
    );

    expect(ticketsServiceMock.findOne).toHaveBeenCalledWith(1);
  });

  it('GET /tickets/:id should return 403 for collaborator when ticket belongs to another user', async () => {
    const otherUserTicket = { ...makeTicket(), userId: 2 };
    ticketsServiceMock.findOne.mockResolvedValue(otherUserTicket);

    await withCollaboratorAuth(request(httpServer()).get('/tickets/1')).expect(
      403,
    );

    expect(ticketsServiceMock.findOne).toHaveBeenCalledWith(1);
  });

  it('PATCH /tickets/:id/status should return 400 when id is not numeric', async () => {
    await withSupportAuth(
      request(httpServer()).patch('/tickets/not-a-number/status'),
    )
      .send({ status: TicketStatus.DONE })
      .expect(400);

    expect(ticketsServiceMock.updateStatus).not.toHaveBeenCalled();
  });

  it('PATCH /tickets/:id/status should return 400 when status is invalid', async () => {
    await withSupportAuth(request(httpServer()).patch('/tickets/1/status'))
      .send({ status: 'INVALID_STATUS' })
      .expect(400);

    expect(ticketsServiceMock.updateStatus).not.toHaveBeenCalled();
  });

  it('PATCH /tickets/:id/status should update status when payload is valid', async () => {
    const updatedTicket = makeTicket();
    updatedTicket.status = TicketStatus.DONE;
    ticketsServiceMock.updateStatus.mockResolvedValue(updatedTicket);

    await withSupportAuth(request(httpServer()).patch('/tickets/1/status'))
      .send({ status: TicketStatus.DONE })
      .expect(200);

    expect(ticketsServiceMock.updateStatus).toHaveBeenCalledWith(1, {
      status: TicketStatus.DONE,
    });
  });

  it('PATCH /tickets/:id/status should return 404 when ticket is not found', async () => {
    ticketsServiceMock.updateStatus.mockRejectedValue(
      new NotFoundException('Ticket #99 not found'),
    );

    await withSupportAuth(request(httpServer()).patch('/tickets/99/status'))
      .send({ status: TicketStatus.DONE })
      .expect(404);

    expect(ticketsServiceMock.updateStatus).toHaveBeenCalledWith(99, {
      status: TicketStatus.DONE,
    });
  });

  it('PATCH /tickets/:id/status should return 403 when user role is collaborator', async () => {
    await withCollaboratorAuth(request(httpServer()).patch('/tickets/1/status'))
      .send({ status: TicketStatus.DONE })
      .expect(403);

    expect(ticketsServiceMock.updateStatus).not.toHaveBeenCalled();
  });

  it('DELETE /tickets/:id should return 204 and call service with parsed id', async () => {
    ticketsServiceMock.remove.mockResolvedValue(undefined);

    const response = await withSupportAuth(
      request(httpServer()).delete('/tickets/1'),
    ).expect(204);

    expect(ticketsServiceMock.remove).toHaveBeenCalledWith(1);
    expect(response.text).toBe('');
  });

  it('DELETE /tickets/:id should return 404 when ticket is not found', async () => {
    ticketsServiceMock.remove.mockRejectedValue(
      new NotFoundException('Ticket #99 not found'),
    );

    await withSupportAuth(request(httpServer()).delete('/tickets/99')).expect(
      404,
    );

    expect(ticketsServiceMock.remove).toHaveBeenCalledWith(99);
  });

  it('DELETE /tickets/:id should return 403 when user role is collaborator', async () => {
    await withCollaboratorAuth(
      request(httpServer()).delete('/tickets/1'),
    ).expect(403);

    expect(ticketsServiceMock.remove).not.toHaveBeenCalled();
  });
});
