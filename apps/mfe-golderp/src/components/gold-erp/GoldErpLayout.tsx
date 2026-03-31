import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoldErpLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === "/";
  const isPurchaseWorkspace = location.pathname === "/purchase/new" || /^\/purchase\/[^/]+$/.test(location.pathname);
  const isSalesWorkspace = location.pathname === "/sales/new";
  const isGrnWorkspace = location.pathname === "/grn/new";

  const backLabel = isDashboard
    ? "Back to Business Dashboard"
    : isSalesWorkspace
      ? "Back to Sales Orders"
    : isGrnWorkspace
      ? "Back to GRN Dashboard"
    : isPurchaseWorkspace
      ? "Back to Purchase Orders"
      : "Back to Dashboard";

  const navigateToHostDashboard = () => {
    if (typeof window === "undefined") {
      navigate("/");
      return;
    }

    const segments = window.location.pathname.split("/").filter(Boolean);
    const goldErpIndex = segments.indexOf("gold-erp");

    if (goldErpIndex > 0) {
      window.location.assign(`/${segments.slice(0, goldErpIndex).join("/")}/dashboard`);
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    navigate("/");
  };

  const handleBack = () => {
    if (isDashboard) {
      navigateToHostDashboard();
      return;
    }

    if (isPurchaseWorkspace) {
      navigate("/purchase");
      return;
    }

    if (isSalesWorkspace) {
      navigate("/sales");
      return;
    }

    if (isGrnWorkspace) {
      navigate("/grn");
      return;
    }

    navigate("/");
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="px-1 py-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        </div>
      </div>

      <div className="flex-1 erp-page animate-fade-in">
        <Outlet />
      </div>
    </div>
  );
}
