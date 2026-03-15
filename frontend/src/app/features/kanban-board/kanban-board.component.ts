import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, finalize, of, switchMap, tap } from 'rxjs';
import { Ticket, TicketCategory, TicketStatus } from '../../domain/models/ticket.model';
import { TicketPeriodFilter, TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-kanban-board',
  imports: [DatePipe],
  templateUrl: './kanban-board.component.html',
})
export class KanbanBoardComponent {
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadTicketsTrigger$ = new Subject<void>();
  private readonly searchTermChanges$ = new Subject<void>();
  private lastFocusedBeforeMobileFilters: HTMLElement | null = null;

  @ViewChild('mobileFiltersPanel')
  private mobileFiltersPanel?: ElementRef<HTMLElement>;

  @ViewChild('mobileFiltersTrigger')
  private mobileFiltersTrigger?: ElementRef<HTMLElement>;

  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly selectedTicket = signal<Ticket | null>(null);
  readonly updatingTicketIds = signal<Set<number>>(new Set());
  readonly draggedTicketId = signal<number | null>(null);
  readonly activeDropStatus = signal<TicketStatus | null>(null);
  readonly mobileFiltersOpen = signal(false);
  readonly mobileActiveStatus = signal<TicketStatus>(TicketStatus.OPEN);

  readonly categoryFilter = signal<TicketCategory | null>(null);
  readonly statusFilter = signal<TicketStatus | null>(null);
  readonly searchTerm = signal('');
  readonly periodFilter = signal<TicketPeriodFilter | null>(null);

  readonly boardStatuses: TicketStatus[] = [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.DONE,
    TicketStatus.CANCELLED,
  ];

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
    () =>
      this.categoryFilter() !== null ||
      this.statusFilter() !== null ||
      this.periodFilter() !== null ||
      this.searchTerm().trim().length > 0,
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
    [TicketStatus.DONE]: 'Concluído',
    [TicketStatus.CANCELLED]: 'Cancelado',
  };

  constructor() {
    this.bindDataStreams();
    this.loadTickets();
  }

  loadTickets(): void {
    this.loadTicketsTrigger$.next();
  }

  setCategoryFilter(value: string): void {
    this.categoryFilter.set((value as TicketCategory) || null);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set((value as TicketStatus) || null);
  }

  setPeriodFilter(value: string): void {
    this.periodFilter.set((value as TicketPeriodFilter) || null);
    this.loadTickets();
  }

  clearFilters(): void {
    const shouldReload = this.searchTerm() !== '' || this.periodFilter() !== null;
    this.categoryFilter.set(null);
    this.statusFilter.set(null);
    this.periodFilter.set(null);
    if (this.searchTerm() !== '') {
      this.searchTerm.set('');
    }
    if (shouldReload) {
      this.loadTickets();
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

  selectMobileStatus(status: TicketStatus, container?: HTMLElement): void {
    this.mobileActiveStatus.set(status);
    if (!container) {
      return;
    }

    const statusIndex = this.boardStatuses.indexOf(status);
    if (statusIndex < 0) {
      return;
    }

    container.scrollTo({
      left: statusIndex * container.clientWidth,
      behavior: 'smooth',
    });
  }

  onMobileBoardScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (!element || element.clientWidth === 0) {
      return;
    }

    const index = Math.round(element.scrollLeft / element.clientWidth);
    const status = this.boardStatuses[index];
    if (status) {
      this.mobileActiveStatus.set(status);
    }
  }

  onMobileStatusSelect(ticket: Ticket, value: string): void {
    const nextStatus = value as TicketStatus;
    if (!nextStatus || nextStatus === ticket.status) {
      return;
    }

    this.updateStatus(ticket, nextStatus);
  }

  updateStatus(ticket: Ticket, status: TicketStatus): void {
    if (this.isUpdatingTicket(ticket.id)) return;

    this.error.set(null);
    this.setTicketUpdating(ticket.id, true);

    this.ticketService
      .updateStatus(ticket.id, status)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setTicketUpdating(ticket.id, false)),
      )
      .subscribe({
        next: (updated) => {
          this.tickets.update((all) => all.map((t) => (t.id === updated.id ? updated : t)));
          this.lastUpdatedAt.set(new Date());
          if (this.selectedTicket()?.id === updated.id) {
            this.selectedTicket.set(updated);
          }
        },
        error: () => {
          this.error.set(
            'Nao foi possivel atualizar o status do chamado. Verifique sua conexao e tente novamente.',
          );
        },
      });
  }

  onDragStart(event: DragEvent, ticket: Ticket): void {
    if (!this.canDragTicket(ticket)) {
      event.preventDefault();
      return;
    }

    this.draggedTicketId.set(ticket.id);
    this.activeDropStatus.set(null);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(ticket.id));
    }
  }

  onDragEnd(): void {
    this.draggedTicketId.set(null);
    this.activeDropStatus.set(null);
  }

  onDragOver(event: DragEvent, targetStatus: TicketStatus): void {
    if (!this.canDropOnStatus(targetStatus)) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnter(targetStatus: TicketStatus): void {
    if (!this.canDropOnStatus(targetStatus)) {
      return;
    }

    this.activeDropStatus.set(targetStatus);
  }

  onDragLeave(targetStatus: TicketStatus): void {
    if (this.activeDropStatus() === targetStatus) {
      this.activeDropStatus.set(null);
    }
  }

  onDrop(event: DragEvent, targetStatus: TicketStatus): void {
    event.preventDefault();

    const draggedTicket = this.resolveDraggedTicket(event);
    this.activeDropStatus.set(null);

    if (!draggedTicket) {
      this.draggedTicketId.set(null);
      return;
    }

    if (draggedTicket.status === targetStatus) {
      this.draggedTicketId.set(null);
      return;
    }

    if (!this.canTransition(draggedTicket.status, targetStatus)) {
      this.error.set('Movimento invalido para o fluxo atual do chamado.');
      this.draggedTicketId.set(null);
      return;
    }

    this.updateStatus(draggedTicket, targetStatus);
    this.draggedTicketId.set(null);
  }

  isUpdatingTicket(ticketId: number): boolean {
    return this.updatingTicketIds().has(ticketId);
  }

  canDragTicket(ticket: Ticket): boolean {
    return this.canMoveFromStatus(ticket.status) && !this.isUpdatingTicket(ticket.id);
  }

  isDraggingTicket(ticketId: number): boolean {
    return this.draggedTicketId() === ticketId;
  }

  isDropTarget(status: TicketStatus): boolean {
    return this.activeDropStatus() === status && this.canDropOnStatus(status);
  }

  ticketsByStatus(status: TicketStatus): Ticket[] {
    switch (status) {
      case TicketStatus.OPEN:
        return this.openTickets();
      case TicketStatus.IN_PROGRESS:
        return this.inProgressTickets();
      case TicketStatus.DONE:
        return this.doneTickets();
      case TicketStatus.CANCELLED:
        return this.cancelledTickets();
      default:
        return [];
    }
  }

  statusPanelClass(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.OPEN:
        return 'border-slate-200 bg-white';
      case TicketStatus.IN_PROGRESS:
        return 'border-sky-100 bg-sky-50/30';
      case TicketStatus.DONE:
        return 'border-emerald-100 bg-emerald-50/30';
      case TicketStatus.CANCELLED:
        return 'border-rose-100 bg-rose-50/30';
      default:
        return 'border-slate-200 bg-white';
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

  openTicketDetails(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
  }

  closeTicketDetails(): void {
    this.selectedTicket.set(null);
  }

  private setTicketUpdating(ticketId: number, updating: boolean): void {
    this.updatingTicketIds.update((current) => {
      const next = new Set(current);
      if (updating) {
        next.add(ticketId);
      } else {
        next.delete(ticketId);
      }
      return next;
    });
  }

  private resolveDraggedTicket(event: DragEvent): Ticket | null {
    let ticketId = this.draggedTicketId();
    if (ticketId === null) {
      const rawId = event.dataTransfer?.getData('text/plain') ?? '';
      const parsedId = Number(rawId);
      ticketId = Number.isFinite(parsedId) ? parsedId : null;
    }

    if (ticketId === null) {
      return null;
    }

    return this.tickets().find((ticket) => ticket.id === ticketId) ?? null;
  }

  private getDraggedTicket(): Ticket | null {
    const ticketId = this.draggedTicketId();
    if (ticketId === null) {
      return null;
    }

    return this.tickets().find((ticket) => ticket.id === ticketId) ?? null;
  }

  private canDropOnStatus(targetStatus: TicketStatus): boolean {
    const draggedTicket = this.getDraggedTicket();
    if (!draggedTicket || this.isUpdatingTicket(draggedTicket.id)) {
      return false;
    }

    return this.canTransition(draggedTicket.status, targetStatus);
  }

  private canMoveFromStatus(status: TicketStatus): boolean {
    return (
      status === TicketStatus.OPEN ||
      status === TicketStatus.IN_PROGRESS ||
      status === TicketStatus.DONE ||
      status === TicketStatus.CANCELLED
    );
  }

  private canTransition(currentStatus: TicketStatus, targetStatus: TicketStatus): boolean {
    return currentStatus !== targetStatus;
  }

  private bindDataStreams(): void {
    this.searchTermChanges$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadTickets());

    this.loadTicketsTrigger$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.ticketService
            .getTickets({
              q: this.searchTerm().trim() || undefined,
              period: this.periodFilter() ?? undefined,
            })
            .pipe(
              tap((tickets) => {
                this.tickets.set(tickets);
                this.lastUpdatedAt.set(new Date());
              }),
              catchError(() => {
                this.error.set(
                  'Nao foi possivel carregar os chamados. Verifique se a API esta online.',
                );
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
