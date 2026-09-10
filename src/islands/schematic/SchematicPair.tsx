import { Schematic, type SchematicProps } from './Schematic';

type PairProps = Omit<SchematicProps, 'orientation'>;

// A flow footprint of up to twelve parts reads well stacked in two lanes on a phone; a larger
// graph keeps the wide drawing and scrolls sideways, because a two-lane tangle of thirty edges
// explains nothing.
export const stackedLimit = 12;

export const SchematicPair = (props: PairProps) => {
  if (props.nodes.length > stackedLimit) {
    return (
      <>
        <div
          class="schematic-scroll"
          role="region"
          tabIndex={0}
          aria-label={`${props.title}, scrolls sideways`}
        >
          <Schematic {...props} orientation="horizontal" />
        </div>
        <p class="schematic-scroll__hint kicker">Full drawing · scrolls sideways</p>
      </>
    );
  }
  // Two lanes of full-size parts are wider than a phone, so the stacked drawing scrolls a little
  // rather than shrinking its type. When the parts inside take focus the wrappers stay plain;
  // when they do not, the wrapper itself must be reachable so the scrolled drawing can be read.
  const scrollerAttributes = (form: string) =>
    props.onSelect === undefined
      ? ({
          role: 'region',
          tabIndex: 0,
          'aria-label': `${props.title}, ${form}, scrolls sideways`,
        } as const)
      : {};
  return (
    <>
      <div
        class="schematic-scroll schematic-scroll--horizontal"
        {...scrollerAttributes('wide drawing')}
      >
        <Schematic {...props} orientation="horizontal" />
      </div>
      <div
        class="schematic-scroll schematic-scroll--vertical"
        {...scrollerAttributes('stacked drawing')}
      >
        <Schematic {...props} orientation="vertical" />
      </div>
      <p class="schematic-scroll__hint kicker">Full drawing · scrolls sideways</p>
    </>
  );
};
