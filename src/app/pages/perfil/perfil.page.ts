import { Component, OnInit } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { ApiService } from 'src/app/services/api';
import { Router } from '@angular/router';


// Registrar la configuración regional "es-CL"
registerLocaleData(localeEsCl, 'es-CL');

interface Visita {
  solicitante: string;
  realizado: string;
  inicio: string;
  fin: string;
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements OnInit {
  visitas: Visita[] = [];
  tecnicoId: number = 0;
  tecnico: any;

  constructor(private api: ApiService, private datePipe: DatePipe,private router: Router) {}

  ngOnInit() {
   const id = localStorage.getItem('tecnicoId');
   const tecnicoData = localStorage.getItem('tecnico')
    if (id) {
      this.tecnicoId = parseInt(id);
      this.cargarHistorial();
    }
    if(tecnicoData){
      this.tecnico = JSON.parse(tecnicoData);
    }
  }

  cargarHistorial() {
    this.api.getHistorialPorTecnico(this.tecnicoId).subscribe({
      next: (res) => {
        this.visitas = res.historial || [];
        console.log(this.visitas)
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
      }
    });
  }
 /* eliminarVisita(v: Visita) {
    this.visitas = this.visitas.filter(item => item !== v);
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
  }*/

  formatoFecha(fecha: string | null): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || '-';
}
  
  cerrarSesion() {
    localStorage.removeItem('username'); // También puedes usar clear() si quieres borrar todo
    this.router.navigate(['/home']); // Reemplaza '/login' por la ruta de tu login real
  }
}

