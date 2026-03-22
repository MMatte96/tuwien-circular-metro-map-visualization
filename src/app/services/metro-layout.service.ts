import { Injectable } from '@angular/core';
import { Publication } from '../classes/publication.class';
import { MetroLayout } from '../interfaces/d3/metro-layout.interace';
import * as d3 from 'd3'
import {IMetroNode} from '../interfaces/d3/metro-node.interface';
import {IMetroLink} from '../interfaces/d3/metro-link.interface';
import { SugiyamaService } from './sugiyama.service';

@Injectable({
  providedIn: 'root'
})
export class MetroLayoutService {

  constructor() { }

  public buildLayout( publications: Publication[] ): MetroLayout {
    if ( !publications || publications.length === 0 ) {
      return {
        nodes: [],
        links: [],
        clusterIds: [],
        minYear: 0,
        maxYear: 0,
        ringYears: []
      };
    }

    const years = publications.map( p => p.year );
    const minYear = d3.min(years)!;
    const maxYear = d3.max(years)!;

    const clusterIds = Array.from(
      new Set( publications.flatMap( p => p.clusters))
    ).sort( (a, b ) => a - b );



    const yearStep = 5;
    const ringYears: number[] = []
    for ( let y = Math.floor(minYear / yearStep ) * yearStep; y <= maxYear; y += yearStep ) {
      ringYears.push(y);
    }

    const [ nodes, links ] = this.createClusterLine( publications, clusterIds );
    const nodes_new = new SugiyamaService( nodes, links ).run();


    return {
      nodes: nodes_new,
      links,
      clusterIds,
      minYear,
      maxYear,
      ringYears
    };
  }

  private createClusterLine( publications: Publication[], clusterIds: number[] ): [ nodes: IMetroNode[], links: IMetroLink[] ] {
    const clusterAngleScale = d3.scalePoint<number>()
      .domain( clusterIds )
      .range( [0, 2 * Math.PI] )
      .padding( 0.2 );

    const links: IMetroLink[] = [];
    const angles = new Map<number, number[]>();
    const pushHint = (pubId: number, a: number) => {
      const arr = angles.get(pubId) ?? [];
      arr.push(this.normalizeAngle(a));
      angles.set(pubId, arr);
    };

    // create links
    clusterIds.forEach( clusterId => {
      const pubsInCluster = publications
        .filter( p => p.clusters.includes( clusterId ) )
        .sort( (a, b ) => a.year - b.year );

      if (pubsInCluster.length <= 1) {
        return;
      }

      const arm1Angle = clusterAngleScale( clusterId ) as number;
      const arm2Angle = arm1Angle + Math.PI;

      const centerPublication = pubsInCluster[0];
      pushHint(centerPublication.id, arm1Angle)
      const arm1: Publication[] = [];
      const arm2: Publication[] = [];

      for ( let i = 1; i < pubsInCluster.length; i++ ) {
        ( i % 2 === 1 ? arm1 : arm2).push( pubsInCluster[i] );
      }

      let prev = centerPublication;
      arm1.forEach( p => {
        links.push({
          source: prev.id,
          target: p.id,
          cluster: clusterId
        })
        pushHint(p.id, arm1Angle);
        prev = p;
      });

      prev = centerPublication;
      arm2.forEach( p => {
        links.push({
          source: prev.id,
          target: p.id,
          cluster: clusterId
        })
        pushHint(p.id, arm2Angle);
        prev = p;
      });
    });

    // create nodes
    const nodes = publications.map( p=> {
      const angleHints = angles.get( p.id );
      let angle: number;
      if (angleHints && angleHints.length > 0) {
        angle = this.circularMean(angleHints);
      } else {
        const clusterAngles = p.clusters
          .filter(c => clusterIds.includes(c))
          .map(c => clusterAngleScale(c)!)
          .filter(v => v != null);

        angle = this.circularMean(clusterAngles);
      }

      return {
        publication: p,
        angle
      }
    } );

    return [ nodes, links ];
  }

  private normalizeAngle(a: number): number {
    const twoPi = 2 * Math.PI;
    return ((a % twoPi) + twoPi) % twoPi;
  }

  private circularMean(angles: number[]): number {
    if (!angles || angles.length === 0) return 0;

    let sx = 0;
    let sy = 0;
    for (const a of angles) {
      sx += Math.cos(a);
      sy += Math.sin(a);
    }

    // atan2 gives angle in [-π, π], normalize to [0, 2π)
    return this.normalizeAngle(Math.atan2(sy / angles.length, sx / angles.length));
  }
}
