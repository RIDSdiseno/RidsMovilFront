import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FormularioVisitasPage } from './formulario-visitas.page';

const routes: Routes = [
  {
    path: '',
    component: FormularioVisitasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FormularioVisitasPageRoutingModule {}
