import type { NodeKind } from '../../systems/schema';
import type { Box } from './layout';

interface GlyphProps {
  kind: NodeKind;
  box: Box;
}

const drumCap = 5;

const Drum = ({ box }: { box: Box }) => {
  const { x, y, width, height } = box;
  const bottom = y + height;
  return (
    <>
      <path
        class="schematic__frame"
        d={`M${String(x)},${String(y + drumCap)} A${String(width / 2)},${String(drumCap)} 0 0 1 ${String(x + width)},${String(y + drumCap)} L${String(x + width)},${String(bottom - drumCap)} A${String(width / 2)},${String(drumCap)} 0 0 1 ${String(x)},${String(bottom - drumCap)} Z`}
      />
      <path
        class="schematic__detail"
        d={`M${String(x)},${String(y + drumCap)} A${String(width / 2)},${String(drumCap)} 0 0 0 ${String(x + width)},${String(y + drumCap)}`}
      />
    </>
  );
};

const Frame = ({ box, dashed = false }: { box: Box; dashed?: boolean }) => (
  <rect
    class="schematic__frame"
    x={box.x}
    y={box.y}
    width={box.width}
    height={box.height}
    stroke-dasharray={dashed ? '4 3' : undefined}
  />
);

export const Glyph = ({ kind, box }: GlyphProps) => {
  if (kind === 'store') {
    return <Drum box={box} />;
  }
  if (kind === 'external') {
    return <Frame box={box} dashed />;
  }
  if (kind === 'job') {
    return (
      <>
        <Frame box={box} />
        <rect
          class="schematic__detail"
          x={box.x + 3}
          y={box.y + 3}
          width={box.width - 6}
          height={box.height - 6}
        />
      </>
    );
  }
  if (kind === 'queue') {
    return (
      <>
        <Frame box={box} />
        <path
          class="schematic__detail"
          d={`M${String(box.x + 8)},${String(box.y + 4)} H${String(box.x + box.width - 8)} M${String(box.x + 8)},${String(box.y + 7)} H${String(box.x + box.width - 8)}`}
        />
      </>
    );
  }
  if (kind === 'frontend') {
    return (
      <>
        <Frame box={box} />
        <path
          class="schematic__detail"
          d={`M${String(box.x)},${String(box.y + 6)} H${String(box.x + box.width)}`}
        />
      </>
    );
  }
  if (kind === 'package') {
    return (
      <>
        <Frame box={box} />
        <path
          class="schematic__detail"
          d={`M${String(box.x)},${String(box.y)} v-5 h${String(Math.min(28, box.width / 3))} v5`}
        />
      </>
    );
  }
  if (kind === 'actor') {
    return (
      <>
        <rect
          class="schematic__frame schematic__frame--actor"
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
        />
        <path
          class="schematic__detail"
          d={`M${String(box.x + 6)},${String(box.y + 8)} V${String(box.y + box.height - 8)}`}
        />
      </>
    );
  }
  return <Frame box={box} />;
};
