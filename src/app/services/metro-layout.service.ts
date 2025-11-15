import { Injectable } from '@angular/core';
import { Publication } from '../classes/publication.class';
import { MetroLayout } from '../interfaces/d3/metro-layout.interace';
import * as d3 from 'd3'
import {IMetroNode} from '../interfaces/d3/metro-node.interface';
import {IMetroLink} from '../interfaces/d3/metro-link.interface';

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

    const nodes = this.createNodes( publications, clusterIds );
    const links = this.createLinks( publications, clusterIds );

    return {
      nodes,
      links,
      clusterIds,
      minYear,
      maxYear,
      ringYears
    };
  }

  private createNodes( publications: Publication[], clusterIds: number[] ): IMetroNode[] {
    const clusterAngleScale = d3.scalePoint<number>()
      .domain( clusterIds )
      .range( [0, 2 * Math.PI] )
      .padding( 0.2 );
    return publications.map( p=> {
      const clusterAngles = p.clusters.map( c => clusterAngleScale(c)! );
      const angle = d3.mean(clusterAngles)!;

      return {
        publication: p,
        angle
      }
    } );
  }

  private createLinks ( publications: Publication[], clusterIds: number[] ): IMetroLink[] {
    const links: IMetroLink[] = [];
    clusterIds.forEach( clusterId => {
      const pubsInCluster = publications
        .filter( p => p.clusters.includes( clusterId ) )
        .sort( (a, b ) => a.year - b.year );

      if (pubsInCluster.length <= 1) {
        return;
      }

      const centerPublication = pubsInCluster[0];
      const arm1: Publication[] = [];
      const arm2: Publication[] = [];

      for ( let i = 1; i < pubsInCluster.length; i++ ) {
        const publication = pubsInCluster[i];
        if ( i % 2 === 1 ) {
          arm1.push( publication );
        } else {
          arm2.push( publication );
        }
      }

      let prev = centerPublication;
      arm1.forEach( p => {
        links.push({
          source: prev.id,
          target: p.id,
          cluster: clusterId
        })
      });

      prev = centerPublication;
      arm2.forEach( p => {
        links.push({
          source: prev.id,
          target: p.id,
          cluster: clusterId
        })
      });
    });
    return links;
  }
}
