import { Injectable } from '@angular/core';
import { Publication } from '../classes/publication.class';
import { MetroLayout } from '../interfaces/d3/metro-layout.interace';
import * as d3 from 'd3'
import {IMetroNode} from '../interfaces/d3/metro-node.interface';
import {IMetroLink} from '../interfaces/d3/metro-link.interface';
import { SugiyamaService } from './sugiyama.service';
import { CycleDetectionService } from './cycle-detection.service';

@Injectable({
  providedIn: 'root'
})
export class MetroLayoutService {

  constructor(private cycleDetection: CycleDetectionService) { }

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
    console.log( 'Cluster lines created' );
    //this.checkForCycles( nodes, links );


    const nodes_new = new SugiyamaService( nodes, links ).run();
    console.log( 'Sugiyama layout completed' );

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
    const links: IMetroLink[] = [];
    // create links
    clusterIds.forEach( clusterId => {
      const pubsInCluster = publications
        .filter( p => p.clusters.includes( clusterId ) )
        .sort( (a, b ) => a.year - b.year || a.id - b.id );

      if (pubsInCluster.length <= 1) {
        return;
      }

      const centerPublication = pubsInCluster[0];
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
        prev = p;
      });

      prev = centerPublication;
      arm2.forEach( p => {
        links.push({
          source: prev.id,
          target: p.id,
          cluster: clusterId
        })
        prev = p;
      });
    });

    // create nodes
    const nodes = publications.map( p=> {
      return {
        publication: p,
        layer: p.year
      }
    } );

    return [ nodes, links ];
  }

  checkForCycles(nodes: IMetroNode[], links: IMetroLink[]): void {
    const cyclicSubgraphs = this.cycleDetection.findCyclicSubgraphs(nodes, links);
  
  if (cyclicSubgraphs.length > 0) {
    console.log('Found cycles:', cyclicSubgraphs);
    cyclicSubgraphs.forEach((subgraph, index) => {
      console.log(`Cycle ${index}: ${subgraph.nodes.length} nodes, ${subgraph.links.length} links`);
    });
  }
}
}
