import { useEffect, useRef } from "react";
import type { MFEProps } from "@jaldee/auth-context";

interface MFELifecycleModule {
  mount: (container: HTMLElement, props: MFEProps) => void;
  unmount: (container: HTMLElement) => void;
}

interface MFELoaderProps {
  remote: () => Promise<MFELifecycleModule | { default: MFELifecycleModule }>;
  props: MFEProps;
}

export function MFELoader({ remote, props }: MFELoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) {
      return;
    }

    let unmountFn: ((container: HTMLElement) => void) | null = null;

    remote()
      .then((loadedModule) => {
        const lifecycleModule = "default" in loadedModule ? loadedModule.default : loadedModule;
        const { mount, unmount } = lifecycleModule;

        console.log("[MFELoader] mounting", props.mfeName);
        if (!containerRef.current) {
          return;
        }
        mount(containerRef.current, props);
        unmountFn = unmount;
        mountedRef.current = true;
      })
      .catch((err) => {
        console.error("[MFELoader] failed to load remote", err);
      });

    return () => {
      if (containerRef.current && unmountFn) {
        unmountFn(containerRef.current);
        mountedRef.current = false;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="mfe-container"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
