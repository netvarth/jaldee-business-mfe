import { usePublicJobs } from "../../services/useCareers";
import { careersStyles } from "./careersStyles";

export interface PublicJobListProps {
  companySlug: string;
  companyName?: string;
  onOpen?: (slug: string) => void;
}

/** Public careers landing — list of published roles for a company. */
export default function PublicJobList({ companySlug, companyName, onOpen }: PublicJobListProps) {
  const { data, loading, error } = usePublicJobs(companySlug);

  const open = (slug: string) => {
    if (onOpen) onOpen(slug);
    else window.location.hash = `#/careers/${companySlug}/${slug}`;
  };

  return (
    <div className="jd">
      <style>{careersStyles}</style>
      <div className="site-nav">
        <div className="logo"><span className="mark">{(companyName || companySlug || "J").charAt(0).toUpperCase()}</span> {companyName || companySlug}</div>
        <div className="nav-links"><a href="#">Careers</a></div>
      </div>
      <div className="hero">
        <h1>Open roles</h1>
        <div className="crumb">Join the team — {data.length} open position{data.length === 1 ? "" : "s"}</div>
      </div>
      <div className="list-wrap">
        {loading && <p style={{ color: "#6b7280" }}>Loading roles…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {!loading && !error && data.length === 0 && (
          <p style={{ color: "#6b7280" }}>No open roles right now. Check back soon.</p>
        )}
        {data.map((j) => (
          <div className="job-row" key={j.slug} onClick={() => open(j.slug)}>
            <div>
              <div className="jt">{j.title}</div>
              <div className="jm">
                {j.locationText && <span>📍 {j.locationText}</span>}
                {j.employmentType && <span>🕑 {j.employmentType}</span>}
                {j.departmentText && <span>🗂 {j.departmentText}</span>}
                {j.experienceText && <span>★ {j.experienceText}</span>}
              </div>
            </div>
            <span className="go">View & apply →</span>
          </div>
        ))}
      </div>
      <div className="footer">
        <span>© {new Date().getFullYear()} {companyName || companySlug}. All rights reserved.</span>
        <span>Powered by Jaldee</span>
      </div>
    </div>
  );
}
