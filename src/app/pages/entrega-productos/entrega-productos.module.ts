import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EntregaProductosPageRoutingModule } from './entrega-productos-routing.module';

import { EntregaProductosPage } from './entrega-productos.page';
import { SharedModule } from 'src/app/shared/shared-module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EntregaProductosPageRoutingModule,
    SharedModule,
  ],
  declarations: [EntregaProductosPage],
})
export class EntregaProductosPageModule {}

