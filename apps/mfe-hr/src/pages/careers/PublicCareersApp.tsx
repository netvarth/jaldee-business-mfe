import { useEffect, useState, useCallback } from "react";
import PublicJobList from "./PublicJobList";
import PublicJobPage from "./PublicJobPage";

/**
 * Self-contained public careers site, exposed as a federation module.
 * It does not use react-router; it parses the pathname and drives history itself.
 *
 * URLs:
 *   /careers/{companySlug}
 *   /careers/{companySlug}/{jobSlug}
 */
function parse(pathname: string): { companySlug?: string; jobSlug?: string } {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/"); // e.g. ["careers","jaldee","senior-..."]
  const idx = parts.indexOf("careers");
  if (idx < 0) {
    return {};
  }
  return { companySlug: parts[idx + 1], jobSlug: parts[idx + 2] };
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
