import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ApiService } from '../services/api'; // Asegúrate de importar el ApiService
import { AuthService } from '../services/auth-service';  // Importamos el AuthService para gestionar el login

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
// Componente para la página de inicio de sesión
export class HomePage {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  
  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private api: ApiService,
    private authService: AuthService // Usamos el servicio de autenticación
  ) { }

  // Método para realizar el login
  async login() {
    if (this.isLoading) return;

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Verificando credenciales...',
      spinner: 'crescent'
    });
    await loading.present();

    const credentials = { email: this.username, password: this.password };

    // Llamamos a la API para autenticar al técnico
    this.api.loginTecnicos(credentials).subscribe(
      async (response: any) => {
        await loading.dismiss();
        this.isLoading = false;

        if (response && response.token) {
          // Guardamos el token y otros datos del técnico en el AuthService
          this.authService.login(response.token, response.user); // Usamos el AuthService para gestionar el login

          // Limpiar campos de login
          this.username = '';
          this.password = '';
          console.log(response.token,response.user)
          // Redirigir al dashboard o página principal
          this.router.navigate(['/inicio-footer']);
        } else {
          await this.mostrarError(this.username);
        }
      },
      async (error: any) => {
        await loading.dismiss();
        this.isLoading = false;
        console.error('Error al hacer login', error);
        await this.mostrarError(error);
      }
    );
  }

  // Método para mostrar error cuando las credenciales son incorrectas
  private async mostrarError(e:any) {
    const alert = await this.alertController.create({
      header: 'Error de autenticación',
      message: 'Credenciales invalidas',
      buttons: ['Aceptar']
    });

    await alert.present();
  }
}
