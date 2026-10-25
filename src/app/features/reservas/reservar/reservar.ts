import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, merge, of, startWith, switchMap, tap } from 'rxjs';
import { Servicio } from '../../servicios/servicio.model';
import { ServiciosService } from '../../servicios/servicios.service';
import { CrearReservaRequest, Disponibilidad, ReservaCreada } from '../cita.model';
import { CitasService } from '../citas.service';

type EstadoServicios =
  | { tipo: 'cargando' }
  | { tipo: 'vacio' }
  | { tipo: 'error' }
  | { tipo: 'listo' };

type EstadoDisponibilidad =
  | { tipo: 'esperando' }
  | { tipo: 'fecha-invalida' }
  | { tipo: 'consultando'; fecha: string }
  | { tipo: 'disponible'; fecha: string; horas: string[] }
  | { tipo: 'vacio'; fecha: string }
  | { tipo: 'error'; fecha: string };

function fechaActualEnBogota(): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const obtener = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function esFechaCalendarioValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fechaUtc.getUTCFullYear() === anio &&
    fechaUtc.getUTCMonth() === mes - 1 &&
    fechaUtc.getUTCDate() === dia
  );
}

function validarFechaReserva(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) {
    return null;
  }

  if (typeof valor !== 'string' || !esFechaCalendarioValida(valor)) {
    return { fechaInvalida: true };
  }

  return valor < fechaActualEnBogota() ? { fechaAnterior: true } : null;
}

function esDomingo(fecha: string): boolean {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() === 0;
}

function leerMensajeApi(error: unknown, respaldo: string): string {
  if (
    error instanceof HttpErrorResponse &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message;
  }

  return respaldo;
}

@Component({
  selector: 'app-reservar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reservar.html',
  styleUrl: './reservar.scss',
})
export class Reservar {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly serviciosService = inject(ServiciosService);
  private readonly citasService = inject(CitasService);
  private readonly recargarServicios$ = new Subject<void>();
  private readonly recargarDisponibilidad$ = new Subject<void>();
  private readonly servicioIdInicial = this.route.snapshot.queryParamMap.get('servicioId');
  private preseleccionAplicada = false;

  protected readonly fechaMinima = fechaActualEnBogota();
  protected readonly servicios = signal<Servicio[]>([]);
  protected readonly estadoServicios = signal<EstadoServicios>({ tipo: 'cargando' });
  protected readonly servicioSeleccionado = signal<Servicio | null>(null);
  protected readonly estadoDisponibilidad = signal<EstadoDisponibilidad>({ tipo: 'esperando' });
  protected readonly enviando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);
  protected readonly reservaCreada = signal<ReservaCreada | null>(null);

  private readonly formatoPrecio = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  protected readonly formulario = this.formBuilder.nonNullable.group({
    servicioId: this.formBuilder.nonNullable.control(
      { value: '', disabled: true },
      Validators.required,
    ),
    fecha: ['', [Validators.required, validarFechaReserva]],
    hora: this.formBuilder.nonNullable.control(
      { value: '', disabled: true },
      Validators.required,
    ),
    notas: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    this.cargarServicios();
    this.observarFecha();
  }

  protected formatearPrecio(precio: number): string {
    return this.formatoPrecio.format(precio);
  }

  protected campoFechaInvalido(): boolean {
    const control = this.formulario.controls.fecha;
    return control.invalid && control.touched;
  }

  protected actualizarServicioSeleccionado(): void {
    const servicio = this.servicios().find(
      (opcion) => opcion.id === this.formulario.controls.servicioId.value,
    );
    this.servicioSeleccionado.set(servicio ?? null);
    this.mensajeError.set(null);
  }

  protected seleccionarHora(hora: string): void {
    const estado = this.estadoDisponibilidad();
    if (estado.tipo !== 'disponible' || !estado.horas.includes(hora)) {
      return;
    }

    this.formulario.controls.hora.setValue(hora);
    this.mensajeError.set(null);
  }

  protected reintentarServicios(): void {
    this.recargarServicios$.next();
  }

  protected reintentarDisponibilidad(): void {
    this.recargarDisponibilidad$.next();
  }

  protected horasDisponibles(): string[] {
    const estado = this.estadoDisponibilidad();
    return estado.tipo === 'disponible' ? estado.horas : [];
  }

  protected sinHorariosEsDomingo(): boolean {
    const estado = this.estadoDisponibilidad();
    return estado.tipo === 'vacio' && esDomingo(estado.fecha);
  }

  protected precioSeleccionado(): string {
    const servicio = this.servicioSeleccionado();
    return servicio ? this.formatearPrecio(servicio.precio) : '—';
  }

  protected puedeConfirmar(): boolean {
    const estado = this.estadoDisponibilidad();
    const hora = this.formulario.controls.hora.value;

    return (
      !this.enviando() &&
      this.reservaCreada() === null &&
      this.formulario.valid &&
      this.servicioSeleccionado() !== null &&
      estado.tipo === 'disponible' &&
      estado.fecha === this.formulario.controls.fecha.value &&
      estado.horas.includes(hora)
    );
  }

  protected confirmarReserva(): void {
    this.formulario.controls.fecha.updateValueAndValidity({ emitEvent: false });
    if (!this.puedeConfirmar()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { servicioId, fecha, hora, notas } = this.formulario.getRawValue();
    const datos: CrearReservaRequest = {
      servicioId,
      fecha,
      hora,
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    };

    this.mensajeError.set(null);
    this.enviando.set(true);
    this.formulario.disable({ emitEvent: false });
    this.citasService
      .crearReserva(datos)
      .pipe(
        tap((respuesta) => {
          this.reservaCreada.set(respuesta.data);
          this.formulario.disable();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (error: unknown) => this.manejarErrorReserva(error),
        complete: () => this.enviando.set(false),
      });
  }

  protected limpiarMensajeError(): void {
    this.mensajeError.set(null);
  }

  private cargarServicios(): void {
    this.recargarServicios$
      .pipe(
        startWith(undefined),
        tap(() => {
          this.estadoServicios.set({ tipo: 'cargando' });
          this.formulario.controls.servicioId.disable();
        }),
        switchMap(() => this.serviciosService.obtenerServicios().pipe(
          map((servicios) => ({ tipo: 'respuesta' as const, servicios })),
          catchError(() => of({ tipo: 'error' as const })),
        )),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (resultado.tipo === 'error') {
          this.servicios.set([]);
          this.estadoServicios.set({ tipo: 'error' });
          this.servicioSeleccionado.set(null);
          return;
        }

        this.servicios.set(resultado.servicios);
        if (resultado.servicios.length === 0) {
          this.estadoServicios.set({ tipo: 'vacio' });
          this.servicioSeleccionado.set(null);
          return;
        }

        this.estadoServicios.set({ tipo: 'listo' });
        this.formulario.controls.servicioId.enable();

        if (!this.preseleccionAplicada) {
          this.preseleccionAplicada = true;
          if (this.servicioIdInicial && resultado.servicios.some((item) => item.id === this.servicioIdInicial)) {
            this.formulario.controls.servicioId.setValue(this.servicioIdInicial);
          }
        }
        this.actualizarServicioSeleccionado();
      });
  }

  private observarFecha(): void {
    const fechaInicial$ = this.formulario.controls.fecha.valueChanges.pipe(
      startWith(this.formulario.controls.fecha.value),
      map((fecha) => ({ fecha, limpiarMensaje: true })),
    );
    const fechaDeReintento$ = this.recargarDisponibilidad$.pipe(
      map(() => ({ fecha: this.formulario.controls.fecha.value, limpiarMensaje: false })),
    );

    merge(fechaInicial$, fechaDeReintento$)
      .pipe(
        tap(({ limpiarMensaje }) => {
          this.formulario.controls.hora.reset({ value: '', disabled: true }, { emitEvent: false });
          if (limpiarMensaje) {
            this.mensajeError.set(null);
          }
        }),
        switchMap(({ fecha }): Observable<EstadoDisponibilidad> => {
          if (!fecha) {
            return of({ tipo: 'esperando' });
          }

          this.formulario.controls.fecha.updateValueAndValidity({ emitEvent: false });
          if (this.formulario.controls.fecha.invalid) {
            return of({ tipo: 'fecha-invalida' });
          }

          this.estadoDisponibilidad.set({ tipo: 'consultando', fecha });
          return this.citasService.consultarDisponibilidad(fecha).pipe(
            map((disponibilidad: Disponibilidad): EstadoDisponibilidad =>
              disponibilidad.horasDisponibles.length > 0
                ? { tipo: 'disponible', fecha, horas: disponibilidad.horasDisponibles }
                : { tipo: 'vacio', fecha },
            ),
            catchError(() => of<EstadoDisponibilidad>({ tipo: 'error', fecha })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((estado) => {
        this.estadoDisponibilidad.set(estado);
        if (estado.tipo === 'disponible') {
          this.formulario.controls.hora.enable();
        } else {
          this.formulario.controls.hora.disable();
        }
      });
  }

  private manejarErrorReserva(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.mensajeError.set('No pudimos crear la reserva. Inténtalo nuevamente.');
      this.enviando.set(false);
      this.restaurarFormularioTrasError();
      return;
    }

    switch (error.status) {
      case 400:
        this.mensajeError.set(
          leerMensajeApi(error, 'La fecha o el horario ya no son válidos. Revisa tu selección.'),
        );
        break;
      case 401:
        this.mensajeError.set('Tu sesión no es válida. Inicia sesión nuevamente.');
        break;
      case 404:
        this.mensajeError.set('El servicio seleccionado ya no está disponible. Elige otro.');
        this.formulario.controls.servicioId.setValue('');
        this.servicioSeleccionado.set(null);
        this.reintentarServicios();
        break;
      case 409:
        this.mensajeError.set('Este horario acaba de ser reservado. Selecciona otro horario.');
        this.formulario.controls.hora.reset({ value: '', disabled: true }, { emitEvent: false });
        this.recargarDisponibilidad$.next();
        break;
      default:
        this.mensajeError.set('No pudimos crear la reserva. Revisa tu conexión e inténtalo de nuevo.');
    }

    this.enviando.set(false);
    this.restaurarFormularioTrasError();
  }

  private restaurarFormularioTrasError(): void {
    const controles = this.formulario.controls;
    controles.fecha.enable({ emitEvent: false });
    controles.notas.enable({ emitEvent: false });

    if (this.estadoServicios().tipo === 'listo') {
      controles.servicioId.enable({ emitEvent: false });
    } else {
      controles.servicioId.disable({ emitEvent: false });
    }

    const disponibilidad = this.estadoDisponibilidad();
    if (
      disponibilidad.tipo === 'disponible' &&
      disponibilidad.fecha === controles.fecha.value
    ) {
      controles.hora.enable({ emitEvent: false });
    } else {
      controles.hora.disable({ emitEvent: false });
    }
  }
}
