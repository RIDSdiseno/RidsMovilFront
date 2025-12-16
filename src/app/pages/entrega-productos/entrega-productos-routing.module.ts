import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntregaProductosPage } from './entrega-productos.page';

const routes: Routes = [
  {
    path: '',
    component: EntregaProductosPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EntregaProductosPageRoutingModule {}

