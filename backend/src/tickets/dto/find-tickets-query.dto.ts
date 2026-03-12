import { IsEnum, IsOptional } from 'class-validator';
import { TicketCategory } from '../enums/ticket-category.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

export class FindTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;
}
