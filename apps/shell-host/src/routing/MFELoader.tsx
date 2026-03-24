import { useEffect, useRef } from "react";
import type { MFEProps } from "@jaldee/auth-context";

interface MFELoaderProps {
  remote: () => Promise<{
    mount:   (container: HTMLElement, props: MFEProps) => void;
    unmount: (container: HTMLElement) => void;
  }>;
  props: MFEProps;
}

export function MFELoader({ remote, props }: MFELoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef   = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;

    let unmountFn: ((container: HTMLElement) => void) | null = null;

    remote().then(({ mount, unmount }) => {
        console.log("[MFELoader] mounting", props.mfeName);
      if (!containerRef.current) return;
      mount(containerRef.current, props);
      unmountFn      = unmount;
      mountedRef.current = true;
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