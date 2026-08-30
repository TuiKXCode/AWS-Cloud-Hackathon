// src/engine/foodWebEngine.ts
// The Food Web Engine: pure functions that derive a trophic graph (nodes and
// directed edges) from the existing exhibits dataset, and identify the
// dependents of a given node for the ecosystem-collapse simulation.
//
// Part of the food-web-dining feature (Phase 2). All functions are pure and
// decoupled from React so they can be unit- and property-tested in isolation.
// Node and edge data is derived exclusively from the `trophicRole`,
// `dependsOn`, and `predatorOf` fields of each exhibit (Requirement 1.4).

import type { Exhibit } from '../types';

/**
 * The three recognized trophic levels. An exhibit whose `trophicRole` is not
 * one of these values is excluded from the graph (Requirement 1.5).
 */
export type TrophicLevel = 'Producer' | 'Primary Consumer' | 'Apex Predator';

/**
 * The set of valid trophic levels, used for validation.
 */
const VALID_TROPHIC_LEVELS: readonly TrophicLevel[] = [
  'Producer',
  'Primary Consumer',
  'Apex Predator',
];

/**
 * A node in the trophic food web. Represents either an exhibit (with a valid
 * `trophicRole`) or an inferred Producer derived from a `dependsOn` entry that
 * does not correspond to an exhibit.
 */
export interface TrophicNode {
  /** Node identifier: exhibit id, or slugified producer name for inferred nodes. */
  id: string;
  /** Display name. */
  label: string;
  /** The node's trophic level. */
  trophicLevel: TrophicLevel;
  /** The originating exhibit id, or null for inferred Producer nodes. */
  exhibitId: string | null;
}

/**
 * A directed edge representing energy flow from a source (producer or prey) to
 * a target (consumer or predator).
 */
export interface TrophicEdge {
  /** Source node id — the energy provider (producer or prey). */
  from: string;
  /** Target node id — the consumer (dependent or predator). */
  to: string;
}

/**
 * The complete derived graph plus any classification warnings.
 */
export interface FoodWebGraph {
  nodes: TrophicNode[];
  edges: TrophicEdge[];
  /** Names of exhibits excluded because their `trophicRole` was unrecognized. */
  warnings: string[];
}

/**
 * Determine whether a `trophicRole` string names one of the three valid
 * trophic levels.
 */
function isValidTrophicLevel(role: string): role is TrophicLevel {
  return (VALID_TROPHIC_LEVELS as readonly string[]).includes(role);
}

/**
 * Produce a stable, deterministic node id from a dependency/prey name. Inferred
 * producer nodes use this so edges can reference them consistently.
 *
 * The scheme lowercases and replaces runs of non-alphanumeric characters with a
 * single hyphen, prefixed with `producer:` to avoid colliding with exhibit ids.
 */
function inferredNodeId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `producer:${slug}`;
}

/**
 * Derive the trophic food web graph from an array of exhibits.
 *
 * Behavior (see design "Components and Interfaces" §1 and Requirements
 * 1.1, 1.3, 1.4, 1.5):
 *
 * 1. Each exhibit with a valid `trophicRole` becomes a node with `exhibitId`
 *    set to the exhibit id.
 * 2. Each unique name appearing in any exhibit's `dependsOn` array that does
 *    not already correspond to an exhibit node becomes an inferred Producer
 *    node (`exhibitId` = null).
 * 3. For every valid exhibit, an edge is created from each `dependsOn` entry's
 *    node to the exhibit (energy flows from producer/prey up to the consumer).
 * 4. For every valid exhibit, an edge is created from each `predatorOf` entry's
 *    node to the exhibit (the predator consumes its prey).
 * 5. Exhibits whose `trophicRole` is not one of the three valid levels are
 *    excluded from `nodes`; their names are collected in `warnings`.
 *
 * Only the `trophicRole`, `dependsOn`, and `predatorOf` fields (plus `id`/`name`
 * for identity/labels) are consulted (Requirement 1.4).
 *
 * @param exhibits The exhibits dataset.
 * @returns The derived {@link FoodWebGraph}.
 */
export function extractGraph(exhibits: Exhibit[]): FoodWebGraph {
  const nodes: TrophicNode[] = [];
  const edges: TrophicEdge[] = [];
  const warnings: string[] = [];

  // Track exhibit nodes by name so dependency/prey references can resolve to an
  // existing exhibit node rather than creating a duplicate inferred node.
  const exhibitNodeIdByName = new Map<string, string>();
  const nodeIds = new Set<string>();

  // Pass 1: create nodes for valid exhibits; collect warnings for invalid ones.
  for (const exhibit of exhibits) {
    if (!isValidTrophicLevel(exhibit.trophicRole)) {
      warnings.push(exhibit.name);
      continue;
    }
    nodes.push({
      id: exhibit.id,
      label: exhibit.name,
      trophicLevel: exhibit.trophicRole,
      exhibitId: exhibit.id,
    });
    nodeIds.add(exhibit.id);
    exhibitNodeIdByName.set(exhibit.name, exhibit.id);
  }

  /**
   * Resolve a dependency/prey name to a node id, creating an inferred Producer
   * node the first time an unknown name is seen.
   */
  const resolveNodeId = (name: string): string => {
    const existing = exhibitNodeIdByName.get(name);
    if (existing !== undefined) {
      return existing;
    }
    const inferredId = inferredNodeId(name);
    if (!nodeIds.has(inferredId)) {
      nodes.push({
        id: inferredId,
        label: name,
        trophicLevel: 'Producer',
        exhibitId: null,
      });
      nodeIds.add(inferredId);
    }
    return inferredId;
  };

  // Pass 2: create edges for valid exhibits only. Inferred producer nodes are
  // materialized on demand as their names are encountered.
  for (const exhibit of exhibits) {
    if (!isValidTrophicLevel(exhibit.trophicRole)) {
      continue;
    }
    for (const dependencyName of exhibit.dependsOn) {
      const fromId = resolveNodeId(dependencyName);
      edges.push({ from: fromId, to: exhibit.id });
    }
    for (const preyName of exhibit.predatorOf) {
      const fromId = resolveNodeId(preyName);
      edges.push({ from: fromId, to: exhibit.id });
    }
  }

  return { nodes, edges, warnings };
}

/**
 * Find every node that depends on the given node — i.e., every exhibit whose
 * `dependsOn` relationship (represented as an edge from the removed node) points
 * to it.
 *
 * Because {@link extractGraph} emits a `from -> to` edge for each `dependsOn`
 * entry (from the dependency to the dependent exhibit), the dependents of a
 * removed node are exactly the `to` endpoints of edges whose `from` equals the
 * removed node id. Predator edges are also modeled `prey -> predator`, so this
 * likewise surfaces predators that rely on the removed node as prey.
 *
 * The returned list contains each dependent id at most once and preserves the
 * order in which the dependents' edges were first encountered.
 *
 * @param graph The graph produced by {@link extractGraph}.
 * @param removedNodeId The id of the node being removed.
 * @returns Distinct ids of nodes that depend on the removed node.
 */
export function findDependents(
  graph: FoodWebGraph,
  removedNodeId: string,
): string[] {
  const dependents: string[] = [];
  const seen = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.from === removedNodeId && !seen.has(edge.to)) {
      seen.add(edge.to);
      dependents.push(edge.to);
    }
  }
  return dependents;
}
