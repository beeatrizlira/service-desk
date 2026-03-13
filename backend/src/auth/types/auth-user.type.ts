import { UserRole } from '../enums/user-role.enum';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  password: string;
};
