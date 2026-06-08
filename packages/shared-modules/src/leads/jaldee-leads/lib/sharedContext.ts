import type { BranchLocation } from "@jaldee/auth-context";
import { useSharedModulesContext } from "../../../context";

export function useJaldeeLeadsContext() {
  const context = useSharedModulesContext();
  const availableLocations = ((context as typeof context & { availableLocations?: BranchLocation[] }).availableLocations ??
    (context.location ? [context.location] : [])) as BranchLocation[];

  return {
    account: context.account,
    user: context.user,
    availableLocations,
  };
}
