// src/components/FoodWebSimulator.tsx
// FoodWebSimulator: the interactive SVG food-web diagram container.
// Part of the food-web-dining feature (Phase 2).
//
// Responsibilities:
//  - Derive nodes/edges from exhibits via extractGraph (Req 1.1, 1.3, 1.4).
//  - Lay out nodes into three trophic tiers: Producers low (y=80%), Primary
//    Consumers mid (y=50%), Apex Predators high (y=20%); x evenly distributed
//    within each tier (Req 1.2).
//  - Draw directed edges as SVG <path> elements with an arrowhead marker,
//    pointing in the direction of energy flow (Req 1.3).
//  - Manage selection and collapse state; when collapse is active, dim the
//    selected node plus its dependents to opacity 0.3 with a 400ms transition
//    and show ecosystemImpactIfRemoved text (Req 2.1, 2.2, 2.4, 2.5).
//  - Restore all nodes when collapse is deactivated (Req 2.3).
//  - Show a warning indicator when some exhibits could not be classified
//    (Req 1.5) and an empty-state message when there is nothing to visualize
//    (Req 1.6).

import { useMemo, useState } from 'react';
import type { Exhibit } from '../types';
import {
  extractGraph,
  findDependents,
  type FoodWebGraph,
  type TrophicNode as TrophicNodeData,
  type TrophicLevel,
} from '../engine/foodWebEngine';
import { TrophicNode } from './TrophicNode';
import { EcosystemCollapseToggle } from './EcosystemCollapseToggle';
import { colors, radius, shadow, space, font } from '../theme';

/** Themed chrome styles (surrounding container only — SVG layout untouched). */
const sectionStyle: React.CSSProperties = {
  fontFamily: font.family,
  color: colors.textDark,
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  boxShadow: shadow.card,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.sandDark,
  padding: space.lg,
  display: 'flex',
  flexDirection: 'column',
  gap: space.md,
  maxWidth: 900,
  margin: '0 auto',
};

const warningStyle: React.CSSProperties = {
  margin: 0,
  padding: `${space.sm}px ${space.md}px`,
  borderRadius: radius.md,
  backgroundColor: colors.barkTint,
  color: colors.bark,
  fontSize: '0.85rem',
  fontWeight: 600,
};

const emptyMessageStyle: React.CSSProperties = {
  margin: 0,
  padding: space.lg,
  textAlign: 'center',
  color: colors.textMuted,
};

const impactPanelStyle: React.CSSProperties = {
  backgroundColor: colors.sand,
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.sandDark,
  padding: space.md,
};

const impactListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: space.sm,
};

const impactItemStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  lineHeight: 1.5,
  color: colors.textDark,
};

const impactNameStyle: React.CSSProperties = {
  fontWeight: 700,
  color: colors.forestGreen,
};

const noDependentsStyle: React.CSSProperties = {
  margin: 0,
  color: colors.textMuted,
  fontStyle: 'italic',
};

/** SVG viewport dimensions (user units); scaled responsively via viewBox. */
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 500;

/** Fractional y positions for each trophic tier (SVG y grows downward). */
const TIER_Y_FRACTION: Record<TrophicLevel, number> = {
  Producer: 0.8,
  'Primary Consumer': 0.5,
  'Apex Predator': 0.2,
};

/** Tier ordering used to group nodes for layout. */
const TIER_ORDER: TrophicLevel[] = [
  'Apex Predator',
  'Primary Consumer',
  'Producer',
];

export interface FoodWebSimulatorProps {
  /** The exhibits dataset from which the graph is derived. */
  exhibits: Exhibit[];
}

/** A node with its computed layout coordinates. */
interface PositionedNode {
  node: TrophicNodeData;
  x: number;
  y: number;
}

/**
 * Compute deterministic (x, y) coordinates for every node, grouped by tier.
 * Producers sit lowest on screen (largest y), Apex Predators highest (Req 1.2).
 */
function layoutNodes(nodes: TrophicNodeData[]): PositionedNode[] {
  const positioned: PositionedNode[] = [];

  for (const level of TIER_ORDER) {
    const tierNodes = nodes.filter((n) => n.trophicLevel === level);
    const y = VIEW_HEIGHT * TIER_Y_FRACTION[level];
    const count = tierNodes.length;
    tierNodes.forEach((node, index) => {
      // Evenly distribute across the width: slot centers at (i + 1)/(count + 1).
      const x = (VIEW_WIDTH * (index + 1)) / (count + 1);
      positioned.push({ node, x, y });
    });
  }

  return positioned;
}

/**
 * Render the food web simulator.
 */
export function FoodWebSimulator({ exhibits }: FoodWebSimulatorProps) {
  const graph: FoodWebGraph = useMemo(
    () => extractGraph(exhibits),
    [exhibits],
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapseActive, setCollapseActive] = useState(false);

  const positionedNodes = useMemo(
    () => layoutNodes(graph.nodes),
    [graph.nodes],
  );

  const positionById = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const p of positionedNodes) {
      map.set(p.node.id, p);
    }
    return map;
  }, [positionedNodes]);

  // Dependents of the selected node, only meaningful while collapse is active.
  const dependentIds = useMemo(() => {
    if (!collapseActive || selectedNodeId === null) {
      return new Set<string>();
    }
    return new Set(findDependents(graph, selectedNodeId));
  }, [collapseActive, selectedNodeId, graph]);

  const selectedNode =
    selectedNodeId !== null
      ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null
      : null;
  const selectedNodeLabel = selectedNode?.label ?? null;

  // Exhibits affected by the collapse: those whose node is a dependent of the
  // removed node. Used to surface their ecosystemImpactIfRemoved text (Req 2.1).
  const affectedExhibits = useMemo(() => {
    if (!collapseActive || dependentIds.size === 0) {
      return [] as Exhibit[];
    }
    const byId = new Map(exhibits.map((e) => [e.id, e] as const));
    const result: Exhibit[] = [];
    for (const id of dependentIds) {
      const exhibit = byId.get(id);
      if (exhibit !== undefined) {
        result.push(exhibit);
      }
    }
    return result;
  }, [collapseActive, dependentIds, exhibits]);

  const handleSelect = (nodeId: string) => {
    // Selecting a different node while collapse is active resets the collapse
    // so the simulation always reflects the current selection (Req 2.5).
    if (nodeId !== selectedNodeId) {
      setCollapseActive(false);
    }
    setSelectedNodeId(nodeId);
  };

  const handleToggle = () => {
    setCollapseActive((prev) => !prev);
  };

  const hasNoRelationships = graph.edges.length === 0;

  // Req 1.6: nothing to visualize (no nodes, or no ecological relationships).
  if (graph.nodes.length === 0 || hasNoRelationships) {
    return (
      <section className="food-web-simulator food-web-simulator--empty" style={sectionStyle}>
        {graph.warnings.length > 0 ? (
          <p className="food-web-simulator__warning" role="alert" style={warningStyle}>
            One or more exhibits could not be classified.
          </p>
        ) : null}
        <p className="food-web-simulator__empty-message" style={emptyMessageStyle}>
          No ecological relationships are available to visualize.
        </p>
      </section>
    );
  }

  const isDimmed = (nodeId: string): boolean => {
    if (!collapseActive || selectedNodeId === null) {
      return false;
    }
    return nodeId === selectedNodeId || dependentIds.has(nodeId);
  };

  return (
    <section className="food-web-simulator" style={sectionStyle}>
      {/* Req 1.5: warning indicator when some exhibits couldn't be classified. */}
      {graph.warnings.length > 0 ? (
        <p className="food-web-simulator__warning" role="alert" style={warningStyle}>
          One or more exhibits could not be classified.
        </p>
      ) : null}

      <EcosystemCollapseToggle
        active={collapseActive}
        selectedNodeLabel={selectedNodeLabel}
        onToggle={handleToggle}
      />

      <svg
        className="food-web-simulator__canvas"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Trophic food web diagram"
      >
        <defs>
          <marker
            id="food-web-arrowhead"
            markerWidth={10}
            markerHeight={10}
            refX={9}
            refY={3}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L9,3 L0,6 Z" fill="#6b7280" />
          </marker>
        </defs>

        {/* Directed edges: energy flows from `from` to `to` (Req 1.3). */}
        <g className="food-web-simulator__edges">
          {graph.edges.map((edge, index) => {
            const from = positionById.get(edge.from);
            const to = positionById.get(edge.to);
            if (from === undefined || to === undefined) {
              return null;
            }
            return (
              <path
                key={`${edge.from}->${edge.to}-${index}`}
                className="food-web-simulator__edge"
                data-from={edge.from}
                data-to={edge.to}
                d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                stroke="#6b7280"
                strokeWidth={1.5}
                fill="none"
                markerEnd="url(#food-web-arrowhead)"
                opacity={
                  collapseActive &&
                  (isDimmed(edge.from) || isDimmed(edge.to))
                    ? 0.3
                    : 1.0
                }
                style={{ transition: 'opacity 400ms ease' }}
              />
            );
          })}
        </g>

        {/* Nodes. */}
        <g className="food-web-simulator__nodes">
          {positionedNodes.map(({ node, x, y }) => (
            <TrophicNode
              key={node.id}
              node={node}
              x={x}
              y={y}
              dimmed={isDimmed(node.id)}
              selected={node.id === selectedNodeId}
              onSelect={handleSelect}
            />
          ))}
        </g>
      </svg>

      {/* Impact overlay while collapse is active (Req 2.1, 2.4). */}
      {collapseActive && selectedNode !== null ? (
        <div className="food-web-simulator__impact-panel" role="status" style={impactPanelStyle}>
          {affectedExhibits.length > 0 ? (
            <ul className="food-web-simulator__impact-list" style={impactListStyle}>
              {affectedExhibits.map((exhibit) => (
                <li
                  key={exhibit.id}
                  className="food-web-simulator__impact-item"
                  data-exhibit-id={exhibit.id}
                  style={impactItemStyle}
                >
                  <span className="food-web-simulator__impact-name" style={impactNameStyle}>
                    {exhibit.name}:
                  </span>{' '}
                  <span className="food-web-simulator__impact-text">
                    {exhibit.ecosystemImpactIfRemoved
                      ? exhibit.ecosystemImpactIfRemoved
                      : 'Impact data unavailable'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            // Req 2.4: selected node has no dependents in the dataset.
            <p className="food-web-simulator__no-dependents" style={noDependentsStyle}>
              No dependent species found in dataset
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default FoodWebSimulator;
