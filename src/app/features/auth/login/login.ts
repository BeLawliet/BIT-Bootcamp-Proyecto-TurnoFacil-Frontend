import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, switchMap, tap, timer } from 'rxjs';
import { AuthService } from '../auth.service';

function tieneMensaje(valor: unknown): valor is { message: string } {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'message' in valor &&
    typeof valor.message === 'string'
  );
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly enviando = signal(false);
  protected readonly mostrarPassword = signal(false);
  protected readonly inicioExitoso = signal(false);
  protected readonly mensajeError = signal<string | null>(null);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected campoInvalido(campo: 'correo' | 'password'): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && control.touched;
  }

  protected enviarLogin(): void {
    if (this.enviando()) {
      return;
    }

    this.formulario.controls.correo.setValue(
      this.formulario.controls.correo.value.trim().toLowerCase(),
    );

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();
    const rutaRetorno = this.obtenerRutaRetorno();
    this.mensajeError.set(null);
    this.enviando.set(true);

    this.authService
      .iniciarSesion(datos)
      .pipe(
        tap(() => {
          this.formulario.reset();
          this.inicioExitoso.set(true);
        }),
        switchMap(() => timer(900)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(rutaRetorno),
        error: (error: unknown) => this.mensajeError.set(this.obtenerMensajeError(error)),
      });
  }

  protected limpiarMensajeError(): void {
    this.mensajeError.set(null);
  }

  private obtenerMensajeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No pudimos iniciar sesión. Inténtalo nuevamente.';
    }

    if (error.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }

    if (error.status === 400 && tieneMensaje(error.error)) {
      return error.error.message;
    }

    return 'No pudimos iniciar sesión. Inténtalo nuevamente.';
  }

  private obtenerRutaRetorno(): string {
    const ruta = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!ruta || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('\\')) {
      return '/';
    }

    return ruta;
  }
}
