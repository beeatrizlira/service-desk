import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
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
  private readonly loadMyTicketsTrigger$ = new Subject<void>();
  private readonly searchTermChanges$ = new Subject<void>();
  private lastFocusedBeforeMobileFilters: HTMLElement | null = null;

  @ViewChild('mobileFiltersPanel')
  private mobileFiltersPanel?: ElementRef<HTMLElement>;

  @ViewChild('mobileFiltersTrigger')
  private mobileFiltersTrigger?: ElementRef<HTMLElement>;

  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mobileFiltersOpen = signal(false);
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
    this.bindDataStreams();
    this.loadMyTickets();
  }

  loadMyTickets(): void {
    this.loadMyTicketsTrigger$.next();
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
    this.searchTermChanges$.next();
  }

  openMobileFilters(): void {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      this.lastFocusedBeforeMobileFilters = document.activeElement;
    }

    this.mobileFiltersOpen.set(true);
    setTimeout(() => this.focusFirstMobileFiltersElement());
  }

  closeMobileFilters(): void {
    this.mobileFiltersOpen.set(false);
    setTimeout(() => this.restoreMobileFiltersFocus());
  }

  onMobileFiltersKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMobileFilters();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = this.getMobileFiltersFocusableElements();
    const panel = this.mobileFiltersPanel?.nativeElement;
    if (!panel) {
      return;
    }

    if (focusableElements.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (event.shiftKey) {
      if (activeElement === first || activeElement === panel) {
        event.preventDefault();
        last?.focus();
      }
      return;
    }

    if (activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
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

  private bindDataStreams(): void {
    this.searchTermChanges$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMyTickets());

    this.loadMyTicketsTrigger$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.ticketService
            .getMyTickets({
              q: this.searchTerm().trim() || undefined,
              period: this.periodFilter() ?? undefined,
            })
            .pipe(
              tap((tickets) => this.tickets.set(tickets)),
              catchError(() => {
                this.error.set('Nao foi possivel carregar suas solicitacoes no momento.');
                return of(null);
              }),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.loading.set(false);
      });
  }

  private focusFirstMobileFiltersElement(): void {
    if (!this.mobileFiltersOpen()) {
      return;
    }

    const panel = this.mobileFiltersPanel?.nativeElement;
    if (!panel) {
      return;
    }

    const focusableElements = this.getMobileFiltersFocusableElements();
    const firstFocusableElement = focusableElements[0];
    if (firstFocusableElement) {
      firstFocusableElement.focus();
      return;
    }

    panel.focus();
  }

  private restoreMobileFiltersFocus(): void {
    const focusTarget =
      this.mobileFiltersTrigger?.nativeElement ?? this.lastFocusedBeforeMobileFilters;

    focusTarget?.focus();
    this.lastFocusedBeforeMobileFilters = null;
  }

  private getMobileFiltersFocusableElements(): HTMLElement[] {
    const panel = this.mobileFiltersPanel?.nativeElement;
    if (!panel) {
      return [];
    }

    const selector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => !element.hasAttribute('disabled'),
    );
  }
}
