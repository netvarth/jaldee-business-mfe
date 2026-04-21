import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  DescriptionList,
  EmptyState,
  PageHeader,
  SectionCard,
  Tabs,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useAllServiceMembers,
  useAllServiceMembersCount,
  useServiceByUid,
} from "../queries/memberships";
import {
  buildTemplateFields,
  formatDate,
  getServiceImageUrl,
  getServiceStatusLabel,
  unwrapCount,
  unwrapList,
  unwrapPayload,
} from "./serviceShared";

interface ServiceDetailsProps {
  serviceUid: string;
}

type MemberRow = {
  uid: string;
  name: string;
  phone: string;
};

type GroupRow = {
  uid: string;
  id: string;
  name: string;
};

function getStatusVariant(status: string): "success" | "danger" | "warning" | "neutral" {
  const label = getServiceStatusLabel(status).toLowerCase();

  if (label === "active") return "success";
  if (label === "inactive") return "danger";
  if (label === "pending") return "warning";
  return "neutral";
}

function RichTextContent({ value }: { value: unknown }) {
  const content = String(value ?? "").trim();

  if (!content) {
    return <span>-</span>;
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  if (!looksLikeHtml) {
    return <span>{content}</span>;
  }

  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

function ServiceAvatar({ fallbackImage, imageUrl }: { fallbackImage: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
      />
    );
  }

  return (
    <img
      src={fallbackImage}
      alt=""
      className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
    />
  );
}

export function ServiceDetails({ serviceUid }: ServiceDetailsProps) {
  const { assetsBaseUrl, basePath } = useSharedModulesContext();
  const [activeTab, setActiveTab] = useState("members");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const serviceQuery = useServiceByUid(serviceUid);
  const membersQuery = useAllServiceMembers(serviceUid, (page - 1) * pageSize, pageSize);
  const memberCountQuery = useAllServiceMembersCount(serviceUid);

  const service = useMemo(() => unwrapPayload(serviceQuery.data), [serviceQuery.data]);
  const members = useMemo(() => unwrapList(membersQuery.data), [membersQuery.data]);
  const memberCount = unwrapCount(memberCountQuery.data) || members.length;
  const serviceImageUrl = getServiceImageUrl(service);
  const noSchemeImage = assetsBaseUrl
    ? `${assetsBaseUrl.replace(/\/+$/, "")}/assets/images/membership/dashboard-actions/noscheme.png`
    : "/assets/images/membership/dashboard-actions/noscheme.png";
  const templateFields = useMemo(
    () => buildTemplateFields(service?.templateSchema, service?.templateSchemaValue),
    [service]
  );

  const memberRows = useMemo<MemberRow[]>(
    () => members.map((member: any, index: number) => ({
      uid: String(member.uid ?? member.id ?? index),
      name: `${member.salutation ? `${member.salutation} ` : ""}${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Unnamed member",
      phone: member.phoneNo ? `${member.countryCode ?? ""} ${member.phoneNo}`.trim() : "-",
    })),
    [members]
  );

  const groupRows = useMemo<GroupRow[]>(
    () => (service?.groupList ?? []).map((group: any, index: number) => ({
      uid: String(group.groupuId ?? group.uid ?? index),
      id: String(group.groupId ?? group.id ?? group.groupuId ?? index),
      name: String(group.groupName ?? `Group ${index + 1}`),
    })),
    [service]
  );

  const memberColumns = useMemo<ColumnDef<MemberRow>[]>(
    () => [
      { key: "name", header: "Member" },
      { key: "phone", header: "Phone" },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (member) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.assign(`${basePath}/members/memberdetails/${member.uid}`)}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath]
  );

  const groupColumns = useMemo<ColumnDef<GroupRow>[]>(
    () => [
      { key: "name", header: "Group" },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (group) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.assign(`${basePath}/members/groupdetails/${group.uid || group.id}`)}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath]
  );

  const summaryItems = [
    {
      label: "Service Type",
      value: String(
        service?.serviceCategory?.categoryName ??
        service?.serviceCategory?.name ??
        service?.serviceType?.name ??
        "-"
      ),
    },
    {
      label: "Created On",
      value: formatDate(service?.createdDate ?? service?.createdAt),
    },
    {
      label: "Valid Until",
      value: formatDate(service?.validityEndDate ?? service?.validTo ?? service?.endDate),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={service?.serviceName ?? "Membership Service"}
        subtitle="Review assigned members, service metadata, and configuration."
        back={{ label: "Back", href: `${basePath}/service` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={(
          <>
            {getServiceStatusLabel(String(service?.status ?? "")) === "Active" ? (
              <Button
                variant="outline"
                onClick={() => window.location.assign(`${basePath}/service/update/${serviceUid}`)}
              >
                Edit
              </Button>
            ) : null}
            <Button onClick={() => window.location.assign(`${basePath}/service/assign/${serviceUid}`)}>
              Assign Members/Groups
            </Button>
          </>
        )}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <ServiceAvatar fallbackImage={noSchemeImage} imageUrl={serviceImageUrl} />
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xl font-semibold text-slate-900">{service?.serviceName ?? "-"}</div>
                <Badge variant={getStatusVariant(String(service?.status ?? ""))}>
                  {getServiceStatusLabel(String(service?.status ?? ""))}
                </Badge>
              </div>
              <DescriptionList items={summaryItems} columns={3} />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 2xl:grid-cols-5">
        <div className="space-y-5 2xl:col-span-2">
          <SectionCard className="border-slate-200 shadow-sm" padding={false}>
            <div className="border-b border-slate-200 px-4 pt-2">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                items={[
                  { value: "members", label: "Members", count: memberCount },
                  { value: "groups", label: "Groups", count: groupRows.length },
                ]}
                className="border-b-0"
              />
            </div>

            <div className="p-4">
              {activeTab === "members" ? (
                <DataTable
                  data={memberRows}
                  columns={memberColumns}
                  getRowId={(row) => row.uid}
                  loading={membersQuery.isLoading || memberCountQuery.isLoading}
                  pagination={{
                    page,
                    pageSize,
                    total: memberCount,
                    onChange: setPage,
                    onPageSizeChange: setPageSize,
                    mode: "server",
                  }}
                  emptyState={(
                    <EmptyState
                      title="No members assigned"
                      description="Assigned members will appear here."
                    />
                  )}
                />
              ) : (
                <DataTable
                  data={groupRows}
                  columns={groupColumns}
                  getRowId={(row) => row.id}
                  emptyState={(
                    <EmptyState
                      title="No groups assigned"
                      description="Assigned groups will appear here."
                    />
                  )}
                />
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5 2xl:col-span-3">
          <SectionCard title="Service Details" className="border-slate-200 shadow-sm">
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-800">Description</div>
                <div className="text-sm leading-7 text-slate-600">
                  <RichTextContent value={service?.description} />
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-6">
                <div className="text-sm font-medium text-slate-800">Remarks</div>
                <div className="text-sm leading-7 text-slate-600">
                  <RichTextContent value={service?.remarks} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Template Fields" className="border-slate-200 shadow-sm">
            {templateFields.length ? (
              <div className="space-y-5">
                {templateFields.map((field) => (
                  <div key={field.key} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-sm font-medium text-slate-900">{field.label}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{field.value || "-"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No template data"
                description="This service does not have saved template values."
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
