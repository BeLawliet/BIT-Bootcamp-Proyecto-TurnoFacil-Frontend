import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { LoginRequest, LoginResponse } from './auth.model';
import { RegistroRequest, Usuario } from './registro/registro.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesionActual = signal<LoginResponse | null>(null);
  readonly sesion = this.sesionActual.asReadonly();

  registrar(datos: RegistroRequest): Observable<ApiResponse<Usuario>> {
    return this.http.post<ApiResponse<Usuario>>(
      `${environment.apiBaseUrl}/auth/registro`,
      datos,
    );
  }

  iniciarSesion(datos: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiBaseUrl}/auth/login`, datos)
      .pipe(tap(({ data }) => this.sesionActual.set(data)));
  }
}
