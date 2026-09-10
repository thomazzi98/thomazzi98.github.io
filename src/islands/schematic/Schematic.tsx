import { useSignal } from '@preact/signals';
import type { TargetedKeyboardEvent } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { SystemEdge, SystemNode, Tone } from '../../systems/schema';
import { Glyph } from './glyphs';
import {
  edgePath,
  labelLineHeight,
  layoutSystem,
  pointAlong,
  type Orientation,
  type PlacedEdge,
  type PlacedNode,
} from './layout';
import { kindName, protocolName, protocolTag } from './protocol';

export type SchematicNode = Pick<SystemNode, 'id' | 'label' | 'kind' | 'stamp'>;
export type SchematicEdge = Pick<SystemEdge, 'id' | 'from' | 'to' | 'label' | 'protocol'>;

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
  // For a rail: the number of rows it spreads over, so drawings on one board share a height.
  readonly rows?: number;
  readonly selected?: Selection;
  readonly activity?: Readonly<Record<string, Tone>>;
  readonly activeEdge?: string;
  readonly packets?: readonly Packet[];
  readonly onSelect?: (selection: Selection | undefined) => void;
}

const isSelected = (selection: Selection | undefined, kind: Selection['kind'], id: string) =>
  selection?.kind === kind && selection.id === id;

const keyToOffset: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

const firstBaseline = 19;
// A drum's cap arc reaches ten units into the box, so a store's label starts lower.
const storeLabelDrop = 4;
const captionInset = 8;
const stampGlyphWidth = 7;
const stampHeight = 16;
const stampDrop = 13;

// The stamp sits in the band the layout reserves under the label, so the two never collide.
const labelBaseline = (box: PlacedNode, lineIndex: number): number =>
  box.y +
  firstBaseline +
  (box.node.kind === 'store' ? storeLabelDrop : 0) +
  lineIndex * labelLineHeight;

const Stamp = ({ text, box }: { text: string; box: PlacedNode }) => {
  const width = text.length * stampGlyphWidth + 12;
  const centreX = box.x + box.width / 2;
  const centreY = labelBaseline(box, box.lines.length - 1) + stampDrop;
  return (
    <g
      class="schematic__stamp"
      transform={`translate(${String(centreX)} ${String(centreY)}) rotate(-8)`}
    >
      <rect x={-width / 2} y={-stampHeight / 2} width={width} height={stampHeight} />
      <text text-anchor="middle" dy="3.5">
        {text}
      </text>
    </g>
  );
};

export const Schematic = ({
  systemId,
  title,
  description,
  nodes,
  edges,
  orientation,
  rows,
  selected,
  activity = {},
  activeEdge,
  packets = [],
  onSelect,
}: SchematicProps) => {
  const layout = useMemo(
    () => layoutSystem(nodes, edges, orientation, { rows }),
    [nodes, edges, orientation, rows],
  );
  const svgReference = useRef<SVGSVGElement>(null);
  const interactive = onSelect !== undefined;
  const prefix = `${systemId}-${orientation}`;
  const titleId = `${prefix}-title`;
  const descriptionId = `${prefix}-description`;
  const arrowId = `${prefix}-arrow`;
  const placedById = new Map(layout.edges.map((placed) => [placed.edge.id, placed]));
  const labelById = new Map(nodes.map((node) => [node.id, node.label]));
  const controlCount = layout.nodes.length + layout.edges.length;
  const focused = useSignal(
    Math.max(
      0,
      layout.nodes.findIndex((placed) => isSelected(selected, 'node', placed.node.id)),
    ),
  );

  // One roving stop per drawing: the nodes in callout order, then the edges in model order.
  const focusControl = (index: number) => {
    const wrapped = ((index % controlCount) + controlCount) % controlCount;
    focused.value = wrapped;
    const svg = svgReference.current;
    if (svg === null) {
      return;
    }
    const controls = [
      ...svg.querySelectorAll<SVGGElement>('[data-node]'),
      ...svg.querySelectorAll<SVGGElement>('[data-edge]'),
    ];
    controls[wrapped]?.focus();
  };

  const toggle = (selection: Selection) => {
    onSelect?.(isSelected(selected, selection.kind, selection.id) ? undefined : selection);
  };

  const onControlKey = (
    event: TargetedKeyboardEvent<SVGGElement>,
    index: number,
    selection: Selection,
  ) => {
    const offset = keyToOffset[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      focusControl(index + offset);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusControl(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusControl(controlCount - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(selection);
      return;
    }
    if (event.key === 'Escape') {
      onSelect?.(undefined);
    }
  };

  const controlAttributes = (index: number, selection: Selection, pressed: boolean) => {
    if (!interactive) {
      return { role: 'img' } as const;
    }
    return {
      role: 'button',
      tabindex: index === focused.value ? 0 : -1,
      'aria-pressed': pressed,
      onClick: () => {
        toggle(selection);
      },
      onFocus: () => {
        focused.value = index;
      },
      onKeyDown: (event: TargetedKeyboardEvent<SVGGElement>) => {
        onControlKey(event, index, selection);
      },
    } as const;
  };

  const edgeName = (placed: PlacedEdge<SchematicEdge>) => {
    const { edge } = placed;
    const origin = labelById.get(edge.from) ?? edge.from;
    const destination = labelById.get(edge.to) ?? edge.to;
    return `${origin} to ${destination}, ${edge.label}, ${protocolName[edge.protocol]}`;
  };

  return (
    <svg
      ref={svgReference}
      class={`schematic schematic--${orientation}`}
      viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`}
      width={layout.width}
      height={layout.height}
      style={`--drawing-width: ${String(layout.width)}px`}
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
        {layout.edges.map((placed, index) => {
          const { edge } = placed;
          const touched =
            selected?.kind === 'node' && (edge.from === selected.id || edge.to === selected.id);
          const edgeSelected = isSelected(selected, 'edge', edge.id);
          return (
            <g
              key={edge.id}
              class="schematic__edge"
              data-edge={edge.id}
              data-protocol={edge.protocol}
              data-selected={edgeSelected ? 'true' : undefined}
              data-touched={touched ? 'true' : undefined}
              data-active={activeEdge === edge.id ? 'true' : undefined}
              aria-label={edgeName(placed)}
              {...controlAttributes(
                layout.nodes.length + index,
                { kind: 'edge', id: edge.id },
                edgeSelected,
              )}
            >
              {interactive && <path class="schematic__hit" d={edgePath(placed)} />}
              <path class="schematic__wire" d={edgePath(placed)} marker-end={`url(#${arrowId})`} />
            </g>
          );
        })}
      </g>
      <g class="schematic__nodes">
        {layout.nodes.map((placed, index) => {
          const { node } = placed;
          const tone = activity[node.id];
          const nodeSelected = isSelected(selected, 'node', node.id);
          const centreX = placed.x + placed.width / 2;
          const stampName = node.stamp === undefined ? '' : `, ${node.stamp}`;
          return (
            <g
              key={node.id}
              class="schematic__node"
              data-node={node.id}
              data-kind={node.kind}
              data-tone={tone}
              aria-label={`${String(placed.number)}. ${node.label}, ${kindName[node.kind]}${stampName}`}
              {...controlAttributes(index, { kind: 'node', id: node.id }, nodeSelected)}
            >
              <title>{node.label}</title>
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
              <text class="schematic__label" text-anchor="middle">
                {placed.lines.map((line, lineIndex) => (
                  <tspan key={line} x={centreX} y={labelBaseline(placed, lineIndex)}>
                    {line}
                  </tspan>
                ))}
              </text>
              <text
                class="schematic__kind"
                x={centreX}
                y={placed.y + placed.height - captionInset}
                text-anchor="middle"
              >
                {kindName[node.kind]}
              </text>
              {node.stamp !== undefined && <Stamp text={node.stamp} box={placed} />}
              <g
                class="schematic__balloon"
                transform={`translate(${String(placed.x)} ${String(placed.y)})`}
              >
                <circle r="10" />
                <text text-anchor="middle" dy="3.5">
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
      {/* Tags are drawn last so a packet in flight never hides the protocol it travels on. */}
      <g class="schematic__tags" aria-hidden="true">
        {layout.edges.map((placed) => (
          <text
            key={placed.edge.id}
            class="schematic__tag"
            data-selected={isSelected(selected, 'edge', placed.edge.id) ? 'true' : undefined}
            data-active={activeEdge === placed.edge.id ? 'true' : undefined}
            x={placed.tag.x}
            y={placed.tag.y}
            text-anchor="middle"
          >
            {protocolTag[placed.edge.protocol]}
          </text>
        ))}
      </g>
    </svg>
  );
};
