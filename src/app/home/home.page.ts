import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  AlertController,
  LoadingController
} from '@ionic/angular/standalone';

interface Usuario {
  user: string;
  pass: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon
  ]
})
export class HomePage {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;

  private usuariosValidos: Usuario[] = [
    { user: 'admin', pass: '1234' },
    { user: 'tecnico', pass: '1234' }
  ];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  // Función principal de login
  async login() {
    if (this.isLoading) return;

    this.isLoading = true;

    const loading = await this.loadingController.create({
      message: 'Verificando credenciales...',
      spinner: 'crescent'
    });
    await loading.present();

    // Verificación simulada usando Promise
    const valido = await this.verificarCredencialesSimuladas();

    await loading.dismiss();
    this.isLoading = false;

    if (valido) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', this.username);

      // Limpiar campos
      this.username = '';
      this.password = '';

      this.router.navigate(['/inicio-footer']);
    } else {
      await this.mostrarError();
    }
  }

  // Verifica credenciales (simulación con Promise)
  private verificarCredencialesSimuladas(): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(() => {
        const valido = this.usuariosValidos.some(u =>
          u.user === this.username && u.pass === this.password
        );
        resolve(valido);
      }, 1500);
    });
  }

  // Muestra error de login
  private async mostrarError() {
    const alert = await this.alertController.create({
      header: 'Error de autenticación',
      message: 'Usuario o contraseña incorrectos.',
      buttons: ['Aceptar']
    });

    await alert.present();
  }
}
