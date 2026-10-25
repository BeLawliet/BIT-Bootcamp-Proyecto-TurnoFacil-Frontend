import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { Servicio } from './servicio.model';

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private readonly http = inject(HttpClient);

  obtenerServicios(): Observable<Servicio[]> {
    return this.http
      .get<ApiResponse<Servicio[]>>(`${environment.apiBaseUrl}/servicios`)
      .pipe(map((respuesta) => respuesta.data));
  }
}
