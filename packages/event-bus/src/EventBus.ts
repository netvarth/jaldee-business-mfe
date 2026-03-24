type Handler = (payload: unknown) => void;

export class EventBusImpl {
  private listeners: Map<string, Set<Handler>> = new Map();

  emit(event: string, payload?: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach(fn => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    });
  }

  on(event: string, handler: Handler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Returns unsubscribe function
    // Always call this in MFE unmount
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  // Clear all listeners for an event
  // Used in testing and MFE unmount
  off(event: string): void {
    this.listeners.delete(event);
  }

  // Clear everything — called on logout
  clear(): void {
    this.listeners.clear();
  }
}