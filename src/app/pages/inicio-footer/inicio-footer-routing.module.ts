import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InicioFooterPage } from './inicio-footer.page';

const routes: Routes = [
  {
    path: '',
    component: InicioFooterPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InicioFooterPageRoutingModule {}
