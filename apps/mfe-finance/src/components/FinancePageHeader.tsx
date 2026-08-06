import { PageHeader, type PageHeaderProps } from "@jaldee/design-system";
import { useNavigate } from "react-router-dom";

export function FinancePageHeader({
  onNavigate,
  ...props
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <PageHeader
      {...props}
      variant="navigation"
      onNavigate={onNavigate ?? ((href) => navigate(href))}
    />
  );
}
