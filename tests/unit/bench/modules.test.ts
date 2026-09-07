import { describe, expect, it } from 'vitest';
import { assertDefinitionIsConsistent } from '../../../src/bench/core/definition';
import { transcriptOf } from '../../../src/bench/core/demonstration';
import { loadScenario, scenarioIds } from '../../../src/bench/scenarios';

describe.each(scenarioIds)('scenario module %s', (id) => {
  it('agrees with its own definition', async () => {
    const module = await loadScenario(id);
    expect(module.scenario.id).toBe(id);
    expect(() => {
      assertDefinitionIsConsistent(module.definition);
    }).not.toThrow();
    expect(module.invitation.length).toBeGreaterThan(40);

    const levers = module.scenario.defaultLevers as Record<string, string>;
    for (const lever of module.definition.levers) {
      expect(Object.keys(levers)).toContain(lever.id);
      expect(lever.options.map((option) => option.value)).toContain(levers[lever.id]);
    }

    for (const action of module.definition.actions) {
      expect(module.actionEvent(action.id)).toBeDefined();
    }
    expect(module.actionEvent('no-such-action')).toBeUndefined();

    const stations = new Set(module.definition.stations.map((station) => station.id));
    const transcript = transcriptOf(module.scenario, module.demonstration);
    expect(transcript.entries.length).toBeGreaterThan(3);
    for (const entry of transcript.entries) {
      expect(stations.has(entry.station)).toBe(true);
    }
  });
});
