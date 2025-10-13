import { DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api';
import localeEsCl from '@angular/common/locales/es-CL';

registerLocaleData(localeEsCl, 'es-CL');

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: false,
})
export class FormularioVisitasPage implements OnInit {
  visitaId: number | null = null;
  visitaForm: FormGroup;
  visitas: any[] = [];
  filtradosSolicitantes: any[] = [];
  todosSolicitantes: any[] = []; // Aquí almacenamos todos los solicitantes

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
  empresaId: number = 0;  // Guardar el ID de la empresa seleccionada

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private alertController: AlertController,
    private router: Router,
    private api: ApiService,
    private toastController: ToastController,
  ) {
    // Inicializar el formulario con validaciones
    this.visitaForm = this.fb.group({
      cliente: ['', Validators.required],
      solicitante: [[], Validators.required],
      busquedaSolicitante: [''],
      actividades: this.fb.group({
        impresoras: [false],
        telefonos: [false],
        pie: [false],
        otros: [false],
        ccleaner: [true],    // Todos seleccionados por defecto
        actualizaciones: [true],  // Todos seleccionados por defecto
        estadoDisco: [true], // Todos seleccionados por defecto
        antivirus: [true],   // Todos seleccionados por defecto
        licenciaWindows: [true], // Todos seleccionados por defecto
        licenciaOffice: [true],  // Todos seleccionados por defecto
        rendimientoEquipo: [true],  // Todos seleccionados por defecto
        mantenimientoReloj: [true]  // Todos seleccionados por defecto
      }),
      otrosDetalle: [''],
    });

    // Limpiar "otrosDetalle" si "otros" cambia a false
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
  }

  ngOnInit() {
    // Cargar clientes
    this.api.getClientes().subscribe(
      (data) => {
        console.log('Clientes cargados:', data);
        this.clientes = data;
      },
      (error) => {
        console.error('Error al cargar clientes', error);
      }
    );

    // Recuperar datos existentes si es necesario
    if (this.visitaId) {
      this.api.crearVisita(this.visitaId).subscribe((visitaData) => {
        const actividades = visitaData.actividades || {};
        // Si existen actividades previas, actualizar los valores
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
    // Actualizar solicitantes cuando se seleccione un cliente
    this.visitaForm.get('cliente')?.valueChanges.subscribe(clienteId => {
      console.log('Cliente seleccionado:', clienteId);
      this.empresaId = clienteId; // Asegúrate de que este valor esté siendo asignado correctamente
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


    // Obtener datos técnicos del localStorage
    this.username = localStorage.getItem('username') || '';
    this.tecnicoId = localStorage.getItem('tecnicoId') || '';

    if (!this.tecnicoId) {
      this.showToast('El técnico no está registrado correctamente. Intenta iniciar sesión nuevamente.');
      this.router.navigate(['/login']);
    }

    // Cargar historial local
    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    if (this.username && allHistorial[this.username]) {
      this.visitas = allHistorial[this.username];
    } else {
      this.visitas = [];
    }

  }
  // Método para mostrar/ocultar la lista de solicitantes
  abrirListaSolicitantes() {
    if (!this.visitaForm.get('cliente')?.value) {
      this.showToast('Debes seleccionar una empresa antes de elegir un solicitante.');
      return;
    }
    this.mostrarListaSolicitantes = !this.mostrarListaSolicitantes;
  }

  // Método para seleccionar un solicitante de la lista
  seleccionarSolicitante(s: any) {
    const seleccionActual = this.visitaForm.get('solicitante')?.value || [];
    const existe = seleccionActual.find((item: any) => item.id_solicitante === s.id_solicitante);

    let nuevaSeleccion;

    if (existe) {
      // Si ya está seleccionado, lo quitamos
      nuevaSeleccion = seleccionActual.filter((item: any) => item.id_solicitante !== s.id_solicitante);
    } else {
      // Si no está seleccionado, lo agregamos
      nuevaSeleccion = [...seleccionActual, s];
    }

    this.visitaForm.get('solicitante')?.setValue(nuevaSeleccion);

    // Actualiza el texto mostrado con los nombres seleccionados
    this.nombreSolicitanteSeleccionado = nuevaSeleccion.map((item: any) => item.nombre).join(', ');
  }

  // Método para filtrar solicitantes según la búsqueda
  filtrarSolicitantes() {
    const term = this.visitaForm.get('busquedaSolicitante')?.value.toLowerCase() || '';
    this.filtradosSolicitantes = this.todosSolicitantes.filter((s: any) =>
      s.nombre.toLowerCase().includes(term)
    );
    console.log('Solicitantes filtrados:', this.filtradosSolicitantes);  // Verificar resultados filtrados
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

    // Datos para la creación de la visita
    const visitaData = {
      cliente: clienteId,
      solicitante: this.visitaForm.value.solicitante,
      realizado: this.visitaForm.value.realizado,
      inicio: this.inicio,
      tecnicoId: this.tecnicoId,
      empresaId: clienteObj.id_empresa
    };

    // Llamada a la API para crear la visita
    this.api.crearVisita(visitaData).subscribe(
      (response: any) => {
        this.estado = 'En curso';
        this.estadoTexto = 'La visita ha comenzado.';
        this.visitaId = response.visita.id_visita;
        console.log('Visita ID asignada:', this.visitaId);
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

  // Método para terminar la visita
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

    // Finalizar la visita
    this.fin = new Date();
    this.visitaEnCurso = false;
    this.estado = 'Completada';
    this.estadoTexto = 'La visita ha sido registrada.';
    const actividades = this.visitaForm.get('actividades')?.value || {};
    const solicitante = this.visitaForm.get('solicitante')?.value;

    console.log('Solicitante seleccionado:', solicitante)

    if (!solicitante || solicitante.length === 0) {
      this.showToast('Por favor, selecciona al menos un solicitante.');
      return;
    }

    // Datos para completar la visita
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
      solicitante,
      realizado: this.visitaForm.value.realizado
    };

    // Llamada a la API para completar la visita
    this.api.completarVisita(this.visitaId, data).subscribe(
      (response: any) => {
        this.guardarVisita();
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

  // Método para reiniciar el formulario
  resetFormulario() {
    this.visitaForm.reset();
    this.inicio = null;
    this.fin = null;
    this.visitaEnCurso = false;
    this.estado = 'Sin iniciar';
    this.estadoTexto = 'Listo para iniciar una visita.';
    this.visitaId = null;
    this.filtradosSolicitantes = [];
  }

  // Validador personalizado para mínimo de palabras y caracteres
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

  // Método para guardar la visita en el almacenamiento local
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

    // Guardar en localStorage
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
