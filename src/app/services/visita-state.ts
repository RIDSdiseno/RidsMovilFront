import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// ✅ ACTUALIZAR: Agregar interfaz para coordenadas
export interface Coordenadas {
  lat: number | null;
  lon: number | null;
}

export interface VisitaState {
  visitaId: number | null;
  empresaId: number | null;
  clienteId: number | null;
  solicitantes: any[];
  actividades: any;
  inicio: Date | null;
  fin: Date | null;
  estado: 'sin_iniciar' | 'en_curso' | 'completada';
  datosFormulario: {
    otrosDetalle?: string;
    realizado?: string;
  };
  direccion_visita?: string;
  // ✅ NUEVA PROPIEDAD: coordenadas
  coordenadas?: Coordenadas;
}

@Injectable({
  providedIn: 'root'
})
export class VisitaStateService {
  private readonly STORAGE_KEY = 'visita_en_curso';

  private stateSubject = new BehaviorSubject<VisitaState>(this.getInitialState());
  public state$ = this.stateSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private getInitialState(): VisitaState {
    return {
      visitaId: null,
      empresaId: null,
      clienteId: null,
      solicitantes: [],
      actividades: {},
      inicio: null,
      fin: null,
      estado: 'sin_iniciar',
      datosFormulario: {},
      direccion_visita: '',
      // ✅ INICIALIZAR: coordenadas como null
      coordenadas: { lat: null, lon: null }
    };
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const state: VisitaState = {
          ...parsed,
          inicio: parsed.inicio ? new Date(parsed.inicio) : null,
          direccion_visita: parsed.direccion_visita || '',
          // ✅ CARGAR: coordenadas desde localStorage
          coordenadas: parsed.coordenadas || { lat: null, lon: null }
        };
        this.stateSubject.next(state);
      }
    } catch (error) {
      console.error('Error cargando estado:', error);
      this.clearState();
    }
  }

  private saveToStorage(): void {
    try {
      const state = this.stateSubject.value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error guardando estado:', error);
    }
  }

  // API Pública Simplificada
  updateState(updates: Partial<VisitaState>): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...updates };
    this.stateSubject.next(newState);
    this.saveToStorage();
  }

  // ✅ ACTUALIZAR: método iniciarVisita para incluir coordenadas
  iniciarVisita(visitaData: {
    visitaId: number | null;
    empresaId: number;
    clienteId: number;
    direccion_visita?: string;
    coordenadas?: Coordenadas; // ✅ NUEVO: parámetro para coordenadas
  }): void {
    this.updateState({
      ...visitaData,
      inicio: new Date(),
      estado: 'en_curso'
    });
  }

  // ✅ ACTUALIZAR: método guardarProgresoFormulario para manejar coordenadas
  guardarProgresoFormulario(datosFormulario: any): void {
    // Si viene direccion_visita o coordenadas en el nivel principal, manejarlas separadamente
    const { direccion_visita, coordenadas, ...otrosDatos } = datosFormulario;

    const updates: Partial<VisitaState> = {
      datosFormulario: {
        ...this.stateSubject.value.datosFormulario,
        ...otrosDatos
      }
    };

    if (direccion_visita !== undefined) {
      updates.direccion_visita = direccion_visita;
    }

    if (coordenadas !== undefined) {
      updates.coordenadas = coordenadas;
    }

    this.updateState(updates);
  }

  agregarSolicitantes(solicitantes: any[]): void {
    this.updateState({ solicitantes });
  }

  agregarActividades(actividades: any): void {
    this.updateState({ actividades });
  }

  completarVisita(): void {
    this.updateState({
      estado: 'completada',
      fin: new Date()
    });
  }

  guardarDireccion(direccion: string): void {
    this.updateState({
      direccion_visita: direccion
    });
  }

  // ✅ NUEVO: método específico para guardar coordenadas
  guardarCoordenadas(coordenadas: Coordenadas): void {
    this.updateState({
      coordenadas
    });
  }

  // ✅ NUEVO: método para obtener coordenadas actuales
  getCoordenadas(): Coordenadas | null {
    return this.stateSubject.value.coordenadas || null;
  }

  // ✅ NUEVO: método para actualizar solo coordenadas
  actualizarCoordenadas(lat: number | null, lon: number | null): void {
    this.updateState({
      coordenadas: { lat, lon }
    });
  }

  getCurrentState(): VisitaState {
    return this.stateSubject.value;
  }

  tieneVisitaEnCurso(): boolean {
    return this.stateSubject.value.estado === 'en_curso';
  }

  clearState(): void {
    const initialState = this.getInitialState();
    this.stateSubject.next(initialState);
    localStorage.removeItem(this.STORAGE_KEY);
  }
}