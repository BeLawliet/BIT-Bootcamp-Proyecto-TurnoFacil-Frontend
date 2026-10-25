import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/auth.service';

function obtenerRutaProtegida(url: string): string | null {
  try {
    const baseUrl = new URL(environment.apiBaseUrl);
    const requestUrl = new URL(url, baseUrl.origin);
    const prefijoApi = baseUrl.pathname.replace(/\/$/, '');

    if (
      requestUrl.origin !== baseUrl.origin ||
      !requestUrl.pathname.startsWith(`${prefijoApi}/`)
    ) {
      return null;
    }

    const rutaApi = requestUrl.pathname.slice(prefijoApi.length + 1);
    if (rutaApi === 'auth/me') {
      return rutaApi;
    }

    if (
      rutaApi === 'citas' ||
      (rutaApi.startsWith('citas/') && rutaApi !== 'citas/disponibilidad')
    ) {
      return rutaApi;
    }

    return null;
  } catch {
    return null;
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const rutaProtegida = obtenerRutaProtegida(request.url);
  const esCitaProtegida = rutaProtegida === 'citas' || rutaProtegida?.startsWith('citas/') === true;
  const token = authService.tokenAcceso();
  const requestAutenticada = token && rutaProtegida
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(requestAutenticada).pipe(
    catchError((error: unknown) => {
      if (
        esCitaProtegida &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        authService.cerrarSesion();
        const returnUrl = router.url.startsWith('/login') ? '/' : router.url;
        void router.navigate(['/login'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};
