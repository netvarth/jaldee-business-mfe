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
const remoteStylesheetHrefs = new Map<string, Set<string>>();

function getStylesheets() {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
}

function restoreRemoteStylesheets(mfeName: string) {
  const knownHrefs = remoteStylesheetHrefs.get(mfeName);
  if (!knownHrefs) return;

  const currentStylesheets = new Map(
    getStylesheets().map((stylesheet) => [stylesheet.href, stylesheet]),
  );
  knownHrefs.forEach((href) => {
    const existingStylesheet = currentStylesheets.get(href);
    if (existingStylesheet) {
      // Lazy shell routes may append CSS after an MFE was first loaded. Moving
      // the remote link to the end restores the remote's cascade priority.
      document.head.appendChild(existingStylesheet);
      return;
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = href;
    stylesheet.dataset.mfeStylesheet = mfeName;
    document.head.appendChild(stylesheet);
  });
}

function rememberRemoteStylesheets(mfeName: string, previousHrefs: Set<string>) {
  const stylesheets = getStylesheets();
  const discoveredHrefs = stylesheets
    .filter((stylesheet) => !previousHrefs.has(stylesheet.href) || !stylesheet.sheet)
    .map((stylesheet) => stylesheet.href);

  if (discoveredHrefs.length === 0) return;

  const knownHrefs = remoteStylesheetHrefs.get(mfeName) ?? new Set<string>();
  discoveredHrefs.forEach((href) => knownHrefs.add(href));
  remoteStylesheetHrefs.set(mfeName, knownHrefs);
}

function waitForPendingStylesheets(mfeName: string) {
  const pendingStylesheets = getStylesheets().filter((stylesheet) => !stylesheet.sheet);

  return Promise.all(
    pendingStylesheets.map(
      (stylesheet) =>
        new Promise<void>((resolve, reject) => {
          let timeoutId = 0;

          const cleanup = () => {
            window.clearTimeout(timeoutId);
            stylesheet.removeEventListener("load", handleLoad);
            stylesheet.removeEventListener("error", handleError);
          };
          const handleLoad = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            stylesheet.remove();
            reject(new Error(`[MFELoader] Failed to load stylesheet for ${mfeName}: ${stylesheet.href}`));
          };

          stylesheet.addEventListener("load", handleLoad, { once: true });
          stylesheet.addEventListener("error", handleError, { once: true });
          timeoutId = window.setTimeout(() => {
            cleanup();
            stylesheet.remove();
            reject(new Error(`[MFELoader] Timed out loading stylesheet for ${mfeName}: ${stylesheet.href}`));
          }, STYLESHEET_LOAD_TIMEOUT_MS);
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
    const mfeName = propsRef.current.mfeName;
    restoreRemoteStylesheets(mfeName);
    const previousStylesheetHrefs = new Set(getStylesheets().map((stylesheet) => stylesheet.href));
    setLoadError(null);
    setIsLoading(true);

    remote()
      .then(async (loadedModule) => {
        // Capture assets even when React StrictMode has already cleaned up this
        // particular effect run; the next run reuses the same cached remote.
        rememberRemoteStylesheets(mfeName, previousStylesheetHrefs);
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

        // Federation appends remote CSS while resolving the exposed module. Keep
        // ownership of those links so a later shell route cannot leave a cached
        // remote mounted without its stylesheet.
        await waitForPendingStylesheets(mfeName);
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
