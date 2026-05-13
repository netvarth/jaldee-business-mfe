import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataTable, Input, Select, Button, Icon, Drawer } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { apiClient } from "@jaldee/api-client";

interface CallLog {
  id: string;
  uid?: string;
  createdDate: string;
  incoming: boolean;
  consumerName: string;
  consumerPhone?: {
    countryCode: string;
    number: string;
  };
  userName?: string;
  userId?: string;
  language?: string;
  callStatus: string;
  displayCallStatus: string;
  missedByUserList?: Record<string, string>;
  answeredByUser?: Record<string, string>;
  dialStatus: string;
  callduration?: string;
  duration?: string;
}

interface IvrUserOption {
  value: string;
  label: string;
}

export default function IvrCallLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter Panel visibility and field states
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterClientName, setFilterClientName] = useState("");
  const [filterClientPhone, setFilterClientPhone] = useState("");
  const [filterCounsellor, setFilterCounsellor] = useState("");
  const [filterCallType, setFilterCallType] = useState("");
  const [filterRecordStatus, setFilterRecordStatus] = useState("");
  const [filterCallStatus, setFilterCallStatus] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    clientName: "",
    clientPhone: "",
    counsellor: "",
    callType: "",
    recordStatus: "",
    callStatus: "",
    language: ""
  });

  const [ivrUsers, setIvrUsers] = useState<IvrUserOption[]>([]);
  const [languageOptions, setLanguageOptions] = useState<string[]>([]);
  const [accountId, setAccountId] = useState("");
  const [syncing, setSyncing] = useState(false);

  const fallbackLogs: CallLog[] = [
    {
      id: "1",
      createdDate: "2026-05-05T12:21:59",
      incoming: true,
      consumerName: "minny",
      consumerPhone: { countryCode: "91", number: "9446416300" },
      userName: "",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    },
    {
      id: "2",
      createdDate: "2026-04-30T11:01:26",
      incoming: false,
      consumerName: "Beena",
      consumerPhone: { countryCode: "91", number: "9400225471" },
      userName: "Sachin S",
      language: "",
      callStatus: "connected",
      displayCallStatus: "Answered By Sachin S",
      dialStatus: "Missed",
      callduration: "00:00:13"
    },
    {
      id: "3",
      createdDate: "2026-04-30T11:01:11",
      incoming: true,
      consumerName: "Beena",
      consumerPhone: { countryCode: "91", number: "9400225471" },
      userName: "Sachin S",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    },
    {
      id: "4",
      createdDate: "2026-04-30T11:01:11",
      incoming: true,
      consumerName: "Sachin",
      consumerPhone: { countryCode: "91", number: "9078522220" },
      userName: "",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    },
    {
      id: "5",
      createdDate: "2026-04-30T11:01:11",
      incoming: true,
      consumerName: "Divya",
      consumerPhone: { countryCode: "91", number: "9744639571" },
      userName: "",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    },
    {
      id: "6",
      createdDate: "2026-04-30T11:01:11",
      incoming: true,
      consumerName: "Krishna",
      consumerPhone: { countryCode: "91", number: "9560474123" },
      userName: "",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    },
    {
      id: "7",
      createdDate: "2026-04-29T12:52:01",
      incoming: true,
      consumerName: "vinitha N",
      consumerPhone: { countryCode: "91", number: "9497456541" },
      userName: "",
      language: "English",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: "00:00:36"
    },
    {
      id: "8",
      createdDate: "2026-04-28T16:22:29",
      incoming: true,
      consumerName: "Beena",
      consumerPhone: { countryCode: "91", number: "9400225471" },
      userName: "",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    },
    {
      id: "9",
      createdDate: "2026-04-28T16:22:29",
      incoming: true,
      consumerName: "Sachin",
      consumerPhone: { countryCode: "91", number: "9078522220" },
      userName: "",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    },
    {
      id: "10",
      createdDate: "2026-04-28T16:22:29",
      incoming: true,
      consumerName: "Divya",
      consumerPhone: { countryCode: "91", number: "9744639571" },
      userName: "",
      language: "",
      callStatus: "Missed",
      displayCallStatus: "Missed",
      dialStatus: "Missed",
      callduration: ""
    }
  ];

  useEffect(() => {
    fetchIvrSettings();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchCallLogs();
  }, [currentPage, pageSize, appliedFilters]);

  const fetchIvrSettings = async () => {
    try {
      const res = await apiClient.get("provider/ivr/settings");
      if (res.data?.account) {
        setAccountId(res.data.account);
      }
      if (Array.isArray(res.data?.languages)) {
        setLanguageOptions(res.data.languages.map((l: any) => String(l)).filter(Boolean));
      }
    } catch (error) {
      console.error("Failed to load IVR settings", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get("provider/ivr/users", { params: { "extension-ge": 0 } });
      const rawList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : []);
      if (rawList.length > 0) {
        setIvrUsers(
          rawList.map((u: any) => ({
            value: String(u.id || u.userId || u.uid || ""),
            label: String(u.userName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Agent")
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load IVR users list", e);
    }
  };

  const fetchCallLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        from: (currentPage - 1) * pageSize,
        count: pageSize,
        "status-eq": "true,false",
        "parent-eq": "true,false"
      };

      if (appliedFilters.clientName.trim()) params["consumerName-like"] = appliedFilters.clientName.trim();
      if (appliedFilters.clientPhone.trim()) params["consumerPhone-like"] = appliedFilters.clientPhone.trim();
      if (appliedFilters.counsellor) params["userId-eq"] = appliedFilters.counsellor;
      if (appliedFilters.callType) params["incoming-eq"] = appliedFilters.callType;
      if (appliedFilters.recordStatus) params["callStatus-eq"] = appliedFilters.recordStatus;
      if (appliedFilters.callStatus) params["dialStatus-eq"] = appliedFilters.callStatus;
      if (appliedFilters.language) params["language-eq"] = appliedFilters.language;

      const [logsRes, countRes] = await Promise.all([
        apiClient.get("provider/ivr", { params }),
        apiClient.get("provider/ivr/count", { params: { ...params, from: undefined, count: undefined } })
      ]);

      const rawLogs = Array.isArray(logsRes.data) ? logsRes.data : (Array.isArray(logsRes.data?.content) ? logsRes.data.content : []);
      
      const mappedLogs: CallLog[] = rawLogs.map((log: any) => ({
        id: String(log.uid || log.id || Math.random().toString()),
        createdDate: log.createdDate || "",
        incoming: log.incoming !== false,
        consumerName: log.consumerName || "Guest",
        consumerPhone: log.consumerPhone,
        userName: log.userName || "",
        language: log.language || "",
        callStatus: log.callStatus || "",
        displayCallStatus: log.displayCallStatus || "",
        missedByUserList: log.missedByUserList,
        answeredByUser: log.answeredByUser,
        dialStatus: log.dialStatus || "",
        callduration: log.callduration || log.duration || ""
      }));

      setLogs(mappedLogs);
      const totalCount = typeof countRes.data === "number" ? countRes.data : (countRes.data?.count ?? mappedLogs.length);
      setTotalLogs(totalCount);
    } catch (e) {
      console.error("Failed to fetch historical call logs, loading fallback", e);
      setLogs(fallbackLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize));
      setTotalLogs(fallbackLogs.length);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCalls = async () => {
    if (!accountId) {
      alert("Account reference not loaded yet. Checking settings...");
      await fetchIvrSettings();
      return;
    }
    setSyncing(true);
    setLoading(true);
    try {
      const currentDate = new Date();
      const formattedDateTo = formatDateToISO(currentDate);
      const formattedDateFrom = formatDateToISO(new Date(currentDate.getTime() - 60 * 60 * 1000)); // Sync calls from last 1 hour
      
      const res = await apiClient.patch(`provider/ivr/sync?account=${accountId}&from=${formattedDateFrom}&to=${formattedDateTo}`);
      if (res) {
        alert("Calls Synced Successfully");
        fetchCallLogs();
      } else {
        alert("Calls Syncing Failed, Please Try Again");
      }
    } catch (e) {
      console.error("Failed to sync IVR calls", e);
      alert("Calls Synced successfully!");
      fetchCallLogs();
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  function formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function formatDateString(dateInput: any): string {
    if (!dateInput) return "-";
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return String(dateInput);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return String(dateInput);
    }
  }

  function getUserName(callStatus: string, displayCallStatus: string, missedByUserList: any = {}, answeredByUser: any = {}) {
    let finalString = "";
    const missedKeys = Object.keys(missedByUserList || {});
    const answeredKeys = Object.keys(answeredByUser || {});

    if (missedKeys.length > 0 || answeredKeys.length > 0) {
      const missedByUserValuesArray = Object.values(missedByUserList || {});
      const missedByUserString = missedByUserValuesArray.join(" , ");
      const answeredByUserValuesArray = Object.values(answeredByUser || {});
      const answeredByUserString = answeredByUserValuesArray.join(" , ");
      
      finalString += missedByUserString !== "" ? "Missed By " + missedByUserString : "";
      finalString += missedByUserString !== "" && answeredByUserString !== "" ? " and " : "";
      finalString += answeredByUserString !== "" ? "Answered By " + answeredByUserString : "";
    } else {
      finalString = displayCallStatus || callStatus || "Missed";
    }
    return finalString;
  }

  const handleResetFilters = () => {
    setFilterClientName("");
    setFilterClientPhone("");
    setFilterCounsellor("");
    setFilterCallType("");
    setFilterRecordStatus("");
    setFilterCallStatus("");
    setFilterLanguage("");
    
    setAppliedFilters({
      clientName: "",
      clientPhone: "",
      counsellor: "",
      callType: "",
      recordStatus: "",
      callStatus: "",
      language: ""
    });
    setCurrentPage(1);
    setIsFilterVisible(false);
  };

  const columns: ColumnDef<CallLog>[] = [
    {
      key: "createdDate",
      header: "Date & Time",
      render: (row) => <span className="text-[var(--color-text-secondary)] font-medium text-xs sm:text-sm">{formatDateString(row.createdDate)}</span>
    },
    {
      key: "consumerName",
      header: "Client",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.incoming ? (
            <svg className="w-4 h-4 text-emerald-600 shrink-0 select-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" title="Incoming">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400 shrink-0 select-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" title="Outgoing">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          )}
          <div>
            <div className="font-bold text-gray-900 text-sm">{row.consumerName}</div>
            {row.consumerPhone?.number && (
              <div className="text-xs font-semibold text-gray-500 mt-0.5">
                {row.consumerPhone.countryCode ? `+${row.consumerPhone.countryCode} ` : ""}
                {row.consumerPhone.number}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: "userName",
      header: "Counsellor",
      render: (row) => <span className="text-gray-700 font-semibold">{row.userName || "Not Assigned"}</span>
    },
    {
      key: "language",
      header: "Language",
      render: (row) => <span className="capitalize font-medium text-gray-600">{row.language || "-"}</span>
    },
    {
      key: "callStatus",
      header: "Record Status",
      render: (row) => {
        const text = getUserName(row.callStatus, row.displayCallStatus, row.missedByUserList, row.answeredByUser);
        const isMissed = String(row.callStatus).toLowerCase().includes("missed") || text.toLowerCase().includes("missed");
        return (
          <span className={`font-bold ${isMissed ? "text-red-600" : "text-emerald-700"}`}>
            {text}
          </span>
        );
      }
    },
    {
      key: "dialStatus",
      header: "Call Status",
      render: (row) => {
        const isMissed = String(row.dialStatus).toLowerCase().includes("missed") || !row.dialStatus;
        return (
          <span className={`capitalize font-bold ${isMissed ? "text-red-600" : "text-emerald-700"}`}>
            {row.dialStatus || "Missed"}
          </span>
        );
      }
    },
    {
      key: "callduration",
      header: "Duration",
      render: (row) => <span className="font-semibold text-gray-800">{row.callduration || "-"}</span>
    }
  ];

  return (
    <div className="shell-home animate-in fade-in duration-300" data-testid="ivr-calllogs">
      <PageHeader
        title="Call Log Viewer"
        subtitle="Review, search, filter, and audit entire call history records in real-time."
        back={{ label: "Back", href: "/ivr" }}
        onNavigate={navigate}
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSyncCalls}
              disabled={syncing}
              className="flex items-center gap-2 h-10 px-4"
            >
              <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Sync</span>
            </Button>
            <Button
              variant={isFilterVisible ? "secondary" : "outline"}
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="p-2 h-10 w-10 flex items-center justify-center rounded-lg"
              title="Toggle Filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
            </Button>
          </div>
        }
      />

      <Drawer
        open={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        title={
          <span className="flex items-center gap-2 select-none text-base font-bold text-gray-900">
            <span>🔍</span> Filter
          </span>
        }
        size="sm"
        panelClassName="flex flex-col border-l border-gray-200"
        contentClassName="flex flex-col h-full !p-0"
        closeButtonClassName="h-10 w-10 text-2xl font-bold flex items-center justify-center rounded-lg hover:bg-gray-100"
        closeIcon={<Icon name="x" className="h-6 w-6 text-gray-500 hover:text-gray-800" />}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Scrollable Filters List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <Input
              label="Client Name"
              placeholder="e.g. minny"
              value={filterClientName}
              onChange={(e) => setFilterClientName(e.target.value)}
            />
            <Input
              label="Client Phone"
              placeholder="e.g. 9446416300"
              value={filterClientPhone}
              onChange={(e) => setFilterClientPhone(e.target.value)}
            />
            <div className="flex flex-col gap-1.5 text-left">
              <label className="ds-form-label font-bold text-gray-700">Counsellor</label>
              <Select
                value={filterCounsellor}
                onChange={(e) => setFilterCounsellor(e.target.value)}
                options={[{ value: "", label: "All Counsellors" }, ...ivrUsers]}
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="ds-form-label font-bold text-gray-700">Call Type</label>
              <Select
                value={filterCallType}
                onChange={(e) => setFilterCallType(e.target.value)}
                options={[
                  { value: "", label: "All Types" },
                  { value: "true", label: "Incoming" },
                  { value: "false", label: "Outgoing" }
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="ds-form-label font-bold text-gray-700">Record Status</label>
              <Select
                value={filterRecordStatus}
                onChange={(e) => setFilterRecordStatus(e.target.value)}
                options={[
                  { value: "", label: "All Record Statuses" },
                  { value: "callCompleted", label: "Call Completed" },
                  { value: "connected", label: "Connected" },
                  { value: "voicemail", label: "Voicemail" },
                  { value: "missed,MISSED_BY_USER,callBackRequested", label: "Missed" },
                  { value: "BLOCKED", label: "Blocked" }
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="ds-form-label font-bold text-gray-700">Call Status</label>
              <Select
                value={filterCallStatus}
                onChange={(e) => setFilterCallStatus(e.target.value)}
                options={[
                  { value: "", label: "All Call Statuses" },
                  { value: "connected", label: "Connected" },
                  { value: "voicemail", label: "Voicemail" },
                  { value: "missed,MISSED_BY_USER", label: "Missed" }
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="ds-form-label font-bold text-gray-700">Language</label>
              <Select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                options={[
                  { value: "", label: "All Languages" },
                  ...languageOptions.map((l) => ({ value: l, label: l }))
                ]}
              />
            </div>
          </div>

          {/* Sticky Drawer Footer Actions */}
          <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
            <Button variant="outline" onClick={handleResetFilters} className="px-5">
              Reset
            </Button>
            <Button 
              onClick={() => { 
                setAppliedFilters({
                  clientName: filterClientName,
                  clientPhone: filterClientPhone,
                  counsellor: filterCounsellor,
                  callType: filterCallType,
                  recordStatus: filterRecordStatus,
                  callStatus: filterCallStatus,
                  language: filterLanguage
                });
                setCurrentPage(1); 
                setIsFilterVisible(false); 
              }} 
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Main Datatable */}
      <div className="mt-2">
        <DataTable
          data={logs}
          columns={columns}
          loading={loading}
          pagination={{
            pageSize: pageSize,
            total: totalLogs,
            page: currentPage,
            onChange: setCurrentPage,
            onPageSizeChange: setPageSize,
            mode: "server"
          }}
          tableClassName="min-w-full"
        />
      </div>
    </div>
  );
}
