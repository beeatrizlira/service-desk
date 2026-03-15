import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../auth/types/request-user.type';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Body() dto: CreateTicketDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const user = req.user;
    if (!user || user.role !== UserRole.COLLABORATOR) {
      throw new ForbiddenException(
        'Only collaborators can create support tickets',
      );
    }

    return this.ticketsService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Req() req: Request & { user?: RequestUser },
    @Query() query: FindTicketsQueryDto,
  ) {
    this.assertSupport(req.user);
    return this.ticketsService.findAll(query);
  }

  @Get('me')
  findMine(
    @Req() req: Request & { user?: RequestUser },
    @Query() query: FindTicketsQueryDto,
  ) {
    const user = this.assertCollaborator(req.user);
    return this.ticketsService.findMine(user.id, query);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const user = req.user;
    const ticket = await this.ticketsService.findOne(id);

    if (user?.role === UserRole.SUPPORT) {
      return ticket;
    }

    if (user?.role === UserRole.COLLABORATOR && ticket.userId === user.id) {
      return ticket;
    }

    throw new ForbiddenException('You can only access your own tickets');
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    this.assertSupport(req.user);
    return this.ticketsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: RequestUser },
  ) {
    this.assertSupport(req.user);
    return this.ticketsService.remove(id);
  }

  private assertCollaborator(user?: RequestUser): RequestUser {
    if (!user || user.role !== UserRole.COLLABORATOR) {
      throw new ForbiddenException('Only collaborators can access this route');
    }
    return user;
  }

  private assertSupport(user?: RequestUser): RequestUser {
    if (!user || user.role !== UserRole.SUPPORT) {
      throw new ForbiddenException('Only support users can access this route');
    }
    return user;
  }
}
