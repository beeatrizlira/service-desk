import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { UserRole } from '../../domain/models/auth.model';
import { AuthService } from '../services/auth.service';

export const authErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const session = authService.session();
      if (!session) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        authService.logout();
        if (isPlatformBrowser(platformId)) {
          void router.navigateByUrl('/login');
        }
      }

      if (error.status === 403 && isPlatformBrowser(platformId)) {
        const fallbackRoute = session.user.role === UserRole.SUPPORT ? '/board' : '/my-tickets';
        void router.navigateByUrl(fallbackRoute);
      }

      return throwError(() => error);
    }),
  );
};

