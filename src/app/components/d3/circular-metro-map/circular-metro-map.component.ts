import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MetroLayoutService } from '../../../services/metro-layout.service';
import { Publication } from '../../../classes/publication.class';
import { IMetroNode } from '../../../interfaces/d3/metro-node.interface';
import { MetroLayout } from '../../../interfaces/d3/metro-layout.interace';
import * as d3 from 'd3';
import { IMetroLink } from '../../../interfaces/d3/metro-link.interface';

@Component({
  selector: 'app-circular-metro-map',
  standalone: false,
  templateUrl: './circular-metro-map.component.html',
  styleUrl: './circular-metro-map.component.scss'
})
export class CircularMetroMapComponent implements AfterViewInit, OnChanges, OnDestroy{
  @Input() public publications: Publication[] = [];
  @ViewChild('svgContainer', { static: true })
  public svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('metroMapWrapper', { static: true })
  public containerElement!: ElementRef<HTMLElement>;

  protected showTooltip: boolean = true;
  protected tooltipX: number = 0;
  protected tooltipY: number = 0;
  protected tooltipData: IMetroNode | null = null;

  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private layout: MetroLayout | null = null;
  private simulation?: d3.Simulation<IMetroNode, IMetroLink>;

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
    this.stopSimulation();
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

    // Year rings
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

    const nodeById = new Map<number, IMetroNode>();
    nodes.forEach( n => nodeById.set( n.publication.id, n ) );

    // Links
    const color = d3.scaleSequential()
      .domain([0, clusterIds.length ])
      .interpolator(d3.interpolateRainbow);

    const colors = d3.range(clusterIds.length + 1).map(i => color(i));

    const pathD = (d: IMetroLink) => {
      const source = (typeof d.source === 'number') ? nodeById.get(d.source)! : d.source as IMetroNode;
      const target = (typeof d.target === 'number') ? nodeById.get(d.target)! : d.target as IMetroNode;

      const x1 = source.x ?? 0;
      const y1 = source.y ?? 0;
      const x2 = target.x ?? 0;
      const y2 = target.y ?? 0;

      return `M${x1},${y1} L${x2},${y2}`;
    };

    const linksGroup = this.svg.append( 'g' )
      .attr( 'class', 'links' );
    const linkSelection = linksGroup
      .selectAll<SVGPathElement, IMetroLink>( 'path' )
      .data( links )
      .enter()
      .append( 'path' )
      .attr( 'd' , pathD )
      .attr('stroke', ( d: IMetroLink ) => colors[ d.cluster ] )
      .attr('stroke-width', 3)
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')

    // Nodes
    const nodesGroup = this.svg.append('g')
      .attr('class', 'nodes');
    nodes.forEach( n => {
      n.radius = radiusScale( n.publication.year );
      n.x = centerX + n.radius * Math.cos( n.angle );
      n.y = centerY + n.radius * Math.sin( n.angle );
      n.vx = 0;
      n.vy = 0;
    })
    const nodeSelection = nodesGroup
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'metro-node')
      .attr('cx', d => d.x!)
      .attr('cy', d => d.y!)
      .attr('r', d => d.publication.clusters.length > 1 ? 6 : 4)
      .attr('fill', d => d.publication.clusters.length > 1 ? '#ffffff' : '#222222')
      .attr('stroke', d => d.publication.clusters.length > 1 ? '#000000' : '#888888')
      .attr('stroke-width', d => d.publication.clusters.length > 1 ? 2 : 1)

    nodeSelection
      .on('mouseenter', (event: MouseEvent, d: IMetroNode) => {

        const r = this.containerElement.nativeElement.getBoundingClientRect();
        this.tooltipX = event.clientX - r.left;
        this.tooltipY = event.clientY - r.top;
        this.tooltipData = d;
        this.showTooltip = true;
      })
      .on('mouseleave', () => {
        this.showTooltip = false;
        this.tooltipData = null;
      })

    // Force Simulation
    const linkForce = d3.forceLink<IMetroNode, IMetroLink>(links)
      .id( d => d.publication.id )
      .distance( 1 )
      .strength( 0.15 );
    const collideForce = d3.forceCollide<IMetroNode>()
      .radius( d => d.publication.clusters.length > 1 ? 10 : 8)
      .strength( 0.9 )
      .iterations( 1 );
    const chargeForce = d3.forceManyBody<IMetroNode>()
      .strength( -10 );

    this.simulation = d3.forceSimulation<IMetroNode>(nodes)
      .force( 'link', linkForce )
      .force('collide', collideForce )
      .force( 'charge', chargeForce )
      .alpha( 1 )
      .alphaDecay( 0.06 )
      .on( 'tick', () => {
        for (const n of nodes) {
          const dx = (n.x ?? 0) - centerX;
          const dy = (n.y ?? 0) - centerY;

          const r = Math.hypot(dx, dy);
          // unit vector
          const ux = dx / r;
          const uy = dy / r;

          const vr = (n.vx ?? 0) * ux + (n.vy ?? 0) * uy;
          n.vx = (n.vx ?? 0) - vr * ux;
          n.vy = (n.vy ?? 0) - vr * uy;

          const R = n.radius ?? r;
          n.x = centerX + ux * R;
          n.y = centerY + uy * R;

          // update DOM
          nodeSelection
            .attr('cx', d => d.x ?? 0)
            .attr('cy', d => d.y ?? 0);
          linkSelection.attr('d', pathD);
        }
      });
  }

  private stopSimulation(): void {
    this.simulation?.stop();
    this.simulation?.on( 'tick', null );
    this.simulation = undefined;
  }

  public ngOnDestroy() {
    this.stopSimulation();
  }
}
