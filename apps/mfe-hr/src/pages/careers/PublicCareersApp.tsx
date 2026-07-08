import { useEffect, useState, useCallback } from "react";
import PublicJobList from "./PublicJobList";
import PublicJobPage from "./PublicJobPage";

/**
 * Self-contained PUBLIC careers site, exposed as a federation module and mounted
 * by shell-host at an UNAUTHENTICATED /careers/* route. It deliberately does NOT
 * use react-router (it renders inside the shell's router) — it parses the path
 * itself and manages navigation via history, so only the public careers pages
 * are reachable (no other HR screens leak out).
 *
 * URLs:
 *   /careers/{companySlug}                 → job listing
 *   /careers/{companySlug}/{jobSlug}       → job detail + apply
 */
function parse(pathname: string): { companySlug?: string; jobSlug?: string } {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/"); // e.g. ["careers","jaldee","senior-..."]
  const idx = parts.indexOf("careers");
  const rest = idx >= 0 ? parts.slice(idx + 1) : parts;
  return { companySlug: rest[0], jobSlug: rest[1] };
}

export default function PublicCareersApp() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  const { companySlug, jobSlug } = parse(path);

  const wrap = (child: React.ReactNode) => (
    <div style={{ minHeight: "100vh", background: "#F5F3FB", padding: "24px 16px" }}>{child}</div>
  );

  if (!companySlug) {
    return wrap(
      <div style={{ maxWidth: 640, margin: "80px auto", textAlign: "center", color: "#6b7280" }}>
        <h2 style={{ color: "#1E1B4B" }}>Careers</h2>
        <p>Open a company's careers link to view open roles.</p>
      </div>
    );
  }

  if (jobSlug) {
    return wrap(<PublicJobPage companySlug={companySlug} jobSlug={jobSlug} />);
  }
  return wrap(
    <PublicJobList companySlug={companySlug} onOpen={(slug) => go(`/careers/${companySlug}/${slug}`)} />
  );
}
