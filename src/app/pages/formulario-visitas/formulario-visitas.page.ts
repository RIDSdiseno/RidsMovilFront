import { DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController, Platform } from '@ionic/angular';
import { ApiService } from 'src/app/services/api';
import { VisitaStateService } from 'src/app/services/visita-state';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import localeEsCl from '@angular/common/locales/es-CL';

// ✅ IMPORTACIONES CORRECTAS PARA CAPACITOR 3+
import { Geolocation } from '@capacitor/geolocation';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

registerLocaleData(localeEsCl, 'es-CL');

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: false,
})
export class FormularioVisitasPage implements OnInit, OnDestroy {

  visitaId: number | null = null;
  visitaForm: FormGroup;
  visitas: any[] = [];
  filtradosSolicitantes: any[] = [];
  todosSolicitantes: any[] = [];

  mostrarListaSolicitantes = false;
  busquedaSolicitante = '';
  nombreSolicitanteSeleccionado = '';

  inicio: Date | null = null;
  fin: Date | null = null;
  estado: string = 'Sin iniciar';
  estadoTexto: string = 'Listo para iniciar una visita.';
  visitaEnCurso = false;
  username: string = '';
  tecnicoId: string = '';
  filtradosSolicitantesUI: any[] = [];
  clientes: any[] = [];
  empresaId: number = 0;

  // Variables para geolocalización
  isLoadingLocation = false;
  ubicacionObtenida = false;

  latitud: number | null = null;
  longitud: number | null = null;
  direccionExacta: string = '';

  private formSubscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private alertController: AlertController,
    private router: Router,
    private api: ApiService,
    private toastController: ToastController,
    private visitaState: VisitaStateService,
    private platform: Platform,
  ) {
    this.visitaForm = this.fb.group({
      cliente: ['', Validators.required],
      solicitante: [[], Validators.required],
      busquedaSolicitante: [''],
      actividades: this.fb.group({
        impresoras: [false],
        telefonos: [false],
        pie: [false],
        otros: [false],
        ccleaner: [true],
        actualizaciones: [true],
        estadoDisco: [true],
        antivirus: [true],
        licenciaWindows: [true],
        licenciaOffice: [true],
        rendimientoEquipo: [true],
        mantenimientoReloj: [true],
        ecografo: [true]
      }),
      otrosDetalle: [''],
      direccion_visita: [{ value: '', disabled: true }]
    });

    this.visitaForm.get('actividades.otros')?.valueChanges.subscribe((val) => {
      if (!val) {
        this.visitaForm.get('otrosDetalle')?.setValue('');
        this.visitaForm.get('otrosDetalle')?.clearValidators();
        this.visitaForm.get('otrosDetalle')?.updateValueAndValidity();
      } else {
        this.visitaForm.get('otrosDetalle')?.setValidators([Validators.required]);
        this.visitaForm.get('otrosDetalle')?.updateValueAndValidity();
      }
    });

    this.setupAutoSave();
  }

  private setupAutoSave(): void {
    const actividadesSub = this.visitaForm.get('actividades')?.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(actividades => {
        if (this.visitaEnCurso) {
          this.visitaState.agregarActividades(actividades);
        }
      });

    const otrosDetalleSub = this.visitaForm.get('otrosDetalle')?.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(otrosDetalle => {
        if (this.visitaEnCurso) {
          this.visitaState.guardarProgresoFormulario({ otrosDetalle });
        }
      });

    const clienteSub = this.visitaForm.get('cliente')?.valueChanges
      .subscribe(clienteId => {
        if (this.visitaEnCurso && clienteId) {
          this.visitaState.updateState({ clienteId });
        }
      });

    [actividadesSub, otrosDetalleSub, clienteSub].forEach(sub => {
      if (sub) this.formSubscriptions.push(sub);
    });
  }

  ngOnDestroy() {
    this.formSubscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnInit() {
    this.api.getClientes().subscribe(
      (data) => {
        console.log('Clientes cargados:', data);
        this.clientes = data;
      },
      (error) => {
        console.error('Error al cargar clientes', error);
      }
    );

    this.cargarVisitaEnCurso();

    if (this.visitaId) {
      this.api.crearVisita(this.visitaId).subscribe((visitaData) => {
        const actividades = visitaData.actividades || {};
        this.visitaForm.patchValue({
          actividades: {
            impresoras: actividades.impresoras ?? true,
            telefonos: actividades.telefonos ?? true,
            pie: actividades.pie ?? true,
            otros: actividades.otros ?? true,
            ccleaner: actividades.ccleaner ?? true,
            actualizaciones: actividades.actualizaciones ?? true,
            antivirus: actividades.antivirus ?? true,
            estadoDisco: actividades.estadoDisco ?? true,
            licenciaWindows: actividades.licenciaWindows ?? true,
            licenciaOffice: actividades.licenciaOffice ?? true,
            rendimientoEquipo: actividades.rendimientoEquipo ?? true,
            mantenimientoReloj: actividades.mantenimientoReloj ?? true,
            ecografo: actividades.ecografo ?? true,
          }
        });
      });
    }

    this.visitaForm.get('cliente')?.valueChanges.subscribe(clienteId => {
      console.log('Cliente seleccionado:', clienteId);
      this.empresaId = clienteId;
      if (clienteId) {
        this.api.getSolicitantes(clienteId).subscribe((res) => {
          this.todosSolicitantes = res.solicitantes || res || [];
          this.filtradosSolicitantes = [...this.todosSolicitantes];
          console.log(this.filtradosSolicitantes)
        },
          (error) => {
            console.error('Error al cargar solicitantes:', error);
          }
        );
      } else {
        this.todosSolicitantes = [];
        this.filtradosSolicitantes = [];
      }
    });

    this.username = localStorage.getItem('username') || '';
    this.tecnicoId = localStorage.getItem('tecnicoId') || '';

    if (!this.tecnicoId) {
      this.showToast('El técnico no está registrado correctamente. Intenta iniciar sesión nuevamente.');
      this.router.navigate(['/home']);
    }

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    if (this.username && allHistorial[this.username]) {
      this.visitas = allHistorial[this.username];
    } else {
      this.visitas = [];
    }
  }

  // ✅ NUEVO: Método para cargar Capacitor Geolocation solo cuando sea necesario
  private async cargarGeolocationCapacitor(): Promise<any> {
    if (this.platform.is('capacitor') && (this.platform.is('ios') || this.platform.is('android'))) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        return Geolocation;
      } catch (error) {
        console.warn('No se pudo cargar Capacitor Geolocation:', error);
        return null;
      }
    }
    return null;
  }

  // ✅ NUEVO: Método para solicitar permisos de ubicación (CORREGIDO)
  async solicitarPermisosUbicacion(): Promise<boolean> {
    try {
      // Verificar si estamos en un dispositivo nativo
      if (this.platform.is('capacitor')) {
        // Para iOS y Android con Capacitor
        const permStatus = await Geolocation.requestPermissions();

        if (permStatus.location === 'granted') {
          console.log('✅ Permisos de ubicación concedidos');
          return true;
        } else {
          console.warn('❌ Permisos de ubicación denegados');

          // Mostrar alerta para dirigir a ajustes
          const alert = await this.alertController.create({
            header: 'Permisos de Ubicación Requeridos',
            message: 'Esta aplicación necesita acceso a tu ubicación para registrar las visitas. Por favor, activa los permisos de ubicación en Configuración.',
            buttons: [
              {
                text: 'Cancelar',
                role: 'cancel'
              },
              {
                text: 'Abrir Configuración',
                handler: () => {
                  this.abrirConfiguracionUbicacion();
                }
              }
            ]
          });
          await alert.present();
          return false;
        }
      } else {
        // Para navegador web
        return await this.solicitarPermisosNavegador();
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      this.showToast('Error al solicitar permisos de ubicación');
      return false;
    }
  }

  // ✅ NUEVO: Método para solicitar permisos en navegador
  // ✅ NUEVO: Método para solicitar permisos en navegador
  private async solicitarPermisosNavegador(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.showToast('Geolocalización no soportada en este navegador');
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          // Éxito - permisos concedidos
          resolve(true);
        },
        (error) => {
          // Error - permisos denegados
          let mensaje = 'Permisos de ubicación denegados';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              mensaje = 'Permisos de ubicación denegados. Por favor, habilítalos en la configuración de tu navegador.';
              break;
            case error.POSITION_UNAVAILABLE:
              mensaje = 'Información de ubicación no disponible.';
              break;
            case error.TIMEOUT:
              mensaje = 'Tiempo de espera agotado al obtener ubicación.';
              break;
          }
          this.showToast(mensaje);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }

  // ✅ NUEVO: Método para abrir configuración del dispositivo
  private async abrirConfiguracionUbicacion(): Promise<void> {
    try {
      // Siempre proporcionar ambas propiedades
      await NativeSettings.open({
        optionAndroid: AndroidSettings.Location,
        optionIOS: IOSSettings.App // Usar una opción válida para iOS
      });
    } catch (error) {
      console.error('Error abriendo configuración:', error);
      this.showToast('No se pudo abrir la configuración');
    }
  }

  // Método para obtener dirección con Ionic Native
  // ✅ MODIFICADO: Método obtenerDireccion con verificación de permisos
  async obtenerDireccion(): Promise<void> {
    this.isLoadingLocation = true;
    this.ubicacionObtenida = false;

    try {
      // 1. Solicitar permisos primero
      const permisosConcedidos = await this.solicitarPermisosUbicacion();
      if (!permisosConcedidos) {
        this.showToast('No se pueden obtener coordenadas sin permisos');
        return;
      }

      let lat: number, lon: number;

      // 2. Obtener coordenadas según la plataforma
      if (this.platform.is('capacitor') && (this.platform.is('ios') || this.platform.is('android'))) {
        // Usar Capacitor Geolocation para dispositivos nativos
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      } else {
        // Usar API del navegador para web
        const position = await this.obtenerPosicionNavegador();
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      }

      console.log('📍 Coordenadas obtenidas:', lat, lon);

      // ✅ GUARDAR COORDENADAS PARA EL BACKEND
      this.latitud = lat;
      this.longitud = lon;

      // ✅ OBTENER DIRECCIÓN EXACTA SOLO PARA MOSTRAR AL USUARIO
      try {
        this.direccionExacta = await this.obtenerDireccionExactaSantiago(lat, lon);
      } catch (error) {
        console.warn('No se pudo obtener dirección exacta, usando formato limpio:', error);
        this.direccionExacta = this.generarUbicacionSantiago(lat, lon);
      }

      this.visitaForm.get('direccion_visita')?.setValue(this.direccionExacta);
      this.ubicacionObtenida = true;

      console.log('✅ Dirección exacta:', this.direccionExacta);
      this.showToast(`📍 Ubicación obtenida: ${this.direccionExacta}`);

    } catch (error: any) {
      console.error('❌ Error obteniendo ubicación:', error);

      // Mensajes de error más específicos
      if (error.message.includes('Permission denied') || error.code === 1) {
        this.showToast('Permisos de ubicación denegados. Por favor, habilítalos en configuración.');
      } else if (error.message.includes('Timeout') || error.code === 3) {
        this.showToast('Tiempo de espera agotado. Verifica tu conexión y GPS.');
      } else {
        this.showToast('Error al obtener la ubicación: ' + error.message);
      }

      this.direccionExacta = 'Ubicación no disponible';
      this.visitaForm.get('direccion_visita')?.setValue(this.direccionExacta);
      this.ubicacionObtenida = false;
    } finally {
      this.isLoadingLocation = false;
    }
  }

  // ✅ NUEVO: Método para verificar estado de permisos
  async verificarEstadoPermisos(): Promise<string> {
    try {
      if (this.platform.is('capacitor')) {
        const permStatus = await Geolocation.checkPermissions();
        return permStatus.location || 'denied';
      } else {
        // Para navegador, no hay forma directa de verificar sin intentar obtener ubicación
        return 'unknown';
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return 'error';
    }
  }

  async forzarSolicitudPermisos() {
    const alert = await this.alertController.create({
      header: 'Permisos de Ubicación',
      message: 'Esta aplicación necesita acceso a tu ubicación para registrar las visitas técnicas. ¿Quieres activar los permisos ahora?',
      buttons: [
        {
          text: 'Ahora no',
          role: 'cancel'
        },
        {
          text: 'Solicitar Permisos',
          handler: async () => {
            const concedidos = await this.solicitarPermisosUbicacion();
            if (concedidos) {
              this.showToast('✅ Permisos concedidos. Ahora puedes obtener tu ubicación.');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ✅ MÉTODO ESPECÍFICO PARA SANTIAGO
  private async obtenerDireccionSantiago(lat: number, lon: number): Promise<string> {
    // Verificar que las coordenadas estén en el área de Santiago
    if (!this.estaEnSantiago(lat, lon)) {
      return this.generarUbicacionSantiago(lat, lon);
    }

    // Intentar con OpenStreetMap para dirección exacta
    try {
      const direccionExacta = await this.obtenerDireccionExactaSantiago(lat, lon);
      if (direccionExacta && direccionExacta.length > 15) {
        return direccionExacta;
      }
    } catch (error) {
      console.warn('No se pudo obtener dirección exacta:', error);
    }

    // Fallback: Ubicación aproximada en Santiago
    return this.generarUbicacionSantiago(lat, lon);
  }

  // ✅ VERIFICAR SI ESTÁ EN SANTIAGO
  private estaEnSantiago(lat: number, lon: number): boolean {
    // Coordenadas del área metropolitana de Santiago
    const esLatitudValida = lat > -33.6 && lat < -33.3;
    const esLongitudValida = lon > -70.9 && lon < -70.5;
    return esLatitudValida && esLongitudValida;
  }

  // ✅ OBTENER DIRECCIÓN EXACTA EN SANTIAGO
  private async obtenerDireccionExactaSantiago(lat: number, lon: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RidsMovilApp/1.0 (app@rids.cl)'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return this.formatearDireccionSantiago(data);
  }

  // ✅ FORMATEADOR ESPECIALIZADO EN SANTIAGO
  private formatearDireccionSantiago(data: any): string {
    const address = data.address;
    const partes = [];

    // Calle y número
    if (address.road) {
      let calle = address.road;
      if (address.house_number) {
        calle += ` #${address.house_number}`;
      }
      partes.push(calle);
    }

    // Comuna
    if (address.suburb) {
      partes.push(address.suburb);
    } else if (address.city_district) {
      partes.push(address.city_district);
    } else if (address.municipality) {
      partes.push(address.municipality);
    }

    // Siempre agregar "Santiago"
    if (!partes.includes('Santiago')) {
      partes.push('Santiago');
    }

    // Agregar región
    partes.push('Región Metropolitana');

    return partes.join(', ');
  }

  // ✅ GENERAR DESCRIPCIÓN DE UBICACIÓN EN SANTIAGO
  private generarUbicacionSantiago(lat: number, lon: number): string {
    const fecha = new Date().toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const comuna = this.detectarComunaSantiago(lat, lon);

    return `${comuna}, Santiago, Región Metropolitana`;
  }

  // ✅ DETECTOR DE COMUNAS DE SANTIAGO (MUCHO MÁS PRECISO)
  private detectarComunaSantiago(lat: number, lon: number): string {
    // Coordenadas aproximadas de comunas de Santiago
    // Basado en ubicaciones geográficas reales

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

  // ✅ Método auxiliar para mostrar alertas de ubicación
  private async mostrarAlertaUbicacion(mensaje: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Ubicación no disponible',
      message: mensaje,
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  // ✅ Método para obtener posición en navegadores (sin cambios)
  private obtenerPosicionNavegador(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation no es soportado por este navegador'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          let errorMessage = 'Error desconocido';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Usuario denegó los permisos de ubicación';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Información de ubicación no disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado al obtener ubicación';
              break;
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  // Método para obtener dirección desde coordenadas
  async obtenerDireccionDesdeCoordenadas(latitud: number, longitud: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitud}&lon=${longitud}&accept-language=es`
      );

      const data = await response.json();
      return data.display_name || 'Dirección no disponible';
    } catch (error) {
      console.warn('No se pudo obtener la dirección:', error);
      return 'Dirección no disponible';
    }
  }

  // Mostrar error de ubicación
  mostrarErrorUbicacion() {
    this.showToast('No se pudo obtener la dirección. Verifica los permisos de ubicación.');
  }

  private cargarVisitaEnCurso(): void {
    if (this.visitaState.tieneVisitaEnCurso()) {
      const state = this.visitaState.getCurrentState();

      this.visitaId = state.visitaId;
      this.inicio = state.inicio;
      this.visitaEnCurso = true;
      this.estado = 'En curso';
      this.estadoTexto = 'Tienes una visita en curso.';
      this.empresaId = state.empresaId || 0;

      // ✅ CARGAR COORDENADAS DESDE EL ESTADO
      if (state.coordenadas) {
        this.latitud = state.coordenadas.lat;
        this.longitud = state.coordenadas.lon;
        console.log('📍 Coordenadas cargadas desde estado:', this.latitud, this.longitud);
      }

      if (state.direccion_visita) {
        this.ubicacionObtenida = true;
        this.direccionExacta = state.direccion_visita;
        console.log('📍 Dirección cargada desde estado:', this.direccionExacta);
      }

      this.restaurarFormularioDesdeEstado(state);
      this.showToast('Visita en curso recuperada');
    }
  }

  private restaurarFormularioDesdeEstado(state: any): void {
    if (state.clienteId) {
      this.visitaForm.patchValue({
        cliente: state.clienteId
      });

      this.cargarSolicitantesPorCliente(state.clienteId, state.solicitantes);
    }

    if (state.actividades) {
      this.visitaForm.patchValue({
        actividades: state.actividades
      });
    }

    if (state.datosFormulario) {
      this.visitaForm.patchValue(state.datosFormulario);
    }

    if (state.direccion_visita) {
      this.visitaForm.patchValue({
        direccion_visita: state.direccion_visita
      });
    }
  }

  private cargarSolicitantesPorCliente(clienteId: number, solicitantesGuardados?: any[]): void {
    this.api.getSolicitantes(clienteId).subscribe(
      (res) => {
        this.todosSolicitantes = res.solicitantes || res || [];
        this.filtradosSolicitantes = [...this.todosSolicitantes];

        if (solicitantesGuardados && solicitantesGuardados.length > 0) {
          this.visitaForm.patchValue({
            solicitante: solicitantesGuardados
          });
          this.nombreSolicitanteSeleccionado = solicitantesGuardados
            .map((s: any) => s.nombre)
            .join(', ');
        }
      },
      (error) => {
        console.error('Error al cargar solicitantes:', error);
      }
    );
  }

  abrirListaSolicitantes() {
    if (!this.visitaForm.get('cliente')?.value) {
      this.showToast('Debes seleccionar una empresa antes de elegir un solicitante.');
      return;
    }
    this.mostrarListaSolicitantes = !this.mostrarListaSolicitantes;
  }

  seleccionarSolicitante(s: any) {
    const seleccionActual = this.visitaForm.get('solicitante')?.value || [];
    const existe = seleccionActual.find((item: any) => item.id_solicitante === s.id_solicitante);

    let nuevaSeleccion;

    if (existe) {
      nuevaSeleccion = seleccionActual.filter((item: any) => item.id_solicitante !== s.id_solicitante);
    } else {
      nuevaSeleccion = [...seleccionActual, s];
    }

    this.visitaForm.get('solicitante')?.setValue(nuevaSeleccion);
    this.nombreSolicitanteSeleccionado = nuevaSeleccion.map((item: any) => item.nombre).join(', ');

    if (this.visitaEnCurso) {
      this.visitaState.agregarSolicitantes(nuevaSeleccion);
    }
  }

  filtrarSolicitantes() {
    const term = this.visitaForm.get('busquedaSolicitante')?.value.toLowerCase() || '';
    this.filtradosSolicitantes = this.todosSolicitantes.filter((s: any) =>
      s.nombre.toLowerCase().includes(term)
    );
    console.log('Solicitantes filtrados:', this.filtradosSolicitantes);
  }

  esSolicitanteSeleccionado(s: any): boolean {
    return this.visitaForm.value.solicitante?.some(
      (item: any) => item.id_solicitante === s.id_solicitante
    );
  }

  eliminarSolicitante(s: any) {
    const actual = this.visitaForm.value.solicitante || [];
    const filtrados = actual.filter(
      (item: any) => item.id_solicitante !== s.id_solicitante
    );
    this.visitaForm.patchValue({ solicitante: filtrados });

    if (this.visitaEnCurso) {
      this.visitaState.agregarSolicitantes(filtrados);
    }
  }

  // Iniciar visita con obtención automática de dirección
  async iniciarVisita() {
    const clienteId = this.visitaForm.value.cliente;
    console.log('Cliente seleccionado para iniciar visita:', clienteId);
    const clienteObj = this.clientes.find(c => c.id_empresa === clienteId);
    console.log('Cliente encontrado:', clienteObj);

    if (!clienteObj) {
      this.showToast('Por favor, selecciona un cliente válido antes de iniciar la visita.');
      return;
    }

    this.inicio = new Date();
    this.fin = null;
    this.visitaEnCurso = true;
    this.estado = 'En curso';
    this.estadoTexto = 'La visita está en curso.';

    // ✅ ENVIAR SOLO COORDENADAS AL BACKEND
    const coordenadasParaBackend = this.latitud && this.longitud
      ? `${this.latitud},${this.longitud}`
      : null;

    const visitaData = {
      empresaId: clienteId,
      solicitante: this.visitaForm.value.solicitante,
      inicio: this.inicio,
      tecnicoId: this.tecnicoId,
      direccion_visita: coordenadasParaBackend  // ← Solo coordenadas
    };

    console.log('🎯 DATOS ENVIADOS AL BACKEND:');
    console.log('- empresaId:', visitaData.empresaId);
    console.log('- direccion_visita (coordenadas):', visitaData.direccion_visita);
    console.log('- Dirección mostrada al usuario:', this.direccionExacta);
    console.log('- JSON completo:', JSON.stringify(visitaData, null, 2));

    this.api.crearVisita(visitaData).subscribe(
      (response: any) => {
        this.estado = 'En curso';
        this.estadoTexto = 'La visita ha comenzado.';
        this.visitaId = response.visita.id_visita;
        console.log('Visita ID asignada:', this.visitaId);

        this.visitaState.iniciarVisita({
          visitaId: this.visitaId,
          empresaId: clienteObj.id_empresa,
          clienteId: clienteId,
          direccion_visita: this.direccionExacta,  // Dirección para el frontend
          coordenadas: {
            lat: this.latitud,
            lon: this.longitud
          }
        });

        if (this.visitaForm.value.solicitante) {
          this.visitaState.agregarSolicitantes(this.visitaForm.value.solicitante);
        }

        this.visitaState.agregarActividades(this.visitaForm.get('actividades')?.value);
        this.showToast('Visita iniciada correctamente.');
      },
      async (error) => {
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'No se pudo iniciar la visita. Intenta de nuevo.',
          buttons: ['Aceptar']
        });
        await alert.present();
        console.error('Error al iniciar la visita:', error);
      }
    );
  }

  // Terminar visita con obtención automática de dirección actualizada
  async terminarVisita() {
    if (!this.visitaId) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se ha iniciado ninguna visita. Por favor, inicia una visita antes de finalizarla.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    this.visitaForm.markAllAsTouched();
    if (this.visitaForm.invalid) {
      const alert = await this.alertController.create({
        header: 'Formulario incompleto',
        message: 'Por favor, completa todos los campos obligatorios antes de terminar la visita.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    // Obtener dirección actualizada al finalizar
    await this.obtenerDireccion();

    this.fin = new Date();
    this.visitaEnCurso = false;
    this.estado = 'Completada';
    this.estadoTexto = 'La visita ha sido registrada.';

    const actividades = this.visitaForm.get('actividades')?.value || {};
    const seleccion = this.visitaForm.get('solicitante')?.value as any[];

    if (!Array.isArray(seleccion) || seleccion.length === 0) {
      this.showToast('Por favor, selecciona al menos un solicitante.');
      return;
    }

    // ✅ SOLUCIÓN: Formatear coordenadas para el backend
    const coordenadasParaBackend = this.latitud && this.longitud
      ? `${this.latitud},${this.longitud}`
      : null;

    const data = {
      confImpresoras: actividades.impresoras,
      confTelefonos: actividades.telefonos,
      confPiePagina: actividades.pie,
      otros: actividades.otros,
      ccleaner: actividades.ccleaner,
      actualizaciones: actividades.actualizaciones,
      antivirus: actividades.antivirus,
      estadoDisco: actividades.estadoDisco,
      licenciaWindows: actividades.licenciaWindows,
      licenciaOffice: actividades.licenciaOffice,
      rendimientoEquipo: actividades.rendimientoEquipo,
      mantenimientoReloj: actividades.mantenimientoReloj,
      ecografo: actividades.ecografo,
      otrosDetalle: this.visitaForm.value.otrosDetalle,
      solicitantes: seleccion,
      direccion_visita: coordenadasParaBackend  // ← Solo coordenadas
    };

    console.log('🎯 DATOS FINALIZACIÓN:');
    console.log('- direccion_visita (coordenadas para backend):', data.direccion_visita);
    console.log('- Dirección mostrada al usuario:', this.direccionExacta);

    this.api.completarVisita(this.visitaId, data).subscribe(
  (response: any) => {
    console.log('✅ RESPUESTA BACKEND:', response);
    this.guardarVisita();
    this.visitaState.clearState();
    this.showToast('Visita finalizada con éxito');
  },
  async (err) => {
    console.error('❌ completarVisita error:', err);
    const detalle = (() => {
      try { return JSON.stringify(err?.error || err, null, 2).slice(0, 1200); } catch { return String(err); }
    })();
    const alert = await this.alertController.create({
      header: `Error al guardar (${err?.status || 'sin status'})`,
      message: `<pre style="white-space:pre-wrap">${detalle}</pre>`,
      buttons: ['OK']
    });
    await alert.present();
    this.showToast('No se pudo finalizar la visita.');
  }
);

  }

  resetFormulario() {
    this.visitaForm.reset();
    this.inicio = null;
    this.fin = null;
    this.visitaEnCurso = false;
    this.estado = 'Sin iniciar';
    this.estadoTexto = 'Listo para iniciar una visita.';
    this.visitaId = null;
    this.filtradosSolicitantes = [];
    this.ubicacionObtenida = false;

    this.visitaState.clearState();
  }

  minWordsValidator(minWords: number, minChars: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || typeof control.value !== 'string') {
        return { minWordsOrChars: true };
      }
      const wordCount = control.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      const charCount = control.value.trim().length;
      return (wordCount < minWords && charCount < minChars) ? { minWordsOrChars: true } : null;
    };
  }

  guardarVisita() {
    const inicioFmt = this.inicio ? this.datePipe.transform(this.inicio, 'dd/MM/yyyy HH:mm', '', 'es-CL') : null;
    const finFmt = this.fin ? this.datePipe.transform(this.fin, 'dd/MM/yyyy HH:mm', '', 'es-CL') : null;

    const data = {
      ...this.visitaForm.value,
      inicio: inicioFmt,
      fin: finFmt,
      username: this.username
    };

    this.visitas.push(data);

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    await toast.present();
  }
}