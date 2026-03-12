export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TicketCategory {
  TI = 'TI',
  RH = 'RH',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  FINANCIAL = 'FINANCIAL',
  OTHER = 'OTHER',
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}
