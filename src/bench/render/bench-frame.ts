import { seedFromText } from '../core/random';
import { createSimulation, type Simulation } from '../core/simulation';
import { isScenarioId, loadScenario } from '../scenarios';
import { bindBench, type BenchBinding, type Clock } from './bind';

const defaultClock: Clock = { beatMilliseconds: 120, virtualPerBeat: 250 };
const seedPattern = /^\d{1,10}$/;
const seedLimit = 0xffffffff;

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const readSeed = (element: HTMLElement): number => {
  const fromUrl = new URL(window.location.href).searchParams.get('seed');
  if (fromUrl !== null && seedPattern.test(fromUrl) && Number(fromUrl) <= seedLimit) {
    return Number(fromUrl);
  }
  return seedFromText(element.dataset.seed ?? element.dataset.scenario ?? 'bench');
};

const readLevers = (element: HTMLElement): Record<string, string> => {
  const levers: Record<string, string> = {};
  const query = new URL(window.location.href).searchParams;
  for (const input of element.querySelectorAll<HTMLInputElement>('input[data-lever]')) {
    const lever = input.dataset.lever;
    if (lever === undefined) {
      continue;
    }
    const requested = query.get(lever);
    if (requested === input.value) {
      input.checked = true;
    }
    if (input.checked) {
      levers[lever] = input.value;
    }
  }
  return levers;
};

const rememberLeversInUrl = (element: HTMLElement): void => {
  element.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.lever === undefined) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set(input.dataset.lever, input.value);
    window.history.replaceState(window.history.state, '', url);
  });
};

export class BenchFrame extends HTMLElement {
  private binding: BenchBinding | undefined;

  async connectedCallback(): Promise<void> {
    const id = this.dataset.scenario;
    if (id === undefined || !isScenarioId(id)) {
      return;
    }
    const module = await loadScenario(id);
    if (!this.isConnected || this.binding !== undefined) {
      return;
    }
    const simulation: Simulation<unknown, unknown, object> = createSimulation(module.scenario, {
      seed: readSeed(this),
      levers: readLevers(this),
    });
    const motionAllowed = !prefersReducedMotion();
    this.binding = bindBench({
      root: this,
      module,
      simulation,
      clock: defaultClock,
      autoRun: this.dataset.autorun === 'true' && motionAllowed,
      motionAllowed,
    });
    rememberLeversInUrl(this);
    this.querySelector('details.transcript')?.removeAttribute('open');
    this.dataset.ready = 'true';
    if (this.dataset.announce === 'true') {
      const reproduction = new URL(window.location.href);
      reproduction.searchParams.set('seed', String(simulation.seed));
      for (const [lever, value] of Object.entries(readLevers(this))) {
        reproduction.searchParams.set(lever, value);
      }
      console.info(
        `bench ${id} · seed ${String(simulation.seed)} · deterministic · levers travel in the URL · reproduce this run at ${reproduction.href}`,
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
