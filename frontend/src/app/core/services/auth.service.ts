import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import {
  AuthSession,
  LoginPayload,
  LoginResponse,
  UserRole,
} from '../../domain/models/auth.model';
import { environment } from '../../../environments/environment';

const AUTH_STORAGE_KEY = 'service-desk-auth-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
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

  isAuthenticated(): boolean {
    const session = this.session();
    if (!session) {
      return false;
    }

    if (this.isTokenExpired(session.accessToken)) {
      this.logout();
      return false;
    }

    return true;
  }

  getCurrentUserRole(): UserRole | null {
    const session = this.session();
    return session?.user.role ?? null;
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
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed?.accessToken || !parsed?.user) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      if (this.isTokenExpired(parsed.accessToken)) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return parsed;
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

  private isTokenExpired(token: string): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    try {
      const payload = JSON.parse(atob(parts[1] as string)) as { exp?: number };
      if (!payload.exp) {
        return false;
      }
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
}
