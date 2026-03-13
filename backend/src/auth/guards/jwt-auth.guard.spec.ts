import { JwtModule, JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../enums/user-role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';

type RequestMock = {
  headers: { authorization?: string };
  user?: unknown;
};

const createContext = (request: RequestMock) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as never;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should attach user to request when token is valid', async () => {
    const token = await jwtService.signAsync({
      sub: 9,
      email: 'colaborador@service-desk.local',
      role: UserRole.COLLABORATOR,
      name: 'Ana Colaboradora',
    });
    const request: RequestMock = {
      headers: { authorization: `Bearer ${token}` },
    };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 9,
      email: 'colaborador@service-desk.local',
      role: UserRole.COLLABORATOR,
      name: 'Ana Colaboradora',
    });
  });

  it('should throw UnauthorizedException when token is missing', async () => {
    const request: RequestMock = { headers: {} };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when token is invalid', async () => {
    const request: RequestMock = {
      headers: { authorization: 'Bearer invalid-token' },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
