// src/components/TrophicNode.tsx
// TrophicNode: presentational SVG node element within the Food Web diagram.
// Part of the food-web-dining feature (Phase 2).
//
// Responsibilities:
//  - Render an SVG <g> group containing a <circle> and a <text> label (Req 1.1).
//  - Drive opacity via the `dimmed` prop using a 400ms CSS transition so the
//    ecosystem-collapse simulation dims nodes smoothly (Req 2.2).
//  - Reflect selection state visually via the `selected` prop.
//  - Notify the parent when clicked via `onSelect(nodeId)`.
//  - Expose accessibility affordances (role/aria) so the node is operable.

import type { TrophicNode as TrophicNodeData } from '../engine/foodWebEngine';

/**
 * Radius for exhibit-backed nodes (larger) versus inferred producer nodes.
 */
const EXHIBIT_NODE_RADIUS = 26;
const INFERRED_NODE_RADIUS = 18;

/**
 * The dimmed opacity applied during ecosystem-collapse simulation (Req 2.1),
 * and the restored full opacity (Req 2.3).
 */
const DIMMED_OPACITY = 0.3;
const FULL_OPACITY = 1.0;

export interface TrophicNodeProps {
  /** The node's derived graph data. */
  node: TrophicNodeData;
  /** X coordinate (SVG user units) of the node center. */
  x: number;
  /** Y coordinate (SVG user units) of the node center. */
  y: number;
  /** Whether the node is dimmed by the collapse simulation. */
  dimmed: boolean;
  /** Whether the node is currently selected. */
  selected: boolean;
  /** Called with the node id when the node is activated. */
  onSelect: (nodeId: string) => void;
}

/**
 * Render a single trophic node as an interactive SVG group.
 */
export function TrophicNode({
  node,
  x,
  y,
  dimmed,
  selected,
  onSelect,
}: TrophicNodeProps) {
  const radius =
    node.exhibitId !== null ? EXHIBIT_NODE_RADIUS : INFERRED_NODE_RADIUS;

  const handleActivate = () => {
    onSelect(node.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(node.id);
    }
  };

  return (
    <g
      className={`trophic-node${selected ? ' trophic-node--selected' : ''}${
        dimmed ? ' trophic-node--dimmed' : ''
      }`}
      data-node-id={node.id}
      data-trophic-level={node.trophicLevel}
      data-dimmed={dimmed}
      data-selected={selected}
      transform={`translate(${x}, ${y})`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${node.label}, ${node.trophicLevel}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      style={{
        opacity: dimmed ? DIMMED_OPACITY : FULL_OPACITY,
        transition: 'opacity 400ms ease',
        cursor: 'pointer',
      }}
    >
      <circle
        className="trophic-node__circle"
        r={radius}
        stroke={selected ? '#1d4ed8' : '#374151'}
        strokeWidth={selected ? 3 : 1.5}
        fill={node.exhibitId !== null ? '#bfdbfe' : '#d1fae5'}
      />
      <text
        className="trophic-node__label"
        y={radius + 14}
        textAnchor="middle"
        fontSize={12}
      >
        {node.label}
      </text>
    </g>
  );
}

export default TrophicNode;
