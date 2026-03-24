import { lazy, Suspense } from "react";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";

interface MFELoaderProps {
  remote: () => Promise<{ default: React.ComponentType }>;
  props: MFEProps;
}

export function MFELoader({ remote, props }: MFELoaderProps) {
  const MFEComponent = lazy(remote);

  return (
    <MFEPropsContext.Provider value={props}>
      <Suspense fallback={<div>Loading MFE...</div>}>
        <MFEComponent />
      </Suspense>
    </MFEPropsContext.Provider>
  );
}