import { PageHeader, type PageHeaderProps } from "@jaldee/design-system";
import { useLocation, useNavigate } from "react-router-dom";
import { HR_ANALYTICS_BACK, isAnalyticsNavigation } from "../lib/hrNavigation";

export function HrPageHeader({
  back,
  onNavigate,
  ...props
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const contextualBack =
    back ?? (isAnalyticsNavigation(location.state) ? HR_ANALYTICS_BACK : undefined);

  return (
    <PageHeader
      {...props}
      variant="navigation"
      back={contextualBack}
      onNavigate={onNavigate ?? ((href) => navigate(href))}
    />
  );
}
