export interface Disponibilidad {
  fecha: string;
  horasOcupadas: string[];
  horasDisponibles: string[];
}

export interface CrearReservaRequest {
  servicioId: string;
  fecha: string;
  hora: string;
  notas?: string;
}

export type EstadoCita = 'activa' | 'cancelada';

export interface ServicioCita {
  id: string;
  nombre: string;
}

interface DatosCita {
  id: string;
  fecha: string;
  hora: string;
  estado: EstadoCita;
  precioReservado: number;
  notas?: string | null;
}

export interface ReservaCreada extends DatosCita {
  servicio: ServicioCita;
}

export interface Cita extends DatosCita {
  servicio: ServicioCita | null;
  createdAt: string;
  updatedAt: string;
}

export interface CancelarReservaResponse {
  id: string;
  estado: 'cancelada';
}
