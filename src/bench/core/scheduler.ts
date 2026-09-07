export interface Scheduled<Event> {
  at: number;
  sequence: number;
  event: Event;
}

export interface Scheduler<Event> {
  schedule(time: number, event: Event): void;
  peek(): Scheduled<Event> | undefined;
  take(): Scheduled<Event> | undefined;
  size(): number;
}

const isEarlier = <Event>(first: Scheduled<Event>, second: Scheduled<Event>): boolean =>
  first.at < second.at || (first.at === second.at && first.sequence < second.sequence);

export const createScheduler = <Event>(): Scheduler<Event> => {
  const heap: Scheduled<Event>[] = [];
  let sequence = 0;

  const swap = (first: number, second: number): void => {
    const held = heap[first];
    const other = heap[second];
    if (held === undefined || other === undefined) {
      return;
    }
    heap[first] = other;
    heap[second] = held;
  };

  const siftUp = (start: number): void => {
    let index = start;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const child = heap[index];
      const above = heap[parent];
      if (child === undefined || above === undefined || !isEarlier(child, above)) {
        return;
      }
      swap(index, parent);
      index = parent;
    }
  };

  const siftDown = (start: number): void => {
    let index = start;
    for (;;) {
      const left = 2 * index + 1;
      const right = left + 1;
      let earliest = index;
      const leftEntry = heap[left];
      const rightEntry = heap[right];
      const current = heap[earliest];
      if (current !== undefined && leftEntry !== undefined && isEarlier(leftEntry, current)) {
        earliest = left;
      }
      const chosen = heap[earliest];
      if (chosen !== undefined && rightEntry !== undefined && isEarlier(rightEntry, chosen)) {
        earliest = right;
      }
      if (earliest === index) {
        return;
      }
      swap(index, earliest);
      index = earliest;
    }
  };

  return {
    schedule: (time, event) => {
      heap.push({ at: time, sequence: sequence++, event });
      siftUp(heap.length - 1);
    },
    peek: () => heap[0],
    take: () => {
      const first = heap[0];
      const last = heap.pop();
      if (first === undefined || last === undefined) {
        return undefined;
      }
      if (heap.length > 0) {
        heap[0] = last;
        siftDown(0);
      }
      return first;
    },
    size: () => heap.length,
  };
};
