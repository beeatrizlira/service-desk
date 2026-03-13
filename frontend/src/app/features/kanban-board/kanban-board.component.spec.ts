import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TicketService } from '../../core/services/ticket.service';
import { Ticket, TicketCategory, TicketStatus } from '../../domain/models/ticket.model';
import { KanbanBoardComponent } from './kanban-board.component';

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  title: 'Chamado',
  description: 'Descricao',
  category: TicketCategory.TI,
  status: TicketStatus.OPEN,
  userId: null,
  createdAt: '2026-03-13T10:00:00.000Z',
  updatedAt: '2026-03-13T10:00:00.000Z',
  ...overrides,
});

describe('KanbanBoardComponent', () => {
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let component: KanbanBoardComponent;

  const ticketServiceMock = {
    getTickets: vi.fn(),
    updateStatus: vi.fn(),
  };

  const ticketsFixture = [
    makeTicket({
      id: 1,
      title: 'Erro no ERP',
      category: TicketCategory.TI,
      status: TicketStatus.OPEN,
    }),
    makeTicket({
      id: 2,
      title: 'Folha de pagamento',
      category: TicketCategory.FINANCIAL,
      status: TicketStatus.IN_PROGRESS,
    }),
    makeTicket({
      id: 3,
      title: 'Admissao pendente',
      category: TicketCategory.RH,
      status: TicketStatus.DONE,
    }),
    makeTicket({
      id: 4,
      title: 'Upgrade de rede',
      category: TicketCategory.INFRASTRUCTURE,
      status: TicketStatus.CANCELLED,
    }),
  ];

  beforeEach(async () => {
    ticketServiceMock.getTickets.mockReset();
    ticketServiceMock.updateStatus.mockReset();
    ticketServiceMock.getTickets.mockReturnValue(of(ticketsFixture));

    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent],
      providers: [{ provide: TicketService, useValue: ticketServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should load tickets and split them by status', () => {
    expect(ticketServiceMock.getTickets).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.openTickets()).toHaveLength(1);
    expect(component.inProgressTickets()).toHaveLength(1);
    expect(component.doneTickets()).toHaveLength(1);
    expect(component.cancelledTickets()).toHaveLength(1);
  });

  it('should apply category and status filters', () => {
    component.setCategoryFilter(TicketCategory.TI);
    expect(component.filteredTickets()).toHaveLength(1);
    expect(component.filteredTickets()[0]?.category).toBe(TicketCategory.TI);

    component.setCategoryFilter('');
    component.setStatusFilter(TicketStatus.DONE);
    expect(component.filteredTickets()).toHaveLength(1);
    expect(component.filteredTickets()[0]?.status).toBe(TicketStatus.DONE);

    component.clearFilters();
    expect(component.filteredTickets()).toHaveLength(ticketsFixture.length);
  });

  it('should update card status and reflect result on board', () => {
    const updated = makeTicket({
      id: 1,
      title: 'Erro no ERP',
      category: TicketCategory.TI,
      status: TicketStatus.DONE,
    });
    ticketServiceMock.updateStatus.mockReturnValue(of(updated));

    component.updateStatus(ticketsFixture[0]!, TicketStatus.DONE);
    fixture.detectChanges();

    expect(ticketServiceMock.updateStatus).toHaveBeenCalledWith(1, TicketStatus.DONE);
    expect(component.doneTickets().some((ticket) => ticket.id === 1)).toBe(true);
    expect(component.openTickets().some((ticket) => ticket.id === 1)).toBe(false);
  });
});
