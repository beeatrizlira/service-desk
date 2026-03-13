import { UserRole } from '../enums/user-role.enum';

export type RequestUser = {
  id: number;
  email: string;
  role: UserRole;
  name: string;
};
