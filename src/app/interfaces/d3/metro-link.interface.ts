import * as d3 from 'd3';
import {IMetroNode} from './metro-node.interface';

export interface IMetroLink extends d3.SimulationLinkDatum<IMetroNode> {
  source: number
  target: number
  cluster: number;
}
