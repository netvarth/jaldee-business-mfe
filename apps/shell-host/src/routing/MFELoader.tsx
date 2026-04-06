import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const lifecycleRef = useRef<MFELifecycleModule | null>(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let cancelled = false;
    const currentLoadId = ++loadIdRef.current;

    if (lifecycleRef.current) {
      lifecycleRef.current.unmount(containerRef.current);
      lifecycleRef.current = null;
    }

    remote()
      .then((loadedModule) => {
        if (cancelled || loadIdRef.current !== currentLoadId) {
          return;
        }

        const lifecycleModule = "default" in loadedModule ? loadedModule.default : loadedModule;
        console.log("[MFELoader] mounting", props.mfeName);
        if (!containerRef.current) {
          return;
        }
        lifecycleModule.mount(containerRef.current, props);
        lifecycleRef.current = lifecycleModule;
      })
      .catch((err) => {
        console.error("[MFELoader] failed to load remote", err);
      });

    return () => {
      cancelled = true;
      if (containerRef.current && lifecycleRef.current && loadIdRef.current === currentLoadId) {
        lifecycleRef.current.unmount(containerRef.current);
        lifecycleRef.current = null;
      }
    };
  }, [location.pathname, props, remote]);

  return (
    <div
      ref={containerRef}
      data-testid="mfe-container"
      className="mfe-container"
    />
  );
}
