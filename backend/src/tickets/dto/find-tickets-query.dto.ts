import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketCategory } from '../enums/ticket-category.enum';
import { TicketPeriod } from '../enums/ticket-period.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

export class FindTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsEnum(TicketPeriod)
  period?: TicketPeriod;
}
