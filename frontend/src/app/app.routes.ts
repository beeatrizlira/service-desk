import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './domain/models/auth.model';

export const routes: Routes = [
  { path: '', redirectTo: 'board', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'board',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.SUPPORT] },
    loadComponent: () =>
      import('./features/kanban-board/kanban-board.component').then((m) => m.KanbanBoardComponent),
  },
  {
    path: 'my-tickets',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.COLLABORATOR] },
    loadComponent: () =>
      import('./features/my-tickets/my-tickets.component').then((m) => m.MyTicketsComponent),
  },
  {
    path: 'tickets/new',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.COLLABORATOR] },
    loadComponent: () =>
      import('./features/ticket-form/ticket-form.component').then((m) => m.TicketFormComponent),
  },
  { path: '**', redirectTo: 'board' },
];
