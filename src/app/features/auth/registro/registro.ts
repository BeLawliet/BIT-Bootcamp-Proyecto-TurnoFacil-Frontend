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
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { RegistroRequest } from './registro.model';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

type CampoRegistro = 'nombre' | 'correo' | 'password' | 'confirmarPassword' | 'telefono';

function contrasenasCoinciden(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmarPassword = control.get('confirmarPassword')?.value;

  if (typeof confirmarPassword !== 'string' || confirmarPassword.length === 0) {
    return null;
  }

  return password === confirmarPassword ? null : { contrasenasDistintas: true };
}

function tieneMensaje(valor: unknown): valor is { message: string } {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'message' in valor &&
    typeof valor.message === 'string'
  );
}

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly enviando = signal(false);
  protected readonly registroExitoso = signal(false);
  protected readonly mostrarPassword = signal(false);
  protected readonly mostrarConfirmacion = signal(false);
  protected readonly mensajeError = signal<string | null>(null);

  protected readonly formulario = this.formBuilder.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)],
      ],
      confirmarPassword: ['', Validators.required],
      telefono: ['', Validators.pattern(/^3\d{9}$/)],
    },
    { validators: contrasenasCoinciden },
  );

  protected campoInvalido(campo: CampoRegistro): boolean {
    const control = this.formulario.controls[campo];
    const errorDeConfirmacion =
      campo === 'confirmarPassword' && this.formulario.hasError('contrasenasDistintas');

    return (control.invalid || errorDeConfirmacion) && control.touched;
  }

  protected enviarRegistro(): void {
    if (this.enviando()) {
      return;
    }

    this.formulario.controls.nombre.setValue(this.formulario.controls.nombre.value.trim());
    this.formulario.controls.correo.setValue(
      this.formulario.controls.correo.value.trim().toLowerCase(),
    );
    this.formulario.controls.telefono.setValue(this.formulario.controls.telefono.value.trim());

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { nombre, correo, password, telefono } = this.formulario.getRawValue();
    const datos: RegistroRequest = {
      nombre,
      correo,
      password,
      ...(telefono ? { telefono } : {}),
    };

    this.mensajeError.set(null);
    this.enviando.set(true);

    this.authService
      .registrar(datos)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () => {
          this.formulario.reset();
          this.registroExitoso.set(true);
        },
        error: (error: unknown) => this.mensajeError.set(this.obtenerMensajeError(error)),
      });
  }

  protected limpiarMensajeError(): void {
    this.mensajeError.set(null);
  }

  private obtenerMensajeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No pudimos completar el registro. Inténtalo nuevamente.';
    }

    if (error.status === 409) {
      return 'Ese correo electrónico ya está registrado. Prueba con otro o inicia sesión.';
    }

    if (error.status === 400 && tieneMensaje(error.error)) {
      return error.error.message;
    }

    return 'No pudimos completar el registro. Inténtalo nuevamente.';
  }
}
