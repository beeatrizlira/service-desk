import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, timeout, TimeoutError } from 'rxjs';
import { TicketCategory } from '../../domain/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-ticket-form',
  imports: [ReactiveFormsModule],
  templateUrl: './ticket-form.component.html',
})
export class TicketFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);

  private successToastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private errorToastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private submitGuardTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(false);
  readonly showSuccessToast = signal(false);
  readonly showErrorToast = signal(false);
  readonly errorMessage = signal('');

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    category: ['' as TicketCategory | '', Validators.required],
    description: ['', Validators.required],
  });

  constructor() {
    this.resetUiState();

    this.destroyRef.onDestroy(() => {
      this.clearSuccessToastTimer();
      this.clearErrorToastTimer();
      this.clearSubmitGuard();
    });
  }

  get titleInvalid(): boolean {
    const c = this.form.get('title')!;
    return c.invalid && c.touched;
  }

  get categoryInvalid(): boolean {
    const c = this.form.get('category')!;
    return c.invalid && c.touched;
  }

  get descriptionInvalid(): boolean {
    const c = this.form.get('description')!;
    return c.invalid && c.touched;
  }

  onSubmit(): void {
    if (this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.showSuccessToast.set(false);
    this.showErrorToast.set(false);
    this.errorMessage.set('');

    this.loading.set(true);
    this.startSubmitGuard();
    const { title, description, category } = this.form.getRawValue();

    this.ticketService
      .createTicket({
        title: title!,
        description: description!,
        category: category as TicketCategory,
      })
      .pipe(
        timeout(10000),
        finalize(() => {
          this.clearSubmitGuard();
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.showErrorToast.set(false);
          this.onClear();
          this.openSuccessToast();
        },
        error: (error: unknown) => {
          this.openErrorToast(this.getErrorMessage(error));
        },
      });
  }

  onClear(): void {
    this.form.reset({ title: '', category: '', description: '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  closeErrorToast(): void {
    this.showErrorToast.set(false);
    this.clearErrorToastTimer();
  }

  retrySubmit(): void {
    this.closeErrorToast();
    this.onSubmit();
  }

  private clearSuccessToastTimer(): void {
    if (this.successToastTimeoutId) {
      clearTimeout(this.successToastTimeoutId);
      this.successToastTimeoutId = null;
    }
  }

  private openSuccessToast(): void {
    this.clearSuccessToastTimer();
    this.showErrorToast.set(false);
    this.errorMessage.set('');
    this.showSuccessToast.set(true);
    this.successToastTimeoutId = setTimeout(() => {
      this.showSuccessToast.set(false);
      this.successToastTimeoutId = null;
    }, 3000);
  }

  private openErrorToast(message: string): void {
    this.clearSuccessToastTimer();
    this.clearErrorToastTimer();
    this.showSuccessToast.set(false);
    this.errorMessage.set(message);
    this.showErrorToast.set(true);
    this.errorToastTimeoutId = setTimeout(() => {
      this.showErrorToast.set(false);
      this.errorToastTimeoutId = null;
    }, 5000);
  }

  private clearErrorToastTimer(): void {
    if (this.errorToastTimeoutId) {
      clearTimeout(this.errorToastTimeoutId);
      this.errorToastTimeoutId = null;
    }
  }

  private startSubmitGuard(): void {
    this.clearSubmitGuard();
    this.submitGuardTimeoutId = setTimeout(() => {
      if (!this.loading()) return;
      this.loading.set(false);
      this.openErrorToast('Nao foi possivel concluir a solicitacao. Tente novamente.');
    }, 12000);
  }

  private clearSubmitGuard(): void {
    if (this.submitGuardTimeoutId) {
      clearTimeout(this.submitGuardTimeoutId);
      this.submitGuardTimeoutId = null;
    }
  }

  private resetUiState(): void {
    this.loading.set(false);
    this.showSuccessToast.set(false);
    this.showErrorToast.set(false);
    this.errorMessage.set('');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'Tempo limite excedido. Verifique se o servidor esta rodando e tente novamente.';
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Nao foi possivel conectar ao servidor. Confira se a API esta online.';
      }

      if (typeof error.error?.message === 'string' && error.error.message.trim()) {
        return error.error.message;
      }

      return `Falha ao criar solicitacao (HTTP ${error.status}).`;
    }

    return 'Falha inesperada ao criar solicitacao. Tente novamente.';
  }
}
