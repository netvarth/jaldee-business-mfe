import { EventBusImpl } from "@jaldee/event-bus";

// Single instance — created once at shell boot
// Injected into every MFE via MFEProps.eventBus
// Never import this directly inside an MFE —
// always use props.eventBus
export const eventBus = new EventBusImpl();