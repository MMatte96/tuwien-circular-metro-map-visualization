import {AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import { MetroLayoutService } from '../../../services/metro-layout.service';
import { Publication } from '../../../classes/publication.class';
import { IMetroNode } from '../../../interfaces/d3/metro-node.interface';
import { MetroLayout } from '../../../interfaces/d3/metro-layout.interace';
import * as d3 from 'd3';
import {IMetroLink} from '../../../interfaces/d3/metro-link.interface';
import {Author} from '../../../classes/author.class';

@Component({
  selector: 'app-circular-metro-map',
  standalone: false,
  templateUrl: './circular-metro-map.component.html',
  styleUrl: './circular-metro-map.component.scss'
})
export class CircularMetroMapComponent implements AfterViewInit, OnChanges{
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

  public ngAfterViewInit() {
    this.initSvg();
    this.render();
  }

  public ngOnChanges( changes: SimpleChanges ) {
    if( changes['publications'] && this.svg ) {
      this.render();
    }
  }

  private initSvg(): void {
    this.svg = d3.select( this.svgRef.nativeElement );
  }

  private render(): void {
    if ( !this.publications || this.publications.length === 0 ) {
      this.svg.selectAll('*').remove();
      return;
    }

    this.layout = this.layoutService.buildLayout( this.publications );
    const hostElem = this.svgRef.nativeElement;
    const rect = hostElem.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    this.svg
      .attr( 'width', width )
      .attr( 'height', height );

    const centerX = width / 2;
    const centerY = height / 2;

    const {
      nodes,
      links,
      clusterIds,
      minYear,
      maxYear,
      ringYears
    } = this.layout;

    this.svg.selectAll('*').remove();
    const innerRadius = 15;
    const outerRadius = Math.min(width, height) / 2 - 30;

    const radiusScale = d3.scaleLinear()
      .domain( [ minYear, maxYear ] )
      .range( [ innerRadius, outerRadius ] );

    const ringGroup = this.svg.append( 'g' )
      .attr( 'class', 'rings' );

    ringGroup
      .selectAll( 'circle' )
      .data( ringYears )
      .enter()
      .append( 'circle' )
      .attr( 'cx', centerX )
      .attr( 'cy', centerY )
      .attr( 'r', y => radiusScale(y) )
      .attr( 'class', 'year-ring');

    ringGroup
      .selectAll( 'text' )
      .data( ringYears )
      .enter()
      .append( 'text' )
      .attr( 'x', centerX)
      .attr( 'y', y => centerY - radiusScale(y) - 4 )
      .attr( 'text-anchor', 'middle' )
      .attr( 'class', 'year-label' )
      .text( y => y.toString() );
  }
}
