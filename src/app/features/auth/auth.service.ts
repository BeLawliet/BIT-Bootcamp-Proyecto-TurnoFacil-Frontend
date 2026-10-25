import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { LoginRequest, LoginResponse } from './auth.model';
import { RegistroRequest, Usuario } from './registro/registro.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesionActual = signal<LoginResponse | null>(null);
  private readonly tokenActual = signal<string | null>(null);
  private readonly comprobacionTerminada = signal(false);
  private readonly restaurando = signal(false);
  readonly sesion = this.sesionActual.asReadonly();
  readonly tokenAcceso = this.tokenActual.asReadonly();
  readonly comprobacionInicialTerminada = this.comprobacionTerminada.asReadonly();
  readonly estaAutenticado = computed(
    () => this.comprobacionTerminada() && !this.restaurando() && this.sesionActual() !== null,
  );

  private readonly claveToken = 'turnofacil.auth.access-token';

  registrar(datos: RegistroRequest): Observable<ApiResponse<Usuario>> {
    return this.http.post<ApiResponse<Usuario>>(
      `${environment.apiBaseUrl}/auth/registro`,
      datos,
    );
  }

  iniciarSesion(datos: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiBaseUrl}/auth/login`, datos)
      .pipe(tap(({ data }) => this.establecerSesion(data)));
  }

  restaurarSesion(): Observable<void> {
    if (this.comprobacionTerminada() || this.restaurando()) {
      return of(undefined);
    }

    const token = this.leerToken();
    if (!token) {
      this.comprobacionTerminada.set(true);
      return of(undefined);
    }

    this.tokenActual.set(token);
    this.restaurando.set(true);

    return this.http.get<ApiResponse<Usuario>>(`${environment.apiBaseUrl}/auth/me`).pipe(
      timeout({ first: 5000 }),
      tap(({ data }) => {
        this.sesionActual.set({ token, tokenType: 'Bearer', expiresIn: '', usuario: data });
      }),
      map(() => undefined),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.eliminarToken();
          this.tokenActual.set(null);
        }
        return of(undefined);
      }),
      tap(() => {
        this.restaurando.set(false);
        this.comprobacionTerminada.set(true);
      }),
    );
  }

  cerrarSesion(): void {
    this.eliminarToken();
    this.sesionActual.set(null);
    this.tokenActual.set(null);
    this.restaurando.set(false);
    this.comprobacionTerminada.set(true);
  }

  private establecerSesion(sesion: LoginResponse): void {
    this.tokenActual.set(sesion.token);
    this.sesionActual.set(sesion);
    this.comprobacionTerminada.set(true);
    this.guardarToken(sesion.token);
  }

  private leerToken(): string | null {
    try {
      return sessionStorage.getItem(this.claveToken);
    } catch {
      return null;
    }
  }

  private guardarToken(token: string): void {
    try {
      sessionStorage.setItem(this.claveToken, token);
    } catch {
      // La sesión permanece activa en memoria si el almacenamiento no está disponible.
    }
  }

  private eliminarToken(): void {
    try {
      sessionStorage.removeItem(this.claveToken);
    } catch {
      // El estado en memoria se limpia aunque el almacenamiento no esté disponible.
    }
  }
}
