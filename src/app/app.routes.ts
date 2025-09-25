import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'formulario-visitas',
    loadComponent: () => import('./formulario-visitas/formulario-visitas.page').then(m => m.FormularioVisitasPage)
  },
  {
    path: 'inicio-footer',
    loadComponent: () => import('./inicio-footer/inicio-footer.page').then(m => m.InicioFooterPage)
  },
  {
    path: 'perfil',
    loadComponent: () => import('./perfil/perfil.page').then( m => m.PerfilPage)
  }

];
