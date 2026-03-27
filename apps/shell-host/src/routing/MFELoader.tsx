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
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current || loadingRef.current) {
      return;
    }

    let cancelled = false;
    let unmountFn: ((container: HTMLElement) => void) | null = null;
    loadingRef.current = true;

    remote()
      .then((loadedModule) => {
        if (cancelled) {
          loadingRef.current = false;
          return;
        }

        const lifecycleModule = "default" in loadedModule ? loadedModule.default : loadedModule;
        const { mount, unmount } = lifecycleModule;

        console.log("[MFELoader] mounting", props.mfeName);
        if (!containerRef.current) {
          loadingRef.current = false;
          return;
        }
        mount(containerRef.current, props);
        unmountFn = unmount;
        mountedRef.current = true;
        loadingRef.current = false;
      })
      .catch((err) => {
        loadingRef.current = false;
        console.error("[MFELoader] failed to load remote", err);
      });

    return () => {
      cancelled = true;
      if (containerRef.current && unmountFn) {
        unmountFn(containerRef.current);
        mountedRef.current = false;
      }
      loadingRef.current = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="mfe-container"
      className="mfe-container"
    />
  );
}
