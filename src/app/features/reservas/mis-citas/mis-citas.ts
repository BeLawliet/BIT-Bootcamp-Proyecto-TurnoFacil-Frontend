import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  finalize,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { Cita, EstadoCita } from '../cita.model';
import { CitasService } from '../citas.service';

type FiltroCitas = 'todas' | EstadoCita;
type EstadoConsulta = 'cargando' | 'listo' | 'error';

type ResultadoConsulta =
  | { tipo: 'listo'; citas: Cita[] }
  | { tipo: 'error' };

interface AvisoCancelacion {
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

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
  protected readonly confirmacionId = signal<string | null>(null);
  protected readonly cancelandoId = signal<string | null>(null);
  protected readonly avisoCancelacion = signal<AvisoCancelacion | null>(null);
  protected readonly requiereActualizar = signal(false);

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

        if (this.requiereActualizar()) {
          const citaSeleccionada = resultado.citas.find(
            (cita) => cita.id === this.confirmacionId(),
          );
          if (!citaSeleccionada || citaSeleccionada.estado !== 'activa') {
            this.confirmacionId.set(null);
          }
          this.requiereActualizar.set(false);
          this.avisoCancelacion.set({
            tipo: 'info',
            mensaje: 'Tus citas se actualizaron. Revisa su estado antes de continuar.',
          });
        }
      });
  }

  protected seleccionarFiltro(filtro: FiltroCitas): void {
    this.filtro.set(filtro);
  }

  protected reintentar(): void {
    if (this.estado() === 'cargando' || this.cancelandoId() !== null) {
      return;
    }
    this.recargar$.next();
  }

  protected abrirConfirmacion(cita: Cita): void {
    if (
      cita.estado !== 'activa' ||
      this.cancelandoId() !== null ||
      this.requiereActualizar()
    ) {
      return;
    }

    this.avisoCancelacion.set(null);
    this.confirmacionId.set(cita.id);
  }

  protected conservarReserva(): void {
    if (this.cancelandoId() === null) {
      this.confirmacionId.set(null);
    }
  }

  protected confirmarCancelacion(id: string): void {
    const cita = this.citas().find((item) => item.id === id);
    if (
      !cita ||
      cita.estado !== 'activa' ||
      this.confirmacionId() !== id ||
      this.cancelandoId() !== null ||
      this.requiereActualizar()
    ) {
      return;
    }

    this.avisoCancelacion.set(null);
    this.cancelandoId.set(id);
    this.citasService
      .cancelarReserva(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cancelandoId.set(null)),
      )
      .subscribe({
        next: ({ data }) => {
          if (data.id !== id || data.estado !== 'cancelada') {
            this.requiereActualizar.set(true);
            this.avisoCancelacion.set({
              tipo: 'error',
              mensaje: 'No pudimos verificar el resultado. Actualiza tus citas antes de continuar.',
            });
            return;
          }

          this.citas.update((citas) =>
            citas.map((item) =>
              item.id === data.id ? { ...item, estado: data.estado } : item,
            ),
          );
          this.confirmacionId.set(null);
          this.avisoCancelacion.set({
            tipo: 'exito',
            mensaje: 'La reserva se canceló correctamente.',
          });
        },
        error: (error: unknown) => this.manejarErrorCancelacion(error),
      });
  }

  protected actualizarAntesDeReintentar(): void {
    if (this.estado() === 'cargando' || this.cancelandoId() !== null) {
      return;
    }
    this.recargar$.next();
  }

  private manejarErrorCancelacion(error: unknown): void {
    const estadoHttp = error instanceof HttpErrorResponse ? error.status : 0;

    switch (estadoHttp) {
      case 400:
        this.requiereActualizar.set(true);
        this.avisoCancelacion.set({
          tipo: 'error',
          mensaje: 'No fue posible identificar la reserva. Actualiza tus citas antes de volver a intentarlo.',
        });
        break;
      case 401:
        this.confirmacionId.set(null);
        this.avisoCancelacion.set({
          tipo: 'error',
          mensaje: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
        });
        break;
      case 404:
        this.confirmacionId.set(null);
        this.avisoCancelacion.set({
          tipo: 'error',
          mensaje: 'La reserva ya no está disponible o no pudo encontrarse.',
        });
        this.recargar$.next();
        break;
      case 409:
        this.confirmacionId.set(null);
        this.avisoCancelacion.set({
          tipo: 'info',
          mensaje: 'Esta reserva ya fue cancelada. Actualizamos tus citas.',
        });
        this.recargar$.next();
        break;
      default:
        if (estadoHttp === 0 || estadoHttp >= 500) {
          this.requiereActualizar.set(true);
          this.avisoCancelacion.set({
            tipo: 'error',
            mensaje: 'No pudimos confirmar el resultado. Actualiza tus citas antes de intentar otra vez.',
          });
          return;
        }

        this.avisoCancelacion.set({
          tipo: 'error',
          mensaje: 'No fue posible cancelar la reserva. Inténtalo nuevamente.',
        });
    }
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
