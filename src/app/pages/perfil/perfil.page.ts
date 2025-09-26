import { Component, OnInit } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';

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

  constructor(private datePipe: DatePipe) {}

  ngOnInit() {
    this.username = localStorage.getItem('username') || '';
    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}') as Record<string, Visita[]>;
    this.visitas = allHistorial[this.username] || [];
  }

  eliminarVisita(v: Visita) {
    this.visitas = this.visitas.filter(item => item !== v);
    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}') as Record<string, Visita[]>;
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }

  formatoFecha(fecha: string | null): string {
    if (!fecha) return '-';
    const parts = fecha.split(' ');
    return parts[0] + ' ' + parts[1]; // dd/MM/yyyy HH:mm
  }
}
