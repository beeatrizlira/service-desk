import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'board', pathMatch: 'full' },
  {
    path: 'board',
    loadComponent: () =>
      import('./features/kanban-board/kanban-board.component').then(
        (m) => m.KanbanBoardComponent,
      ),
  },
  {
    path: 'tickets/new',
    loadComponent: () =>
      import('./features/ticket-form/ticket-form.component').then(
        (m) => m.TicketFormComponent,
      ),
  },
];
