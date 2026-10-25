import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, of, shareReplay, startWith, switchMap } from 'rxjs';
import { Servicio } from './servicio.model';
import { ServiciosService } from './servicios.service';

type EstadoServicios =
  | { tipo: 'cargando' }
  | { tipo: 'vacio' }
  | { tipo: 'error' }
  | { tipo: 'listo'; servicios: Servicio[] };

@Component({
  selector: 'app-servicios',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './servicios.html',
  styleUrl: './servicios.scss',
})
export class Servicios {
  private readonly reintentos = new Subject<void>();
  private readonly formatoPrecio = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  protected readonly estado$: Observable<EstadoServicios> = this.reintentos.pipe(
    startWith(undefined),
    switchMap(() =>
      this.serviciosService.obtenerServicios().pipe(
        map((servicios): EstadoServicios =>
          servicios.length > 0 ? { tipo: 'listo', servicios } : { tipo: 'vacio' },
        ),
        catchError(() => of<EstadoServicios>({ tipo: 'error' })),
        startWith<EstadoServicios>({ tipo: 'cargando' }),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor(private readonly serviciosService: ServiciosService) {}

  protected formatearPrecio(precio: number): string {
    return this.formatoPrecio.format(precio);
  }

  protected reintentar(): void {
    this.reintentos.next();
  }
}
