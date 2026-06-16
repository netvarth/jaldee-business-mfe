import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { format } from '../lib/dateUtils';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { PageHeader, SectionCard, Button, Dialog, DialogFooter, DataTable, EmptyState, Select, Drawer, Input, cn } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { leadService } from '../services/leadService';

interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  auditlogContext:
    | 'CRM_LEAD'
    | 'CRM_LEAD_CHANNEL'
    | 'CRM_LEAD_CONSUMER'
    | 'CRM_LEAD_PRODUCT'
    | 'CRM_LEAD_PIPELINE_STAGE'
    | 'CRM_LEAD_TEMPLATE'
    | 'CRM_LEAD_PIPELINE';
  status: 'SUCCESS' | 'WARNING' | 'CRITICAL';
  details: string;
  ip: string;
  payload?: any;
}

const auditlogContextOptions = [
  { label: 'ALL OPERATIONS', value: 'ALL' },
  { label: 'CHANNEL', value: 'CRM_LEAD_CHANNEL' },
  { label: 'CONSUMER', value: 'CRM_LEAD_CONSUMER' },
  { label: 'PRODUCT', value: 'CRM_LEAD_PRODUCT' },
  { label: 'STAGE', value: 'CRM_LEAD_PIPELINE_STAGE' },
  { label: 'TEMPLATE', value: 'CRM_LEAD_TEMPLATE' },
  { label: 'PIPELINE', value: 'CRM_LEAD_PIPELINE' },
] as const;

const mockAuditLogs: AuditRecord[] = [
  {
    id: 'AUD-39420',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    actor: 'System Ingest Service',
    action: 'Lead Auto-Route',
    auditlogContext: 'CRM_LEAD',
    status: 'SUCCESS',
    details: 'Lead L-90231 (Sarah Connor) successfully routed to "Prospect Intake" stage via Website Form API.',
    ip: '35.231.144.12',
    payload: { channel: 'c2Website', product: 'HEALTH_CHK', pipeline: 'p1' }
  },
  {
    id: 'AUD-39419',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 min ago
    actor: 'Alice Admin',
    action: 'Change Gateway Sku',
    auditlogContext: 'CRM_LEAD_CHANNEL',
    status: 'SUCCESS',
    details: 'Updated Source Channel "WhatsApp Bot" (c3) linked product to "School ERP Demo" (pr3).',
    ip: '192.168.1.145',
    payload: { channelUid: 'c35', previousProduct: 'HEALTH_CHK', currentProduct: 'EDU_ERP' }
  },
  {
    id: 'AUD-39418',
    timestamp: new Date(Date.now() - 1000 * 60 * 58).toISOString(), // 1 hour ago
    actor: 'Bob Sales',
    action: 'Lead Conversion Update',
    auditlogContext: 'CRM_LEAD_PIPELINE',
    status: 'SUCCESS',
    details: 'Lead L-1239A (Peter Parker) status updated to "Closed/WON". Triggered commission reward sequence.',
    ip: '102.34.19.220',
    payload: { originStage: 's1-4', nextStage: 's1-5', transactionVal: 4500 }
  },
  {
    id: 'AUD-39417',
    timestamp: new Date(Date.now() - 1000 * 60 * 122).toISOString(), // 2 hours ago
    actor: 'System Compliance daemon',
    action: 'SLA Rule Violation Alert',
    auditlogContext: 'CRM_LEAD_PIPELINE_STAGE',
    status: 'WARNING',
    details: 'Lead L-45302 (Tony Stark) in "Nurture Track" exceeded SLA threshold limit of 5 days (currently at 5.2 days).',
    ip: '10.0.4.95',
  },
  {
    id: 'AUD-39416',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    actor: 'Alice Admin',
    action: 'SLA Days Tuning',
    auditlogContext: 'CRM_LEAD_PIPELINE_STAGE',
    status: 'SUCCESS',
    details: 'Stage "Demo Scheduled" (s1-3) SLA threshold parameter changed from 5 to 3 days.',
    ip: '192.168.1.145',
    payload: { previousValue: 5, newValue: 3, pipelineId: 'p1' }
  },
  {
    id: 'AUD-39415',
    timestamp: new Date(Date.now() - 1000 * 60 * 250).toISOString(),
    actor: 'Bulk Import Handler',
    action: 'Data Ingestion Suite',
    auditlogContext: 'CRM_LEAD',
    status: 'SUCCESS',
    details: 'Executed CSV upload stream. Successfully registered 45 active leads to pipeline "Fast Track".',
    ip: '35.231.144.12',
    payload: { recordCount: 45, failedLines: 0, timeTakenMs: 450 }
  },
  {
    id: 'AUD-39414',
    timestamp: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    actor: 'John Doe',
    action: 'Console SSO Login',
    auditlogContext: 'CRM_LEAD_CONSUMER',
    status: 'SUCCESS',
    details: 'Secure SSO connection verified for john@jaldee.com (User group: Systems Admin).',
    ip: '185.22.45.109',
  }
];

export default function AuditLogScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const showDashboardBack = cameFromDashboard(location);
  const [logs, setLogs] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState('');
  const [filterUpdatedBy, setFilterUpdatedBy] = useState('');
  const [filterUpdatedFrom, setFilterUpdatedFrom] = useState('');
  const [filterUpdatedTo, setFilterUpdatedTo] = useState('');
  const [draftFilterAction, setDraftFilterAction] = useState('');
  const [draftFilterUpdatedBy, setDraftFilterUpdatedBy] = useState('');
  const [draftFilterUpdatedFrom, setDraftFilterUpdatedFrom] = useState('');
  const [draftFilterUpdatedTo, setDraftFilterUpdatedTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    leadService.getLogs({
      page: page - 1,
      size: pageSize,
      ...(filterCategory !== 'ALL' && { auditlogContext: filterCategory }),
      ...(filterAction.trim() && { action: filterAction.trim() }),
      ...(filterUpdatedBy.trim() && { updatedByName: filterUpdatedBy.trim() }),
      ...(filterUpdatedFrom && { fromDate: filterUpdatedFrom }),
      ...(filterUpdatedTo && { toDate: filterUpdatedTo }),
    })
      .then((data: any) => {
        if (active) {
          const arr = Array.isArray(data) ? data : data?.content || [];
          const total = typeof data?.page?.totalElements === 'number'
            ? data.page.totalElements
            : typeof data?.totalElements === 'number'
              ? data.totalElements
              : arr.length;
          setLogs(arr);
          setTotalElements(total);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch audit logs", err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filterCategory, page, pageSize, filterAction, filterUpdatedBy, filterUpdatedFrom, filterUpdatedTo]);

  const filteredLogs = logs.filter(log => {
    const cat = log.auditlogContext || log.auditLogContext || log.context || log.category || 'CRM_LEAD';
    const matchesCategory = filterCategory === 'ALL' || cat === filterCategory;
    const action = String(log.action || log.event || log.actionName || '').toLowerCase();
    const updatedByName = String(log.updatedByName || log.actorUserName || log.actor || log.userName || 'System').toLowerCase();
    const updatedAtValue = log.updatedAt || log.createdAt || log.timestamp;
    const updatedAtTime = updatedAtValue ? new Date(updatedAtValue).getTime() : 0;
    const matchesAction = !filterAction.trim() || action.includes(filterAction.trim().toLowerCase());
    const matchesUpdatedBy = !filterUpdatedBy.trim() || updatedByName.includes(filterUpdatedBy.trim().toLowerCase());
    const fromTime = filterUpdatedFrom ? new Date(`${filterUpdatedFrom}T00:00:00`).getTime() : null;
    const toTime = filterUpdatedTo ? new Date(`${filterUpdatedTo}T23:59:59`).getTime() : null;
    const matchesUpdatedFrom = fromTime === null || (updatedAtTime && updatedAtTime >= fromTime);
    const matchesUpdatedTo = toTime === null || (updatedAtTime && updatedAtTime <= toTime);

    return matchesCategory && matchesAction && matchesUpdatedBy && matchesUpdatedFrom && matchesUpdatedTo;
  });

  const appliedFilterCount = [
    Boolean(filterAction.trim()),
    Boolean(filterUpdatedBy.trim()),
    Boolean(filterUpdatedFrom),
    Boolean(filterUpdatedTo),
  ].filter(Boolean).length;

  useEffect(() => {
    setPage(1);
  }, [filterCategory, filterAction, filterUpdatedBy, filterUpdatedFrom, filterUpdatedTo, pageSize]);

  const openFilters = () => {
    setDraftFilterAction(filterAction);
    setDraftFilterUpdatedBy(filterUpdatedBy);
    setDraftFilterUpdatedFrom(filterUpdatedFrom);
    setDraftFilterUpdatedTo(filterUpdatedTo);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setFilterAction(draftFilterAction);
    setFilterUpdatedBy(draftFilterUpdatedBy);
    setFilterUpdatedFrom(draftFilterUpdatedFrom);
    setFilterUpdatedTo(draftFilterUpdatedTo);
    setPage(1);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilterAction('');
    setDraftFilterUpdatedBy('');
    setDraftFilterUpdatedFrom('');
    setDraftFilterUpdatedTo('');
    setFilterAction('');
    setFilterUpdatedBy('');
    setFilterUpdatedFrom('');
    setFilterUpdatedTo('');
    setPage(1);
    setFiltersOpen(false);
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredLogs.length, page, pageSize]);

  const downloadSimulatedJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jaldee_leads_audit_logs_${format(new Date(), 'yyyy-MM-dd')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        key: "subject",
        header: "Subject",
        width: 260,
        render: (log) => {
          const subject = String(log.subject || log.entityName || log.referenceName || log.id || log.uid || 'Audit record');
          const action = String(log.action || log.event || log.actionName || 'Unknown');
          return (
            <div className="min-w-0 flex items-center gap-2">
              <span className="inline-flex shrink-0 max-w-[8rem] items-center rounded-full border border-purple-100 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#5D40A8]">
                <span className="truncate">{action}</span>
              </span>
              <span className="truncate text-sm font-semibold text-slate-900">{subject}</span>
            </div>
          );
        },
      },
      {
        key: "message",
        header: "Message",
        width: 320,
        render: (log) => (
          <p className="text-sm text-slate-500 line-clamp-2 font-medium leading-relaxed">
            {String(log.message || log.details || log.description || 'No additional details provided')}
          </p>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        width: 230,
        render: (log) => {
          const updatedByName = String(log.updatedByName || log.actorUserName || log.actor || log.userName || 'System');
          const updatedAt = log.updatedAt || log.createdAt || log.timestamp || new Date().toISOString();
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {updatedByName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="block truncate font-semibold text-slate-800">{updatedByName}</span>
                <span className="block text-xs font-medium text-slate-500">{format(new Date(updatedAt), 'dd MMM yyyy HH:mm:ss')}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: "inspect",
        header: "",
        align: "right",
        width: 120,
        render: (log) => (
          log.metadata || log.afterState || log.beforeState || log.payload ? (
            <Button
              id={`jaldee-leads-audit-log-${String(log.id || log.uid)}-inspect-button`}
              data-testid={`jaldee-leads-audit-log-${String(log.id || log.uid)}-inspect-button`}
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedRecord(log);
              }}
              className="text-xs font-semibold"
            >
              Inspect
            </Button>
          ) : (
            <span className="text-slate-300 text-xs font-medium italic">-</span>
          )
        ),
      },
    ],
    [],
  );

  return (
    <div data-testid="jaldee-leads-audit-log-page" data-state={loading ? "loading" : filteredLogs.length === 0 ? "empty" : "ready"} className="h-full bg-slate-50 overflow-y-auto no-scrollbar font-sans text-slate-900 flex flex-col p-4 sm:p-6 md:p-8 space-y-8">
      {/* 1. Creative Title Area */}
      <PageHeader
        back={showDashboardBack ? { label: 'Back to Dashboard', href: '/jaldee-leads/dashboard' } : undefined}
        onNavigate={() => navigateBackToDashboard(navigate)}
        title="Global Compliance & Activity Log"
        subtitle="Immutable cryptographic audit logs for stream ingestion operations"
        actions={
          <Button
            id="jaldee-leads-audit-log-export-button"
            data-testid="jaldee-leads-audit-log-export-button"
            onClick={downloadSimulatedJSON}
            variant="primary"
            icon={<ICONS.DOWNLOAD className="w-4 h-4 text-purple-200" />}
            className="px-5 py-3 text-sm font-semibold transition-all active-scale"
          >
            Export Audit Schema
          </Button>
        }
      />

      <div className="space-y-8 w-full flex-1">
        {/* 2. Top Metric Stats Row temporarily hidden.
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5D40A8] flex items-center justify-center shrink-0">
              <ICONS.SHIELD className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Verification Status</p>
              <h3 className="text-sm font-semibold text-[#5D40A8] mt-1">SECURE & IMMUTABLE</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ICONS.LEADS className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Telemetry Stream Rate</p>
              <h3 className="text-xs font-semibold text-slate-900 mt-1">12 INGESTIONS / HR</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <ICONS.ALERT className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Integrity Alerts</p>
              <h3 className="text-sm font-semibold text-slate-900 mt-1">0 CRITICAL</h3>
            </div>
          </div>
        </div>
        */}

        {/* 3. Filters Log Stream */}
        <SectionCard className="p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/40">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:hidden">
                <Select
                  id="jaldee-leads-audit-log-filter-select"
                  data-testid="jaldee-leads-audit-log-filter-select"
                  aria-label="Filter audit logs"
                  value={filterCategory}
                  onChange={(event) => setFilterCategory(event.target.value)}
                  options={[...auditlogContextOptions]}
                />
              </div>

              {/* Filter buttons */}
              <div className="hidden flex-wrap gap-2 text-xs font-semibold md:flex">
                {auditlogContextOptions.map((option) => (
                  <Button
                    id={`jaldee-leads-audit-log-filter-${option.value.toLowerCase().replace(/_/g, '-')}-button`}
                    data-testid={`jaldee-leads-audit-log-filter-${option.value.toLowerCase().replace(/_/g, '-')}-button`}
                    data-active={filterCategory === option.value}
                    key={option.value}
                    onClick={() => setFilterCategory(option.value)}
                    variant={filterCategory === option.value ? "primary" : "outline"}
                    size="sm"
                    className="text-xs font-semibold"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <Button
                type="button"
                id="jaldee-leads-audit-log-filter-button"
                data-testid="jaldee-leads-audit-log-filter-button"
                variant={appliedFilterCount > 0 ? "primary" : "outline"}
                className={cn(
                  "flex items-center gap-2 self-end rounded-md px-4 py-2 font-semibold md:shrink-0",
                  appliedFilterCount > 0 ? "" : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
                )}
                onClick={openFilters}
              >
                <FilterIcon />
                <span>Filter</span>
                {appliedFilterCount > 0 ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                    {appliedFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </div>

          <div data-testid="jaldee-leads-audit-log-table" data-state={loading ? "loading" : filteredLogs.length === 0 ? "empty" : "ready"} className="p-6 pt-4">
            <DataTable
              data={filteredLogs}
              columns={columns}
              getRowId={(log) => String(log.id || log.uid || `${log.action || 'log'}-${log.updatedAt || log.createdAt || log.timestamp}`)}
              loading={loading}
              pagination={{
                page,
                pageSize,
                total: totalElements,
                mode: "server",
                onChange: setPage,
                onPageSizeChange: setPageSize,
              }}
              paginationPlacement="top"
              emptyState={
                <EmptyState
                  data-testid="jaldee-leads-audit-log-empty-state"
                  title="No matching audit records"
                  description="Adjust the current filters to review activity logs."
                />
              }
            />
          </div>
          <div className="bg-slate-50 border-t border-slate-150 p-5 flex items-center justify-between text-xs font-bold text-slate-400 select-none">
            <span>Regulatory Engine Verified</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              ALL SYSTEMS COMPLIANT
            </span>
          </div>
        </SectionCard>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Advanced Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <Input
              id="jaldee-leads-audit-log-drawer-action-filter"
              data-testid="jaldee-leads-audit-log-drawer-action-filter"
              label="Action"
              placeholder="Filter by action"
              value={draftFilterAction}
              onChange={(event) => setDraftFilterAction(event.target.value)}
            />
            <Input
              id="jaldee-leads-audit-log-drawer-updated-by-filter"
              data-testid="jaldee-leads-audit-log-drawer-updated-by-filter"
              label="Updated By"
              placeholder="Filter by user"
              value={draftFilterUpdatedBy}
              onChange={(event) => setDraftFilterUpdatedBy(event.target.value)}
            />
            <Input
              id="jaldee-leads-audit-log-drawer-updated-from-filter"
              data-testid="jaldee-leads-audit-log-drawer-updated-from-filter"
              label="Updated From"
              type="date"
              value={draftFilterUpdatedFrom}
              onChange={(event) => setDraftFilterUpdatedFrom(event.target.value)}
            />
            <Input
              id="jaldee-leads-audit-log-drawer-updated-to-filter"
              data-testid="jaldee-leads-audit-log-drawer-updated-to-filter"
              label="Updated To"
              type="date"
              value={draftFilterUpdatedTo}
              onChange={(event) => setDraftFilterUpdatedTo(event.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset All
            </Button>
            <Button type="button" variant="primary" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>

      {/* JSON Inspection dialogue modal */}
      <Dialog
        data-testid="jaldee-leads-audit-log-inspector-dialog"
        data-state={selectedRecord ? "open" : "closed"}
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Crypto Payload Node Inspector"
        size="lg"
        bodyClassName="space-y-4 font-mono text-indigo-300 bg-slate-950 p-6"
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="text-sm space-y-2">
              <p className="text-slate-400 text-xs font-sans font-semibold">Log Event Message:</p>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-300 font-sans font-bold leading-relaxed text-xs">
                {selectedRecord.message || selectedRecord.details || 'No message provided'}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-slate-400 text-xs font-sans font-semibold">Metadata & Changes:</p>
              <pre className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs font-medium text-emerald-400 overflow-x-auto max-h-48 no-scrollbar">
                {JSON.stringify(selectedRecord.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedRecord.beforeState && (
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs font-sans font-semibold">Before State:</p>
                  <pre className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs font-medium text-amber-400/80 overflow-x-auto max-h-64 no-scrollbar">
                    {JSON.stringify(selectedRecord.beforeState, null, 2)}
                  </pre>
                </div>
              )}
              {selectedRecord.afterState && (
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs font-sans font-semibold">After State:</p>
                  <pre className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs font-medium text-sky-400/80 overflow-x-auto max-h-64 no-scrollbar">
                    {JSON.stringify(selectedRecord.afterState, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="bg-slate-950">
          <Button
            id="jaldee-leads-audit-log-inspector-close-button"
            data-testid="jaldee-leads-audit-log-inspector-close-button"
            onClick={() => setSelectedRecord(null)}
            variant="ghost"
            className="text-white hover:bg-slate-800"
          >
            Close Node
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-[2.2]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

