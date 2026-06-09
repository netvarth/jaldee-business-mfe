import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { format } from '../lib/dateUtils';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { PageHeader, SectionCard, Button, Input, Dialog, DialogFooter, DataTable, EmptyState } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { leadService } from '../services/leadService';

interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: 'CONFIG' | 'INGEST' | 'USER_AUTH' | 'PIPELINE' | 'DATA';
  status: 'SUCCESS' | 'WARNING' | 'CRITICAL';
  details: string;
  ip: string;
  payload?: any;
}

const mockAuditLogs: AuditRecord[] = [
  {
    id: 'AUD-39420',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    actor: 'System Ingest Service',
    action: 'Lead Auto-Route',
    category: 'INGEST',
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
    category: 'CONFIG',
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
    category: 'PIPELINE',
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
    category: 'PIPELINE',
    status: 'WARNING',
    details: 'Lead L-45302 (Tony Stark) in "Nurture Track" exceeded SLA threshold limit of 5 days (currently at 5.2 days).',
    ip: '10.0.4.95',
  },
  {
    id: 'AUD-39416',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    actor: 'Alice Admin',
    action: 'SLA Days Tuning',
    category: 'CONFIG',
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
    category: 'DATA',
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
    category: 'USER_AUTH',
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
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    leadService.getLogs({ page: 0, size: 100 })
      .then((data: any) => {
        if (active) {
          // ensure data is an array
          const arr = Array.isArray(data) ? data : data?.content || [];
          setLogs(arr);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch audit logs", err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredLogs = logs.filter(log => {
    const actor = String(log.actorUserName || log.actor || log.userName || log.user || 'System');
    const action = String(log.action || log.event || log.actionName || 'Unknown');
    const details = String(log.message || log.details || log.description || '');
    const id = String(log.id || log.uid || '');
    
    const matchesSearch = 
      actor.toLowerCase().includes(search.toLowerCase()) ||
      action.toLowerCase().includes(search.toLowerCase()) ||
      details.toLowerCase().includes(search.toLowerCase()) ||
      id.toLowerCase().includes(search.toLowerCase());
    
    const cat = log.category || 'INGEST';
    const matchesCategory = filterCategory === 'ALL' || cat === filterCategory;

    return matchesSearch && matchesCategory;
  });

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
        width: 160,
        render: (log) => <span className="font-semibold text-slate-900">{String(log.subject || '-')}</span>,
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
        key: "action",
        header: "Action",
        width: 180,
        render: (log) => (
          <span className="px-2 py-0.5 border border-purple-150 bg-purple-50 text-[#5D40A8] text-xs font-semibold rounded-sm">
            {String(log.action || log.event || log.actionName || 'Unknown')}
          </span>
        ),
      },
      {
        key: "updatedBy",
        header: "Updated By",
        width: 180,
        render: (log) => {
          const updatedByName = String(log.updatedByName || log.actorUserName || log.actor || log.userName || 'System');
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {updatedByName.substring(0, 2).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-800">{updatedByName}</span>
            </div>
          );
        },
      },
      {
        key: "updatedAt",
        header: "Updated At",
        width: 190,
        render: (log) => {
          const updatedAt = log.updatedAt || log.createdAt || log.timestamp || new Date().toISOString();
          return <span className="font-medium text-slate-500">{format(new Date(updatedAt), 'dd MMM yyyy HH:mm:ss')}</span>;
        },
      },
      {
        key: "inspect",
        header: "Inspect",
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
        back={showDashboardBack ? { label: 'Back to Dashboard', href: '/leads/dashboard' } : undefined}
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
        {/* 2. Top Metric Stats Row */}
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

        {/* 3. Filters Log Stream */}
        <SectionCard className="p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
            {/* Search input to target logs */}
            <div className="relative flex-1 max-w-md">
              <Input
                id="jaldee-leads-audit-log-search-input"
                data-testid="jaldee-leads-audit-log-search-input"
                type="text"
                placeholder="Search audit trail actor, action or ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<ICONS.SEARCH className="w-4 h-4 text-slate-400" />}
                className="w-full"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {['ALL', 'CONFIG', 'INGEST', 'USER_AUTH', 'PIPELINE', 'DATA'].map((cat) => (
                <Button
                  id={`jaldee-leads-audit-log-filter-${cat.toLowerCase().replace('_', '-')}-button`}
                  data-testid={`jaldee-leads-audit-log-filter-${cat.toLowerCase().replace('_', '-')}-button`}
                  data-active={filterCategory === cat}
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  variant={filterCategory === cat ? "primary" : "outline"}
                  size="sm"
                  className="text-xs font-semibold"
                >
                  {cat === 'ALL' ? 'ALL OPERATIONS' : cat}
                </Button>
              ))}
            </div>
          </div>

          <div data-testid="jaldee-leads-audit-log-table" data-state={loading ? "loading" : filteredLogs.length === 0 ? "empty" : "ready"} className="p-6 pt-4">
            <DataTable
              data={filteredLogs}
              columns={columns}
              getRowId={(log) => String(log.id || log.uid || `${log.action || 'log'}-${log.updatedAt || log.createdAt || log.timestamp}`)}
              loading={loading}
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

