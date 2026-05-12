export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

export interface IAuthProvider {
  getSession(): Promise<AuthSession | null>;
}
