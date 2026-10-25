import { Routes } from '@angular/router';

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
    path: '**',
    title: 'Página no encontrada | TurnoFácil',
    loadComponent: () => import('./features/no-encontrado/no-encontrado').then((module) => module.NoEncontrado),
  },
];
