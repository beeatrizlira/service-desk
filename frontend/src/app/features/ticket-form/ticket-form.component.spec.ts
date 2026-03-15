import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TicketService } from '../../core/services/ticket.service';
import { TicketCategory, TicketStatus, type Ticket } from '../../domain/models/ticket.model';
import { TicketFormComponent } from './ticket-form.component';

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  title: 'Problema no sistema',
  description: 'Não consigo acessar o ERP',
  category: TicketCategory.TI,
  status: TicketStatus.OPEN,
  userId: null,
  createdAt: '2026-03-13T10:00:00.000Z',
  updatedAt: '2026-03-13T10:00:00.000Z',
  ...overrides,
});

describe('TicketFormComponent', () => {
  let fixture: ComponentFixture<TicketFormComponent>;
  let component: TicketFormComponent;

  const ticketServiceMock = {
    createTicket: vi.fn(),
  };

  beforeEach(async () => {
    ticketServiceMock.createTicket.mockReset();

    await TestBed.configureTestingModule({
      imports: [TicketFormComponent],
      providers: [{ provide: TicketService, useValue: ticketServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should block submit and mark fields as touched when form is invalid', () => {
    component.onSubmit();
    fixture.detectChanges();

    expect(ticketServiceMock.createTicket).not.toHaveBeenCalled();
    expect(component.form.invalid).toBe(true);
    expect(component.form.get('title')?.touched).toBe(true);
    expect(component.form.get('category')?.touched).toBe(true);
    expect(component.form.get('description')?.touched).toBe(true);
  });

  it('should submit, reset form and show success toast on success', () => {
    const created = makeTicket();
    ticketServiceMock.createTicket.mockReturnValue(of(created));

    component.form.setValue({
      title: 'Falha no login',
      category: TicketCategory.TI,
      description: 'Usuario sem acesso ao sistema interno',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(ticketServiceMock.createTicket).toHaveBeenCalledWith({
      title: 'Falha no login',
      category: TicketCategory.TI,
      description: 'Usuario sem acesso ao sistema interno',
    });
    expect(component.loading()).toBe(false);
    expect(component.showSuccessToast()).toBe(true);
    expect(component.showErrorToast()).toBe(false);
    expect(component.form.getRawValue()).toEqual({
      title: '',
      category: '',
      description: '',
    });
  });

  it('should show error toast and restore button state when API is offline', () => {
    ticketServiceMock.createTicket.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    component.form.setValue({
      title: 'Falha no login',
      category: TicketCategory.TI,
      description: 'Usuario sem acesso ao sistema interno',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.showSuccessToast()).toBe(false);
    expect(component.showErrorToast()).toBe(true);
    expect(component.errorMessage()).toContain('conectar ao servidor');
  });
});
