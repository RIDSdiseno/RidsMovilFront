import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VisitaStateService } from '../../services/visita-state';

@Component({
  selector: 'app-footer-menu',
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss'],
  standalone: false,
})
export class FooterMenuComponent implements OnInit {
  visitaEnCurso = false;

  constructor(
    private router: Router,
    private visitaState: VisitaStateService
  ) { }

  // Navegar a la ruta especificada
  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  ngOnInit() {
    // Suscribirse solo para saber si hay visita en curso
    this.visitaState.state$.subscribe(state => {
      this.visitaEnCurso = state.estado === 'en_curso';
    });
  }
}