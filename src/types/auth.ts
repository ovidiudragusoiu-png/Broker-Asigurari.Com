export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface AuthError {
  error: string;
}
