import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { AuthSession, LoginPayload, LoginResponse } from '../../domain/models/auth.model';

const AUTH_STORAGE_KEY = 'service-desk-auth-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly baseUrl = 'http://localhost:3001/api/auth';
  readonly session = signal<AuthSession | null>(this.readStoredSession());

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, payload)
      .pipe(tap((result) => this.setSession(result)));
  }

  logout(): void {
    this.session.set(null);
    this.clearStoredSession();
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  private setSession(result: LoginResponse): void {
    const nextSession: AuthSession = {
      accessToken: result.accessToken,
      user: result.user,
    };
    this.session.set(nextSession);
    this.persistSession(nextSession);
  }

  private readStoredSession(): AuthSession | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  private persistSession(session: AuthSession): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  private clearStoredSession(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
