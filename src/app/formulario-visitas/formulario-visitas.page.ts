import { Component, LOCALE_ID } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import localeEsCl from '@angular/common/locales/es-CL';
import { FooterMenuComponent } from '../components/footer-menu/footer-menu.component';
import { ApiService } from '../services/api';
import { HttpClientModule } from '@angular/common/http';  // Importa HttpClientModule


registerLocaleData(localeEsCl, 'es-CL');

@Component({
  selector: 'app-formulario-visitas',
  templateUrl: './formulario-visitas.page.html',
  styleUrls: ['./formulario-visitas.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, FooterMenuComponent, HttpClientModule ],
  providers: [DatePipe, { provide: LOCALE_ID, useValue: 'es-CL' }]
})
export class FormularioVisitasPage {

  visitaForm: FormGroup;
  visitas: any[] = [];

  inicio: Date | null = null;
  fin: Date | null = null;
  estado: string = 'Sin iniciar';
  estadoTexto: string = 'Listo para iniciar una visita.';
  visitaEnCurso = false;
  username: string = '';

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private alertController: AlertController,
    private router: Router,
    private api: ApiService
  ) {
    this.visitaForm = this.fb.group({
      empresa: ['', Validators.required],
      solicitante: ['', Validators.required],
      impresoras: [false],
      telefonos: [false],
      pie: [false],
      otros: [false],
      otrosDetalle: [''],
      realizado: ['', [Validators.required, this.minWordsValidator(2, 10)]]
    });
  }

  clientes: any[] = []; // Array para almacenar los clientes
  selectedCliente: any; // Cliente seleccionado en el formulario

  ngOnInit() {
    this.api.getClientes().subscribe(
      (data) => {
        this.clientes = data;
      },
      (error) => {
        console.error('Error al cargar clientes', JSON.stringify(error));
      }
    )

    // Recupera el usuario actual
    this.username = localStorage.getItem('username') || '';

    // Carga historial filtrado por usuario
    const allHistorial = JSON.parse(localStorage.getItem('visitas_registro') || '{}');
    if (this.username && allHistorial[this.username]) {
      this.visitas = allHistorial[this.username];
    } else {
      this.visitas = [];
    }
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

    // Guardamos historial separado por usuario
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

  /*
  logout() {
    // Solo eliminamos datos de sesión, NO historial
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    this.router.navigate(['/home']); // login
  } */
}
