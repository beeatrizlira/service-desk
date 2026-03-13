import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Ticket, TicketCategory, TicketStatus } from '../../domain/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-kanban-board',
  imports: [DatePipe],
  templateUrl: './kanban-board.component.html',
})
export class KanbanBoardComponent {
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedTicket = signal<Ticket | null>(null);

  readonly categoryFilter = signal<TicketCategory | null>(null);
  readonly statusFilter = signal<TicketStatus | null>(null);

  readonly filteredTickets = computed(() => {
    const category = this.categoryFilter();
    const status = this.statusFilter();
    return this.tickets().filter(
      (t) => (!category || t.category === category) && (!status || t.status === status),
    );
  });

  readonly openTickets = computed(() =>
    this.filteredTickets().filter((t) => t.status === TicketStatus.OPEN),
  );
  readonly inProgressTickets = computed(() =>
    this.filteredTickets().filter((t) => t.status === TicketStatus.IN_PROGRESS),
  );
  readonly doneTickets = computed(() =>
    this.filteredTickets().filter((t) => t.status === TicketStatus.DONE),
  );
  readonly cancelledTickets = computed(() =>
    this.filteredTickets().filter((t) => t.status === TicketStatus.CANCELLED),
  );

  readonly hasActiveFilters = computed(
    () => this.categoryFilter() !== null || this.statusFilter() !== null,
  );

  readonly TicketStatus = TicketStatus;
  readonly TicketCategory = TicketCategory;

  readonly categoryLabel: Record<TicketCategory, string> = {
    [TicketCategory.TI]: 'TI',
    [TicketCategory.RH]: 'RH',
    [TicketCategory.INFRASTRUCTURE]: 'Infraestrutura',
    [TicketCategory.FINANCIAL]: 'Financeiro',
    [TicketCategory.OTHER]: 'Outros',
  };

  readonly statusLabel: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'Aberto',
    [TicketStatus.IN_PROGRESS]: 'Em andamento',
    [TicketStatus.DONE]: 'Concluido',
    [TicketStatus.CANCELLED]: 'Cancelado',
  };

  constructor() {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.ticketService
      .getTickets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Nao foi possivel carregar os chamados. Verifique se a API esta online.');
          this.loading.set(false);
        },
      });
  }

  setCategoryFilter(value: string): void {
    this.categoryFilter.set((value as TicketCategory) || null);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set((value as TicketStatus) || null);
  }

  clearFilters(): void {
    this.categoryFilter.set(null);
    this.statusFilter.set(null);
  }

  updateStatus(ticket: Ticket, status: TicketStatus): void {
    this.ticketService
      .updateStatus(ticket.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.tickets.update((all) => all.map((t) => (t.id === updated.id ? updated : t)));
          if (this.selectedTicket()?.id === updated.id) {
            this.selectedTicket.set(updated);
          }
        },
      });
  }

  openTicketDetails(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
  }

  closeTicketDetails(): void {
    this.selectedTicket.set(null);
  }
}
