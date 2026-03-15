import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { UserRole } from '../../domain/models/auth.model';
import { AuthService } from '../services/auth.service';
import { authErrorInterceptor } from './auth-error.interceptor';

describe('authErrorInterceptor', () => {
  const request = new HttpRequest('GET', '/api/tickets');
  const routerMock = {
    navigateByUrl: vi.fn().mockResolvedValue(true),
  };

  let sessionRole: UserRole | null;
  const authServiceMock = {
    session: vi.fn(() =>
      sessionRole
        ? {
            accessToken: 'token',
            user: {
              id: 1,
              name: 'Usuario',
              email: 'user@test.com',
              role: sessionRole,
            },
          }
        : null,
    ),
    logout: vi.fn(),
  };

  beforeEach(() => {
    sessionRole = UserRole.SUPPORT;
    routerMock.navigateByUrl.mockClear();
    authServiceMock.logout.mockClear();

    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  it('should logout and redirect to login on 401 when session exists', async () => {
    const next: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    await expect(
      TestBed.runInInjectionContext(() => firstValueFrom(authErrorInterceptor(request, next))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('should redirect support user to board on 403', async () => {
    sessionRole = UserRole.SUPPORT;
    const next: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));

    await expect(
      TestBed.runInInjectionContext(() => firstValueFrom(authErrorInterceptor(request, next))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/board');
  });

  it('should redirect collaborator user to my tickets on 403', async () => {
    sessionRole = UserRole.COLLABORATOR;
    const next: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));

    await expect(
      TestBed.runInInjectionContext(() => firstValueFrom(authErrorInterceptor(request, next))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/my-tickets');
  });

  it('should ignore redirect/logout when there is no active session', async () => {
    sessionRole = null;
    const next: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    await expect(
      TestBed.runInInjectionContext(() => firstValueFrom(authErrorInterceptor(request, next))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should pass through successful responses', async () => {
    const next: HttpHandlerFn = () => of(new HttpResponse({ status: 200 }));

    const response = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authErrorInterceptor(request, next)),
    );

    expect(response).toBeInstanceOf(HttpResponse);
    expect((response as HttpResponse<unknown>).status).toBe(200);
    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });
});
