import { AuthUser } from './auth-user.type';

export type PublicAuthUser = Omit<AuthUser, 'passwordHash'>;
