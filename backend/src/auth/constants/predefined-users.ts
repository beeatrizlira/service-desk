import { UserRole } from '../enums/user-role.enum';
import { AuthUser } from '../types/auth-user.type';

// MVP-only users to bootstrap auth flow without registration.
export const PREDEFINED_USERS: AuthUser[] = [
  {
    id: 1,
    name: 'Ana Colaboradora',
    email: 'colaborador@service-desk.local',
    role: UserRole.COLLABORATOR,
    password: '123456',
  },
  {
    id: 2,
    name: 'Caio Suporte',
    email: 'suporte@service-desk.local',
    role: UserRole.SUPPORT,
    password: '123456',
  },
];
