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

  // ✅ NUEVO: obtiene dirección legible desde coordenadas
  private async obtenerDireccionLegibleDesdeCoordenadas(coordenadas: string): Promise<string> {
    if (!coordenadas || coordenadas === '0,0') return 'Ubicación no registrada';
    if (!this.esCoordenada(coordenadas)) return 'Ubicación no válida';

    const [lat, lon] = coordenadas.split(',').map(v => parseFloat(v.trim()));

    try {
      // ✅ Si es móvil (Capacitor), usar fetch nativo (sin CORS)
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'RidsMovilApp/1.0 (app@rids.cl)',
            },
          }
        );

        const data = await response.json();
        const address = data.address;

        if (address?.road) {
          let calle = address.road;
          if (address.house_number) calle += ` #${address.house_number}`;
          const comuna = address.suburb || address.city_district || 'Santiago';
          return `${calle}, ${comuna}, Región Metropolitana`;
        }
      }

      // ⚠️ Si estás en navegador o el fetch falla, usa método local
      return `${this.detectarComunaSantiago(lat, lon)}, Región Metropolitana`;

    } catch (error) {
      console.warn('⚠️ Error al traducir coordenadas (perfil):', error);
      return `${this.detectarComunaSantiago(lat, lon)}, Región Metropolitana`;
    }
  }


  cargarHistorial() {
    this.api.getHistorialPorTecnico(this.tecnicoId).subscribe({
      next: async (res) => {
        console.log('Respuesta completa del historial:', res);
        const historial = res.historial || [];

        // ✅ Usa Promise.all para procesar cada visita (async)
        this.visitas = await Promise.all(historial.map(async (visita: any) => {
          const empresa = visita.solicitanteRef?.empresa;
          const direccionLegible = await this.obtenerDireccionLegibleDesdeCoordenadas(visita.direccion_visita);

          return {
            ...visita,
            nombreCliente: empresa ? empresa.nombre : 'Empresa desconocida',
            direccion_visita: direccionLegible,
          };
        }));
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
      },
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

  // ✅ Verifica si el string es una coordenada válida
  private esCoordenada(valor: string): boolean {
    if (!valor.includes(',')) return false;
    const [lat, lon] = valor.split(',').map((v) => parseFloat(v.trim()));
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
  // ✅ Detecta comuna por rango si no se puede resolver con Nominatim
  private detectarComunaSantiago(lat: number, lon: number): string {
    if (lat === 0 && lon === 0) return 'Ubicación no registrada';

    if (lat > -33.45 && lat < -33.42 && lon > -70.68 && lon < -70.64) return 'Santiago Centro';
    if (lat > -33.44 && lat < -33.42 && lon > -70.62 && lon < -70.58)
      return lon > -70.60 ? 'Providencia' : 'Ñuñoa';
    if (lat > -33.42 && lat < -33.38 && lon > -70.58 && lon < -70.55)
      return lat < -33.40 ? 'Las Condes' : lon > -70.57 ? 'Vitacura' : 'Lo Barnechea';
    if (lat > -33.52 && lat < -33.45 && lon > -70.75 && lon < -70.70) return 'Maipú';
    if (lat > -33.62 && lat < -33.52 && lon > -70.60 && lon < -70.55)
      return lat < -33.57 ? 'Puente Alto' : 'La Florida';
    if (lat > -33.65 && lat < -33.55 && lon > -70.72 && lon < -70.65) return 'San Bernardo';
    if (lat > -33.38 && lat < -33.33 && lon > -70.75 && lon < -70.68) return 'Quilicura';
    if (lat > -33.48 && lat < -33.45 && lon > -70.70 && lon < -70.65) return 'Estación Central';
    if (lat > -33.42 && lat < -33.40 && lon > -70.66 && lon < -70.62) return 'Recoleta';

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