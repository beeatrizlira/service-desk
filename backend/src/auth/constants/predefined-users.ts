import { UserRole } from '../enums/user-role.enum';
import { AuthUser } from '../types/auth-user.type';

// MVP-only users to bootstrap auth flow without registration.
export const PREDEFINED_USERS: AuthUser[] = [
  {
    id: 1,
    name: 'Ana Colaboradora',
    email: 'colaborador@service-desk.local',
    role: UserRole.COLLABORATOR,
    passwordHash:
      '$2b$10$s16b1XI5I.GhwI/M9F9dm.ABhs6bQWD72pP3D2zwmHB7vaMsBFDRW',
  },
  {
    id: 2,
    name: 'Caio Suporte',
    email: 'suporte@service-desk.local',
    role: UserRole.SUPPORT,
    passwordHash:
      '$2b$10$A/YdEXyFihARJ/AlNzEPie067UXBAg2oWYRJVw8fDWPr.BC4yZRsy',
  },
];
