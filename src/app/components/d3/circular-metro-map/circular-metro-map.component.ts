import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { MetroLayoutService } from '../../../services/metro-layout.service';
import { Publication } from '../../../classes/publication.class';
import { IMetroNode } from '../../../interfaces/d3/metro-node.interface';
import { MetroLayout } from '../../../interfaces/d3/metro-layout.interace';

@Component({
  selector: 'app-circular-metro-map',
  standalone: false,
  templateUrl: './circular-metro-map.component.html',
  styleUrl: './circular-metro-map.component.scss'
})
export class CircularMetroMapComponent {
  @Input() public publications: Publication[] = [];
  @ViewChild('svgContainer', { static: true })
  public svgRef!: ElementRef<SVGSVGElement>;

  protected showTooltip: boolean = false;
  protected tooltipX: number = 0;
  protected tooltipY: number = 0;
  protected tooltipData: IMetroNode | null = null;

  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private layout: MetroLayout | null = null;

  constructor(
    private layoutService: MetroLayoutService
  ) {
  }
}
