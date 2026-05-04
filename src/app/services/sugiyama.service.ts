import { Publication } from "../classes/publication.class";
import { IMetroLink } from "../interfaces/d3/metro-link.interface";
import { IMetroNode } from "../interfaces/d3/metro-node.interface";

export class SugiyamaService {
    private links: IMetroLink[];
    private nodes: IMetroNode[];
    private layers: Map<number, IMetroNode[]> = new Map();
    private bestLayers: Map<number, IMetroNode[]> = new Map();

    constructor(
        nodes: IMetroNode[],
        links: IMetroLink[]
    ) {
        this.nodes = nodes.map( n => ({ ...n }) );
        this.links = links.map( l => ({ ...l }) );
     } 

    public run(): IMetroNode[] {
        this.assignLayers();
        this.orderVertices();
        this.assignCoordinates();

        return this.nodes;
    }

    private assignLayers(): void {
        for ( const node of this.nodes ) {
            const layer = node.publication.year;
            if ( ! this.layers.has( node.publication.year ) ) {
                this.layers.set( node.publication.year, [ node ] );
            } else {
                this.layers.get( node.publication.year )!.push( node );
            }
        }
        // get nodes size from layers
        const totalNodes = Array.from(this.layers.values()).reduce((sum, layer) => sum + layer.length, 0);
        console.log(`Assigned ${totalNodes} nodes to ${this.layers.size} layers based on publication year.`);
    }

    // Virtual nodes are introduced for multi-layer spanning edges, to satisfy Sugiyama's prerequisite of edges only spanning adjacent layers. 
    // They are placed in the next layer and connected to the original target with a new link. The original link is removed and replaced with a link from the source to the virtual node.
    private createVirtualNodesAndLinks(): void {
        let totalNodesBefore = 0;
        for (const layer of this.layers.values()) {
            totalNodesBefore += layer.length;
        }

        let virtualIndex = 0;
        const layerKeys = Array.from(this.layers.keys()).sort((a, b) => a - b);
        const nodeIdToLayerKey = new Map<number, number>();
        for (const k of layerKeys) {
            const layer = this.layers.get(k) ?? [];
            for (const n of layer) {
                nodeIdToLayerKey.set(n.publication.id, k);
            }
        }

        for ( let i = 0; i < layerKeys.length - 1; i++ ) {
            const currentLayerKey = layerKeys[i];
            const nextLayerKey = layerKeys[i + 1];
            const currentLayer = this.layers.get( currentLayerKey ) ?? [];
            const nextLayer = this.layers.get( nextLayerKey ) ?? [];

            for ( let node of currentLayer ) {
                const nextLayerKeyIndex = layerKeys.indexOf( nextLayerKey );
                // get all Links that are outgoing from this node and skip those that go to the next layer
                const outgoingMulti = this.links.filter( 
                    l => 
                        l.source == node.publication.id &&
                        layerKeys.indexOf( nodeIdToLayerKey.get( l.target )! ) !== nextLayerKeyIndex &&
                        nodeIdToLayerKey.get( l.target ) !== nextLayerKey
                );

                // For each outgoing link, create a virtual node in the next layer and connect it to the target of the original link. Connect the original node to the virtual node with a new link. Remove the original link.
                for ( const link of outgoingMulti ) {
                    const virtualId = -1 - virtualIndex++;
                    const virtualNode: IMetroNode = {
                        publication: { id: virtualId } as Publication,
                        angle: 0
                    }
                    nextLayer.push( virtualNode );
                    nodeIdToLayerKey.set( virtualId, nextLayerKey );
                    // remove original link
                    const idx = this.links.findIndex(
                        l => l.source === link.source && l.target === link.target && l.cluster === link.cluster
                    );
                    if (idx >= 0) this.links.splice(idx, 1);
                    // add new links
                    this.links.push({ source: link.source, target: virtualId, cluster: link.cluster });
                    this.links.push({ source: virtualId, target: link.target, cluster: link.cluster });
                }
            }
        }

        let totalNodesAfter = 0;
        for (const layer of this.layers.values()) {
            totalNodesAfter += layer.length;
        }
        console.log(`Virtual nodes: ${totalNodesBefore} nodes before → ${totalNodesAfter} nodes after (added ${virtualIndex} virtual nodes)`);
    }

    // Count the number of edge crossings in the given layout
    // Prerequisite: directed links only go from layer i to layer i+1, no intra-layer links, not multi-layer spanning links
    private numberOfCrossings(layers: Map<number, IMetroNode[]>): number {
        let crossings = 0;
        const layerKeys = Array.from(layers.keys()).sort((a, b) => a - b);

        for ( let i = 0; i < layerKeys.length - 1; i++ ) {
            const layer = layers.get(layerKeys[i])!;
            const nextLayer = layers.get(layerKeys[i + 1])!;

            if ( !nextLayer ) continue;

            const sourcePos = new Map<number, number>();
            const targetPos = new Map<number, number>();

            layer.forEach((n, index) => sourcePos.set(n.publication.id, index));
            nextLayer.forEach((n, index) => targetPos.set(n.publication.id, index));

            const layerLinks = this.links.filter(l =>
                sourcePos.has(l.source) &&
                targetPos.has(l.target)
            );

            for ( let j = 0; j < layerLinks.length; j++ ) {
                for ( let k = j + 1; k < layerLinks.length; k++ ) {
                    const l1 = layerLinks[j];
                    const l2 = layerLinks[k];

                    const l1SourceIndex = sourcePos.get(l1.source)!;
                    const l1TargetIndex = targetPos.get(l1.target)!;
                    const l2SourceIndex = sourcePos.get(l2.source)!;
                    const l2TargetIndex = targetPos.get(l2.target)!;
                    if ( (l1SourceIndex < l2SourceIndex && l1TargetIndex > l2TargetIndex) ||
                         (l1SourceIndex > l2SourceIndex && l1TargetIndex < l2TargetIndex) ) {
                        crossings++;
                    }
                }
            }
        }
        return crossings;
    }

    private median(arr: number[]): number {
        if ( arr.length === 0 ) {
            return Number.POSITIVE_INFINITY;
        }
        const sorted = arr.slice().sort( (a, b) => a - b );
        const mid = Math.floor( sorted.length / 2 );
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    private buildAdjacency() {
        const incoming = new Map<number, number[]>();
        const outgoing = new Map<number, number[]>();

        for (const link of this.links) {
            if (!incoming.has(link.target)) incoming.set(link.target, []);
            incoming.get(link.target)!.push(link.source);

            if (!outgoing.has(link.source)) outgoing.set(link.source, []);
            outgoing.get(link.source)!.push(link.target);
        }

        return { incoming, outgoing };
    }   

    private medianSweep( layers: Map<number, IMetroNode[]> ): Map<number, IMetroNode[]> {
        const result = new Map<number, IMetroNode[]>();
        const { incoming, outgoing } = this.buildAdjacency();

        // Deep-ish copy of map structure so original map is not mutated
        const copy = Array.from(layers.keys()).sort((a, b) => a - b);
        for (const key of copy) {
            result.set(key, [...(layers.get(key) ?? [])]);
        }

        const sweep =( 
            layerIndices: number[], 
            getReferenceLayerKey: ( currentIndex: number ) => number,
            getNeighborIds: ( node: IMetroNode ) => number[]
        ): void => {
            for (const currentIndex of layerIndices) {
                const currentLayerKey = copy[currentIndex];
                const referenceLayerKey = getReferenceLayerKey(currentIndex);

                const currentLayer = [...(result.get(currentLayerKey) ?? [])];
                const referenceLayer = result.get(referenceLayerKey) ?? [];

                const referencePositions = new Map<number, number>();
                for (let i = 0; i < referenceLayer.length; i++) {
                    referencePositions.set(referenceLayer[i].publication.id, i);
                }

                const originalOrder = new Map<number, number>();
                for (let i = 0; i < currentLayer.length; i++) {
                    originalOrder.set(currentLayer[i].publication.id, i);
                }

                currentLayer.sort((a, b) => {
                    const aPositions = getNeighborIds(a)
                        .map(id => referencePositions.get(id))
                        .filter((pos): pos is number => pos !== undefined);

                    const bPositions = getNeighborIds(b)
                        .map(id => referencePositions.get(id))
                        .filter((pos): pos is number => pos !== undefined);

                    const aMedian = this.median(aPositions);
                    const bMedian = this.median(bPositions);

                    if (aMedian === bMedian) {
                        return (originalOrder.get(a.publication.id) ?? 0) - (originalOrder.get(b.publication.id) ?? 0);
                    }

                    return aMedian - bMedian;
                });

                result.set(currentLayerKey, currentLayer);
            }
        };

        // top -> bottom
        sweep(
            Array.from({ length: copy.length - 1 }, (_, i) => i + 1),
            currentIndex => copy[currentIndex - 1],
            node => incoming.get(node.publication.id) ?? []
        );

        // bottom -> top
        sweep(
            Array.from({ length: copy.length - 1 }, (_, i) => copy.length - 2 - i),
            currentIndex => copy[currentIndex + 1],
            node => outgoing.get(node.publication.id) ?? []
        );

        return result;
    }

    /**
     * Detects if there are cycles in the intra-layer subgraph for a given layer.
     * Returns the set of node IDs that are part of cycles, or empty set if acyclic.
     * IMPORTANT: Properly handles all nodes that participate in ANY cycle, including
     * those that may not be direct cycle participants but are affected by back edges.
     */
    private detectIntraLayerCycles(intraLinks: IMetroLink[]): Set<number> {
        // Build adjacency list
        const adj = new Map<number, Set<number>>();
        const allNodeIds = new Set<number>();

        for (const link of intraLinks) {
            if (!adj.has(link.source)) adj.set(link.source, new Set());
            if (!adj.has(link.target)) adj.set(link.target, new Set());
            adj.get(link.source)!.add(link.target);
            allNodeIds.add(link.source);
            allNodeIds.add(link.target);
        }

        const cycleNodes = new Set<number>();
        const visited = new Set<number>();
        const recursionStack = new Set<number>();
        const hasCycleInSubtree = new Set<number>();

        const dfs = (nodeId: number): boolean => {
            if (visited.has(nodeId)) {
                // Already processed - check if it was part of a cycle
                return hasCycleInSubtree.has(nodeId);
            }

            visited.add(nodeId);
            recursionStack.add(nodeId);
            let hasLocalCycle = false;

            const neighbors = adj.get(nodeId) ?? [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (dfs(neighbor)) {
                        hasLocalCycle = true;
                        cycleNodes.add(nodeId);
                    }
                } else if (recursionStack.has(neighbor)) {
                    // Back edge found - this is a cycle!
                    hasLocalCycle = true;
                    cycleNodes.add(nodeId);
                    cycleNodes.add(neighbor);
                }
            }

            recursionStack.delete(nodeId);
            if (hasLocalCycle) {
                hasCycleInSubtree.add(nodeId);
            }
            return hasLocalCycle;
        };

        for (const nodeId of allNodeIds) {
            if (!visited.has(nodeId)) {
                dfs(nodeId);
            }
        }

        if (cycleNodes.size > 0) {
            console.log(`detectIntraLayerCycles found ${cycleNodes.size} cyclic nodes out of ${allNodeIds.size}`);
        }

        return cycleNodes;
    }

    /**
     * Resolves intra-layer edges by promoting nodes to fractional sublayers.
     * The sublayers are purely logical — assignCoordinates() maps all nodes
     * belonging to the same parent year to the same radius ring.
     *
     * Handles both acyclic and cyclic intra-layer subgraphs:
     * - Acyclic: nodes are topologically sorted and assigned fractional sublayers
     * - Cyclic: cyclic nodes are kept in the original layer; acyclic nodes are promoted
     *
     * After this method, every edge in this.links is between nodes in
     * different (possibly fractional) layer keys. createVirtualNodesAndLinks()
     * will then handle any remaining non-adjacent spans.
     */
    private resolveIntraLayerEdgesBySublayering(): void {
        const layerKeys = Array.from(this.layers.keys()).sort((a, b) => a - b);
        let totalNodesBeforeSublayering = 0;

        for (const layerKey of layerKeys) {
            const layer = this.layers.get(layerKey) ?? [];
            totalNodesBeforeSublayering += layer.length;
            const layerNodeIds = new Set(layer.map(n => n.publication.id));

            const intraLinks = this.links.filter( l => layerNodeIds.has(l.source) && layerNodeIds.has(l.target) );

            if (intraLinks.length === 0) continue;

            console.log(`Layer ${layerKey}: ${layer.length} nodes, ${intraLinks.length} intra-links`);

            // Detect cycles in the intra-layer subgraph
            const cycleNodes = this.detectIntraLayerCycles(intraLinks);

            // Only nodes involved in at least one intra-layer edge are candidates for promotion.
            const participatingIds = new Set<number>([
                ...intraLinks.map(l => l.source),
                ...intraLinks.map(l => l.target),
            ]);

            // Nodes that can be promoted: participating but not in a cycle
            const promotableIds = new Set<number>(
                [...participatingIds].filter(id => !cycleNodes.has(id))
            );

            if (promotableIds.size === 0) {
                // All participating nodes are in cycles; keep them all in the original layer
                if (cycleNodes.size > 0) {
                    console.warn(
                        `Layer ${layerKey}: All ${participatingIds.size} nodes with intra-layer edges are cyclic. Keeping them in the layer.`
                    );
                }
                continue;
            }

            // --- Topological sort of promotable (acyclic) nodes ---
            const adj = new Map<number, Set<number>>();
            const inDegree = new Map<number, number>();

            for (const id of promotableIds) {
                adj.set(id, new Set());
                inDegree.set(id, 0);
            }

            // Deduplicate edges between promotable nodes
            const uniqueEdges = new Set<string>();
            let edgeCountRaw = 0;
            for (const link of intraLinks) {
                if (promotableIds.has(link.source) && promotableIds.has(link.target)) {
                    edgeCountRaw++;
                    const edgeKey = `${link.source}->${link.target}`;
                    if (!uniqueEdges.has(edgeKey)) {
                        uniqueEdges.add(edgeKey);
                        adj.get(link.source)!.add(link.target);
                        inDegree.set(link.target, (inDegree.get(link.target) ?? 0) + 1);
                    }
                }
            }

            // Log in-degree distribution
            const inDegreeHistogram: { [key: number]: number } = {};
            for (const deg of inDegree.values()) {
                inDegreeHistogram[deg] = (inDegreeHistogram[deg] ?? 0) + 1;
            }
            const zeroIndegree = [...inDegree.entries()].filter(([_, deg]) => deg === 0).length;
            console.log(`Layer ${layerKey}: raw-edges=${edgeCountRaw}, unique-edges=${uniqueEdges.size}, in-degree histogram:`, inDegreeHistogram, `zeroIndegree=${zeroIndegree}`);

            const queue: number[] = [];
            for (const [id, deg] of inDegree.entries()) {
                if (deg === 0) queue.push(id);
            }

            const topoOrder: number[] = [];
            let iterationCount = 0;
            while (queue.length > 0) {
                const current = queue.shift()!;
                topoOrder.push(current);
                const outgoing = adj.get(current) ?? [];
                for (const neighbor of outgoing) {
                    const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
                    inDegree.set(neighbor, newDeg);
                    if (newDeg === 0) 
                        queue.push(neighbor);
                }
                iterationCount++;
            }

            // Final check: which nodes are still unvisited?
            const inTopoOrder = new Set(topoOrder);
            const unvisitedNodes = [...promotableIds].filter(id => !inTopoOrder.has(id));
            if (unvisitedNodes.length > 0) {
                const unvisitedInDegrees = unvisitedNodes.map(id => `${id}:${inDegree.get(id)}`).slice(0, 5);
                console.warn(`Layer ${layerKey}: Unvisited=${unvisitedNodes.length}, final in-degrees: ${unvisitedInDegrees.join(', ')}`);
            }

            console.log(`Layer ${layerKey}: promotableIds=${promotableIds.size}, topoOrder=${topoOrder.length}, cycleNodes=${cycleNodes.size}`);

            // Check for nodes missing from topoOrder
            if (topoOrder.length < promotableIds.size) {
                const missing = [...promotableIds].filter(id => !inTopoOrder.has(id));
                console.warn(`Layer ${layerKey}: Missing ${missing.length} nodes from topoOrder: ${missing.slice(0, 10).join(',')}`);
            }

            // Assign fractional sublayer keys to acyclic nodes
            const nodeToSublayer = new Map<number, number>();
            for (let i = 0; i < topoOrder.length; i++) {
                nodeToSublayer.set(
                    topoOrder[i],
                    layerKey + i / topoOrder.length
                );
            }

            // Collect all nodes that will be affected
            const promotableNodes = layer.filter(n => promotableIds.has(n.publication.id));

            // Nodes that completed topo sort (will be promoted to sublayers)
            const promotedNodes = promotableNodes.filter(n => inTopoOrder.has(n.publication.id));
            const unvisitedPromotable = promotableNodes.filter(n => !inTopoOrder.has(n.publication.id));

            // --- Rebuild this.layers ---
            // Remove all promotable nodes from the integer layer (both promoted and unvisited)
            this.layers.set(
                layerKey,
                layer.filter(n => !promotableIds.has(n.publication.id))
            );

            // Place promoted nodes in their new fractional sublayers
            for (const [nodeId, subKey] of nodeToSublayer.entries()) {
                const node = promotedNodes.find(n => n.publication.id === nodeId)!;
                if (!this.layers.has(subKey)) 
                    this.layers.set(subKey, []);
                this.layers.get(subKey)!.push(node);
            }

            // SAFETY: If topological sort was incomplete, keep unvisited nodes in original layer
            // rather than losing them (which was the bug causing node loss)
            if (unvisitedPromotable.length > 0) {
                console.warn(`Layer ${layerKey}: Keeping ${unvisitedPromotable.length} incomplete-topo nodes in original layer (safety fallback)`);
                const originalLayerNodes = this.layers.get(layerKey) ?? [];
                this.layers.set(layerKey, [...originalLayerNodes, ...unvisitedPromotable]);
            }

            if (cycleNodes.size > 0) {
                console.log(
                    `Layer ${layerKey}: ${topoOrder.length} acyclic nodes promoted, ${cycleNodes.size} cyclic nodes retained in layer.`
                );
            }
        }

        // Re-sort this.layers so fractional sublayers interleave correctly
        // between their parent integer year and the next integer year.
        const sorted = new Map<number, IMetroNode[]>(
            [...this.layers.entries()].sort(([a], [b]) => a - b)
        );
        this.layers = sorted;

        let totalNodesAfterSublayering = 0;
        for (const layer of this.layers.values()) {
            totalNodesAfterSublayering += layer.length;
        }
        console.log(`Sublayering: ${totalNodesBeforeSublayering} nodes before → ${totalNodesAfterSublayering} nodes after`);
    }

    private orderVertices(): void {
        console.log(`orderVertices START: ${Array.from(this.layers.values()).reduce((sum, layer) => sum + layer.length, 0)} nodes in layers`);

        this.resolveIntraLayerEdgesBySublayering();
        console.log(`After sublayering: ${Array.from(this.layers.values()).reduce((sum, layer) => sum + layer.length, 0)} nodes in layers`);

        this.createVirtualNodesAndLinks();
        console.log(`After virtual nodes: ${Array.from(this.layers.values()).reduce((sum, layer) => sum + layer.length, 0)} nodes in layers`);

        const layers = this.layers;
        let best = new Map([...layers.entries()]);
        console.log(`After copy: ${Array.from(best.values()).reduce((sum, layer) => sum + layer.length, 0)} nodes in best`);

        let bestCrossings = this.numberOfCrossings(best);
        console.log(`Initial crossings: ${bestCrossings}`);

        for ( let i = 0; i < 24; i++) {
            const transposed = this.medianSweep( best );
            const nodesInTransposed = Array.from(transposed.values()).reduce((sum, layer) => sum + layer.length, 0);
            console.log(`Iteration ${i}: transposed has ${nodesInTransposed} nodes`);
            if( this.numberOfCrossings( transposed ) < bestCrossings ) {
                best = transposed;
                bestCrossings = this.numberOfCrossings(best);
            }
        }
        console.log(`After median sweep: ${Array.from(best.values()).reduce((sum, layer) => sum + layer.length, 0)} nodes in best`);

        this.bestLayers = best;
        this.assignLayersToNodes( best );
    }

    // Assigns each node a layer property based on the layer it belongs to. This is used in the assignCoordinates step to determine the distance of each node from the center. Virtual nodes are assigned a layer as well, but this is only used for the crossing minimization and they are not part of the final layout.
    private assignLayersToNodes(layers: Map<number, IMetroNode[]>): void {
        for (const [layerKey, layerNodes] of layers.entries()) {
            for (const node of layerNodes) {
                node.layer = layerKey;
            }
        }
    }

    // Assign radial coordinates to already existing nodes based on their layer and position within the layer. 
    // Virtual nodes are ignored in this step, as they are only used for the crossing minimization and not part of the final layout.
    // For center nodes (no incoming edges), arms from different clusters are placed in opposite directions.
    private assignCoordinates(): void {
        let assignedCoordinates = 0;
        const layerKeys = Array.from(this.bestLayers.keys()).sort((a, b) => a - b);
        for ( const layerKey of layerKeys ) {
            const layer = this.bestLayers.get(layerKey) ?? [];
            const maxLayerSize = Math.max( ...Array.from(this.bestLayers.values()).map( l => l.length ) );
            for( const node of layer ) {
                if ( node.publication.id < 0 ) {
                    // virtual node, ignore
                    continue;
                }
                node.angle = 2 * Math.PI * layer.indexOf(node) / maxLayerSize;
                assignedCoordinates++;
            }
        }
        console.log(`Assigned coordinates to ${assignedCoordinates} nodes across ${layerKeys.length} layers.`);
    }
}