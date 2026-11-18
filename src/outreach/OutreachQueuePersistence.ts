const queue: any[] = [];

export function pushQueue(item: any): void { queue.push(item); }
export function popQueue(): any { return queue.shift(); }
export function queueSize(): number { return queue.length; }
export default { pushQueue, popQueue, queueSize };
