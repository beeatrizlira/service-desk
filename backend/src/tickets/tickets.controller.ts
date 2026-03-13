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
  findAll(@Query() query: FindTicketsQueryDto) {
    return this.ticketsService.findAll(query);
  }

  @Get('me')
  findMine(@Req() req: Request & { user?: RequestUser }) {
    return this.ticketsService.findMine(req.user?.id ?? 0);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.remove(id);
  }
}
