import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserRole } from '../../domain/models/auth.model';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
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

  it('should allow navigation when route does not require roles', () => {
    authServiceMock.session.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: {} } as never, {} as never),
    );

    expect(result).toBe(true);
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect to login when route has required roles and user is not authenticated', () => {
    authServiceMock.session.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: [UserRole.SUPPORT] } } as never, {} as never),
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
    expect(result).toEqual({ redirectTo: '/login' });
  });

  it('should allow navigation when user has one of required roles', () => {
    authServiceMock.session.mockReturnValue({
      accessToken: 'token',
      user: {
        id: 2,
        name: 'Caio Suporte',
        email: 'suporte@service-desk.local',
        role: UserRole.SUPPORT,
      },
    });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: [UserRole.SUPPORT] } } as never, {} as never),
    );

    expect(result).toBe(true);
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect collaborator to my tickets when role is not allowed', () => {
    authServiceMock.session.mockReturnValue({
      accessToken: 'token',
      user: {
        id: 1,
        name: 'Ana Colaboradora',
        email: 'colaborador@service-desk.local',
        role: UserRole.COLLABORATOR,
      },
    });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: [UserRole.SUPPORT] } } as never, {} as never),
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/my-tickets');
    expect(result).toEqual({ redirectTo: '/my-tickets' });
  });

  it('should redirect support to board when role is not allowed', () => {
    authServiceMock.session.mockReturnValue({
      accessToken: 'token',
      user: {
        id: 2,
        name: 'Caio Suporte',
        email: 'suporte@service-desk.local',
        role: UserRole.SUPPORT,
      },
    });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: [UserRole.COLLABORATOR] } } as never, {} as never),
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/board');
    expect(result).toEqual({ redirectTo: '/board' });
  });
});
