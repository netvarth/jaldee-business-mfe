import { Alert, Button, DataTable, EmptyState, Input, PageHeader, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import { useChannelByUid, useLeads, useLeadsCount } from "../queries/leads";
import { CHANNEL_TYPE_OPTIONS, PRODUCT_TYPE_OPTIONS, fullName, mapLeadStatusLabel, unwrapCount, unwrapList, unwrapPayload } from "../utils";
import { ModulePlaceholder, StatusBadge } from "./shared";

type ChannelLeadRow = {
  uid: string;
  referenceNo: string;
  prospectName: string;
  currentStage: string;
  owner: string;
  productOrService: string;
  status: string;
};

function getChannelTypeLabel(value: unknown) {
  return CHANNEL_TYPE_OPTIONS.find((item) => item.value === String(value ?? ""))?.label ?? String(value ?? "-");
}

function getProductTypeLabel(value: unknown) {
  return PRODUCT_TYPE_OPTIONS.find((item) => item.value === String(value ?? ""))?.label ?? String(value ?? "-");
}

function toLeadRows(data: unknown): ChannelLeadRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    referenceNo: String(item.referenceNo ?? `LEAD-${index + 1}`),
    prospectName: fullName(item),
    currentStage: String(item.stageName ?? item.leadStage?.stageName ?? item.currentStage ?? "-"),
    owner: String(item.ownerName ?? item.assigneeName ?? "-"),
    productOrService: String(item.productName ?? item.crmLeadProductTypeName ?? item.productTypeName ?? "-"),
    status: String(item.internalStatus ?? item.status ?? ""),
  }));
}

export function ChannelDetails({ channelUid }: { channelUid: string }) {
  const { account, basePath } = useSharedModulesContext();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("all");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "leadChannelDetails",
    resetDeps: [appliedQuery, channelUid, status],
  });
  const [copied, setCopied] = useState(false);

  const channelQuery = useChannelByUid(channelUid);
  const channel = useMemo(() => unwrapPayload(channelQuery.data), [channelQuery.data]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const leadFilters = useMemo(
    () => ({
      "channelUid-eq": channelUid,
      ...(appliedQuery ? { "referenceNo-like": appliedQuery } : {}),
      ...(status !== "all" ? { "internalStatus-eq": status } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedQuery, channelUid, page, pageSize, status]
  );

  const leadCountFilters = useMemo(
    () => ({
      "channelUid-eq": channelUid,
      ...(appliedQuery ? { "referenceNo-like": appliedQuery } : {}),
      ...(status !== "all" ? { "internalStatus-eq": status } : {}),
    }),
    [appliedQuery, channelUid, status]
  );

  const leadsQuery = useLeads(leadFilters);
  const leadsCountQuery = useLeadsCount(leadCountFilters);
  const leadRows = useMemo(() => toLeadRows(leadsQuery.data), [leadsQuery.data]);
  const totalLeads = unwrapCount(leadsCountQuery.data) || leadRows.length;

  const columns = useMemo<ColumnDef<ChannelLeadRow>[]>(
    () => [
      { key: "referenceNo", header: "Lead Id", render: (row) => <span className="font-semibold text-slate-900">{row.referenceNo}</span> },
      { key: "prospectName", header: "Prospect Name" },
      { key: "currentStage", header: "Current Stage" },
      { key: "owner", header: "Owner" },
      { key: "productOrService", header: "Product/Service" },
      { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/leads/details/${row.uid}`);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath]
  );

  if (!channelUid) {
    return <ModulePlaceholder title="Channel not selected" description="Open a channel record from the list to view its details." backHref={`${basePath}/channels`} />;
  }

  if (channelQuery.isLoading) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">Loading channel details...</div>
      </SectionCard>
    );
  }

  if (!channel) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Channel details unavailable" description="The selected channel could not be loaded." />
      </SectionCard>
    );
  }

  const location = Array.isArray(channel.locationDtos) && channel.locationDtos.length > 0
    ? String(channel.locationDtos[0]?.place ?? channel.locationDtos[0]?.name ?? "-")
    : "-";
  const productType = String(channel.crmLeadProductTypeDto?.typeName ?? "-");
  const product = getProductTypeLabel(channel.crmLeadProductTypeDto?.productEnum ?? "");
  const channelEncId = String(channel.encId ?? channel.channelEncId ?? channel.channelId ?? channel.uid ?? "-");
  const accountPath = String(account?.name ?? "")
    .trim()
    .replace(/\s+/g, "");
  const shareLink = typeof window === "undefined"
    ? `/${accountPath || "account"}/lead/create/${channelEncId}`
    : `${window.location.origin}/${accountPath || "account"}/lead/create/${channelEncId}`;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function openShare(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channel Details"
        back={{ label: "Back", href: `${basePath}/channels` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-2xl font-semibold text-indigo-500">{String(channel.name ?? "-")}</div>
            </div>
            <Button variant="outline" onClick={() => window.location.assign(`${basePath}/channels/update/${channelUid}`)}>
              Edit Channel
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <InfoBlock label="Location" value={location} />
            <InfoBlock label="Product" value={product} />
            <InfoBlock label="Product Type" value={productType} />
            <InfoBlock label="Platform Type" value={getChannelTypeLabel(channel.channelType)} />
            <InfoBlock label="Channel EncId" value={channelEncId} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="text-base font-semibold text-slate-900">Here is your QR code and Link</div>
              <div className="w-fit rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <LinkCodeGraphic value={shareLink} />
              </div>
            </div>

            <div className="space-y-5">
              <div className="break-all text-sm leading-6 text-slate-700">{shareLink}</div>

              <div className="flex flex-wrap items-start gap-4">
                <ShareAction label="Facebook" tone="bg-[#4267B2]" onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`)}>
                  <FacebookIcon />
                </ShareAction>
                <ShareAction label="WhatsApp" tone="bg-[#25D366]" onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(shareLink)}`)}>
                  <WhatsAppIcon />
                </ShareAction>
                <ShareAction label="Email" tone="bg-[#FF8A1D]" onClick={() => openShare(`mailto:?subject=${encodeURIComponent(String(channel.name ?? "Channel"))}&body=${encodeURIComponent(shareLink)}`)}>
                  <MailIcon />
                </ShareAction>
                <ShareAction label="Telegram" tone="bg-[#229ED9]" onClick={() => openShare(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`)}>
                  <TelegramIcon />
                </ShareAction>
                <ShareAction label={copied ? "Copied" : "Copy link"} tone="bg-slate-500" onClick={() => void copyShareLink()}>
                  <LinkIcon />
                </ShareAction>
              </div>

              {copied ? <Alert variant="success">Channel link copied.</Alert> : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Leads</h2>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="w-full lg:max-w-[420px]">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search with lead id" />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="all">All Leads</option>
                  <option value="ACTIVE">{mapLeadStatusLabel("ACTIVE")}</option>
                  <option value="COMPLETED">{mapLeadStatusLabel("COMPLETED")}</option>
                  <option value="REJECTED">{mapLeadStatusLabel("REJECTED")}</option>
                  <option value="NO_RESPONSE">{mapLeadStatusLabel("NO_RESPONSE")}</option>
                </select>
                <button
                  type="button"
                  className="flex h-[38px] w-[44px] items-center justify-center rounded-md border border-slate-200 bg-white text-[#4C1D95] shadow-sm"
                  aria-label="Filters"
                  title="Filters"
                >
                  <FilterIcon />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={leadRows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={leadsQuery.isLoading || leadsCountQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/leads/details/${row.uid}`)}
            pagination={{ page, pageSize, total: totalLeads, onChange: setPage, onPageSizeChange: setPageSize, mode: "server" }}
            emptyState={<EmptyState title="No leads found" description="No leads are linked to this channel yet." />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-base font-semibold text-slate-900">{label}</div>
      <div className="text-sm leading-6 text-slate-700">{value}</div>
    </div>
  );
}

function ShareAction({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 border-0 bg-transparent p-0 text-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm ${tone}`}>
        {children}
      </span>
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </button>
  );
}

function LinkCodeGraphic({ value }: { value: string }) {
  const cells = useMemo(() => buildMatrix(value), [value]);

  return (
    <svg viewBox="0 0 116 116" width="100" height="100" aria-hidden="true">
      <rect x="0" y="0" width="116" height="116" fill="#FFFFFF" />
      {cells.map((cell, index) =>
        cell.filled ? <rect key={index} x={cell.x} y={cell.y} width="4" height="4" fill="#111827" /> : null
      )}
    </svg>
  );
}

function buildMatrix(value: string) {
  const size = 29;
  const cellSize = 4;
  const margin = 0;
  const seed = Array.from(value).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0) || 1;
  const cells: Array<{ x: number; y: number; filled: boolean }> = [];
  let state = seed;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);

      let filled = false;

      if (inFinder) {
        const localRow = row < 7 ? row : row - (size - 7);
        const localCol = col < 7 ? col : col - (size - 7);
        const ring = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
        const core = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
        filled = ring || core;
      } else {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        filled = state % 3 === 0;
      }

      cells.push({
        x: margin + col * cellSize,
        y: margin + row * cellSize,
        filled,
      });
    }
  }

  return cells;
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18l-7 8v5.5a1 1 0 0 1-1.5.86l-2-1.15a1 1 0 0 1-.5-.86V13L3 5z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.2-1.6 1.5-1.6H16V4.8c-.2 0-.9-.1-1.8-.1-2.6 0-4.2 1.6-4.2 4.5V11H7.5v3H10V21h3.5z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.1 4.9A9.9 9.9 0 0 0 3.7 17.1L2 22l5-1.6a9.9 9.9 0 0 0 15.9-8.1c0-2.7-1-5.1-2.8-7.4ZM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-3 .9.9-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-5.9c-.2-.1-1.4-.7-1.6-.7-.2-.1-.4-.1-.6.1l-.5.7c-.2.2-.3.2-.6.1-1.6-.8-2.6-2.8-2.8-3.1-.2-.3 0-.4.1-.6l.4-.5.2-.4c.1-.2 0-.4 0-.5l-.7-1.6c-.2-.4-.3-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.2.2-.9.8-.9 2s.9 2.4 1 2.6c.1.2 1.8 3 4.4 4.1.6.3 1.1.5 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.2-1.2 0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16v10H4z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m5 8 7 5 7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.7 4.4 18.5 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.1 2c-.2.2-.4.4-.8.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.5-.2L7.3 13 2.8 11.6c-1-.3-1-.9.2-1.3L20.6 3.6c.8-.3 1.4.2 1.1.8Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.6 13.4a3 3 0 0 0 4.2 0l2.8-2.8a3 3 0 1 0-4.2-4.2l-1.2 1.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.4 10.6a3 3 0 0 0-4.2 0l-2.8 2.8a3 3 0 0 0 4.2 4.2l1.2-1.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
