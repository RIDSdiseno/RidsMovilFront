import { Component } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { ApiService } from 'src/app/services/api';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';

// Registrar la configuración regional "es-CL"
registerLocaleData(localeEsCl, 'es-CL');

// Definimos la interfaz para las visitas
interface Visita {
  solicitante: string;
  realizado: string;
  inicio: string;
  fin: string;
  cliente: { // Información del cliente
    nombre: string;
    empresa: { // Información de la empresa
      nombre: string;
    }
  };
  nombreCliente?: string; // Nueva propiedad para el nombre de la empresa
}


@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})

export class PerfilPage implements ViewWillEnter {
  visitas: Visita[] = []; // Array para almacenar las visitas
  tecnicoId: number = 0; //
  tecnico: any; // Objeto para almacenar los datos del técnico
  clientes: any[] = []; // Lista de clientes


  constructor(
    private api: ApiService,
    private datePipe: DatePipe,
    private router: Router
  ) { }

  // Se llama cada vez que entras a esta página
  ionViewWillEnter() {
    const id = localStorage.getItem('tecnicoId');
    const tecnicoData = localStorage.getItem('tecnico');
    // Cargar lista de clientes
    if (id) {
      this.tecnicoId = parseInt(id, 10);
      this.cargarHistorial();
    }
    // Cargar datos del técnico desde localStorage
    if (tecnicoData) {
      this.tecnico = JSON.parse(tecnicoData);
    } else {
      this.tecnico = null;
    }
  }

  // Método para cargar el historial de visitas del técnico
  // Método para cargar el historial de visitas del técnico
// Método para cargar el historial de visitas del técnico
cargarHistorial() {
  this.api.getHistorialPorTecnico(this.tecnicoId).subscribe({
    next: (res) => {
      console.log('Respuesta completa del historial:');
      console.log(JSON.stringify(res, null, 2));  // Esto mostrará la respuesta completa

      const historial = res.historial || [];

      this.visitas = historial.map((visita: any) => {
        // Aquí accedemos correctamente al nombre de la empresa desde solicitanteRef
        const empresa = visita.solicitanteRef?.empresa;
        return {
          ...visita,
          nombreCliente: empresa ? empresa.nombre : 'Empresa desconocida'  // Modificamos esto
        };
      });
    },
    error: (err) => {
      console.error('Error al cargar historial:', err);
    }
  });
}



  formatoFecha(fecha: string | null): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || '-';
  }

  // Método para cerrar sesión
  cerrarSesion() {
    localStorage.removeItem('username');
    localStorage.removeItem('tecnico');
    localStorage.removeItem('tecnicoId');
    this.router.navigate(['/home']);
  }
}
