import { Component, HostListener } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { ApiService } from 'src/app/services/api';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { finalize } from 'rxjs/operators';

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
  private swipeCoord?: [number, number];
  private swipeTime?: number;

  visitas: Visita[] = []; // Array para almacenar las visitas
  tecnicoId: number = 0; //
  tecnico: any; // Objeto para almacenar los datos del técnico
  clientes: any[] = []; // Lista de clientes

  constructor(
    private api: ApiService,
    private datePipe: DatePipe,
    private router: Router
  ) { }

  // ========== GESTOS TÁCTILES PARA CAMBIAR PÁGINAS ==========
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.swipeCoord = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    this.swipeTime = new Date().getTime();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (!this.swipeCoord || !this.swipeTime) return;

    const coord: [number, number] = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    const time = new Date().getTime();

    const direction = [coord[0] - this.swipeCoord[0], coord[1] - this.swipeCoord[1]];
    const duration = time - this.swipeTime;

    // Detectar swipe horizontal (más de 30px en X y menos en Y)
    if (duration < 1000 && Math.abs(direction[0]) > 30 && Math.abs(direction[0]) > Math.abs(direction[1] * 3)) {
      if (direction[0] > 0) {
        this.goToPreviousPage(); // Swipe derecho - Página anterior
      } else {
        this.goToNextPage(); // Swipe izquierdo - Página siguiente
      }
    }
  }

  goToNextPage() {
    const pageOrder = ['/inicio-footer', '/formulario-visitas', '/equipos', '/perfil'];
    const currentIndex = pageOrder.indexOf(this.router.url);

    if (currentIndex !== -1 && currentIndex < pageOrder.length - 1) {
      this.router.navigate([pageOrder[currentIndex + 1]]);
    } else {
      // Si es la última página, ir a la primera
      this.router.navigate([pageOrder[0]]);
    }
  }

  goToPreviousPage() {
    const pageOrder = ['/inicio-footer', '/formulario-visitas', '/equipos', '/perfil'];
    const currentIndex = pageOrder.indexOf(this.router.url);

    if (currentIndex !== -1 && currentIndex > 0) {
      this.router.navigate([pageOrder[currentIndex - 1]]);
    } else {
      // Si es la primera página, ir a la última
      this.router.navigate([pageOrder[pageOrder.length - 1]]);
    }
  }
  // ========== FIN GESTOS TÁCTILES ==========

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
  cargarHistorial() {
    this.api.getHistorialPorTecnico(this.tecnicoId).subscribe({
      next: (res) => {
        console.log('Respuesta completa del historial:', res);  // Esto mostrará la respuesta completa

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
    this.api.logout()
      .pipe(finalize(() => {
        // Limpieza local SIEMPRE
        localStorage.removeItem('username');
        localStorage.removeItem('tecnico');
        localStorage.removeItem('tecnicoId');
        localStorage.removeItem('access_token'); // por si lo usas en otros flujos
        this.router.navigate(['/home']);
      }))
      .subscribe({
        next: (res) => {
          console.log('Logout OK', res);
        },
        error: (err) => {
          console.warn('Logout falló en el server (se limpia igual en cliente):', err);
        }
      });
  }
}