import { PublicAuthUser } from './public-auth-user.type';

export type LoginResult = {
  accessToken: string;
  user: PublicAuthUser;
};
