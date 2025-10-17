import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgregarEquiposPage } from './agregar-equipos.page';

const routes: Routes = [
  {
    path: '',
    component: AgregarEquiposPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgregarEquiposPageRoutingModule {}
