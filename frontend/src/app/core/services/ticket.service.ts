import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Ticket, TicketCategory, TicketStatus } from '../../domain/models/ticket.model';

export interface CreateTicketData {
  title: string;
  description: string;
  category: TicketCategory;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3001/api/tickets';

  getTickets(filters?: {
    status?: TicketStatus;
    category?: TicketCategory;
  }): Observable<Ticket[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.category) params['category'] = filters.category;
    return this.http.get<Ticket[]>(this.baseUrl, { params });
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  createTicket(data: CreateTicketData): Observable<Ticket> {
    return this.http.post<Ticket>(this.baseUrl, data);
  }

  updateStatus(id: number, status: TicketStatus): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/${id}/status`, { status });
  }
}
