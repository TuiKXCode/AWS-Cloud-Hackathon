// src/engine/__tests__/foodWebEngine.property.test.ts
// Property-based tests for the Food Web Engine, validating the design
// document's correctness properties 1, 3, 4, and 5. Each test runs a minimum
// of 100 iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { extractGraph, findDependents } from '../foodWebEngine';
import type { FoodWebGraph } from '../foodWebEngine';
import type { Exhibit } from '../../types';

const VALID_LEVELS = ['Producer', 'Primary Consumer', 'Apex Predator'] as const;

/**
 * Recreate the inferred-node id scheme used by the engine so tests can predict
 * which node id an unknown dependency/prey name resolves to.
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
 * Build an exhibit stub. Only the fields consulted by the engine
 * (id, name, trophicRole, dependsOn, predatorOf) carry meaning; the rest are
 * filled with harmless defaults.
 */
function makeExhibit(fields: {
  id: string;
  name: string;
  trophicRole: string;
  dependsOn: string[];
  predatorOf: string[];
}): Exhibit {
  return {
    id: fields.id,
    name: fields.name,
    lat: 0,
    lng: 0,
    iucnStatus: 'Least Concern',
    funFact: '',
    feedingTimes: [],
    diet: '',
    dietTags: [],
    trophicRole: fields.trophicRole,
    dependsOn: fields.dependsOn,
    predatorOf: fields.predatorOf,
    ecosystemImpactIfRemoved: '',
    imagenetLabels: [],
    spriteBodyAsset: '',
    points: 0,
  };
}

// A name generator that always slugifies to a non-empty, distinct-ish token.
const nameArb = fc.string({ minLength: 1, maxLength: 8 }).map((s) => `name-${s}`);

const validRoleArb = fc.constantFrom(...VALID_LEVELS);

/**
 * Generate an array of exhibits with unique ids and unique names, each carrying
 * a valid trophicRole and random dependsOn/predatorOf name lists.
 */
function validExhibitsArb(): fc.Arbitrary<Exhibit[]> {
  return fc
    .array(
      fc.record({
        role: validRoleArb,
        dependsOn: fc.array(nameArb, { maxLength: 4 }),
        predatorOf: fc.array(nameArb, { maxLength: 4 }),
      }),
      { minLength: 0, maxLength: 12 },
    )
    .map((rows) =>
      rows.map((r, i) =>
        makeExhibit({
          id: `ex-${i}`,
          name: `Exhibit ${i}`,
          trophicRole: r.role,
          dependsOn: r.dependsOn,
          predatorOf: r.predatorOf,
        }),
      ),
    );
}

describe('foodWebEngine property tests', () => {
  // Feature: food-web-dining, Property 1: Graph node completeness — for any
  // exhibits with valid trophicRole, extractGraph returns exactly one node per
  // exhibit plus exactly one node per unique dependsOn name not already an
  // exhibit node, and no other nodes.
  it('Property 1: extractGraph produces one node per valid exhibit + one per unique inferred producer', () => {
    fc.assert(
      fc.property(validExhibitsArb(), (exhibits) => {
        const graph = extractGraph(exhibits);

        // Expected exhibit node ids.
        const exhibitIds = new Set(exhibits.map((e) => e.id));
        const exhibitNames = new Set(exhibits.map((e) => e.name));

        // Expected inferred producer ids: unique dependsOn names that are not
        // the name of an existing exhibit node.
        const inferredIds = new Set<string>();
        for (const e of exhibits) {
          for (const dep of e.dependsOn) {
            if (!exhibitNames.has(dep)) {
              inferredIds.add(inferredNodeId(dep));
            }
          }
        }
        // predatorOf names that are unknown also materialize as producer nodes.
        for (const e of exhibits) {
          for (const prey of e.predatorOf) {
            if (!exhibitNames.has(prey)) {
              inferredIds.add(inferredNodeId(prey));
            }
          }
        }

        const expectedNodeIds = new Set<string>([...exhibitIds, ...inferredIds]);

        // No duplicate node ids.
        const actualIds = graph.nodes.map((n) => n.id);
        expect(new Set(actualIds).size).toBe(actualIds.length);

        // Exactly the expected set of node ids — no more, no fewer.
        expect(new Set(actualIds)).toEqual(expectedNodeIds);

        // Every valid exhibit is represented as a node with its exhibitId set.
        for (const e of exhibits) {
          const node = graph.nodes.find((n) => n.id === e.id);
          expect(node).toBeDefined();
          expect(node!.exhibitId).toBe(e.id);
        }
      }),
      { numRuns: 200 },
    );
  });

  // Feature: food-web-dining, Property 3: Edge directionality follows energy
  // flow — for any exhibit with a non-empty dependsOn, there is an edge from
  // the dependency node to the exhibit; likewise predatorOf prey -> exhibit.
  it('Property 3: edges point from dependency/prey to the consuming exhibit', () => {
    fc.assert(
      fc.property(validExhibitsArb(), (exhibits) => {
        const graph = extractGraph(exhibits);
        const nameToId = new Map<string, string>();
        for (const e of exhibits) {
          nameToId.set(e.name, e.id);
        }
        const resolve = (name: string): string =>
          nameToId.get(name) ?? inferredNodeId(name);

        const hasEdge = (from: string, to: string): boolean =>
          graph.edges.some((edge) => edge.from === from && edge.to === to);

        for (const e of exhibits) {
          for (const dep of e.dependsOn) {
            expect(hasEdge(resolve(dep), e.id)).toBe(true);
          }
          for (const prey of e.predatorOf) {
            expect(hasEdge(resolve(prey), e.id)).toBe(true);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  // Feature: food-web-dining, Property 4: Invalid trophicRole exclusion —
  // exhibits whose trophicRole is not a valid level are excluded from nodes and
  // their names appear in warnings.
  it('Property 4: exhibits with invalid trophicRole are excluded from nodes and listed in warnings', () => {
    const invalidRoleArb = fc
      .string({ maxLength: 12 })
      .filter((s) => !(VALID_LEVELS as readonly string[]).includes(s));

    const mixedExhibitsArb = fc
      .array(
        fc.record({
          role: fc.oneof(validRoleArb, invalidRoleArb),
          dependsOn: fc.array(nameArb, { maxLength: 3 }),
          predatorOf: fc.array(nameArb, { maxLength: 3 }),
        }),
        { minLength: 1, maxLength: 12 },
      )
      .map((rows) =>
        rows.map((r, i) =>
          makeExhibit({
            id: `ex-${i}`,
            name: `Exhibit ${i}`,
            trophicRole: r.role,
            dependsOn: r.dependsOn,
            predatorOf: r.predatorOf,
          }),
        ),
      );

    fc.assert(
      fc.property(mixedExhibitsArb, (exhibits) => {
        const graph = extractGraph(exhibits);

        const invalid = exhibits.filter(
          (e) => !(VALID_LEVELS as readonly string[]).includes(e.trophicRole),
        );

        for (const e of invalid) {
          // Excluded from nodes (no node carries this exhibit's id).
          expect(graph.nodes.some((n) => n.exhibitId === e.id)).toBe(false);
          // Name appears in warnings.
          expect(graph.warnings).toContain(e.name);
        }

        // warnings contains exactly one entry per invalid exhibit.
        expect(graph.warnings.length).toBe(invalid.length);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: food-web-dining, Property 5: Dependent identification correctness —
  // findDependents returns exactly the set of node ids reachable via an edge
  // from the removed node (i.e., exhibits whose dependsOn/predatorOf reference
  // the removed node), and no others.
  it('Property 5: findDependents returns exactly the direct dependents of the removed node', () => {
    fc.assert(
      fc.property(validExhibitsArb(), (exhibits) => {
        const graph: FoodWebGraph = extractGraph(exhibits);
        if (graph.nodes.length === 0) {
          expect(findDependents(graph, 'nonexistent')).toEqual([]);
          return;
        }

        for (const node of graph.nodes) {
          const result = findDependents(graph, node.id);

          // Expected: distinct `to` endpoints of edges whose `from` == node.id.
          const expected = new Set(
            graph.edges
              .filter((edge) => edge.from === node.id)
              .map((edge) => edge.to),
          );

          // Exactly the expected set, and no duplicates.
          expect(new Set(result)).toEqual(expected);
          expect(new Set(result).size).toBe(result.length);
        }
      }),
      { numRuns: 200 },
    );
  });
});
