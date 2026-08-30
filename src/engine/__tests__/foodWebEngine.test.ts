// src/engine/__tests__/foodWebEngine.test.ts
// Example-based unit tests for the Food Web Engine.
//
// Coverage:
//   - extractGraph derives data exclusively from trophicRole/dependsOn/predatorOf
//     (Requirement 1.4)
//   - empty-state: no relationships => graph has nodes but no edges
//     (Requirement 1.6)
//   - findDependents returns an empty array when a node has no dependents
//     (Requirement 2.4)

import { describe, it, expect } from 'vitest';
import { extractGraph, findDependents } from '../foodWebEngine';
import type { Exhibit } from '../../types';

/**
 * Build an exhibit with sensible defaults; callers override only the fields
 * relevant to the assertion.
 */
function makeExhibit(overrides: Partial<Exhibit> & { id: string; name: string }): Exhibit {
  return {
    lat: 1.4043,
    lng: 103.793,
    iucnStatus: 'Endangered',
    funFact: 'irrelevant',
    feedingTimes: ['10:30'],
    diet: 'Herbivore',
    dietTags: ['fruit'],
    trophicRole: 'Primary Consumer',
    dependsOn: [],
    predatorOf: [],
    ecosystemImpactIfRemoved: 'irrelevant',
    imagenetLabels: ['label'],
    spriteBodyAsset: '/sprite.png',
    points: 20,
    ...overrides,
  };
}

describe('extractGraph', () => {
  it('derives nodes and edges exclusively from trophicRole, dependsOn, and predatorOf (Req 1.4)', () => {
    // Two exhibits, each with distinctive values in the "irrelevant" fields.
    // Changing those fields must not change the derived graph.
    const base: Exhibit[] = [
      makeExhibit({
        id: 'hippo',
        name: 'Pygmy Hippopotamus',
        trophicRole: 'Primary Consumer',
        dependsOn: ['riverine plants'],
        predatorOf: [],
      }),
      makeExhibit({
        id: 'tiger',
        name: 'Malayan Tiger',
        trophicRole: 'Apex Predator',
        dependsOn: [],
        predatorOf: ['Pygmy Hippopotamus'],
      }),
    ];

    // Same trophicRole/dependsOn/predatorOf, but every other field mutated.
    const mutated: Exhibit[] = base.map((e) =>
      makeExhibit({
        id: e.id,
        name: e.name,
        trophicRole: e.trophicRole,
        dependsOn: e.dependsOn,
        predatorOf: e.predatorOf,
        lat: 42,
        lng: -7,
        iucnStatus: 'Least Concern',
        funFact: 'different',
        feedingTimes: ['23:59', '00:00'],
        diet: 'Carnivore',
        dietTags: ['meat', 'bones'],
        ecosystemImpactIfRemoved: 'totally different text',
        imagenetLabels: ['other'],
        spriteBodyAsset: '/different.png',
        points: 999,
      }),
    );

    const graphA = extractGraph(base);
    const graphB = extractGraph(mutated);

    expect(graphB).toEqual(graphA);

    // Sanity: the derived structure is what we expect.
    // Nodes: hippo, tiger, and one inferred producer "riverine plants".
    expect(new Set(graphA.nodes.map((n) => n.id))).toEqual(
      new Set(['hippo', 'tiger', 'producer:riverine-plants']),
    );
    // Edges: producer -> hippo (dependsOn), hippo -> tiger (predatorOf prey).
    expect(graphA.edges).toEqual(
      expect.arrayContaining([
        { from: 'producer:riverine-plants', to: 'hippo' },
        { from: 'hippo', to: 'tiger' },
      ]),
    );
    expect(graphA.edges).toHaveLength(2);
    expect(graphA.warnings).toEqual([]);
  });

  it('produces nodes but no edges when all dependsOn and predatorOf are empty (empty-state, Req 1.6)', () => {
    const exhibits: Exhibit[] = [
      makeExhibit({ id: 'a', name: 'A', trophicRole: 'Producer' }),
      makeExhibit({ id: 'b', name: 'B', trophicRole: 'Primary Consumer' }),
      makeExhibit({ id: 'c', name: 'C', trophicRole: 'Apex Predator' }),
    ];

    const graph = extractGraph(exhibits);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toEqual([]);
    expect(graph.warnings).toEqual([]);
  });

  it('returns an empty graph for an empty exhibits array', () => {
    const graph = extractGraph([]);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.warnings).toEqual([]);
  });
});

describe('findDependents', () => {
  it('returns an empty array when the node has no dependents (Req 2.4)', () => {
    // Tiger is an apex predator that nothing depends on.
    const exhibits: Exhibit[] = [
      makeExhibit({
        id: 'hippo',
        name: 'Pygmy Hippopotamus',
        trophicRole: 'Primary Consumer',
        dependsOn: ['riverine plants'],
      }),
      makeExhibit({
        id: 'tiger',
        name: 'Malayan Tiger',
        trophicRole: 'Apex Predator',
        predatorOf: ['Pygmy Hippopotamus'],
      }),
    ];

    const graph = extractGraph(exhibits);

    // Nothing lists the tiger as a dependency or prey.
    expect(findDependents(graph, 'tiger')).toEqual([]);

    // The hippo, by contrast, is prey for the tiger => tiger is its dependent.
    expect(findDependents(graph, 'hippo')).toEqual(['tiger']);
  });

  it('returns an empty array for an id that is not in the graph', () => {
    const graph = extractGraph([
      makeExhibit({ id: 'a', name: 'A', trophicRole: 'Producer' }),
    ]);
    expect(findDependents(graph, 'missing')).toEqual([]);
  });
});
