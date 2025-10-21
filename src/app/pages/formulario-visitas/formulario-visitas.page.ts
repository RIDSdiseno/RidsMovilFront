import { DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api';
import { VisitaStateService } from 'src/app/services/visita-state'; // ✅ AGREGAR
import { Subscription } from 'rxjs'; // ✅ AGREGAR
import { debounceTime } from 'rxjs/operators'; // ✅ AGREGAR
import localeEsCl from '@angular/common/locales/es-CL';

registerLocaleData(localeEsCl, 'es-CL');

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: false,
})
export class FormularioVisitasPage implements OnInit, OnDestroy { // ✅ AGREGAR OnDestroy

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

  // ✅ AGREGAR: Suscripciones para auto-guardado
  private formSubscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private alertController: AlertController,
    private router: Router,
    private api: ApiService,
    private toastController: ToastController,
    private visitaState: VisitaStateService // ✅ AGREGAR
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
        mantenimientoReloj: [true]
      }),
      otrosDetalle: [''],
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

    // ✅ AGREGAR: Configurar auto-guardado
    this.setupAutoSave();
  }

  // ✅ AGREGAR: Método para configurar auto-guardado
  private setupAutoSave(): void {
    // Guardar cambios en actividades
    const actividadesSub = this.visitaForm.get('actividades')?.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(actividades => {
        if (this.visitaEnCurso) {
          this.visitaState.agregarActividades(actividades);
        }
      });

    // Guardar otros detalles
    const otrosDetalleSub = this.visitaForm.get('otrosDetalle')?.valueChanges
      .pipe(debounceTime(1000))
      .subscribe(otrosDetalle => {
        if (this.visitaEnCurso) {
          this.visitaState.guardarProgresoFormulario({ otrosDetalle });
        }
      });

    // Guardar cambios en cliente
    const clienteSub = this.visitaForm.get('cliente')?.valueChanges
      .subscribe(clienteId => {
        if (this.visitaEnCurso && clienteId) {
          this.visitaState.guardarProgresoFormulario({ cliente: clienteId });
        }
      });

    // Agregar suscripciones al array para limpiar después
    [actividadesSub, otrosDetalleSub, clienteSub].forEach(sub => {
      if (sub) this.formSubscriptions.push(sub);
    });
  }

  // ✅ AGREGAR: Limpiar suscripciones
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

    // ✅ AGREGAR: Cargar visita en curso al iniciar
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
            mantenimientoReloj: actividades.mantenimientoReloj ?? true
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

  // ✅ AGREGAR: Método para cargar visita en curso
  private cargarVisitaEnCurso(): void {
    if (this.visitaState.tieneVisitaEnCurso()) {
      const state = this.visitaState.getCurrentState();

      // Restaurar variables del componente
      this.visitaId = state.visitaId;
      this.inicio = state.inicio;
      this.visitaEnCurso = true;
      this.estado = 'En curso';
      this.estadoTexto = 'Tienes una visita en curso.';
      this.empresaId = state.empresaId || 0;

      // Restaurar formulario
      this.restaurarFormularioDesdeEstado(state);

      this.showToast('Visita en curso recuperada');
    }
  }

  // ✅ AGREGAR: Método para restaurar formulario desde estado
  private restaurarFormularioDesdeEstado(state: any): void {
    // Restaurar cliente
    if (state.clienteId) {
      this.visitaForm.patchValue({
        cliente: state.clienteId
      });

      // Cargar solicitantes para restaurar selección
      this.cargarSolicitantesPorCliente(state.clienteId, state.solicitantes);
    }

    // Restaurar actividades
    if (state.actividades) {
      this.visitaForm.patchValue({
        actividades: state.actividades
      });
    }

    // Restaurar otros datos del formulario
    if (state.datosFormulario) {
      this.visitaForm.patchValue(state.datosFormulario);
    }
  }

  // ✅ AGREGAR: Método para cargar solicitantes y restaurar selección
  private cargarSolicitantesPorCliente(clienteId: number, solicitantesGuardados?: any[]): void {
    this.api.getSolicitantes(clienteId).subscribe(
      (res) => {
        this.todosSolicitantes = res.solicitantes || res || [];
        this.filtradosSolicitantes = [...this.todosSolicitantes];

        // Restaurar solicitantes seleccionados si existen
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

  // Los demás métodos se mantienen igual...
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

    // ✅ AGREGAR: Guardar en estado si hay visita en curso
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

    // ✅ AGREGAR: Guardar en estado si hay visita en curso
    if (this.visitaEnCurso) {
      this.visitaState.agregarSolicitantes(filtrados);
    }
  }

  iniciarVisita() {
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

    const visitaData = {
      cliente: clienteId,
      solicitante: this.visitaForm.value.solicitante,
      realizado: this.visitaForm.value.realizado,
      inicio: this.inicio,
      tecnicoId: this.tecnicoId,
      empresaId: clienteObj.id_empresa
    };

    this.api.crearVisita(visitaData).subscribe(
      (response: any) => {
        this.estado = 'En curso';
        this.estadoTexto = 'La visita ha comenzado.';
        this.visitaId = response.visita.id_visita;
        console.log('Visita ID asignada:', this.visitaId);

        // ✅ AGREGAR: Guardar en el servicio de estado
        this.visitaState.iniciarVisita({
          visitaId: this.visitaId,
          empresaId: clienteObj.id_empresa,
          clienteId: clienteId
        });

        // ✅ AGREGAR: Guardar datos iniciales en el estado
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

    this.fin = new Date();
    this.visitaEnCurso = false;
    this.estado = 'Completada';
    this.estadoTexto = 'La visita ha sido registrada.';
    const actividades = this.visitaForm.get('actividades')?.value || {};
    const solicitante = this.visitaForm.get('solicitante')?.value;

    console.log('Solicitante seleccionado:', solicitante)

    const seleccion = this.visitaForm.get('solicitante')?.value as any[];
    if (!Array.isArray(seleccion) || seleccion.length === 0) {
      this.showToast('Por favor, selecciona al menos un solicitante.');
      return;
    }
    console.log('Solicitante seleccionado:', seleccion)
    // Datos para completar la visita
    if (!solicitante || solicitante.length === 0) {
      this.showToast('Por favor, selecciona al menos un solicitante.');
      return;
    }

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
      otrosDetalle: this.visitaForm.value.otrosDetalle,
      solicitantes: seleccion,
      realizado: this.visitaForm.value.realizado
    };

    this.api.completarVisita(this.visitaId, data).subscribe(
      (response: any) => {
        this.guardarVisita();

        // ✅ AGREGAR: Limpiar estado persistente
        this.visitaState.clearState();

        this.showToast('Visita finalizada con éxito');
      },
      async (error) => {
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'No se pudo finalizar la visita. Intenta de nuevo.',
          buttons: ['Aceptar']
        });
        await alert.present();
        console.error('Error al finalizar la visita:', error);
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

    // ✅ AGREGAR: Limpiar estado persistente
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