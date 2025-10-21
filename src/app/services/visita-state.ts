// src/app/services/visita-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface VisitaState {
  visitaId: number | null;
  empresaId: number | null;
  clienteId: number | null;
  solicitantes: any[];
  actividades: any;
  inicio: Date | null;
  fin?: Date | null;
  estado: 'sin_iniciar' | 'en_curso' | 'completada';
  datosFormulario: any;
}

@Injectable({
  providedIn: 'root'
})
export class VisitaStateService {
  private readonly STORAGE_KEY = 'visita_en_curso';
  private readonly STORAGE_VERSION = '1.0';

  private stateSubject = new BehaviorSubject<VisitaState>(this.getInitialState());
  public state$ = this.stateSubject.asObservable();

  constructor() {
    this.loadFromStorage();
    this.setupAutoPersist();
  }

  private getInitialState(): VisitaState {
    return {
      visitaId: null,
      empresaId: null,
      clienteId: null,
      solicitantes: [],
      actividades: {},
      inicio: null,
      estado: 'sin_iniciar',
      datosFormulario: {}
    };
  }

  private setupAutoPersist(): void {
    // Auto-persistir cambios con debounce para performance
    this.stateSubject.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) =>
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    ).subscribe(state => {
      this.saveToStorage(state);
    });
  }

  private saveToStorage(state: VisitaState): void {
    try {
      const storageData = {
        version: this.STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        data: {
          ...state,
          inicio: state.inicio ? state.inicio.toISOString() : null,
          fin: state.fin ? state.fin.toISOString() : null
        }
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Error guardando estado de visita:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const storageData = JSON.parse(saved);

        // Validar versión y estructura
        if (!this.isValidState(storageData)) {
          console.warn('Estado corrupto o versión antigua, limpiando...');
          this.clearState();
          return;
        }

        const state: VisitaState = {
          ...storageData.data,
          inicio: storageData.data.inicio ? new Date(storageData.data.inicio) : null,
          fin: storageData.data.fin ? new Date(storageData.data.fin) : null
        };

        this.stateSubject.next(state);
      }
    } catch (error) {
      console.error('Error cargando estado de visita:', error);
      this.clearState();
    }
  }

  private isValidState(storageData: any): boolean {
    return storageData &&
      storageData.version === this.STORAGE_VERSION &&
      storageData.data &&
      typeof storageData.data.estado === 'string' &&
      ['sin_iniciar', 'en_curso', 'completada'].includes(storageData.data.estado);
  }

  // API Pública
  updateState(updates: Partial<VisitaState>): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...updates };
    this.stateSubject.next(newState);
  }

  // Modifica la interfaz del método iniciarVisita
  iniciarVisita(visitaData: {
    visitaId: number | null;  // ← Permitir null
    empresaId: number;
    clienteId: number;
    inicio?: Date
  }): void {
    this.updateState({
      ...visitaData,
      inicio: visitaData.inicio || new Date(),
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
    this.updateState({
      actividades: {
        ...this.stateSubject.value.actividades,
        ...actividades
      }
    });
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

  getTiempoTranscurrido(): string {
    const state = this.getCurrentState();
    if (!state.inicio || state.estado !== 'en_curso') return '';

    const ahora = new Date();
    const inicio = new Date(state.inicio);
    const diffMs = ahora.getTime() - inicio.getTime();

    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }
}
