import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Ticket, TicketCategory, TicketStatus } from '../../domain/models/ticket.model';
import { TicketPeriodFilter, TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-my-tickets',
  imports: [DatePipe],
  templateUrl: './my-tickets.component.html',
})
export class MyTicketsComponent {
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);
  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<TicketStatus | null>(null);
  readonly searchTerm = signal('');
  readonly periodFilter = signal<TicketPeriodFilter | null>(null);

  readonly filteredTickets = computed(() => {
    const status = this.statusFilter();
    return this.tickets().filter((ticket) => !status || ticket.status === status);
  });

  readonly hasActiveFilters = computed(
    () =>
      this.statusFilter() !== null ||
      this.periodFilter() !== null ||
      this.searchTerm().trim().length > 0,
  );

  readonly openCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === TicketStatus.OPEN).length,
  );
  readonly inProgressCount = computed(
    () =>
      this.tickets().filter((ticket) => ticket.status === TicketStatus.IN_PROGRESS).length,
  );
  readonly doneCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === TicketStatus.DONE).length,
  );
  readonly cancelledCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === TicketStatus.CANCELLED).length,
  );

  readonly statusLabel: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'Aberto',
    [TicketStatus.IN_PROGRESS]: 'Em andamento',
    [TicketStatus.DONE]: 'Concluido',
    [TicketStatus.CANCELLED]: 'Cancelado',
  };

  readonly categoryLabel: Record<TicketCategory, string> = {
    [TicketCategory.TI]: 'TI',
    [TicketCategory.RH]: 'RH',
    [TicketCategory.INFRASTRUCTURE]: 'Infraestrutura',
    [TicketCategory.FINANCIAL]: 'Financeiro',
    [TicketCategory.OTHER]: 'Outros',
  };

  constructor() {
    this.destroyRef.onDestroy(() => this.clearSearchDebounce());
    this.loadMyTickets();
  }

  loadMyTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.ticketService
      .getMyTickets({
        q: this.searchTerm().trim() || undefined,
        period: this.periodFilter() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Nao foi possivel carregar suas solicitacoes no momento.');
          this.loading.set(false);
        },
      });
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set((value as TicketStatus) || null);
  }

  setPeriodFilter(value: string): void {
    this.periodFilter.set((value as TicketPeriodFilter) || null);
    this.loadMyTickets();
  }

  clearFilters(): void {
    const shouldReload = this.searchTerm() !== '' || this.periodFilter() !== null;
    this.statusFilter.set(null);
    this.periodFilter.set(null);
    if (this.searchTerm() !== '') {
      this.searchTerm.set('');
    }
    if (shouldReload) {
      this.loadMyTickets();
    }
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.scheduleSearch();
  }

  statusBadgeClass(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.OPEN:
        return 'border-slate-200 bg-slate-100 text-slate-700';
      case TicketStatus.IN_PROGRESS:
        return 'border-sky-200 bg-sky-100 text-sky-700';
      case TicketStatus.DONE:
        return 'border-emerald-200 bg-emerald-100 text-emerald-700';
      case TicketStatus.CANCELLED:
        return 'border-rose-200 bg-rose-100 text-rose-700';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-700';
    }
  }

  private scheduleSearch(): void {
    this.clearSearchDebounce();
    this.searchDebounceId = setTimeout(() => {
      this.searchDebounceId = null;
      this.loadMyTickets();
    }, 300);
  }

  private clearSearchDebounce(): void {
    if (!this.searchDebounceId) {
      return;
    }

    clearTimeout(this.searchDebounceId);
    this.searchDebounceId = null;
  }
}
