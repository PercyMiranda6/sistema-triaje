import { Routes } from '@angular/router';
import { authGuard, publicGuard, rolesGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
    canActivate: [publicGuard()],
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent),
    canActivate: [publicGuard(true)],
  },
  {
    path: 'nuevo-ticket',
    loadComponent: () => import('./pages/tickets/ticket-form').then((m) => m.TicketFormComponent),
    canActivate: [authGuard],
  },
  {
    path: 'bandeja',
    loadComponent: () => import('./pages/tickets/ticket-list').then((m) => m.TicketListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'tickets/:id',
    loadComponent: () => import('./pages/tickets/ticket-detail').then((m) => m.TicketDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard, rolesGuard('analista', 'administrador')],
  },
  {
    path: 'analistas',
    loadComponent: () => import('./pages/analistas/analistas').then((m) => m.AnalistasComponent),
    canActivate: [authGuard, rolesGuard('administrador')],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];