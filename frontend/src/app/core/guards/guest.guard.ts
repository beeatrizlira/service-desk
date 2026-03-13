import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../domain/models/auth.model';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const session = authService.session();
  if (!session) {
    return true;
  }

  if (session.user.role === UserRole.SUPPORT) {
    return router.parseUrl('/board');
  }

  return router.parseUrl('/tickets/new');
};
