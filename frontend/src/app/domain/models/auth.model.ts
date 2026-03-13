export enum UserRole {
  COLLABORATOR = 'COLLABORATOR',
  SUPPORT = 'SUPPORT',
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}
