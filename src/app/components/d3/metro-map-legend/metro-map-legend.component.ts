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
  @Output() public hoverLine = new EventEmitter<number>();
  @Output() public clickLine = new EventEmitter<number>();

  protected onLineHover( lineId?: number ): void {
    this.hoverLine.emit( lineId );
  }

  protected onLineClick( lineId: number ): void {
    this.clickLine.emit( lineId );
  }
}
