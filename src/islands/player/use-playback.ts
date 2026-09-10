import { useSignal } from '@preact/signals';
import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { TraceSimulation } from '../../trace/runner';

export interface PlaybackOptions {
  readonly build: () => TraceSimulation[];
  readonly endOf: () => number;
  readonly autoplay: boolean;
  readonly finishedText: (simulations: readonly TraceSimulation[]) => string;
}

export interface Playback {
  readonly simulations: readonly TraceSimulation[];
  readonly root: RefObject<HTMLDivElement>;
  readonly playing: boolean;
  readonly ready: boolean;
  readonly revision: number;
  readonly now: number;
  readonly finished: boolean;
  readonly announcement: string;
  readonly play: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
  readonly step: () => TraceSimulation[];
  readonly reset: () => void;
  readonly advanceTo: (target: number) => void;
  readonly announce: (text: string) => void;
}

// A frame longer than this (a tab that was throttled, a debugger) advances the clock by this much.
const frameCap = 100;

type Hold = 'hidden' | 'offscreen';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const clockOf = (simulations: readonly TraceSimulation[]): number =>
  Math.max(0, ...simulations.map((simulation) => simulation.now));

export const usePlayback = (options: PlaybackOptions): Playback => {
  const optionsReference = useRef(options);
  optionsReference.current = options;
  const simulationsReference = useRef<TraceSimulation[] | undefined>(undefined);
  simulationsReference.current ??= options.build();
  const root = useRef<HTMLDivElement>(null);
  const version = useSignal(0);
  const playing = useSignal(false);
  const ready = useSignal(false);
  const announcement = useSignal('');
  const frameReference = useRef<number | undefined>(undefined);
  const lastFrameReference = useRef<number | undefined>(undefined);
  const holdsReference = useRef(new Set<Hold>());

  const current = (): TraceSimulation[] => simulationsReference.current ?? [];

  const refresh = () => {
    version.value += 1;
  };

  const exhausted = (simulations: readonly TraceSimulation[]): boolean =>
    simulations.every((simulation) => simulation.pending() === 0);

  // The loop runs on past the last event until the end so the last packet lands.
  const atEnd = (simulations: readonly TraceSimulation[]): boolean =>
    exhausted(simulations) && clockOf(simulations) >= optionsReference.current.endOf();

  const cancelFrame = () => {
    if (frameReference.current !== undefined) {
      cancelAnimationFrame(frameReference.current);
      frameReference.current = undefined;
    }
    lastFrameReference.current = undefined;
  };

  const frame = (timestamp: number) => {
    const previous = lastFrameReference.current ?? timestamp;
    lastFrameReference.current = timestamp;
    const simulations = current();
    for (const simulation of simulations) {
      simulation.advance(Math.min(frameCap, timestamp - previous));
    }
    refresh();
    if (atEnd(simulations)) {
      frameReference.current = undefined;
      playing.value = false;
      announcement.value = optionsReference.current.finishedText(simulations);
      return;
    }
    frameReference.current = requestAnimationFrame(frame);
  };

  const run = () => {
    if (!playing.value || holdsReference.current.size > 0 || frameReference.current !== undefined) {
      return;
    }
    frameReference.current = requestAnimationFrame(frame);
  };

  const rebuild = () => {
    cancelFrame();
    playing.value = false;
    simulationsReference.current = optionsReference.current.build();
    announcement.value = '';
    refresh();
  };

  const stop = () => {
    playing.value = false;
    cancelFrame();
  };

  const play = () => {
    if (exhausted(current())) {
      rebuild();
    }
    playing.value = true;
    run();
  };

  const hold = (reason: Hold) => {
    holdsReference.current.add(reason);
    cancelFrame();
  };

  const release = (reason: Hold) => {
    holdsReference.current.delete(reason);
    run();
  };

  useEffect(() => {
    ready.value = true;
    const onVisibility = () => {
      if (document.hidden) {
        hold('hidden');
        return;
      }
      release('hidden');
    };
    document.addEventListener('visibilitychange', onVisibility);
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'function' && root.current !== null) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            release('offscreen');
            continue;
          }
          hold('offscreen');
        }
      });
      observer.observe(root.current);
    }
    if (optionsReference.current.autoplay && !prefersReducedMotion()) {
      play();
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      cancelFrame();
    };
    // Playback starts once, when the island mounts.
  }, []);

  const simulations = current();
  return {
    simulations,
    root,
    playing: playing.value,
    ready: ready.value,
    revision: version.value,
    now: clockOf(simulations),
    // Stopped with nothing left to happen: the next Play is a replay.
    finished: exhausted(simulations) && !playing.value,
    announcement: announcement.value,
    play,
    stop,
    toggle: () => {
      if (playing.value) {
        stop();
        return;
      }
      play();
    },
    step: () => {
      stop();
      const advanced = current().filter((simulation) => simulation.step());
      refresh();
      return advanced;
    },
    reset: rebuild,
    advanceTo: (target) => {
      stop();
      if (target < clockOf(current())) {
        rebuild();
      }
      for (const simulation of current()) {
        simulation.advance(Math.max(0, target - simulation.now));
      }
      refresh();
    },
    announce: (text) => {
      announcement.value = text;
    },
  };
};
