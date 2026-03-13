import { Injectable } from '@nestjs/common';
import { PREDEFINED_USERS } from './constants/predefined-users';
import { AuthUser } from './types/auth-user.type';

@Injectable()
export class AuthService {
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
}
