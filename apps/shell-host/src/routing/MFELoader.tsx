import { useEffect, useRef, useState } from "react";
import { MFE_CONTRACT_VERSION, type MFEProps } from "@jaldee/auth-context";
import PageLoadingSkeleton from "../layout/PageLoadingSkeleton";

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

const STYLESHEET_LOAD_TIMEOUT_MS = 5000;

function waitForPendingStylesheets() {
  const pendingStylesheets = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).filter((stylesheet) => !stylesheet.sheet);

  return Promise.allSettled(
    pendingStylesheets.map(
      (stylesheet) =>
        new Promise<void>((resolve) => {
          let timeoutId = 0;

          const finish = () => {
            window.clearTimeout(timeoutId);
            stylesheet.removeEventListener("load", finish);
            stylesheet.removeEventListener("error", finish);
            resolve();
          };

          stylesheet.addEventListener("load", finish, { once: true });
          stylesheet.addEventListener("error", finish, { once: true });
          timeoutId = window.setTimeout(finish, STYLESHEET_LOAD_TIMEOUT_MS);
        }),
    ),
  );
}

export function MFELoader({ remote, props }: MFELoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lifecycleRef = useRef<MFELifecycleModule | null>(null);
  const propsRef = useRef(props);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  propsRef.current = props;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let cancelled = false;
    let revealFrame: number | null = null;
    setLoadError(null);
    setIsLoading(true);

    remote()
      .then(async (loadedModule) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const lifecycleModule = "default" in loadedModule ? loadedModule.default : loadedModule;
        const contractVersion = lifecycleModule.CONTRACT_VERSION;

        if (contractVersion !== MFE_CONTRACT_VERSION) {
          throw new Error(
            `[MFELoader] Contract version mismatch for ${propsRef.current.mfeName}: expected ${MFE_CONTRACT_VERSION}, received ${contractVersion ?? "unknown"}`
          );
        }

        await waitForPendingStylesheets();
        if (cancelled || !containerRef.current) {
          return;
        }

        lifecycleModule.mount(containerRef.current, propsRef.current);
        lifecycleRef.current = lifecycleModule;

        revealFrame = window.requestAnimationFrame(() => {
          revealFrame = window.requestAnimationFrame(() => {
            if (!cancelled) {
              setIsLoading(false);
            }
          });
        });
      })
      .catch((err) => {
        console.error("[MFELoader] failed to load remote", err);
        if (!cancelled) {
          setIsLoading(false);
          setLoadError(err instanceof Error ? err.message : "Failed to load remote module");
        }
      });

    return () => {
      cancelled = true;
      if (revealFrame !== null) {
        window.cancelAnimationFrame(revealFrame);
      }
      if (containerRef.current && lifecycleRef.current) {
        lifecycleRef.current.unmount(containerRef.current);
        lifecycleRef.current = null;
      }
    };
  }, [remote]);

  useEffect(() => {
    if (!containerRef.current || !lifecycleRef.current) {
      return;
    }

    if (lifecycleRef.current.updateProps) {
      lifecycleRef.current.updateProps(props);
      return;
    }

    lifecycleRef.current.unmount(containerRef.current);
    lifecycleRef.current.mount(containerRef.current, props);
  }, [props]);

  return (
    <div className="mfe-loader" aria-busy={isLoading}>
      {isLoading && !loadError ? (
        <div className="mfe-loading-skeleton" data-testid="mfe-loading-skeleton">
          <PageLoadingSkeleton />
        </div>
      ) : null}
      {loadError ? (
        <div className="shell-loading" role="alert">
          Failed to load {props.mfeName}: {loadError}
        </div>
      ) : null}
      <div
        ref={containerRef}
        data-testid="mfe-container"
        className={`mfe-container${isLoading ? " mfe-container-loading" : ""}`}
      />
    </div>
  );
}
