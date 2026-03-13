import { JwtModule, JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from './enums/user-role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', () => {
      const user = service.validateUser(
        'colaborador@service-desk.local',
        '123456',
      );
      expect(user).toBeDefined();
      expect(user?.role).toBe(UserRole.COLLABORATOR);
    });

    it('should return null when credentials are invalid', () => {
      const user = service.validateUser(
        'colaborador@service-desk.local',
        'wrong-password',
      );
      expect(user).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and public user data when credentials are valid', async () => {
      const result = await service.login({
        email: 'suporte@service-desk.local',
        password: '123456',
      });

      expect(result.accessToken).toBeTruthy();
      expect(result.user).toEqual({
        id: 2,
        name: 'Caio Suporte',
        email: 'suporte@service-desk.local',
        role: UserRole.SUPPORT,
      });
      expect('password' in result.user).toBe(false);

      const payload = await jwtService.verifyAsync<{
        sub: number;
        email: string;
        role: UserRole;
      }>(result.accessToken, { secret: 'test-secret' });

      expect(payload.sub).toBe(2);
      expect(payload.email).toBe('suporte@service-desk.local');
      expect(payload.role).toBe(UserRole.SUPPORT);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      await expect(
        service.login({
          email: 'suporte@service-desk.local',
          password: 'invalid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
