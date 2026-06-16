import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { PieChart, Button, StatCard, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { leadService } from '../services/leadService';
import { useShellStore } from '../../../store/shellStore';
import { CrmLeadPipelineDto, Product, Channel } from '../types';

interface DashboardScreenProps {
  pipelines?: CrmLeadPipelineDto[];
  products?: Product[];
  channels?: Channel[];
  onNavigate: (route: string, selection?: any) => void;
}

const COLORS = ['#818cf8', '#34d399', '#60a5fa', '#fbbf24', '#a78bfa', '#f43f5e', '#06b6d4'];

const FREQUENCY_OPTIONS = [
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEKLY', label: 'Last 7 Days' },
  { value: 'MONTHLY', label: 'Last 30 Days' },
  { value: 'TILL_NOW', label: 'Till Now' },
];

function readCountMetric(analytics: any, ...keys: string[]) {
  const target = analytics?.data !== undefined ? analytics.data : analytics;
  if (target?.metricWiseValues?.length) {
    const match = target.metricWiseValues.find((item: any) => keys.includes(item.metricName));
    if (match) {
      return Number(match.isAmt ? match.amount : match.value) || 0;
    }
  }

  for (const key of keys) {
    const value = target?.[key];
    if (value !== undefined && value !== null) {
      return Number(value) || 0;
    }
  }

  return 0;
}

function extractBreakdown(
  analytics: any,
  arrayKeys: string[],
  metadataList?: any[],
  idKey?: string
): { name: string; value: number }[] {
  const target = analytics?.data !== undefined ? analytics.data : analytics;
  let results: { name: string; value: number; uid?: string }[] = [];

  // 1. Try to extract elements from analytics
  for (const key of arrayKeys) {
    const arr = target?.[key];
    if (Array.isArray(arr)) {
      results = arr.map(item => {
        let name = item?.byName || item?.name || item?.label || item?.metricLabel || item?.metricName;
        const idVal = item?.[idKey || ''] || item?.pipelineStageUid || item?.stageUid || item?.productUid || item?.channelUid;
        if ((!name || name === 'Unknown') && metadataList) {
          if (idVal) {
            const match = metadataList.find(m => m.uid === idVal || m.id === idVal);
            if (match) {
              name = match.name || match.displayName || match.title || match.stageName;
            }
          }
        }
        return {
          uid: idVal,
          name: name || 'Unknown',
          value: Number(item?.value !== undefined ? item.value : item?.count !== undefined ? item.count : item?.amount ?? 0)
        };
      });
      break;
    }
  }

  // 2. Supplement with missing metadataList entries
  if (metadataList) {
    const seenUids = new Set(results.map(r => r.uid).filter(Boolean));
    const seenNames = new Set(results.map(r => r.name.toLowerCase()).filter(Boolean));

    for (const meta of metadataList) {
      const metaUid = meta.uid || meta.id;
      const metaName = meta.name || meta.displayName || meta.title || meta.stageName;
      if (!metaName) continue;

      if ((metaUid && seenUids.has(metaUid)) || seenNames.has(metaName.toLowerCase())) {
        continue;
      }

      results.push({
        uid: metaUid,
        name: metaName,
        value: 0
      });
    }
  }

  return results;
}

export default function DashboardScreen({ pipelines, products, channels, onNavigate }: DashboardScreenProps) {
  const account = useShellStore((state) => state.account);
  const tenantUid = account?.tenantUid ?? account?.id;

  const [frequency, setFrequency] = useState<string>('TILL_NOW');
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<any>(null);

  useEffect(() => {
    if (!tenantUid) return;

    let active = true;
    setLoading(true);

    const fetchDashboardData = async () => {
      try {
        const summaryRes = await leadService.getAnalytics({
          tenantUid,
          frequency,
          filters: {},
          includeTotals: false,
          featureModule: 'CRM_LEAD',
          getDimensionWiseValue: false
        });

        if (active) {
          setSummaryData(summaryRes?.data || summaryRes);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching leads dashboard analytics:', err);
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [frequency, tenantUid]);

  // Extract Summary KPI Counts (strictly 0 fallback, no mock)
  const totalLeads = summaryData ? readCountMetric(summaryData, "CRM_LEAD_TOTAL_COUNT", "TOTAL_LEADS") : 0;
  const activeLeadsCount = summaryData ? readCountMetric(summaryData, "CRM_LEAD_ACTIVE_COUNT", "ACTIVE_PROSPECTS", "ACTIVE_LEADS") : 0;
  const newLeadsCount = summaryData ? readCountMetric(summaryData, "CRM_LEAD_NEW_COUNT", "NEW_LEADS_COUNT", "NEW_LEADS") : 0;
  const overdueTasksCount = summaryData ? readCountMetric(summaryData, "CRM_LEAD_PENDING_TASKS_COUNT", "PENDING_TASKS", "OVERDUE_TASKS") : 0;
  const unassignedLeadsCount = summaryData ? readCountMetric(summaryData, "CRM_LEAD_UNASSIGNED_COUNT", "UNASSIGNED_LEADS") : 0;

  // Extract breakdowns with 0 mock defaults, resolving UIDs to names if needed
  const channelAnalytics = extractBreakdown(summaryData, ["channelWiseValues", "leadsByChannel", "leadsBySource", "sourceWiseValues"], channels, "channelUid");
  const productAnalytics = extractBreakdown(summaryData, ["productWiseValues", "leadsByProduct", "productAnalytics"], products, "productUid");

  const flatStages = pipelines?.flatMap(p => p.stages || []) || [];
  const apiStageBreakdown = extractBreakdown(summaryData, ["stageWiseValues", "pipelineSaturationData", "stages", "pipelineWiseValues"], flatStages, "pipelineStageUid");
  const pipelineSaturationData = apiStageBreakdown.map((item, idx) => ({
    name: item.name,
    leads: item.value,
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <div data-testid="jaldee-leads-dashboard-page" className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8 space-y-8 pb-24 no-scrollbar">
      {/* Header Area */}
      <PageHeader
        title="Jaldee Leads Workspace"
        subtitle="Interface & CRM Logistics Engine"
        actions={
          <div className="flex items-center gap-4">
            <Select
              options={FREQUENCY_OPTIONS}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              fullWidth={false}
              className="min-w-[150px] text-xs font-semibold"
              testId="jaldee-leads-dashboard-frequency-select"
            />
            <Button 
              id="jaldee-leads-dashboard-all-leads-button"
              data-testid="jaldee-leads-dashboard-all-leads-button"
              onClick={() => onNavigate('leads')}
              variant="outline"
              className="rounded-xl px-6 h-10 text-xs font-semibold active-scale"
            >
              All Leads
            </Button>
            <Button 
              id="jaldee-leads-dashboard-new-lead-button"
              data-testid="jaldee-leads-dashboard-new-lead-button"
              onClick={() => onNavigate('leads/create')} 
              variant="primary"
              icon={<ICONS.ADD className="w-4 h-4 text-purple-200" />}
              className="rounded-xl px-6 h-10 text-xs font-semibold active-scale"
            >
              New Lead
            </Button>
          </div>
        }
      />

      {/* Section: Quick Actions Hub */}
      <div className="space-y-4">
        <div className="px-1">
          <p className="text-sm font-semibold text-slate-400 mb-1 leading-none">
            CRM Operations Hub
          </p>
          <p className="text-xs text-slate-500 font-bold">
            Quick Actions Panel
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-4">
          {[
            { 
              name: 'Leads', 
              id: 'leads', 
              icon: ICONS.LEADS, 
              btnClass: 'bg-[#5D40A8] hover:bg-[#4d3493] text-white border-[#5D40A8]/10 shadow-[0_6px_20px_rgba(93,64,168,0.25)] hover:shadow-[0_12px_28px_rgba(93,64,168,0.35)]',
              badgeClass: 'bg-white/15 border-white/10 text-white' 
            },
            { 
              name: 'Pipelines', 
              id: 'pipelines', 
              icon: ICONS.PIPELINES, 
              btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700/10 shadow-[0_6px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_28px_rgba(16,185,129,0.35)]',
              badgeClass: 'bg-white/15 border-white/10 text-white' 
            },
            { 
              name: 'Products', 
              id: 'products', 
              icon: ICONS.PRODUCTS, 
              btnClass: 'bg-purple-600 hover:bg-purple-750 text-white border-purple-700/10 shadow-[0_6px_20px_rgba(147,51,234,0.23)] hover:shadow-[0_12px_28px_rgba(147,51,234,0.33)]',
              badgeClass: 'bg-white/15 border-white/10 text-white' 
            },
            { 
              name: 'Channels', 
              id: 'channels', 
              icon: ICONS.CHANNELS, 
              btnClass: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700/10 shadow-[0_6px_20px_rgba(3,105,161,0.22)] hover:shadow-[0_12px_28px_rgba(3,105,161,0.32)]',
              badgeClass: 'bg-white/15 border-white/10 text-white' 
            },
            { 
              name: 'Bulk Import', 
              id: 'bulk_import', 
              icon: ICONS.IMPORT, 
              btnClass: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-700/10 shadow-[0_6px_20px_rgba(249,115,22,0.25)] hover:shadow-[0_12px_28px_rgba(249,115,22,0.35)]',
              badgeClass: 'bg-white/15 border-white/10 text-white' 
            },
            { 
              name: 'Audit Log', 
              id: 'audit_log', 
              icon: ICONS.HISTORY, 
              btnClass: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-650/10 shadow-[0_6px_20px_rgba(244,63,94,0.24)] hover:shadow-[0_12px_28px_rgba(244,63,94,0.34)]',
              badgeClass: 'bg-white/15 border-white/10 text-white' 
            }
          ].map((action) => (
            <Button
              id={`jaldee-leads-dashboard-quick-action-${action.id.replace('_', '-')}-button`}
              data-testid={`jaldee-leads-dashboard-quick-action-${action.id.replace('_', '-')}-button`}
              key={action.id}
              onClick={() => onNavigate(action.id)}
              variant="ghost"
              className={cn(
                "flex min-h-[68px] items-center gap-3 border rounded-2xl px-3.5 py-3 transition-all duration-300 group active-scale select-none cursor-pointer text-left w-full hover:-translate-y-1 hover:brightness-[1.03]",
                action.btnClass
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 group-hover:rotate-6 transition-transform",
                action.badgeClass
              )}>
                <action.icon className="w-4 h-4 shrink-0 font-bold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-xs font-semibold truncate leading-none">
                  {action.name}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-6">
        <StatCard
          label="New Leads (7d)"
          value={newLeadsCount}
          accent="indigo"
          icon={<ICONS.ADD className="w-7 h-7" />}
          className="min-h-[104px] rounded-[24px] border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all [&>div]:items-center [&>div]:gap-5 [&>div>div:first-child]:h-12 [&>div>div:first-child]:w-12"
        />
        <StatCard
          label="Pending Tasks"
          value={overdueTasksCount}
          accent="rose"
          icon={<ICONS.SAVE className="w-7 h-7" />}
          className="min-h-[104px] rounded-[24px] border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all [&>div]:items-center [&>div]:gap-5 [&>div>div:first-child]:h-12 [&>div>div:first-child]:w-12"
        />
        <StatCard
          label="Unassigned Leads"
          value={unassignedLeadsCount}
          accent="amber"
          icon={<ICONS.USER className="w-7 h-7" />}
          className="min-h-[104px] rounded-[24px] border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all [&>div]:items-center [&>div]:gap-5 [&>div>div:first-child]:h-12 [&>div>div:first-child]:w-12"
        />
      </div>

      {/* Primary Analytics Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <SectionCard className="p-8 flex flex-col justify-between xl:col-span-4">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-1">Funnel Overview</p>
              <h4 className="text-xl font-semibold text-slate-900">Leads Volume</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-3xl font-semibold text-indigo-600 leading-none">{totalLeads}</p>
                <p className="text-xs font-semibold text-indigo-400 mt-1">Total Leads Ingested</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-3xl font-semibold text-emerald-600 leading-none">{activeLeadsCount}</p>
                <p className="text-xs font-semibold text-emerald-400 mt-1">Active Prospects</p>
              </div>
            </div>
          </div>
          <Button 
            id="jaldee-leads-dashboard-inspect-leads-button"
            data-testid="jaldee-leads-dashboard-inspect-leads-button"
            onClick={() => onNavigate('leads')}
            variant="outline"
            className="w-[200px] py-3 text-sm font-semibold text-slate-400 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all mt-6"
          >
            Inspect Leads
          </Button>
        </SectionCard>
      </div>

      {/* Pipeline & Source Row */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <SectionCard className="p-4 sm:p-6 lg:p-8 overflow-hidden xl:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
            <h3 className="text-sm font-semibold text-slate-900 break-words">Pipeline Saturation</h3>
            <span className="text-sm font-semibold text-indigo-600 shrink-0">Leads by State</span>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar sm:grid sm:grid-cols-[repeat(auto-fit,minmax(min(100%,7.5rem),1fr))] sm:overflow-visible sm:pb-0">
             {pipelineSaturationData.map((stage, idx) => (
                <div key={idx} className="min-w-[132px] sm:min-w-0 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-600 transition-all group cursor-pointer text-center">
                   <div 
                     className="w-7 h-7 rounded-full bg-white mx-auto mb-3 flex items-center justify-center text-slate-800 font-bold text-xs shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all border border-slate-200"
                   >
                     {stage.leads}
                   </div>
                   <p className="text-xs font-semibold text-slate-900 truncate mb-1" title={stage.name}>{stage.name}</p>
                   <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                         className="h-full" 
                         style={{ width: `${totalLeads ? Math.min((stage.leads / totalLeads) * 100, 100) : 0}%`, backgroundColor: stage.color }}
                      />
                   </div>
                </div>
             ))}
          </div>
        </SectionCard>

        <SectionCard className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400"></div>
          <p className="text-sm font-semibold text-slate-400 mb-4">Total Leads</p>
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
             <PieChart
                data={channelAnalytics.filter(c => c.value > 0).map((c, index) => ({
                  label: c.name,
                  value: c.value,
                  color: COLORS[index % COLORS.length]
                }))}
                variant="donut"
                chartSize={152}
                showTooltip={true}
                showLabels={false}
                className="border-none bg-transparent h-auto p-0"
             />
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-semibold text-slate-900 leading-none">{totalLeads}</span>
                <span className="text-xs font-semibold text-slate-400 mt-1">Stored</span>
             </div>
          </div>
          <div className="mt-8 space-y-2 w-full">
             <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-xs font-semibold text-slate-500">Main Source</span>
                <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{channelAnalytics.sort((a,b)=>b.value-a.value)[0]?.name || 'N/A'}</span>
             </div>
             <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-xs font-semibold text-slate-500">Leading Product</span>
                <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{productAnalytics.sort((a,b)=>b.value-a.value)[0]?.name || 'N/A'}</span>
             </div>
          </div>
        </SectionCard>
      </div>

      {/* Leads by Channel & Leads by Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SectionCard className="p-6">
          <h4 className="text-xs font-semibold text-slate-400 mb-4">Leads by Source Channel</h4>
          <div className="space-y-3">
            {channelAnalytics.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-400 font-mono">{(totalLeads ? (c.value/totalLeads)*100 : 0).toFixed(0)}%</span>
                  <span className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-xs font-semibold text-indigo-600">{c.value}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="p-6">
          <h4 className="text-xs font-semibold text-slate-400 mb-4">Leads by Product Offer</h4>
          <div className="space-y-3">
            {productAnalytics.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-400 font-mono">{(totalLeads ? (p.value/totalLeads)*100 : 0).toFixed(0)}%</span>
                  <span className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-xs font-semibold text-indigo-600">{p.value}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
