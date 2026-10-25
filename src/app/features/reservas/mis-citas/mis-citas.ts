import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, of, startWith, switchMap, tap } from 'rxjs';
import { Cita, EstadoCita } from '../cita.model';
import { CitasService } from '../citas.service';

type FiltroCitas = 'todas' | EstadoCita;
type EstadoConsulta = 'cargando' | 'listo' | 'error';

type ResultadoConsulta =
  | { tipo: 'listo'; citas: Cita[] }
  | { tipo: 'error' };

@Component({
  selector: 'app-mis-citas',
  imports: [RouterLink],
  templateUrl: './mis-citas.html',
  styleUrl: './mis-citas.scss',
})
export class MisCitas {
  private readonly citasService = inject(CitasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recargar$ = new Subject<void>();
  private readonly formatoPrecio = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  protected readonly estado = signal<EstadoConsulta>('cargando');
  protected readonly citas = signal<Cita[]>([]);
  protected readonly filtro = signal<FiltroCitas>('todas');

  protected readonly citasFiltradas = computed(() => {
    const filtroSeleccionado = this.filtro();
    const citas = this.citas();
    return filtroSeleccionado === 'todas'
      ? citas
      : citas.filter((cita) => cita.estado === filtroSeleccionado);
  });

  protected readonly totalActivas = computed(
    () => this.citas().filter((cita) => cita.estado === 'activa').length,
  );
  protected readonly totalCanceladas = computed(
    () => this.citas().filter((cita) => cita.estado === 'cancelada').length,
  );
  protected readonly mensajeFiltroVacio = computed(() =>
    this.filtro() === 'activa'
      ? 'No tienes citas activas.'
      : 'No tienes citas canceladas.',
  );

  ngOnInit(): void {
    this.recargar$
      .pipe(
        startWith(undefined),
        tap(() => this.estado.set('cargando')),
        switchMap((): Observable<ResultadoConsulta> =>
          this.citasService.consultarMisCitas().pipe(
            map((citas): ResultadoConsulta => ({ tipo: 'listo', citas })),
            catchError(() => of<ResultadoConsulta>({ tipo: 'error' })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (resultado.tipo === 'error') {
          this.estado.set('error');
          return;
        }

        this.citas.set(resultado.citas);
        this.estado.set('listo');
      });
  }

  protected seleccionarFiltro(filtro: FiltroCitas): void {
    this.filtro.set(filtro);
  }

  protected reintentar(): void {
    this.recargar$.next();
  }

  protected formatearFecha(fecha: string): string {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (!coincidencia) {
      return fecha;
    }

    const [, anio, mes, dia] = coincidencia;
    const fechaUtc = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia), 12));
    if (
      fechaUtc.getUTCFullYear() !== Number(anio) ||
      fechaUtc.getUTCMonth() !== Number(mes) - 1 ||
      fechaUtc.getUTCDate() !== Number(dia)
    ) {
      return fecha;
    }
    const fechaFormateada = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(fechaUtc);

    return fechaFormateada.charAt(0).toLocaleUpperCase('es-CO') + fechaFormateada.slice(1);
  }

  protected formatearHora(hora: string): string {
    const coincidencia = /^(\d{2}):(\d{2})$/.exec(hora);
    if (!coincidencia) {
      return hora;
    }

    const horas = Number(coincidencia[1]);
    const minutos = Number(coincidencia[2]);
    if (horas > 23 || minutos > 59) {
      return hora;
    }

    const horaDoce = horas % 12 || 12;
    const periodo = horas < 12 ? 'a. m.' : 'p. m.';
    return `${horaDoce}:${coincidencia[2]} ${periodo}`;
  }

  protected formatearPrecio(precio: number): string {
    return this.formatoPrecio.format(precio);
  }
}
