import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketCategory } from './enums/ticket-category.enum';
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

  findAll(filters?: {
    status?: TicketStatus;
    category?: TicketCategory;
  }): Promise<Ticket[]> {
    const where: {
      status?: TicketStatus;
      category?: TicketCategory;
    } = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    return this.ticketRepository.find({ where, order: { createdAt: 'DESC' } });
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
}
