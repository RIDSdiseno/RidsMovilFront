import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FormularioVisitasPageRoutingModule } from './formulario-visitas-routing.module';

import { FormularioVisitasPage } from './formulario-visitas.page';
import { SharedModule } from 'src/app/shared/shared-module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    FormularioVisitasPageRoutingModule,
    SharedModule
  ],
  declarations: [FormularioVisitasPage,],
  providers:[DatePipe],
  exports:[FormularioVisitasPageRoutingModule,],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class FormularioVisitasPageModule {}
