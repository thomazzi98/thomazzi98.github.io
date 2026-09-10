import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { Schematic, type SchematicProps } from './Schematic';

type PairProps = Omit<SchematicProps, 'orientation'>;

// A flow footprint of up to twelve parts reads as a rail on a phone; a larger graph keeps the
// wide drawing and scrolls sideways, because a rail of twenty parts is a scroll of its own.
export const stackedLimit = 12;

type Form = 'wide' | 'rail';

// The hint under a drawing says it scrolls sideways; each wrapper measures itself so the hint
// only stays when that is true. Before the island runs nothing is measured and the hint stays
// as the honest fallback.
const useOverflowMarks = () => {
  const wide = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const overflowing = useSignal<Partial<Record<Form, boolean>>>({});
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const wrappers: readonly (readonly [Form, HTMLDivElement | null])[] = [
      ['wide', wide.current],
      ['rail', rail.current],
    ];
    const measure = () => {
      const marks: Partial<Record<Form, boolean>> = {};
      for (const [form, wrapper] of wrappers) {
        if (wrapper !== null) {
          marks[form] = wrapper.scrollWidth > wrapper.clientWidth;
        }
      }
      overflowing.value = marks;
    };
    const observer = new ResizeObserver(measure);
    for (const [, wrapper] of wrappers) {
      if (wrapper !== null) {
        observer.observe(wrapper);
      }
    }
    measure();
    return () => {
      observer.disconnect();
    };
  }, [overflowing]);
  const markOf = (form: Form): string | undefined => {
    const mark = overflowing.value[form];
    return mark === undefined ? undefined : String(mark);
  };
  return { wide, rail, markOf };
};

export const SchematicPair = (props: PairProps) => {
  const { wide, rail, markOf } = useOverflowMarks();
  const hint = <p class="schematic-scroll__hint kicker">Full drawing · scrolls sideways</p>;
  if (props.nodes.length > stackedLimit) {
    return (
      <>
        <div
          ref={wide}
          class="schematic-scroll"
          role="region"
          tabIndex={0}
          aria-label={`${props.title}, scrolls sideways`}
          data-overflows={markOf('wide')}
        >
          <Schematic {...props} orientation="horizontal" />
        </div>
        {hint}
      </>
    );
  }
  // When the parts inside take focus the wrappers stay plain; when they do not, the wrapper
  // itself must be reachable so a drawing wider than its box can be scrolled and read.
  const scrollerAttributes = (form: string) =>
    props.onSelect === undefined
      ? ({
          role: 'region',
          tabIndex: 0,
          'aria-label': `${props.title}, ${form}`,
        } as const)
      : {};
  return (
    <>
      <div
        ref={wide}
        class="schematic-scroll schematic-scroll--horizontal"
        data-overflows={markOf('wide')}
        {...scrollerAttributes('wide drawing, scrolls sideways')}
      >
        <Schematic {...props} orientation="horizontal" />
      </div>
      <div
        ref={rail}
        class="schematic-scroll schematic-scroll--vertical"
        data-overflows={markOf('rail')}
        {...scrollerAttributes('drawn as a rail')}
      >
        <Schematic {...props} orientation="rail" />
      </div>
      {hint}
    </>
  );
};
