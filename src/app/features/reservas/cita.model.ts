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

export interface ReservaCreada {
  id: string;
  servicio: {
    id: string;
    nombre: string;
  };
  fecha: string;
  hora: string;
  estado: string;
  precioReservado: number;
  notas?: string;
}
