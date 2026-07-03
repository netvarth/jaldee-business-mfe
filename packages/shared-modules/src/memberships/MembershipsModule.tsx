import { useMemo, useState, lazy, Suspense } from "react";
import { ErrorState } from "../../../design-system/src/components/ErrorState/ErrorState";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";

const MembershipsList = lazy(() => import("./components/MembershipsList").then(m => ({ default: m.MembershipsList })));
const MembershipDetail = lazy(() => import("./components/MembershipDetail").then(m => ({ default: m.MembershipDetail })));
const MembershipDashboard = lazy(() => import("./components/MembershipDashboard").then(m => ({ default: m.MembershipDashboard })));
const MemberTypeList = lazy(() => import("./components/MemberTypeList").then(m => ({ default: m.MemberTypeList })));
const MemberTypeForm = lazy(() => import("./components/MemberTypeForm").then(m => ({ default: m.MemberTypeForm })));
const ServiceTypeList = lazy(() => import("./components/ServiceTypeList").then(m => ({ default: m.ServiceTypeList })));
const ServiceTypeForm = lazy(() => import("./components/ServiceTypeForm").then(m => ({ default: m.ServiceTypeForm })));
const MembersList = lazy(() => import("./components/MembersList").then(m => ({ default: m.MembersList })));
const PaymentInfoList = lazy(() => import("./components/PaymentInfoList").then(m => ({ default: m.PaymentInfoList })));
const SchemeList = lazy(() => import("./components/SchemeList").then(m => ({ default: m.SchemeList })));
const CreateMember = lazy(() => import("./components/CreateMember").then(m => ({ default: m.CreateMember })));
const MemberDetails = lazy(() => import("./components/MemberDetails").then(m => ({ default: m.MemberDetails })));
const PaymentDetails = lazy(() => import("./components/PaymentDetails").then(m => ({ default: m.PaymentDetails })));
const MemberGroupDetails = lazy(() => import("./components/MemberGroupDetails").then(m => ({ default: m.MemberGroupDetails })));
const ServiceForm = lazy(() => import("./components/ServiceForm").then(m => ({ default: m.ServiceForm })));
const ServiceDetails = lazy(() => import("./components/ServiceDetails").then(m => ({ default: m.ServiceDetails })));
const ServiceAssign = lazy(() => import("./components/ServiceAssign").then(m => ({ default: m.ServiceAssign })));
const TemplatesScreen = lazy(() => import("./components/TemplatesScreen").then(m => ({ default: m.TemplatesScreen })));
const TemplateBuilderScreen = lazy(() => import("./components/TemplateBuilderScreen").then(m => ({ default: m.TemplateBuilderScreen })));

export function MembershipsModule() {
  const access = useModuleAccess("membership");
  const { routeParams } = useSharedModulesContext();
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(routeParams?.recordId ?? null);

  const membershipId = useMemo(
    () => routeParams?.recordId ?? selectedMembershipId,
    [routeParams?.recordId, selectedMembershipId]
  );

  const view = routeParams?.view;
  const subview = routeParams?.subview;

  if (!access.allowed) {
    return (
      <ErrorState
        title="Memberships unavailable"
        description={access.reason === "module-disabled"
          ? "This account does not currently have access to the Memberships module."
          : access.reason === "location-required"
            ? "Select a location to work with location-scoped membership data."
            : "This module cannot be opened in the current scope."}
      />
    );
  }

  const renderContent = () => {
    // Handle members sub-views
    if (view === "members") {
      if (subview === "create") {
        return <CreateMember />;
      }
      if (subview === "details" && membershipId) {
        return <MemberDetails memberId={membershipId} />;
      }
      if (subview === "paymentdetails" && membershipId) {
        return <PaymentDetails memberId={membershipId} />;
      }
      if (subview === "memberdetails" && membershipId) {
        return <MemberDetails memberId={membershipId} />;
      }
      if (subview === "groupdetails" && membershipId) {
        return <MemberGroupDetails groupId={membershipId} />;
      }
      if (subview && membershipId) {
        // For :source/:uid, treat as create with source
        return <CreateMember source={subview} memberId={membershipId} />;
      }
      if (subview) {
        // For :groupdetails
        return <MemberGroupDetails groupId={subview} />;
      }
      // Default members list
      return <MembersList />;
    }

    // Handle other views
    if (view === "dashboard" || view === "overview") {
      return <MembershipDashboard />;
    }

    if (view === "memberType") {
      if (subview === "create") {
        return <MemberTypeForm />;
      }
      if (subview === "update" && membershipId) {
        return <MemberTypeForm source="update" memberTypeUid={membershipId} />;
      }
      return <MemberTypeList />;
    }

    if (view === "serviceType") {
      if (subview === "create") {
        return <ServiceTypeForm />;
      }
      if (subview === "update" && membershipId) {
        return <ServiceTypeForm source="update" serviceTypeUid={membershipId} />;
      }
      return <ServiceTypeList />;
    }

    if (view === "members") {
      return <MembersList />;
    }

    if (view === "paymentInfo" || view === "fee-management") {
      return <PaymentInfoList />;
    }

    if (view === "scheme") {
      return <SchemeList />;
    }

    if (view === "service" || view === "services") {
      if (subview === "create") {
        return <ServiceForm />;
      }
      if (subview === "servicedetails" && membershipId) {
        return <ServiceDetails serviceUid={membershipId} />;
      }
      if (subview === "update" && membershipId) {
        return <ServiceForm source="update" serviceUid={membershipId} />;
      }
      if (subview === "assign" && membershipId) {
        return <ServiceAssign serviceUid={membershipId} />;
      }
      if (subview === "memberService" && membershipId) {
        return <ServiceDetails serviceUid={membershipId} />;
      }
      return <SchemeList />;
    }

    if (view === "templates") {
      if (subview === "create") {
        return <TemplateBuilderScreen />;
      }
      if (membershipId === "edit" && subview) {
        return <TemplateBuilderScreen initialTemplateUid={subview} />;
      }
      return <TemplatesScreen />;
    }

    // Default view - membership dashboard
    if (membershipId) {
      return <MembershipDetail membershipId={membershipId} onBack={() => setSelectedMembershipId(null)} />;
    }

    return <MembershipDashboard />;
  };

  return (
    <Suspense fallback={<div className="p-6 text-slate-500 animate-pulse text-sm">Loading section...</div>}>
      {renderContent()}
    </Suspense>
  );
}

