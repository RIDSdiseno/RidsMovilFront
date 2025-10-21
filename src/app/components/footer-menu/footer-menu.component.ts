import { Component, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer-menu',
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss'],
  standalone: false,
})
export class FooterMenuComponent implements OnInit {
  visitaEnCurso = false;
  estadoVisita = '';
  tiempoTranscurrido = '';

  private stateSubscription?: Subscription;
  private timerSubscription?: Subscription;

  constructor(
    private router: Router,
  ) { }

  // Navegar a la ruta especificada
  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  ngOnInit() {
  }

}