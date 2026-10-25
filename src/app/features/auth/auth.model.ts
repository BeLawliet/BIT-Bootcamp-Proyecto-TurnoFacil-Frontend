import { Usuario } from './registro/registro.model';

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: string;
  usuario: Usuario;
}
