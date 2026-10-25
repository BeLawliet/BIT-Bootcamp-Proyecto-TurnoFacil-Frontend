export interface RegistroRequest {
  nombre: string;
  correo: string;
  password: string;
  telefono?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
}
