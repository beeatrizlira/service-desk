import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const authServiceMock = {
    isAuthenticated: vi.fn(),
  };
  const routerMock = {
    parseUrl: vi.fn((url: string) => ({ redirectTo: url })),
  };

  beforeEach(() => {
    authServiceMock.isAuthenticated.mockReset();
    routerMock.parseUrl.mockClear();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow navigation when user is authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
    expect(result).toEqual({ redirectTo: '/login' });
  });
});
