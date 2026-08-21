import React from "react";
import { Users } from "lucide-react";
import { useCustomerFamilyMembers } from "@jaldee/shared-modules";

import { initialsOf } from "../theme";
import { EmptyBlock, LoadErrorBlock, SkeletonBar, card } from "../parts";

/** Linked family members — plain by design; it is the least-visited tab on the record. */
export function FamilyTab({ uid }: { uid: string }) {
  const familyQ = useCustomerFamilyMembers(uid);
  const members = familyQ.data ?? [];

  if (familyQ.isLoading) {
    return (
      <div style={{ ...card, padding: 16 }}>
        <SkeletonBar w="60%" />
      </div>
    );
  }

  if (familyQ.isError) {
    return (
      <LoadErrorBlock
        what="family members"
        detail={(familyQ.error as { message?: string })?.message}
        onRetry={() => familyQ.refetch()}
      />
    );
  }

  if (members.length === 0) {
    return (
      <EmptyBlock
        icon={<Users size={26} />}
        title="No linked family members"
        body="Family links let one person order for another and keep the history on the right record."
      />
    );
  }

  return (
    <div style={{ ...card, borderRadius: 13, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--kt-border)",
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--kt-text)" }}>
          Linked family members
        </span>
      </div>
      {members.map((m) => {
        const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || "Family member";
        return (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "13px 16px",
              borderBottom: "1px solid var(--kt-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--kt-surface3)",
                  color: "var(--kt-text2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {initialsOf(name)}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--kt-text)" }}>{name}</div>
                <div
                  style={{
                    fontFamily: "var(--kt-fmono)",
                    fontSize: 11.5,
                    color: "var(--kt-text3)",
                    marginTop: 2,
                  }}
                >
                  {m.jaldeeId ?? m.id}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
