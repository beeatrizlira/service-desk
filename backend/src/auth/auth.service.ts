import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PREDEFINED_USERS } from './constants/predefined-users';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './types/auth-user.type';
import { LoginResult } from './types/login-result.type';
import { PublicAuthUser } from './types/public-auth-user.type';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  findUserByEmail(email: string): AuthUser | undefined {
    return PREDEFINED_USERS.find((user) => user.email === email);
  }

  validateUser(email: string, password: string): AuthUser | null {
    const user = this.findUserByEmail(email);
    if (!user || user.password !== password) {
      return null;
    }
    return user;
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: AuthUser): PublicAuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
