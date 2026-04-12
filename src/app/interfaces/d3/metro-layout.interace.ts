import {IMetroNode} from './metro-node.interface';
import {IMetroLink} from './metro-link.interface';

export interface MetroLayout {
  nodes: IMetroNode[];
  links: IMetroLink[];
  clusterIds: number[];
  minYear: number;
  maxYear: number;
  ringYears: number[];
}
