import { usePublicJob } from "../../services/useCareers";
import { careersStyles } from "./careersStyles";
import JobPageView, { type JobView } from "./JobPageView";

export interface PublicJobPageProps {
  companySlug: string;
  jobSlug: string;
}

/** Public job detail + application — fetches the published job, then renders the shared view. */
export default function PublicJobPage({ companySlug, jobSlug }: PublicJobPageProps) {
  const { data: job, loading, error } = usePublicJob(companySlug, jobSlug);

  if (loading) {
    return <div className="jd" style={{ padding: 60, textAlign: "center", color: "#6b7280" }}><style>{careersStyles}</style>Loading…</div>;
  }
  if (error || !job) {
    return (
      <div className="jd" style={{ padding: 60, textAlign: "center" }}>
        <style>{careersStyles}</style>
        <h2 style={{ color: "#1E1B4B" }}>Position not found</h2>
        <p style={{ color: "#6b7280" }}>This job may have been closed or the link is incorrect.</p>
      </div>
    );
  }

  const view: JobView = {
    companyName: job.company?.companyName,
    companySlug,
    jobSlug,
    primaryColor: job.company?.primaryColor,
    templateKey: job.templateKey,
    title: job.title,
    locationText: job.locationText,
    employmentType: job.employmentType,
    departmentText: job.departmentText,
    experienceText: job.experienceText,
    salaryText: job.salaryText,
    summary: job.summary,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    niceToHave: job.niceToHave,
    benefits: job.benefits,
    tags: job.tags,
    aboutHtml: job.company?.aboutHtml,
  };

  return <JobPageView job={view} interactive />;
}
