import { useEffect, useRef, useState } from "react";
import { MFE_CONTRACT_VERSION, type MFEProps } from "@jaldee/auth-context";

interface MFELifecycleModule {
  CONTRACT_VERSION?: string;
  mount: (container: HTMLElement, props: MFEProps) => void;
  unmount: (container: HTMLElement) => void;
  updateProps?: (props: Partial<MFEProps>) => void;
}

interface MFELoaderProps {
  remote: () => Promise<MFELifecycleModule | { default: MFELifecycleModule }>;
  props: MFEProps;
}

export default function MFELoader({ remote, props }: MFELoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lifecycleRef = useRef<MFELifecycleModule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    setLoadError(null);
    setIsLoading(true);

    remote()
      .then((loadedModule) => {
        if (cancelled || !containerRef.current) return;

        const lifecycleModule = "default" in loadedModule ? loadedModule.default : loadedModule;
        if (lifecycleModule.CONTRACT_VERSION !== MFE_CONTRACT_VERSION) {
          throw new Error(
            `HR contract mismatch: expected ${MFE_CONTRACT_VERSION}, received ${lifecycleModule.CONTRACT_VERSION ?? "unknown"}`,
          );
        }

        lifecycleModule.mount(containerRef.current, props);
        lifecycleRef.current = lifecycleModule;
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("[employee-shell] failed to load HR MFE", error);
        if (!cancelled) {
          setIsLoading(false);
          setLoadError(error instanceof Error ? error.message : "Failed to load HR");
        }
      });

    return () => {
      cancelled = true;
      if (containerRef.current && lifecycleRef.current) {
        lifecycleRef.current.unmount(containerRef.current);
        lifecycleRef.current = null;
      }
    };
  }, [props, remote]);

  useEffect(() => {
    lifecycleRef.current?.updateProps?.(props);
  }, [props]);

  return (
    <div className="min-h-full">
      {isLoading ? <div className="p-6 text-sm text-slate-500">Loading HR...</div> : null}
      {loadError ? <div className="p-6 text-sm text-rose-600">Failed to load HR: {loadError}</div> : null}
      <div ref={containerRef} className={isLoading ? "opacity-0" : "opacity-100"} />
    </div>
  );
}
