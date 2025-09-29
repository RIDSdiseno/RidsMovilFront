import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api';
import localeEsCl from '@angular/common/locales/es-CL';
import { ToastController } from '@ionic/angular';

// Registrar la configuración regional "es-CL"
registerLocaleData(localeEsCl, 'es-CL');

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

  inicio: Date | null = null;
  fin: Date | null = null;
  estado: string = 'Sin iniciar';
  estadoTexto: string = 'Listo para iniciar una visita.';
  visitaEnCurso = false;
  username: string = '';
  tecnicoId: string = '';  // Variable para almacenar el ID del técnico

  clientes: any[] = []; // Array para almacenar los clientes
  selectedCliente: any; // Cliente seleccionado en el formulario

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private alertController: AlertController,
    private router: Router,
    private api: ApiService,
    private toastController: ToastController
  ) {
    // Inicializar el formulario con validaciones
    this.visitaForm = this.fb.group({
      cliente: ['', Validators.required],
      solicitante: ['', Validators.required],
      actividades: this.fb.group({
        impresoras: [false],
        telefonos: [false],
        pie: [false],
        otros: [false],
      }),
      otrosDetalle: [''],
      realizado: ['', [Validators.required, this.minWordsValidator(2, 10)]]
    });
  }
  
  // Cargar clientes y datos del técnico al iniciar el componente
  ngOnInit() {
    this.api.getClientes().subscribe(
      (data) => {
        this.clientes = data;
      },
      (error) => {
        console.error('Error al cargar clientes', JSON.stringify(error));
      }
    );

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
  
  // Método para iniciar la visita
  iniciarVisita() {
    const clienteId = this.visitaForm.value.cliente;
    const clienteObj = this.clientes.find(c => c.id === clienteId);

    if (!clienteObj) {
      this.showToast('Por favor, selecciona un cliente válido antes de iniciar la visita.');
      return;
    }

    this.inicio = new Date();
    this.fin = null;
    this.visitaEnCurso = true;
    this.estado = 'En curso';
    this.estadoTexto = 'La visita está en curso.';

    // Enviar solo el ID de la empresa al backend
    const visitaData = {
      cliente: clienteId,  // Solo pasamos el ID de la empresa
      solicitante: this.visitaForm.value.solicitante,
      realizado: this.visitaForm.value.realizado,
      inicio: this.inicio,
      tecnicoId: this.tecnicoId,  // Incluimos el técnico
      empresaId: clienteObj.id  // El cliente es la empresa (corregido selectedCliente a clienteObj)
    };
    
    // Llamada a la API para crear la visita
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

    this.fin = new Date();
    this.visitaEnCurso = false;
    this.estado = 'Completada';
    this.estadoTexto = 'La visita ha sido registrada.';

    const actividades = this.visitaForm.get('actividades')?.value || {};

    // Datos para enviar al backend
    const data = {
      confImpresoras: actividades.impresoras,
      confTelefonos: actividades.telefonos,
      confPiePagina: actividades.pie,
      otros: actividades.otros,
      otrosDetalle: this.visitaForm.value.otrosDetalle,
      solicitante: this.visitaForm.value.solicitante,
      realizado: this.visitaForm.value.realizado
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
  
  // Método para reiniciar el formulario
  resetFormulario() {
    this.visitaForm.reset();
    this.inicio = null;
    this.fin = null;
    this.visitaEnCurso = false;
    this.estado = 'Sin iniciar';
    this.estadoTexto = 'Listo para iniciar una visita.';
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

  toggleOtros() {
    if (!this.visitaForm.get('actividades.otros')?.value) {
      this.visitaForm.get('otrosDetalle')?.setValue('');
    }
  }
  
  // Guardar la visita en el almacenamiento local
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
  
  eliminarVisita(v: any) {
    this.visitas = this.visitas.filter(item => item !== v);

    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    allHistorial[this.username] = this.visitas;
    localStorage.setItem('visitas_registro', JSON.stringify(allHistorial));
  }
  
  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    toast.present();
  }
}
