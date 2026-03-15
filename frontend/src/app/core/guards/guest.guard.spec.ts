import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserRole } from '../../domain/models/auth.model';
import { AuthService } from '../services/auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  const authServiceMock = {
    session: vi.fn(),
  };
  const routerMock = {
    parseUrl: vi.fn((url: string) => ({ redirectTo: url })),
  };

  beforeEach(() => {
    authServiceMock.session.mockReset();
    routerMock.parseUrl.mockClear();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow guest access when there is no session', () => {
    authServiceMock.session.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect support user to board', () => {
    authServiceMock.session.mockReturnValue({
      accessToken: 'token',
      user: {
        id: 2,
        name: 'Caio Suporte',
        email: 'suporte@service-desk.local',
        role: UserRole.SUPPORT,
      },
    });

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/board');
    expect(result).toEqual({ redirectTo: '/board' });
  });

  it('should redirect collaborator user to my tickets', () => {
    authServiceMock.session.mockReturnValue({
      accessToken: 'token',
      user: {
        id: 1,
        name: 'Ana Colaboradora',
        email: 'colaborador@service-desk.local',
        role: UserRole.COLLABORATOR,
      },
    });

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/my-tickets');
    expect(result).toEqual({ redirectTo: '/my-tickets' });
  });
});
