import { Injectable } from '@angular/core';

interface CyclicSubgraph<T, L> {
  nodes: T[];
  links: L[];
}

@Injectable({
  providedIn: 'root'
})
export class CycleDetectionService {

  /**
   * Finds all cyclic subgraphs in a directed graph
   * @param nodes - Array of node objects (must have an id property)
   * @param links - Array of link objects (must have source and target properties)
   * @returns Array of cyclic subgraphs, each containing nodes and links that form cycles
   */
  public findCyclicSubgraphs<T extends { publication: { id: any } }, L extends { source: any; target: any }>(
    nodes: T[],
    links: L[]
  ): CyclicSubgraph<T, L>[] {
    const adjacencyList = this.buildAdjacencyList(nodes, links);
    const cycleNodeSets: Set<any>[] = [];

    const visited = new Set<any>();
    const recursionStack = new Set<any>();
    const nodeInCycle = new Set<any>();

    // DFS to find all nodes that are part of any cycle
    nodes.forEach(node => {
      if (!visited.has(node.publication.id)) {
        this.dfsDetectCycles(
          node.publication.id,
          adjacencyList,
          visited,
          recursionStack,
          nodeInCycle
        );
      }
    });

    // Extract cyclic subgraphs from nodes that are part of cycles
    if (nodeInCycle.size === 0) {
      return [];
    }

    // Build cyclic subgraphs
    const cyclicNodes = nodes.filter(n => nodeInCycle.has(n.publication.id));
    const cyclicLinks = links.filter(
      l => nodeInCycle.has(l.source) && nodeInCycle.has(l.target)
    );

    // If you want separate subgraphs for each cycle, use this approach:
    const connectedComponents = this.findConnectedCycles(
      cyclicNodes,
      cyclicLinks
    );

    return connectedComponents;
  }

  /**
   * Alternative method: Find individual cycles (potentially overlapping)
   * Returns each cycle as a separate subgraph
   */
  public findIndividualCycles<T extends { publication: { id: any } }, L extends { source: any; target: any }>(
    nodes: T[],
    links: L[]
  ): CyclicSubgraph<T, L>[] {
    const cycles: CyclicSubgraph<T, L>[] = [];
    const adjacencyList = this.buildAdjacencyList(nodes, links);
    const visited = new Set<any>();

    nodes.forEach(startNode => {
      const path: any[] = [];
      const pathSet = new Set<any>();

      this.dfsCollectCycles(
        startNode.publication.id,
        startNode.publication.id,
        adjacencyList,
        path,
        pathSet,
        visited,
        nodes,
        links,
        cycles
      );
    });

    // Remove duplicate cycles
    return this.removeDuplicateCycles(cycles);
  }

  /**
   * Check if a graph has any cycles
   */
  public hasCycle<T extends { publication: { id: any } }, L extends { source: any; target: any }>(
    nodes: T[],
    links: L[]
  ): boolean {
    const adjacencyList = this.buildAdjacencyList(nodes, links);
    const visited = new Set<any>();
    const recursionStack = new Set<any>();

    for (const node of nodes) {
      if (!visited.has(node.publication.id)) {
        if (this.hasCycleDFS(node.publication.id, adjacencyList, visited, recursionStack)) {
          return true;
        }
      }
    }

    return false;
  }

  // ============ Private Helper Methods ============

  private buildAdjacencyList<T extends { publication: { id: any } }, L extends { source: any; target: any }>(
    nodes: T[],
    links: L[]
  ): Map<any, any[]> {
    const adjacencyList = new Map<any, any[]>();

    nodes.forEach(node => {
      if (!adjacencyList.has(node.publication.id)) {
        adjacencyList.set(node.publication .id, []);
      }
    });

    links.forEach(link => {
      if (adjacencyList.has(link.source)) {
        adjacencyList.get(link.source)!.push(link.target);
      }
    });

    return adjacencyList;
  }

  private dfsDetectCycles(
    nodeId: any,
    adjacencyList: Map<any, any[]>,
    visited: Set<any>,
    recursionStack: Set<any>,
    nodeInCycle: Set<any>
  ): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (
          this.dfsDetectCycles(
            neighbor,
            adjacencyList,
            visited,
            recursionStack,
            nodeInCycle
          )
        ) {
          nodeInCycle.add(nodeId);
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Back edge found - mark the cycle
        nodeInCycle.add(nodeId);
        nodeInCycle.add(neighbor);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  private hasCycleDFS(
    nodeId: any,
    adjacencyList: Map<any, any[]>,
    visited: Set<any>,
    recursionStack: Set<any>
  ): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.hasCycleDFS(neighbor, adjacencyList, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  private dfsCollectCycles<T extends { publication: { id: any } }, L extends { source: any; target: any }>(
    currentNode: any,
    startNode: any,
    adjacencyList: Map<any, any[]>,
    path: any[],
    pathSet: Set<any>,
    visited: Set<any>,
    nodes: T[],
    links: L[],
    cycles: CyclicSubgraph<T, L>[]
  ): void {
    path.push(currentNode);
    pathSet.add(currentNode);

    const neighbors = adjacencyList.get(currentNode) || [];

    for (const neighbor of neighbors) {
      if (neighbor === startNode && path.length > 2) {
        // Found a cycle
        const cycleNodeIds = new Set(path);
        const cycleNodes = nodes.filter(n => cycleNodeIds.has(n.publication.id));
        const cycleLinks = links.filter(
          l => cycleNodeIds.has(l.source) && cycleNodeIds.has(l.target)
        );

        cycles.push({
          nodes: cycleNodes,
          links: cycleLinks
        });
      } else if (!pathSet.has(neighbor)) {
        this.dfsCollectCycles(
          neighbor,
          startNode,
          adjacencyList,
          path,
          pathSet,
          visited,
          nodes,
          links,
          cycles
        );
      }
    }

    path.pop();
    pathSet.delete(currentNode);
  }

  private findConnectedCycles<T extends { publication: { id: any } }, L extends { source: any; target: any }>(
    nodes: T[],
    links: L[]
  ): CyclicSubgraph<T, L>[] {
    // Returns all nodes/links that are part of cycles as a single connected component
    // If you want separate components, implement union-find here
    if (nodes.length === 0) {
      return [];
    }

    return [
      {
        nodes,
        links
      }
    ];
  }

  private removeDuplicateCycles<T extends { publication: { id: any } }, L extends { source: any; target: any }>(
    cycles: CyclicSubgraph<T, L>[]
  ): CyclicSubgraph<T, L>[] {
    const seen = new Set<string>();
    const unique: CyclicSubgraph<T, L>[] = [];

    cycles.forEach(cycle => {
      const signature = cycle.nodes
        .map(n => n.publication.id)
        .sort()
        .join(',');

      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(cycle);
      }
    });

    return unique;
  }
}
