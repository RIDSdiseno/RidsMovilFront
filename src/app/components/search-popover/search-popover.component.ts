import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-search-popover',
  templateUrl: './search-popover.component.html',
  styleUrls: ['./search-popover.component.scss'],
  standalone:false
})
export class SearchPopoverComponent {
  @Input() solicitantes: any[] = [];
  @Output() seleccionado = new EventEmitter<any>();

  searchTerm: string = '';
  filteredSolicitantes: any[] = [];

  ngOnInit() {
    this.filteredSolicitantes = this.solicitantes;
  }

  filterSolicitantes() {
    const term = this.searchTerm.toLowerCase();
    this.filteredSolicitantes = this.solicitantes.filter(s => 
      s.nombre.toLowerCase().includes(term)
    );
  }

  seleccionar(solicitante: any) {
    this.seleccionado.emit(solicitante);
  }
}
