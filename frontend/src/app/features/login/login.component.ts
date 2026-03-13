import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { UserRole } from '../../domain/models/auth.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  get emailInvalid(): boolean {
    const control = this.form.get('email');
    return !!control && control.invalid && control.touched;
  }

  get passwordInvalid(): boolean {
    const control = this.form.get('password');
    return !!control && control.invalid && control.touched;
  }

  onSubmit(): void {
    if (this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.errorMessage.set('');
    this.loading.set(true);

    this.authService
      .login({
        email: email!,
        password: password!,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (session) => {
          if (session.user.role === UserRole.SUPPORT) {
            void this.router.navigateByUrl('/board');
            return;
          }
          void this.router.navigateByUrl('/my-tickets');
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Email ou senha invalidos.';
      }
      if (error.status === 0) {
        return 'Nao foi possivel conectar ao servidor.';
      }
    }
    return 'Nao foi possivel fazer login. Tente novamente.';
  }
}
