import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Inicio | TurnoFácil',
    loadComponent: () => import('./features/inicio/inicio').then((module) => module.Inicio),
  },
  {
    path: 'servicios',
    title: 'Servicios | TurnoFácil',
    loadComponent: () => import('./features/servicios/servicios').then((module) => module.Servicios),
  },
  {
    path: 'login',
    title: 'Iniciar sesión | TurnoFácil',
    loadComponent: () => import('./features/auth/login/login').then((module) => module.Login),
  },
  {
    path: 'registro',
    title: 'Registro | TurnoFácil',
    loadComponent: () => import('./features/auth/registro/registro').then((module) => module.Registro),
  },
  {
    path: 'reservar',
    title: 'Reservar cita | TurnoFácil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservas/reservar/reservar').then((module) => module.Reservar),
  },
  {
    path: 'mis-citas',
    title: 'Mis citas | TurnoFácil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservas/mis-citas/mis-citas').then((module) => module.MisCitas),
  },
  {
    path: '**',
    title: 'Página no encontrada | TurnoFácil',
    loadComponent: () => import('./features/no-encontrado/no-encontrado').then((module) => module.NoEncontrado),
  },
];
