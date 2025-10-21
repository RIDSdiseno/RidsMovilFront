import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { LoginGuard } from './guards/splash-guard';

const routes: Routes = [
  // raíz válida: redirige a /home
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // login protegido por LoginGuard
  {
    path: 'home',
    canActivate: [LoginGuard],
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },

  {
    path: 'inicio-footer',
    loadChildren: () => import('./pages/inicio-footer/inicio-footer.module').then(m => m.InicioFooterPageModule)
  },
  {
    path: 'formulario-visitas',
    loadChildren: () => import('./pages/formulario-visitas/formulario-visitas.module').then(m => m.FormularioVisitasPageModule)
  },
  {
    path: 'perfil',
    loadChildren: () => import('./pages/perfil/perfil.module').then(m => m.PerfilPageModule)
  },
  {
    path: 'equipos',
    loadChildren: () => import('./pages/equipos/equipos.module').then(m => m.EquiposPageModule)
  },
  {
    path: 'agregar-equipos',
    loadChildren: () => import('./pages/agregar-equipos/agregar-equipos.module').then(m => m.AgregarEquiposPageModule)
  },
  {
    path: 'agregar-usuario',
    loadChildren: () => import('./pages/agregar-usuario/agregar-usuario.module').then(m => m.AgregarUsuarioPageModule)
  },

  // comodín
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
