import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { TicketService } from '../../core/services/ticket.service';
import { Ticket, TicketCategory, TicketStatus } from '../../domain/models/ticket.model';
import { MyTicketsComponent } from './my-tickets.component';

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  title: 'Solicitacao',
  description: 'Descricao',
  category: TicketCategory.TI,
  status: TicketStatus.OPEN,
  userId: 10,
  createdAt: '2026-03-13T10:00:00.000Z',
  updatedAt: '2026-03-13T10:00:00.000Z',
  ...overrides,
});

describe('MyTicketsComponent', () => {
  let fixture: ComponentFixture<MyTicketsComponent>;
  let component: MyTicketsComponent;

  const ticketServiceMock = {
    getMyTickets: vi.fn(),
  };

  const ticketsFixture: Ticket[] = [
    makeTicket({ id: 1, title: 'VPN sem acesso', status: TicketStatus.OPEN }),
    makeTicket({ id: 2, title: 'Atualizar cadastro', status: TicketStatus.DONE }),
  ];

  beforeEach(async () => {
    ticketServiceMock.getMyTickets.mockReset();
    ticketServiceMock.getMyTickets.mockReturnValue(of(ticketsFixture));

    await TestBed.configureTestingModule({
      imports: [MyTicketsComponent],
      providers: [{ provide: TicketService, useValue: ticketServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(MyTicketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should load tickets on init', () => {
    expect(ticketServiceMock.getMyTickets).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.tickets()).toHaveLength(2);
  });

  it('should apply status filter without reloading from API', () => {
    component.setStatusFilter(TicketStatus.DONE);
    expect(component.filteredTickets()).toHaveLength(1);
    expect(component.filteredTickets()[0]?.status).toBe(TicketStatus.DONE);
    expect(ticketServiceMock.getMyTickets).toHaveBeenCalledTimes(1);
  });

  it('should reload list when changing period filter', () => {
    component.setPeriodFilter('7d');

    expect(ticketServiceMock.getMyTickets).toHaveBeenCalledTimes(2);
    expect(ticketServiceMock.getMyTickets).toHaveBeenLastCalledWith({ period: '7d', q: undefined });
  });

  it('should debounce search before reloading', fakeAsync(() => {
    component.setSearchTerm('vpn');
    tick(299);
    expect(ticketServiceMock.getMyTickets).toHaveBeenCalledTimes(1);

    tick(1);
    expect(ticketServiceMock.getMyTickets).toHaveBeenCalledTimes(2);
    expect(ticketServiceMock.getMyTickets).toHaveBeenLastCalledWith({ q: 'vpn', period: undefined });
  }));
});
