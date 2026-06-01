import React, { useState } from 'react';
import { ICONS } from '../constants';
import { format } from '../lib/dateUtils';
import { cn } from '../lib/utils';
import { PageHeader, SectionCard, Button, Input, Dialog, DialogFooter } from "@jaldee/design-system";

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
  const [logs, setLogs] = useState<AuditRecord[]>(mockAuditLogs);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = filterCategory === 'ALL' || log.category === filterCategory;

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

  return (
    <div className="h-full bg-slate-50 overflow-y-auto no-scrollbar font-sans text-slate-900 flex flex-col p-4 sm:p-6 md:p-8 space-y-8">
      {/* 1. Creative Title Area */}
      <PageHeader
        title="Global Compliance & Activity Log"
        subtitle="Immutable cryptographic audit logs for stream ingestion operations"
        actions={
          <Button
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl border transition-all cursor-pointer",
                    filterCategory === cat 
                      ? "bg-[#5D40A8] border-[#5D40A8] text-white shadow-md shadow-[#5D40A8]/10" 
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
                  )}
                >
                  {cat === 'ALL' ? 'ALL OPERATIONS' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAF9FC] text-xs font-semibold text-slate-400 border-b border-slate-200 select-none">
                <tr>
                  <th className="px-6 py-4.5 text-left font-semibold">LOG ID & IP</th>
                  <th className="px-6 py-4.5 text-left font-semibold">DATE & HOUR</th>
                  <th className="px-6 py-4.5 text-left font-semibold">ACTURED BY</th>
                  <th className="px-6 py-4.5 text-left font-semibold">EVENT ACTION</th>
                  <th className="px-6 py-4.5 text-left font-semibold text-right">PAYLOAD SCHEMA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  let badgeColors = "bg-purple-50 text-[#5D40A8] border-purple-150";
                  if (log.status === 'WARNING') badgeColors = "bg-amber-50 text-amber-600 border-amber-150";
                  if (log.status === 'CRITICAL') badgeColors = "bg-rose-50 text-rose-600 border-rose-150";

                  return (
                    <tr key={log.id} className="hover:bg-[#FAF9FC] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-slate-900">
                            {log.id}
                          </span>
                          <span className="text-xs font-mono text-slate-400 mt-1">
                            IP: {log.ip}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-500">
                          {format(new Date(log.timestamp), 'dd MMM yyyy • HH:mm:ss')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            {log.actor.substring(0,2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {log.actor}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("px-2 py-0.5 border text-xs font-semibold rounded-sm", badgeColors)}>
                              {log.category}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {log.action}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 max-w-md line-clamp-1 group-hover:line-clamp-none font-medium leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.payload ? (
                          <button
                            onClick={() => setSelectedRecord(log)}
                            className="text-xs font-semibold text-[#5D40A8] bg-purple-50 border border-purple-150 hover:bg-[#5D40A8] hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            Inspection
                          </button>
                        ) : (
                          <span className="text-xs text-slate-440 font-bold italic">
                            Empty
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-slate-400 text-xs font-bold italic leading-loose">
                      No matching audit parameters logged in this database cycle.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Crypto Payload Node Inspector"
        size="lg"
        bodyClassName="space-y-4 font-mono text-indigo-300 bg-slate-950 p-6"
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="text-sm space-y-2">
              <p className="text-slate-400 text-xs font-sans font-semibold">Log Event Details:</p>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-300 font-sans font-bold leading-relaxed text-xs font-sans">
                {selectedRecord.details}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-slate-400 text-xs font-sans font-semibold">Metadata Payload:</p>
              <pre className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm font-bold text-emerald-400 overflow-x-auto max-h-48 no-scrollbar">
                {JSON.stringify(selectedRecord.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
        <DialogFooter className="bg-slate-950">
          <Button
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
