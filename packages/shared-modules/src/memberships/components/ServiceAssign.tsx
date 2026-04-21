import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  EmptyState,
  PageHeader,
  SectionCard,
  Tabs,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useAllServiceMembers,
  useAssignGroupToService,
  useAssignMember,
  useMemberCount,
  useMemberGroup,
  useMemberGroupCount,
  useMembers,
  useServiceByUid,
} from "../queries/memberships";
import { getServiceStatusLabel, unwrapCount, unwrapList, unwrapPayload } from "./serviceShared";

interface ServiceAssignProps {
  serviceUid: string;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function ServiceAssign({ serviceUid }: ServiceAssignProps) {
  const { basePath } = useSharedModulesContext();
  const [activeTab, setActiveTab] = useState<"members" | "groups">("members");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const serviceQuery = useServiceByUid(serviceUid);
  const membersQuery = useMembers({ from: 0, count: 200 });
  const memberCountQuery = useMemberCount();
  const groupsQuery = useMemberGroup({ from: 0, count: 200 });
  const groupCountQuery = useMemberGroupCount();
  const assignedMembersQuery = useAllServiceMembers(serviceUid, 0, 500);

  const assignMemberMutation = useAssignMember();
  const assignGroupMutation = useAssignGroupToService();

  const service = useMemo(() => unwrapPayload(serviceQuery.data), [serviceQuery.data]);
  const members = useMemo(() => unwrapList(membersQuery.data), [membersQuery.data]);
  const groups = useMemo(() => unwrapList(groupsQuery.data), [groupsQuery.data]);
  const assignedMembers = useMemo(() => unwrapList(assignedMembersQuery.data), [assignedMembersQuery.data]);

  const assignedMemberIds = useMemo(
    () => new Set(assignedMembers.map((member: any) => String(member.id ?? member.uid ?? ""))),
    [assignedMembers]
  );
  const assignedGroupIds = useMemo(
    () => new Set((service?.groupList ?? []).map((group: any) => String(group.groupId ?? group.id ?? group.uid ?? ""))),
    [service]
  );

  const memberOptions = useMemo(
    () => members.map((member: any) => ({
      id: String(member.id ?? member.uid ?? ""),
      name: `${member.salutation ? `${member.salutation} ` : ""}${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Unnamed member",
      description: member.phoneNo ? `${member.countryCode ?? ""} ${member.phoneNo}`.trim() : member.email ?? "",
    })),
    [members]
  );

  const groupOptions = useMemo(
    () => groups.map((group: any) => ({
      id: String(group.id ?? group.groupId ?? group.uid ?? ""),
      name: String(group.groupName ?? "Unnamed group"),
      description: String(group.description ?? ""),
    })),
    [groups]
  );

  async function handleAssign() {
    try {
      setSubmitError(null);

      if (activeTab === "members") {
        const filteredIds = selectedMemberIds.filter((id) => !assignedMemberIds.has(id));
        if (!filteredIds.length) {
          setSubmitError("Select at least one new member to assign.");
          return;
        }

        await assignMemberMutation.mutateAsync({
          memberService: { uid: serviceUid },
          memberIds: filteredIds,
        });
      } else {
        const filteredIds = selectedGroupIds.filter((id) => !assignedGroupIds.has(id));
        if (!filteredIds.length) {
          setSubmitError("Select at least one new group to assign.");
          return;
        }

        await assignGroupMutation.mutateAsync({
          memberService: { uid: serviceUid },
          groupIds: filteredIds,
        });
      }

      window.location.assign(`${basePath}/service/servicedetails/${serviceUid}`);
    } catch (error: any) {
      setSubmitError(
        typeof error?.message === "string"
          ? error.message
          : "Unable to assign the selected items."
      );
    }
  }

  const isSubmitting = assignMemberMutation.isPending || assignGroupMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={service?.serviceName ? `Assign to ${service.serviceName}` : "Assign Members/Groups"}
        subtitle={service?.status ? `Current status: ${getServiceStatusLabel(String(service.status))}` : undefined}
        back={{ label: "Back", href: `${basePath}/service/servicedetails/${serviceUid}` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-5">
          {submitError ? <ErrorBanner message={submitError} /> : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "members" | "groups")}
            items={[
              { value: "members", label: "Members", count: unwrapCount(memberCountQuery.data) || memberOptions.length },
              { value: "groups", label: "Groups", count: unwrapCount(groupCountQuery.data) || groupOptions.length },
            ]}
          />

          {activeTab === "members" ? (
            memberOptions.length ? (
              <div className="space-y-3">
                {memberOptions.map((member) => {
                  const isAssigned = assignedMemberIds.has(member.id);
                  const isChecked = selectedMemberIds.includes(member.id);

                  return (
                    <div key={member.id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <Checkbox
                        checked={isAssigned || isChecked}
                        disabled={isAssigned}
                        onChange={(event) => {
                          const nextChecked = event.currentTarget.checked;
                          setSelectedMemberIds((current) =>
                            nextChecked
                              ? [...current, member.id]
                              : current.filter((id) => id !== member.id)
                          );
                        }}
                        label={
                          <div>
                            <div className="font-medium text-slate-900">{member.name}</div>
                            {member.description ? <div className="text-sm text-slate-500">{member.description}</div> : null}
                            {isAssigned ? <div className="text-xs font-medium text-emerald-600">Already assigned</div> : null}
                          </div>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No members found"
                description="Create members first, then assign them to this service."
              />
            )
          ) : groupOptions.length ? (
            <div className="space-y-3">
              {groupOptions.map((group) => {
                const isAssigned = assignedGroupIds.has(group.id);
                const isChecked = selectedGroupIds.includes(group.id);

                return (
                  <div key={group.id} className="rounded-xl border border-slate-200 px-4 py-3">
                    <Checkbox
                      checked={isAssigned || isChecked}
                      disabled={isAssigned}
                      onChange={(event) => {
                        const nextChecked = event.currentTarget.checked;
                        setSelectedGroupIds((current) =>
                          nextChecked
                            ? [...current, group.id]
                            : current.filter((id) => id !== group.id)
                        );
                      }}
                      label={
                        <div>
                          <div className="font-medium text-slate-900">{group.name}</div>
                          {group.description ? <div className="text-sm text-slate-500">{group.description}</div> : null}
                          {isAssigned ? <div className="text-xs font-medium text-emerald-600">Already assigned</div> : null}
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No groups found"
              description="Create groups first, then assign them to this service."
            />
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/service/servicedetails/${serviceUid}`)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} loading={isSubmitting}>
              Assign
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
