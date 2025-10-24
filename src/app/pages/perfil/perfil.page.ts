import { Component, HostListener } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { ApiService } from 'src/app/services/api';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth-service';

registerLocaleData(localeEsCl, 'es-CL');

// Actualizamos la interfaz para incluir la dirección
interface Visita {
  solicitante: string;
  realizado: string;
  inicio: string;
  fin: string;
  direccion_visita?: string; // NUEVO: Campo para la dirección
  cliente: {
    nombre: string;
    empresa: {
      nombre: string;
    }
  };
  nombreCliente?: string;
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements ViewWillEnter {

  visitas: Visita[] = [];
  tecnicoId: number = 0;
  tecnico: any;
  clientes: any[] = [];

  constructor(
    private api: ApiService,
    private datePipe: DatePipe,
    private router: Router,
    private auth: AuthService
  ) { }

  ionViewWillEnter() {
    const id = localStorage.getItem('tecnicoId');
    const tecnicoData = localStorage.getItem('tecnico');

    if (id) {
      this.tecnicoId = parseInt(id, 10);
      this.cargarHistorial();
    }

    if (tecnicoData) {
      this.tecnico = JSON.parse(tecnicoData);
    } else {
      this.tecnico = null;
    }
  }

  cargarHistorial() {
    this.api.getHistorialPorTecnico(this.tecnicoId).subscribe({
      next: (res) => {
        console.log('Respuesta completa del historial:', res);

        const historial = res.historial || [];

        this.visitas = historial.map((visita: any) => {
          const empresa = visita.solicitanteRef?.empresa;

          // ✅ MODIFICADO: Usar la dirección exacta si está disponible
          const direccionLegible = this.formatearDireccionParaHistorial(visita.direccion_visita, visita.direccion_exacta);

          return {
            ...visita,
            nombreCliente: empresa ? empresa.nombre : 'Empresa desconocida',
            direccion_visita: direccionLegible
          };
        });
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
      }
    });
  }

  // ✅ MODIFICADO: Método mejorado para formatear la dirección
  private formatearDireccionParaHistorial(direccion: string, direccionExacta?: string): string {
    // Si hay una dirección exacta guardada, usarla primero
    if (direccionExacta && direccionExacta !== 'Ubicación no disponible') {
      return direccionExacta;
    }

    if (!direccion) return 'Ubicación no disponible';

    // Si la dirección es una dirección legible (no coordenadas), usarla
    if (!this.esCoordenada(direccion)) {
      return direccion;
    }

    // Si son coordenadas, intentar obtener dirección exacta
    return this.obtenerDireccionDesdeCoordenadasHistorial(direccion);
  }

  // ✅ NUEVO: Método para verificar si es una coordenada
  private esCoordenada(direccion: string): boolean {
    if (!direccion.includes(',')) return false;

    const partes = direccion.split(',');
    if (partes.length !== 2) return false;

    const lat = parseFloat(partes[0]);
    const lon = parseFloat(partes[1]);

    return !isNaN(lat) && !isNaN(lon);
  }

  // ✅ NUEVO: Método para obtener dirección desde coordenadas (versión simplificada para historial)
  private obtenerDireccionDesdeCoordenadasHistorial(coordenadas: string): string {
    try {
      const [lat, lon] = coordenadas.split(',').map(coord => parseFloat(coord.trim()));

      // Detectar comuna aproximada basada en coordenadas
      const comuna = this.detectarComunaSantiago(lat, lon);
      return `${comuna}, Santiago, Región Metropolitana`;

    } catch (error) {
      console.warn('No se pudo procesar coordenadas para historial:', error);
      return 'Ubicación registrada en Santiago';
    }
  }

  // ✅ COPIAR: Este método debe estar en ambos componentes (o en un servicio compartido)
  private detectarComunaSantiago(lat: number, lon: number): string {
    // Coordenadas aproximadas de comunas de Santiago
    // Santiago Centro y alrededores
    if (lat > -33.45 && lat < -33.42 && lon > -70.68 && lon < -70.64) {
      return 'Santiago Centro';
    }

    // Providencia, Ñuñoa
    if (lat > -33.44 && lat < -33.42 && lon > -70.62 && lon < -70.58) {
      if (lon > -70.60) return 'Providencia';
      return 'Ñuñoa';
    }

    // Las Condes, Vitacura, Lo Barnechea
    if (lat > -33.42 && lat < -33.38 && lon > -70.58 && lon < -70.55) {
      if (lat < -33.40) return 'Las Condes';
      if (lon > -70.57) return 'Vitacura';
      return 'Lo Barnechea';
    }

    // Maipú, Pudahuel
    if (lat > -33.52 && lat < -33.45 && lon > -70.75 && lon < -70.70) {
      return 'Maipú';
    }

    // Puente Alto, La Florida
    if (lat > -33.62 && lat < -33.52 && lon > -70.60 && lon < -70.55) {
      if (lat < -33.57) return 'Puente Alto';
      return 'La Florida';
    }

    // San Bernardo, El Bosque
    if (lat > -33.65 && lat < -33.55 && lon > -70.72 && lon < -70.65) {
      return 'San Bernardo';
    }

    // Quilicura, Huechuraba
    if (lat > -33.38 && lat < -33.33 && lon > -70.75 && lon < -70.68) {
      return 'Quilicura';
    }

    // Estación Central, Pedro Aguirre Cerda
    if (lat > -33.48 && lat < -33.45 && lon > -70.70 && lon < -70.65) {
      return 'Estación Central';
    }

    // Recoleta, Independencia
    if (lat > -33.42 && lat < -33.40 && lon > -70.66 && lon < -70.62) {
      return 'Recoleta';
    }

    // Si no coincide con comuna específica, determinar zona
    if (lat < -33.5) return 'Zona Sur de Santiago';
    if (lon < -70.7) return 'Zona Poniente de Santiago';
    if (lon > -70.58) return 'Zona Oriente de Santiago';

    return 'Santiago';
  }

  formatoFecha(fecha: string | null): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return this.datePipe.transform(date, 'dd/MM/yyyy') || '-';
  }

  formatoHora(fecha: string | null): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return this.datePipe.transform(date, 'HH:mm') || '-';
  }

  cerrarSesion() {
    this.api.logout()
      .pipe(finalize(() => {
        this.auth.logout();
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