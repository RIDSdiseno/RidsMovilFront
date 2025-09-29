import { Component, OnInit } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { Router } from '@angular/router';


// Registrar la configuración regional "es-CL"
registerLocaleData(localeEsCl, 'es-CL');

interface Visita {
  cliente: string;
  solicitante: string;
  impresoras: boolean;
  telefonos: boolean;
  pie: boolean;
  otros: boolean;
  otrosDetalle: string;
  realizado: string;
  inicio: string | null;
  fin: string | null;
  username: string;
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements OnInit {
  visitas: Visita[] = [];
  username: string = '';

  constructor(private datePipe: DatePipe, private router: Router) { }

  ngOnInit() {
    this.username = (localStorage.getItem('username') || '').toLowerCase();
    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    console.log('Cargando historial para', this.username, allHistorial);

    this.visitas = allHistorial[this.username] || [];
    console.log('Visitas encontradas:', this.visitas);

    // Ordenar visitas por fecha de inicio (más recientes primero)
    this.visitas.sort((a, b) => {
      const fechaA = new Date(a.inicio || '').getTime();
      const fechaB = new Date(b.inicio || '').getTime();
      return fechaB - fechaA;
    });
  }

  eliminarVisita(visita: Visita) {
    this.visitas = this.visitas.filter(v => v !== visita);

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}') as Record<string, Visita[]>;
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }

  formatoFecha(fecha: string | null): string {
    if (!fecha) return '-';
    const [dia, hora] = fecha.split(' ');
    return `${dia} ${hora}`;
  }
  cerrarSesion() {
    localStorage.removeItem('username'); // También puedes usar clear() si quieres borrar todo
    this.router.navigate(['/home']); // Reemplaza '/login' por la ruta de tu login real
  }
}

