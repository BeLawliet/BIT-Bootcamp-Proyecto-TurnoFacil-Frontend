import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { Cita, CrearReservaRequest, Disponibilidad, ReservaCreada } from './cita.model';

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly http = inject(HttpClient);
  private readonly urlCitas = `${environment.apiBaseUrl}/citas`;

  consultarDisponibilidad(fecha: string): Observable<Disponibilidad> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http
      .get<ApiResponse<Disponibilidad>>(`${this.urlCitas}/disponibilidad`, { params })
      .pipe(map((respuesta) => respuesta.data));
  }

  crearReserva(datos: CrearReservaRequest): Observable<ApiResponse<ReservaCreada>> {
    return this.http.post<ApiResponse<ReservaCreada>>(this.urlCitas, datos);
  }

  consultarMisCitas(): Observable<Cita[]> {
    return this.http
      .get<ApiResponse<Cita[]>>(this.urlCitas)
      .pipe(map((respuesta) => respuesta.data));
  }
}
