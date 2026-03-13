import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../domain/models/auth.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = (route.data?.['roles'] as UserRole[] | undefined) ?? [];
  if (requiredRoles.length === 0) {
    return true;
  }

  const session = authService.session();
  if (!session) {
    return router.parseUrl('/login');
  }

  if (requiredRoles.includes(session.user.role)) {
    return true;
  }

  if (session.user.role === UserRole.SUPPORT) {
    return router.parseUrl('/board');
  }

  return router.parseUrl('/my-tickets');
};
