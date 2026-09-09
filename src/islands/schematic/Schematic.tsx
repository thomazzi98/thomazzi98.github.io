import { useSignal } from '@preact/signals';
import type { TargetedKeyboardEvent } from 'preact';
import { useRef } from 'preact/hooks';
import type { SystemEdge, SystemNode, Tone } from '../../systems/schema';

export type SchematicNode = Pick<SystemNode, 'id' | 'label' | 'kind'>;
export type SchematicEdge = Pick<SystemEdge, 'id' | 'from' | 'to' | 'label' | 'protocol'>;
import { Glyph } from './glyphs';
import { edgePath, labelPoint, layoutSystem, pointAlong, type Orientation } from './layout';
import { kindName, protocolTag } from './protocol';

export type Selection =
  { readonly kind: 'node'; readonly id: string } | { readonly kind: 'edge'; readonly id: string };

export interface Packet {
  readonly edge: string;
  readonly progress: number;
  readonly tone: Tone;
}

export interface SchematicProps {
  readonly systemId: string;
  readonly title: string;
  readonly description: string;
  readonly nodes: readonly SchematicNode[];
  readonly edges: readonly SchematicEdge[];
  readonly orientation: Orientation;
  readonly selected?: Selection;
  readonly activity?: Readonly<Record<string, Tone>>;
  readonly activeEdge?: string;
  readonly packets?: readonly Packet[];
  readonly onSelect?: (selection: Selection | undefined) => void;
}

const isSelected = (selection: Selection | undefined, kind: Selection['kind'], id: string) =>
  selection?.kind === kind && selection.id === id;

const labelLimit = 20;

// The drawing truncates; the accessible name, the inspector and the parts list keep the full label.
const drawnLabel = (label: string): string =>
  label.length > labelLimit ? `${label.slice(0, labelLimit - 1).trimEnd()}…` : label;

const keyToOffset: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

export const Schematic = ({
  systemId,
  title,
  description,
  nodes,
  edges,
  orientation,
  selected,
  activity = {},
  activeEdge,
  packets = [],
  onSelect,
}: SchematicProps) => {
  const layout = layoutSystem(nodes, edges, orientation);
  const svgReference = useRef<SVGSVGElement>(null);
  const prefix = `${systemId}-${orientation}`;
  const titleId = `${prefix}-title`;
  const descriptionId = `${prefix}-description`;
  const arrowId = `${prefix}-arrow`;
  const placedById = new Map(layout.edges.map((placed) => [placed.edge.id, placed]));
  const focused = useSignal(
    Math.max(
      0,
      layout.nodes.findIndex((placed) => isSelected(selected, 'node', placed.node.id)),
    ),
  );

  const focusNode = (index: number) => {
    const wrapped = ((index % layout.nodes.length) + layout.nodes.length) % layout.nodes.length;
    focused.value = wrapped;
    const controls = svgReference.current?.querySelectorAll<SVGGElement>('[data-node]');
    controls?.[wrapped]?.focus();
  };

  const onNodeKey = (event: TargetedKeyboardEvent<SVGGElement>, index: number, id: string) => {
    const offset = keyToOffset[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      focusNode(index + offset);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusNode(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusNode(layout.nodes.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(isSelected(selected, 'node', id) ? undefined : { kind: 'node', id });
      return;
    }
    if (event.key === 'Escape') {
      onSelect?.(undefined);
    }
  };

  return (
    <svg
      ref={svgReference}
      class={`schematic schematic--${orientation}`}
      viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-system={systemId}
    >
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{description}</desc>
      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0.5 L7.5,4 L0,7.5 Z" class="schematic__arrow" />
        </marker>
      </defs>
      <g class="schematic__edges">
        {layout.edges.map((placed) => {
          const { edge } = placed;
          const touched =
            selected?.kind === 'node' && (edge.from === selected.id || edge.to === selected.id);
          const label = labelPoint(placed);
          return (
            <g
              key={edge.id}
              class="schematic__edge"
              data-protocol={edge.protocol}
              data-selected={isSelected(selected, 'edge', edge.id) ? 'true' : undefined}
              data-touched={touched ? 'true' : undefined}
              data-active={activeEdge === edge.id ? 'true' : undefined}
              onClick={() => onSelect?.({ kind: 'edge', id: edge.id })}
            >
              {onSelect !== undefined && <path class="schematic__hit" d={edgePath(placed)} />}
              <path class="schematic__wire" d={edgePath(placed)} marker-end={`url(#${arrowId})`} />
              <text class="schematic__tag" x={label.x} y={label.y} text-anchor="middle">
                {protocolTag[edge.protocol]}
              </text>
            </g>
          );
        })}
      </g>
      <g class="schematic__nodes">
        {layout.nodes.map((placed, index) => {
          const { node } = placed;
          const tone = activity[node.id];
          const nodeSelected = isSelected(selected, 'node', node.id);
          return (
            <g
              key={node.id}
              class="schematic__node"
              data-node={node.id}
              data-kind={node.kind}
              data-tone={tone}
              role="button"
              tabindex={index === focused.value ? 0 : -1}
              aria-pressed={nodeSelected}
              aria-label={`${String(placed.number)}. ${node.label}, ${kindName[node.kind]}`}
              onClick={() => onSelect?.(nodeSelected ? undefined : { kind: 'node', id: node.id })}
              onFocus={() => {
                focused.value = index;
              }}
              onKeyDown={(event) => {
                onNodeKey(event, index, node.id);
              }}
            >
              {nodeSelected && (
                <rect
                  class="schematic__ring"
                  x={placed.x - 4}
                  y={placed.y - 4}
                  width={placed.width + 8}
                  height={placed.height + 8}
                />
              )}
              <Glyph kind={node.kind} box={placed} />
              <text
                class="schematic__label"
                x={placed.x + placed.width / 2}
                y={placed.y + placed.height / 2 - 3}
                text-anchor="middle"
              >
                {drawnLabel(node.label)}
              </text>
              <text
                class="schematic__kind"
                x={placed.x + placed.width / 2}
                y={placed.y + placed.height / 2 + 10}
                text-anchor="middle"
              >
                {kindName[node.kind]}
              </text>
              <g
                class="schematic__balloon"
                transform={`translate(${String(placed.x)} ${String(placed.y)})`}
              >
                <circle r="9" />
                <text text-anchor="middle" dy="3">
                  {placed.number}
                </text>
              </g>
            </g>
          );
        })}
      </g>
      <g class="schematic__packets" aria-hidden="true">
        {packets.map((packet, index) => {
          const placed = placedById.get(packet.edge);
          if (placed === undefined) {
            return null;
          }
          const point = pointAlong(placed, packet.progress);
          return (
            <circle
              key={`${packet.edge}-${String(index)}`}
              class="schematic__packet"
              data-tone={packet.tone}
              cx={point.x}
              cy={point.y}
              r="5"
            />
          );
        })}
      </g>
    </svg>
  );
};
