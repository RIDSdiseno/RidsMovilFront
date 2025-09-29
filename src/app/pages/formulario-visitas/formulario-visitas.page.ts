import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api';
import localeEsCl from '@angular/common/locales/es-CL';
import { AlertController } from '@ionic/angular';
import { ToastController } from '@ionic/angular';

registerLocaleData(localeEsCl, 'es-CL');

enum EstadoVisita {
  SIN_INICIAR = 'Sin iniciar',
  EN_CURSO = 'En curso',
  COMPLETADA = 'Completada'
}

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: false,
})
export class FormularioVisitasPage implements OnInit {
  visitaId: number | null = null; // Aquí definimos la propiedad visitaId
  visitaForm: FormGroup;
  visitas: any[] = [];
  clientes: any[] = [];

  inicio: Date | null = null;
  fin: Date | null = null;
  estado: EstadoVisita = EstadoVisita.SIN_INICIAR;
  estadoTexto: string = 'Listo para iniciar una visita.';
  visitaEnCurso = false;
  username: string = '';
  tecnicoId: string = '';  // Variable para almacenar el ID del técnico

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private api: ApiService,
    private router: Router,
    private api: ApiService,
    private toastController: ToastController
    private alertController: AlertController
  ) {
    this.visitaForm = this.fb.group({
      cliente: ['', Validators.required],
      cliente: ['', Validators.required],
      solicitante: ['', Validators.required],
      actividades: this.fb.group({
        impresoras: [false],
        telefonos: [false],
        pie: [false],
        otros: [false],
      }),
      otrosDetalle: [''],
      realizado: ['', [Validators.required, this.minWordsValidator(2, 10)]],
    });
  }

  ngOnInit() {
    this.username = (localStorage.getItem('username') || '').toLowerCase();
    this.api.getClientes().subscribe(
      (data) => {
        this.clientes = data;
      },
      (error) => {
        console.error('Error al cargar clientes', JSON.stringify(error));
      }
      
      (data) => this.clientes = data,
      (error) => console.error('Error al cargar clientes', error)
    );
      this.selectedCliente = this.selectedCliente || null;
      console.log('Selected cliente en ngOnInit:', this.selectedCliente);

    this.setupOtrosDetalleValidation();
    this.visitaForm.disable(); // Deshabilitado por defecto
    // Verificar si el técnico está correctamente logueado y obtener sus datos
    this.username = localStorage.getItem('username') || '';
    this.tecnicoId = localStorage.getItem('tecnicoId') || '';

    if (!this.tecnicoId) {
      this.showToast('El técnico no está registrado correctamente. Intenta iniciar sesión nuevamente.');
      this.router.navigate(['/login']);  // Redirigir al login si el técnico no está registrado
    }

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    if (this.username && allHistorial[this.username]) {
      this.visitas = allHistorial[this.username];
    } else {
      this.visitas = [];
    }
  }

  iniciarVisita() {
    this.inicio = new Date();
    this.visitaEnCurso = true;
    this.fin = null;
    this.estado = EstadoVisita.EN_CURSO;
    this.estadoTexto = 'La visita está en curso.';
    this.visitaForm.enable();
  }
iniciarVisita() {
  if (!this.selectedCliente || !this.selectedCliente.id) {
    this.showToast('Por favor, selecciona un cliente antes de iniciar la visita.');
    return;
  }

  this.inicio = new Date();
  this.fin = null;
  this.visitaEnCurso = true;
  this.estado = 'En curso';
  this.estadoTexto = 'La visita está en curso.';

  // Enviar solo el ID de la empresa al backend
  const visitaData = {
    cliente: this.selectedCliente.id,  // Solo pasamos el ID de la empresa
    solicitante: this.visitaForm.value.solicitante,
    realizado: this.visitaForm.value.realizado,
    inicio: this.inicio,
    tecnicoId: this.tecnicoId,  // Incluimos el técnico
    empresaId: this.selectedCliente.id  // El cliente es la empresa
  };

  this.api.crearVisita(visitaData).subscribe(
    (response: any) => {
      console.log('Visita iniciada correctamente:', response);
      this.estado = 'En curso';
      this.estadoTexto = 'La visita ha comenzado.';

      // Guardamos el ID de la visita después de crearla
      this.visitaId = response.visita.id; // Guarda el ID de la visita creada
      console.log('ID de la visita creada:', this.visitaId);  // Para confirmar que se guarda correctamente
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

  // Verificar que el formulario esté completo
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
  async terminarVisita() {
    // Marca todos los campos como tocados para activar validaciones en la UI
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

  // Datos para enviar al backend
  const data = {
    confImpresoras: this.visitaForm.value.impresoras,
    confTelefonos: this.visitaForm.value.telefonos,
    confPiePagina: this.visitaForm.value.pie,
    otros: this.visitaForm.value.otros,
    otrosDetalle: this.visitaForm.value.otrosDetalle,
    solicitante: this.visitaForm.value.solicitante, // Asegúrate de que esto se incluya
    realizado: this.visitaForm.value.realizado // Asegúrate de que esto se incluya
  };

  // Usamos el ID de la visita para completar la visita
  this.api.completarVisita(this.visitaId, data).subscribe(
    (response: any) => {
      console.log('Visita finalizada correctamente:', response);
      this.guardarVisita(); // Guardar localmente
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


    this.fin = new Date();
    this.visitaEnCurso = false;
    this.estado = EstadoVisita.COMPLETADA;
    this.estadoTexto = 'La visita ha sido registrada.';
    this.visitaForm.disable();

    this.guardarVisita();
  }

  resetFormulario() {
    this.visitaForm.reset();
    this.visitaForm.disable();
    this.inicio = null;
    this.fin = null;
    this.visitaEnCurso = false;
    this.estado = EstadoVisita.SIN_INICIAR;
    this.estadoTexto = 'Listo para iniciar una visita.';
  }

  guardarVisita() {
    const formValue = this.visitaForm.value;

    const visitaData = {
      cliente: formValue.cliente,
      solicitante: formValue.solicitante,
      ...formValue.actividades,
      otrosDetalle: formValue.otrosDetalle,
      realizado: formValue.realizado,
      inicio: this.formatFecha(this.inicio),
      fin: this.formatFecha(this.fin),
      username: this.username
    };

    this.visitas.push(visitaData);

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}') as Record<string, any[]>;
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }

  private formatFecha(fecha: Date | null): string | null {
    return fecha ? this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm', '', 'es-CL') : null;
  }

  private minWordsValidator(minWords: number, minChars: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || typeof control.value !== 'string') {
        return { minWordsOrChars: true };
      }
      const wordCount = control.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      const charCount = control.value.trim().length;
      return (wordCount < minWords && charCount < minChars) ? { minWordsOrChars: true } : null;
    };
  }

  private setupOtrosDetalleValidation() {
    this.visitaForm.get('actividades.otros')?.valueChanges.subscribe((isChecked: boolean) => {
      const otrosDetalle = this.visitaForm.get('otrosDetalle');
      if (isChecked) {
        otrosDetalle?.setValidators([Validators.required]);
      } else {
        otrosDetalle?.clearValidators();
        otrosDetalle?.setValue('');
      }
      otrosDetalle?.updateValueAndValidity();
    });
  }

  eliminarVisita(v: any) {
    this.visitas = this.visitas.filter(item => item !== v);

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000
    });
    toast.present();
  }
}
