import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api';

// Importa la configuración regional para "es-CL"
import localeEsCl from '@angular/common/locales/es-CL';

// Registrar la configuración regional "es-CL"
registerLocaleData(localeEsCl, 'es-CL');

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: false,
})
export class FormularioVisitasPage implements OnInit {
  visitaForm: FormGroup;
  visitas: any[] = [];

  inicio: Date | null = null;
  fin: Date | null = null;
  estado: string = 'Sin iniciar';
  estadoTexto: string = 'Listo para iniciar una visita.';
  visitaEnCurso = false;
  username: string = '';

  clientes: any[] = []; // Array para almacenar los clientes
  selectedCliente: any; // Cliente seleccionado en el formulario

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private alertController: AlertController,
    private router: Router,
    private api: ApiService
  ) {
    this.visitaForm = this.fb.group({
      cliente: ['', Validators.required],  // Usamos 'cliente' como formControlName
      solicitante: ['', Validators.required],
      impresoras: [false],
      telefonos: [false],
      pie: [false],
      otros: [false],
      otrosDetalle: [''],
      realizado: ['', [Validators.required, this.minWordsValidator(2, 10)]]
    });
  }

  ngOnInit() {
    this.api.getClientes().subscribe(
      (data) => {
        this.clientes = data;
      },
      (error) => {
        console.error('Error al cargar clientes', JSON.stringify(error));
      }
    );

    this.username = localStorage.getItem('username') || '';
  }

  iniciarVisita() {
    this.inicio = new Date();
    this.fin = null;
    this.visitaEnCurso = true;
    this.estado = 'En curso';
    this.estadoTexto = 'La visita está en curso.';
  }

  async terminarVisita() {
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
    this.guardarVisita();
  }

  resetFormulario() {
    this.visitaForm.reset();
    this.inicio = null;
    this.fin = null;
    this.visitaEnCurso = false;
    this.estado = 'Sin iniciar';
    this.estadoTexto = 'Listo para iniciar una visita.';
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

  toggleOtros() {
    if (!this.visitaForm.get('otros')?.value) {
      this.visitaForm.get('otrosDetalle')?.setValue('');
    }
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
}
