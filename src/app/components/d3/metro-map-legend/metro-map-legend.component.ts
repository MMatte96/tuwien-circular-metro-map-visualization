import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IMetroLine } from '../../../interfaces/d3/metro-line.interface';

@Component({
  selector: 'metro-map-legend',
  standalone: false,
  templateUrl: './metro-map-legend.component.html',
  styleUrl: './metro-map-legend.component.scss'
})
export class MetroMapLegendComponent {
  @Input() public lineData: IMetroLine[] = [];
  @Output() public clickLine = new EventEmitter<number>();
  protected selectedLine: number | null = null;

  protected onLineClick( lineId: number ): void {
    this.selectedLine = lineId;
    this.clickLine.emit( lineId );
  }
}
