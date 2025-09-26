import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ApiService } from '../services/api'; // Asegúrate de importar el ApiService

interface Usuario {
  email: string;
  password: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;

  private usuariosValidos: Usuario[] = [
    { email: 'admin@example.com', password: '1234' },
    { email: 'tecnico@example.com', password: '1234' }
  ];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private api: ApiService
  ) { }

  async login() {
    if (this.isLoading) return;

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Verificando credenciales...',
      spinner: 'crescent'
    });
    await loading.present();

    const credentials = { email: this.username, password: this.password };

    this.api.loginTecnicos(credentials).subscribe(
      async (response:any) => {
        await loading.dismiss();
        this.isLoading = false;

        if (response && response.token) {
          // Guardar token y otros datos en localStorage o manejar el estado
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('username', this.username);
          localStorage.setItem('token', response.token); // Guardar el token

          // Limpiar campos
          this.username = '';
          this.password = '';

          // Redirigir al dashboard o página principal
          this.router.navigate(['/inicio-footer']);
        } else {
          await this.mostrarError();
        }
      },
      async (error:any) => {
        await loading.dismiss();
        this.isLoading = false;
        console.error('Error al hacer login', JSON.stringify(error));
        await this.mostrarError();
      }
    );
  }

  private async mostrarError() {
    const alert = await this.alertController.create({
      header: 'Error de autenticación',
      message: 'Usuario o contraseña incorrectos.',
      buttons: ['Aceptar']
    });

    await alert.present();
  }
}
