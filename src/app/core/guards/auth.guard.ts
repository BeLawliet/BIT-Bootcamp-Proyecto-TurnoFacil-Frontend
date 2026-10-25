import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';

export const authGuard: CanActivateFn = (_route, routerState) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const decidir = () =>
    authService.estaAutenticado()
      ? true
      : router.createUrlTree(['/login'], {
          queryParams: { returnUrl: routerState.url },
        });

  if (authService.comprobacionInicialTerminada()) {
    return decidir();
  }

  return toObservable(authService.comprobacionInicialTerminada).pipe(
    filter(Boolean),
    take(1),
    map(decidir),
  );
};
