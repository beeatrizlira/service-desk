import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../domain/models/auth.model';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;

  const authServiceMock = {
    login: vi.fn(),
  };

  const routerMock = {
    navigateByUrl: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    authServiceMock.login.mockReset();
    routerMock.navigateByUrl.mockClear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should show invalid credentials message and stop loading on 401', () => {
    authServiceMock.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    component.form.setValue({
      email: 'colaborador@service-desk.local',
      password: 'senha-invalida',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'colaborador@service-desk.local',
      password: 'senha-invalida',
    });
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('Email ou senha invalidos.');
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should navigate collaborator to my tickets on successful login', () => {
    authServiceMock.login.mockReturnValue(
      of({
        accessToken: 'fake-jwt',
        user: {
          id: 1,
          name: 'Colaborador',
          email: 'colaborador@service-desk.local',
          role: UserRole.COLLABORATOR,
        },
      }),
    );

    component.form.setValue({
      email: 'colaborador@service-desk.local',
      password: '123456',
    });

    component.onSubmit();

    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('');
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/my-tickets');
  });
});
