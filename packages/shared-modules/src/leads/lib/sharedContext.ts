import type { BranchLocation } from "@jaldee/auth-context";
import { useSharedModulesContext } from "../../context";

export function useJaldeeLeadsContext() {
  const context = useSharedModulesContext();
  const sharedLocations = (context as typeof context & { availableLocations?: BranchLocation[] }).availableLocations;
  const availableLocations = (
    sharedLocations?.length
      ? sharedLocations
      : context.location
        ? [context.location]
        : []
  ) as BranchLocation[];

  return {
    account: context.account,
    user: context.user,
    eventBus: context.eventBus,
    availableLocations,
  };
}
