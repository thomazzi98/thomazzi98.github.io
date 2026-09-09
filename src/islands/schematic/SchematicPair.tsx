import { Schematic, type SchematicProps } from './Schematic';

type PairProps = Omit<SchematicProps, 'orientation'>;

// Up to eight parts read well stacked in two lanes on a phone; a larger graph keeps the wide
// drawing and scrolls sideways, because a two-lane tangle of thirty edges explains nothing.
export const stackedLimit = 8;

export const SchematicPair = (props: PairProps) => {
  if (props.nodes.length > stackedLimit) {
    return (
      <div class="schematic-scroll" tabIndex={0} aria-label={`${props.title}, scrolls sideways`}>
        <Schematic {...props} orientation="horizontal" />
      </div>
    );
  }
  return (
    <>
      <Schematic {...props} orientation="horizontal" />
      <Schematic {...props} orientation="vertical" />
    </>
  );
};
