import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
      datosFormulario: {}
    };
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const state: VisitaState = {
          ...parsed,
          inicio: parsed.inicio ? new Date(parsed.inicio) : null
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

  iniciarVisita(visitaData: { visitaId: number | null; empresaId: number; clienteId: number }): void {
    this.updateState({
      ...visitaData,
      inicio: new Date(),
      estado: 'en_curso'
    });
  }

  guardarProgresoFormulario(datosFormulario: any): void {
    this.updateState({
      datosFormulario: {
        ...this.stateSubject.value.datosFormulario,
        ...datosFormulario
      }
    });
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