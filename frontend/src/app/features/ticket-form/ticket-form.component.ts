import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, timeout, TimeoutError } from 'rxjs';
import { TicketCategory } from '../../domain/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-ticket-form',
  imports: [ReactiveFormsModule],
  templateUrl: './ticket-form.component.html',
})
export class TicketFormComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ticketService = inject(TicketService);
  private successToastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private errorToastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  loading = false;
  showSuccessToast = false;
  showErrorToast = false;
  errorMessage = '';

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    category: ['' as TicketCategory | '', Validators.required],
    description: ['', Validators.required],
  });

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
    if (this.loading) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
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
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.showErrorToast = false;
          this.onClear();
          this.openSuccessToast();
        },
        error: (error: unknown) => {
          this.openErrorToast(this.getErrorMessage(error));
        },
      });
  }

  onClear(): void {
    this.form.reset({
      title: '',
      category: '',
      description: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  ngOnDestroy(): void {
    if (this.successToastTimeoutId) {
      clearTimeout(this.successToastTimeoutId);
    }

    if (this.errorToastTimeoutId) {
      clearTimeout(this.errorToastTimeoutId);
    }
  }

  private openSuccessToast(): void {
    if (this.successToastTimeoutId) {
      clearTimeout(this.successToastTimeoutId);
    }

    this.showSuccessToast = true;
    this.successToastTimeoutId = setTimeout(() => {
      this.showSuccessToast = false;
      this.successToastTimeoutId = null;
    }, 3000);
  }

  private openErrorToast(message: string): void {
    this.clearErrorToastTimer();

    this.errorMessage = message;
    this.showErrorToast = true;
    this.errorToastTimeoutId = setTimeout(() => {
      this.showErrorToast = false;
      this.errorToastTimeoutId = null;
    }, 5000);
  }

  closeErrorToast(): void {
    this.showErrorToast = false;
    this.clearErrorToastTimer();
  }

  private clearErrorToastTimer(): void {
    if (this.errorToastTimeoutId) {
      clearTimeout(this.errorToastTimeoutId);
      this.errorToastTimeoutId = null;
    }
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
