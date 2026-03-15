import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketCategory } from './enums/ticket-category.enum';
import { TicketPeriod } from './enums/ticket-period.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { TicketsService } from './tickets.service';

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  remove: jest.fn(),
});

type MockRepository = ReturnType<typeof mockRepository>;

const mockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
});

type MockQueryBuilder = ReturnType<typeof mockQueryBuilder>;

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket =>
  ({
    id: 1,
    title: 'Problema no sistema',
    description: 'Não consigo acessar o ERP',
    category: TicketCategory.TI,
    status: TicketStatus.OPEN,
    userId: null,
    createdAt: new Date('2024-01-10T10:00:00Z'),
    updatedAt: new Date('2024-01-10T10:00:00Z'),
    ...overrides,
  }) as Ticket;

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    repo = module.get<MockRepository>(getRepositoryToken(Ticket));
  });

  describe('create', () => {
    it('should create and save a ticket with userId, returning it with an id and OPEN status', async () => {
      const dto: CreateTicketDto = {
        title: 'Problema no sistema',
        description: 'Não consigo acessar o ERP',
        category: TicketCategory.TI,
      };
      const userId = 7;
      const builtTicket = { ...dto, status: TicketStatus.OPEN, userId };
      const savedTicket = makeTicket({ userId });

      repo.create.mockReturnValue(builtTicket);
      repo.save.mockResolvedValue(savedTicket);

      const result = await service.create(dto, userId);

      expect(repo.create).toHaveBeenCalledWith({
        ...dto,
        userId,
      });
      expect(repo.save).toHaveBeenCalledWith(builtTicket);
      expect(result.id).toBeDefined();
      expect(result.status).toBe(TicketStatus.OPEN);
      expect(result.userId).toBe(userId);
      expect(result).toEqual(savedTicket);
    });
  });

  describe('findAll', () => {
    it('should return all tickets ordered by createdAt DESC when no filters are provided', async () => {
      const tickets = [makeTicket({ id: 2 }), makeTicket({ id: 1 })];
      repo.find.mockResolvedValue(tickets);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(tickets);
    });

    it('should pass the status filter to the repository when provided', async () => {
      const tickets = [makeTicket({ status: TicketStatus.IN_PROGRESS })];
      repo.find.mockResolvedValue(tickets);

      const result = await service.findAll({
        status: TicketStatus.IN_PROGRESS,
      });

      expect(repo.find).toHaveBeenCalledWith({
        where: { status: TicketStatus.IN_PROGRESS },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(tickets);
    });

    it('should pass the category filter to the repository when provided', async () => {
      const tickets = [makeTicket({ category: TicketCategory.RH })];
      repo.find.mockResolvedValue(tickets);

      const result = await service.findAll({ category: TicketCategory.RH });

      expect(repo.find).toHaveBeenCalledWith({
        where: { category: TicketCategory.RH },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(tickets);
    });

    it('should pass both status and category filters to the repository when provided together', async () => {
      const tickets = [
        makeTicket({
          category: TicketCategory.TI,
          status: TicketStatus.IN_PROGRESS,
        }),
      ];
      repo.find.mockResolvedValue(tickets);

      const result = await service.findAll({
        status: TicketStatus.IN_PROGRESS,
        category: TicketCategory.TI,
      });

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          status: TicketStatus.IN_PROGRESS,
          category: TicketCategory.TI,
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(tickets);
    });

    it('should use query builder and search by title, description or id when q is provided', async () => {
      const tickets = [makeTicket({ id: 12, title: 'Erro no ERP' })];
      const qb: MockQueryBuilder = mockQueryBuilder();
      qb.getMany.mockResolvedValue(tickets);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ q: 'erp' });

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('ticket');
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(ticket.title) LIKE :search OR LOWER(ticket.description) LIKE :search OR CAST(ticket.id AS TEXT) LIKE :search)',
        { search: '%erp%' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('ticket.createdAt', 'DESC');
      expect(result).toEqual(tickets);
    });

    it('should use query builder and apply createdAt period filter when period is provided', async () => {
      const tickets = [makeTicket({ id: 9 })];
      const qb: MockQueryBuilder = mockQueryBuilder();
      qb.getMany.mockResolvedValue(tickets);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        period: TicketPeriod.LAST_7_DAYS,
      });

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('ticket');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'ticket.createdAt >= :fromDate',
        {
          fromDate: expect.any(Date) as unknown,
        },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('ticket.createdAt', 'DESC');
      expect(result).toEqual(tickets);
    });
  });

  describe('findMine', () => {
    it('should return only tickets from the provided user ordered by createdAt DESC', async () => {
      const tickets = [
        makeTicket({ id: 5, userId: 7 }),
        makeTicket({ id: 3, userId: 7 }),
      ];
      repo.find.mockResolvedValue(tickets);

      const result = await service.findMine(7);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 7 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(tickets);
    });

    it('should apply q search for the provided user when q is informed', async () => {
      const tickets = [
        makeTicket({ id: 21, userId: 7, title: 'Notebook com problema' }),
      ];
      const qb: MockQueryBuilder = mockQueryBuilder();
      qb.getMany.mockResolvedValue(tickets);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMine(7, { q: 'note' });

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('ticket');
      expect(qb.where).toHaveBeenCalledWith('ticket.userId = :userId', {
        userId: 7,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(ticket.title) LIKE :search OR LOWER(ticket.description) LIKE :search OR CAST(ticket.id AS TEXT) LIKE :search)',
        { search: '%note%' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('ticket.createdAt', 'DESC');
      expect(result).toEqual(tickets);
    });

    it('should apply period filter for the provided user when period is informed', async () => {
      const tickets = [makeTicket({ id: 22, userId: 7 })];
      const qb: MockQueryBuilder = mockQueryBuilder();
      qb.getMany.mockResolvedValue(tickets);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMine(7, {
        period: TicketPeriod.LAST_30_DAYS,
      });

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('ticket');
      expect(qb.where).toHaveBeenCalledWith('ticket.userId = :userId', {
        userId: 7,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'ticket.createdAt >= :fromDate',
        {
          fromDate: expect.any(Date) as unknown,
        },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('ticket.createdAt', 'DESC');
      expect(result).toEqual(tickets);
    });
  });

  describe('findOne', () => {
    it('should return the ticket when a valid ID is provided', async () => {
      const ticket = makeTicket();
      repo.findOneBy.mockResolvedValue(ticket);

      const result = await service.findOne(1);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(ticket);
    });

    it('should throw NotFoundException when the ID does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      try {
        await service.findOne(99);
        fail('Expected service.findOne to throw NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as Error).message).toBe('Ticket #99 not found');
      }

      expect(repo.findOneBy).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStatus', () => {
    it('should find the ticket, update its status and return the saved result', async () => {
      const ticket = makeTicket({ status: TicketStatus.OPEN });
      const dto: UpdateTicketStatusDto = { status: TicketStatus.IN_PROGRESS };
      const savedTicket = makeTicket({ status: TicketStatus.IN_PROGRESS });

      repo.findOneBy.mockResolvedValue(ticket);
      repo.save.mockResolvedValue(savedTicket);

      const result = await service.updateStatus(1, dto);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(repo.save).toHaveBeenCalledWith({
        ...ticket,
        status: TicketStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('should throw NotFoundException when the ID does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateStatus(99, {
          status: TicketStatus.DONE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should find the ticket and remove it', async () => {
      const ticket = makeTicket();
      repo.findOneBy.mockResolvedValue(ticket);
      repo.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(repo.remove).toHaveBeenCalledWith(ticket);
    });

    it('should throw NotFoundException when the ID does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
