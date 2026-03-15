import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Ticket, TicketCategory, TicketStatus } from '../../domain/models/ticket.model';
import { environment } from '../../../environments/environment';

export type TicketPeriodFilter = '7d' | '30d';

export interface CreateTicketData {
  title: string;
  description: string;
  category: TicketCategory;
}

export interface FindTicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  q?: string;
  period?: TicketPeriodFilter;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/tickets`;

  getTickets(filters?: FindTicketFilters): Observable<Ticket[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.category) params['category'] = filters.category;
    if (filters?.q?.trim()) params['q'] = filters.q.trim();
    if (filters?.period) params['period'] = filters.period;
    return this.http.get<Ticket[]>(this.baseUrl, { params });
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  getMyTickets(filters?: FindTicketFilters): Observable<Ticket[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.category) params['category'] = filters.category;
    if (filters?.q?.trim()) params['q'] = filters.q.trim();
    if (filters?.period) params['period'] = filters.period;
    return this.http.get<Ticket[]>(`${this.baseUrl}/me`, { params });
  }

  createTicket(data: CreateTicketData): Observable<Ticket> {
    return this.http.post<Ticket>(this.baseUrl, data);
  }

  updateStatus(id: number, status: TicketStatus): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/${id}/status`, { status });
  }
}
