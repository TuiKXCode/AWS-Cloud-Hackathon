// src/components/__tests__/FoodWebSimulator.test.tsx
// Component tests for FoodWebSimulator (Task 4.4, food-web-dining feature).
// Uses Vitest + React Testing Library.
//
// Coverage:
//  - Nodes render at correct trophic-level y positions (Req 1.2)
//  - Collapse toggle dims selected node + dependents to opacity 0.3 (Req 2.1)
//  - Deactivation restores opacity to 1.0 (Req 2.3)
//  - Ecosystem impact text displays for affected exhibits (Req 2.1)
//  - Empty-state message when no relationships (Req 1.6)
//  - Warning indicator for invalid trophicRole exhibits (Req 1.5)

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FoodWebSimulator } from '../FoodWebSimulator';
import type { Exhibit } from '../../types';

/**
 * Build a minimal Exhibit with sensible defaults; override per-test.
 */
function makeExhibit(overrides: Partial<Exhibit>): Exhibit {
  return {
    id: 'x',
    name: 'X',
    lat: 0,
    lng: 0,
    iucnStatus: 'Least Concern',
    funFact: '',
    feedingTimes: [],
    diet: '',
    dietTags: [],
    trophicRole: 'Primary Consumer',
    dependsOn: [],
    predatorOf: [],
    ecosystemImpactIfRemoved: '',
    imagenetLabels: [],
    spriteBodyAsset: '',
    points: 0,
    ...overrides,
  };
}

/**
 * A small food web:
 *  - "plants" inferred Producer (from tiger/deer dependsOn)
 *  - deer: Primary Consumer, dependsOn ["plants"]
 *  - tiger: Apex Predator, predatorOf ["deer"], depends on nothing directly
 */
const baseExhibits: Exhibit[] = [
  makeExhibit({
    id: 'deer',
    name: 'Deer',
    trophicRole: 'Primary Consumer',
    dependsOn: ['plants'],
    ecosystemImpactIfRemoved: 'Tigers lose their primary prey.',
  }),
  makeExhibit({
    id: 'tiger',
    name: 'Tiger',
    trophicRole: 'Apex Predator',
    dependsOn: ['deer'],
    predatorOf: ['deer'],
    ecosystemImpactIfRemoved: 'Deer overpopulate.',
  }),
];

/** Read the numeric y coordinate from a translate() transform. */
function translateY(transform: string): number {
  const match = /translate\(\s*[-\d.]+\s*,\s*([-\d.]+)\s*\)/.exec(transform);
  expect(match, `expected translate() in "${transform}"`).not.toBeNull();
  return Number(match![1]);
}

function getNodeGroup(nodeId: string): SVGGElement {
  const el = document.querySelector(`[data-node-id="${nodeId}"]`);
  expect(el, `node ${nodeId} should be rendered`).not.toBeNull();
  return el as unknown as SVGGElement;
}

describe('FoodWebSimulator', () => {
  it('renders nodes at correct trophic-level positions (Req 1.2)', () => {
    render(<FoodWebSimulator exhibits={baseExhibits} />);

    const producer = getNodeGroup('producer:plants');
    const consumer = getNodeGroup('deer');
    const predator = getNodeGroup('tiger');

    const yProducer = translateY(producer.getAttribute('transform')!);
    const yConsumer = translateY(consumer.getAttribute('transform')!);
    const yPredator = translateY(predator.getAttribute('transform')!);

    // SVG y grows downward: Producer lowest on screen (largest y),
    // Apex Predator highest (smallest y).
    expect(yProducer).toBeGreaterThan(yConsumer);
    expect(yConsumer).toBeGreaterThan(yPredator);
  });

  it('dims selected node and dependents to opacity 0.3 on collapse (Req 2.1)', () => {
    render(<FoodWebSimulator exhibits={baseExhibits} />);

    // Select the producer "plants"; deer depends on it.
    fireEvent.click(getNodeGroup('producer:plants'));

    const toggle = screen.getByRole('button', {
      name: /simulate ecosystem collapse/i,
    });
    fireEvent.click(toggle);

    const producer = getNodeGroup('producer:plants');
    const dependent = getNodeGroup('deer');

    expect(producer.style.opacity).toBe('0.3');
    expect(dependent.style.opacity).toBe('0.3');
    // The 400ms transition must be present (Req 2.2).
    expect(producer.style.transition).toContain('400ms');
  });

  it('restores opacity to 1.0 when collapse is deactivated (Req 2.3)', () => {
    render(<FoodWebSimulator exhibits={baseExhibits} />);

    fireEvent.click(getNodeGroup('producer:plants'));
    const toggle = screen.getByRole('button', {
      name: /simulate ecosystem collapse/i,
    });

    fireEvent.click(toggle); // activate
    expect(getNodeGroup('deer').style.opacity).toBe('0.3');

    fireEvent.click(toggle); // deactivate
    expect(getNodeGroup('producer:plants').style.opacity).toBe('1');
    expect(getNodeGroup('deer').style.opacity).toBe('1');
  });

  it('displays ecosystem impact text for affected exhibits (Req 2.1)', () => {
    render(<FoodWebSimulator exhibits={baseExhibits} />);

    fireEvent.click(getNodeGroup('producer:plants'));
    fireEvent.click(
      screen.getByRole('button', { name: /simulate ecosystem collapse/i }),
    );

    // Deer depends on plants -> its impact text should appear.
    expect(
      screen.getByText(/tigers lose their primary prey/i),
    ).toBeInTheDocument();
  });

  it('shows "no dependent species" message when selected node has none (Req 2.4)', () => {
    render(<FoodWebSimulator exhibits={baseExhibits} />);

    // Select the tiger (apex predator) — nothing depends on it.
    fireEvent.click(getNodeGroup('tiger'));
    fireEvent.click(
      screen.getByRole('button', { name: /simulate ecosystem collapse/i }),
    );

    expect(
      screen.getByText(/no dependent species found in dataset/i),
    ).toBeInTheDocument();
  });

  it('shows empty-state message when there are no relationships (Req 1.6)', () => {
    const noRelationships: Exhibit[] = [
      makeExhibit({ id: 'a', name: 'A', trophicRole: 'Producer' }),
      makeExhibit({ id: 'b', name: 'B', trophicRole: 'Apex Predator' }),
    ];
    render(<FoodWebSimulator exhibits={noRelationships} />);

    expect(
      screen.getByText(/no ecological relationships are available/i),
    ).toBeInTheDocument();
  });

  it('shows warning indicator for invalid trophicRole exhibits (Req 1.5)', () => {
    const withInvalid: Exhibit[] = [
      ...baseExhibits,
      makeExhibit({
        id: 'mystery',
        name: 'Mystery Creature',
        trophicRole: 'Unknown Role',
        dependsOn: ['plants'],
      }),
    ];
    render(<FoodWebSimulator exhibits={withInvalid} />);

    const alert = screen.getByRole('alert');
    expect(
      within(alert).getByText(/could not be classified/i),
    ).toBeInTheDocument();

    // The invalid exhibit must be excluded from the diagram.
    expect(document.querySelector('[data-node-id="mystery"]')).toBeNull();
  });
});
