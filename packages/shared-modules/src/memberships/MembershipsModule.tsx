import { useMemo, useState } from "react";
import { ErrorState } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { MembershipsList } from "./components/MembershipsList";
import { MembershipDetail } from "./components/MembershipDetail";
import { MembershipDashboard } from "./components/MembershipDashboard";
import { MemberTypeList } from "./components/MemberTypeList";
import { MemberTypeForm } from "./components/MemberTypeForm";
import { ServiceTypeList } from "./components/ServiceTypeList";
import { ServiceTypeForm } from "./components/ServiceTypeForm";
import { MembersList } from "./components/MembersList";
import { PaymentInfoList } from "./components/PaymentInfoList";
import { SchemeList } from "./components/SchemeList";
import { CreateMember } from "./components/CreateMember";
import { MemberDetails } from "./components/MemberDetails";
import { PaymentDetails } from "./components/PaymentDetails";
import { MemberGroupDetails } from "./components/MemberGroupDetails";
import { ServiceForm } from "./components/ServiceForm";
import { ServiceDetails } from "./components/ServiceDetails";
import { ServiceAssign } from "./components/ServiceAssign";

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
  if (view === "dashboard") {
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

  if (view === "paymentInfo") {
    return <PaymentInfoList />;
  }

  if (view === "scheme") {
    return <SchemeList />;
  }

  if (view === "service") {
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

  // Default view - membership dashboard
  if (membershipId) {
    return <MembershipDetail membershipId={membershipId} onBack={() => setSelectedMembershipId(null)} />;
  }

  return <MembershipDashboard />;
}

