import { Component, OnInit } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { ApiService } from 'src/app/services/api';

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

  constructor(private api: ApiService, private datePipe: DatePipe) {}

  ngOnInit() {
   const id = localStorage.getItem('tecnicoId');
    if (id) {
      this.tecnicoId = parseInt(id);
      this.cargarHistorial();
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
}