import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { VisitaStateService } from '../../services/visita-state';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer-menu',
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss'],
  standalone: false,
//  changeDetection: ChangeDetectionStrategy.OnPush // ← AÑADIR ESTO
})
export class FooterMenuComponent implements OnInit, OnDestroy {
  visitaEnCurso = false;
  estadoVisita = '';
  tiempoTranscurrido = '';

  private stateSubscription?: Subscription;
  private timerSubscription?: Subscription;

  constructor(
    private router: Router,
    private visitaState: VisitaStateService,
    private cdRef: ChangeDetectorRef // ← AÑADIR ESTO
  ) { }

  // Navegar a la ruta especificada
  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  ngOnInit() {
    // DEBUG: Verificar si el servicio está funcionando
    console.log(' Footer iniciado, estado actual:', this.visitaState.getCurrentState());

    // Suscribirse a cambios de estado
    this.stateSubscription = this.visitaState.state$.subscribe(state => {
      console.log(' Footer recibió cambio de estado:', state);

      this.visitaEnCurso = state.estado === 'en_curso';
      this.estadoVisita = this.visitaEnCurso ? 'Visita en curso' : 'Sin visita activa';

      // Iniciar o detener el timer
      if (this.visitaEnCurso) {
        this.iniciarTimer();
      } else {
        this.detenerTimer();
        this.tiempoTranscurrido = '';
      }

      // FORZAR DETECCIÓN DE CAMBIOS
      this.cdRef.detectChanges();
    });

    // Cargar estado inicial inmediatamente
    this.actualizarEstadoInicial();
  }

  ngOnDestroy() {
    console.log(' Footer destruyéndose');
    this.stateSubscription?.unsubscribe();
    this.detenerTimer();
  }

  private actualizarEstadoInicial(): void {
    const state = this.visitaState.getCurrentState();
    this.visitaEnCurso = state.estado === 'en_curso';
    this.estadoVisita = this.visitaEnCurso ? 'Visita en curso' : 'Sin visita activa';

    if (this.visitaEnCurso) {
      this.iniciarTimer();
    }

    this.cdRef.detectChanges();
  }

  private iniciarTimer(): void {
    this.actualizarTiempo();
    this.detenerTimer(); // Limpiar timer anterior

    this.timerSubscription = interval(30000) // Actualizar cada 30 segundos
      .subscribe(() => {
        this.actualizarTiempo();
      });
  }

  private detenerTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
  }

  private actualizarTiempo(): void {
    this.tiempoTranscurrido = this.visitaState.getTiempoTranscurrido();
    this.cdRef.detectChanges(); // Forzar actualización de UI
  }
}