import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { VisitaStateService } from '../../services/visita-state';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer-menu',
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss'],
  standalone: false,
})
export class FooterMenuComponent implements OnInit, OnDestroy {

  visitaEnCurso = false;
  estadoVisita = '';
  tiempoTranscurrido = '';

  private stateSubscription?: Subscription;
  private timerSubscription?: Subscription;


  constructor(private router: Router, private visitaState: VisitaStateService) { }

  // Navegar a la ruta especificada
  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  ngOnInit() {
     // Suscribirse a cambios de estado
    this.stateSubscription = this.visitaState.state$.subscribe(state => {
      this.visitaEnCurso = state.estado === 'en_curso';
      this.estadoVisita = this.visitaEnCurso ? 'Visita en curso' : 'Sin visita activa';
      
      // Iniciar o detener el timer
      if (this.visitaEnCurso) {
        this.iniciarTimer();
      } else {
        this.detenerTimer();
        this.tiempoTranscurrido = '';
      }
    });
  }

  ngOnDestroy() {
    this.stateSubscription?.unsubscribe();
    this.detenerTimer();
  }

  private iniciarTimer(): void {
    this.actualizarTiempo();
    this.timerSubscription = interval(30000) // Actualizar cada 30 segundos
      .subscribe(() => {
        this.actualizarTiempo();
      });
  }

  private detenerTimer(): void {
    this.timerSubscription?.unsubscribe();
  }

  private actualizarTiempo(): void {
    this.tiempoTranscurrido = this.visitaState.getTiempoTranscurrido();
  }
}