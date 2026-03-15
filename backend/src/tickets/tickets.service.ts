import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketCategory } from './enums/ticket-category.enum';
import { TicketPeriod } from './enums/ticket-period.enum';
import { TicketStatus } from './enums/ticket-status.enum';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  create(dto: CreateTicketDto, userId: number | null): Promise<Ticket> {
    const ticket = this.ticketRepository.create({
      ...dto,
      userId,
    });
    return this.ticketRepository.save(ticket);
  }

  findAll(filters: FindTicketsQueryDto = {}): Promise<Ticket[]> {
    const query = filters.q?.trim();
    if (!query && !filters.period) {
      const where: {
        status?: TicketStatus;
        category?: TicketCategory;
      } = {};
      if (filters.status) where.status = filters.status;
      if (filters.category) where.category = filters.category;
      return this.ticketRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });
    }

    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('1 = 1');
    this.applyEnumFilters(qb, filters);
    this.applyPeriodFilter(qb, filters.period);
    if (query) {
      this.applySearchFilter(qb, query);
    }
    return qb.orderBy('ticket.createdAt', 'DESC').getMany();
  }

  findMine(
    userId: number,
    filters: FindTicketsQueryDto = {},
  ): Promise<Ticket[]> {
    const query = filters.q?.trim();
    if (!query && !filters.period) {
      const where: {
        userId: number;
        status?: TicketStatus;
        category?: TicketCategory;
      } = { userId };
      if (filters.status) where.status = filters.status;
      if (filters.category) where.category = filters.category;
      return this.ticketRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });
    }

    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.userId = :userId', { userId });
    this.applyEnumFilters(qb, filters);
    this.applyPeriodFilter(qb, filters.period);
    if (query) {
      this.applySearchFilter(qb, query);
    }
    return qb.orderBy('ticket.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOneBy({ id });
    if (!ticket) throw new NotFoundException(`Ticket #${id} not found`);
    return ticket;
  }

  async updateStatus(id: number, dto: UpdateTicketStatusDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    ticket.status = dto.status;
    return this.ticketRepository.save(ticket);
  }

  async remove(id: number): Promise<void> {
    const ticket = await this.findOne(id);
    await this.ticketRepository.remove(ticket);
  }

  private applyEnumFilters(
    qb: SelectQueryBuilder<Ticket>,
    filters: {
      status?: TicketStatus;
      category?: TicketCategory;
    },
  ): void {
    if (filters.status) {
      qb.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters.category) {
      qb.andWhere('ticket.category = :category', {
        category: filters.category,
      });
    }
  }

  private applySearchFilter(
    qb: SelectQueryBuilder<Ticket>,
    query: string,
  ): void {
    const search = `%${query.toLowerCase()}%`;
    qb.andWhere(
      '(LOWER(ticket.title) LIKE :search OR LOWER(ticket.description) LIKE :search OR CAST(ticket.id AS TEXT) LIKE :search)',
      { search },
    );
  }

  private applyPeriodFilter(
    qb: SelectQueryBuilder<Ticket>,
    period?: TicketPeriod,
  ): void {
    const fromDate = this.resolveFromDate(period);
    if (!fromDate) {
      return;
    }

    qb.andWhere('ticket.createdAt >= :fromDate', { fromDate });
  }

  private resolveFromDate(period?: TicketPeriod): Date | null {
    if (!period) {
      return null;
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    switch (period) {
      case TicketPeriod.LAST_7_DAYS:
        return new Date(Date.now() - 7 * oneDayMs);
      case TicketPeriod.LAST_30_DAYS:
        return new Date(Date.now() - 30 * oneDayMs);
      default:
        return null;
    }
  }
}
