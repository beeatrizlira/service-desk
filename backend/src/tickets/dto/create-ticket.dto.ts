import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TicketCategory } from '../enums/ticket-category.enum';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;
}
