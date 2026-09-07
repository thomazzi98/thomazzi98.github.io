import { seedFromText } from '../core/random';
import { createSimulation, type Simulation } from '../core/simulation';
import { isScenarioId, loadScenario } from '../scenarios';
import { bindBench, type BenchBinding, type Clock } from './bind';

const defaultClock: Clock = { beatMilliseconds: 120, virtualPerBeat: 250 };

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const readSeed = (element: HTMLElement): number => {
  const fromUrl = new URL(window.location.href).searchParams.get('seed');
  if (fromUrl !== null && /^\d+$/.test(fromUrl)) {
    return Number(fromUrl);
  }
  return seedFromText(element.dataset.seed ?? element.dataset.scenario ?? 'bench');
};

const readLevers = (element: HTMLElement): Record<string, string> => {
  const levers: Record<string, string> = {};
  for (const input of element.querySelectorAll<HTMLInputElement>('input[data-lever]:checked')) {
    if (input.dataset.lever !== undefined) {
      levers[input.dataset.lever] = input.value;
    }
  }
  return levers;
};

export class BenchFrame extends HTMLElement {
  private binding: BenchBinding | undefined;

  async connectedCallback(): Promise<void> {
    const id = this.dataset.scenario;
    if (id === undefined || !isScenarioId(id)) {
      return;
    }
    const module = await loadScenario(id);
    const simulation: Simulation<unknown, unknown, object> = createSimulation(module.scenario, {
      seed: readSeed(this),
      levers: readLevers(this),
    });
    const autoRun = this.dataset.autorun === 'true' && !prefersReducedMotion();
    this.binding = bindBench({ root: this, module, simulation, clock: defaultClock, autoRun });
    this.querySelector('details.transcript')?.removeAttribute('open');
    this.dataset.ready = 'true';
    if (this.dataset.announce === 'true') {
      console.info(
        `bench ${id} · seed ${String(simulation.seed)} · deterministic; append ?seed=${String(simulation.seed)} to reproduce this run`,
      );
    }
  }

  disconnectedCallback(): void {
    this.binding?.destroy();
    this.binding = undefined;
  }
}

export const defineBenchFrame = (): void => {
  if (customElements.get('bench-frame') === undefined) {
    customElements.define('bench-frame', BenchFrame);
  }
};
