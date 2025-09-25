import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormularioVisitasPage } from './formulario-visitas.page';

describe('FormularioVisitasPage', () => {
  let component: FormularioVisitasPage;
  let fixture: ComponentFixture<FormularioVisitasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FormularioVisitasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
