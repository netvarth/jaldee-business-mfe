import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@jaldee/api-client";
import { Button, ChartTooltip, Dialog, Icon, Input, MultiCombobox, PageHeader, Popover, Select } from "@jaldee/design-system";

interface Call {
  id: string;
  phone: string;
  customerName: string;
  time: string;
  status: string;
  assignedTo: string;
  duration?: string;
  remarks?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastCall: string;
  status: "ACTIVE" | "DISABLE";
}

interface Schedule {
  id: string;
  name: string;
  phone: string;
  time: string;
  reason: string;
  status: string;
}

interface IvrLanguageUser {
  userId: string;
  userName: string;
  phone: string;
  languages: string[];
}

type ChartTooltipState = {
  x: number;
  y: number;
  label: string;
  series: string;
  value: number | string;
  color: string;
};

export default function IvrPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("Agent");

  // Metrics
  const [todayReceived, setTodayReceived] = useState(0);
  const [todayPicked, setTodayPicked] = useState(0);
  const [allReceived, setAllReceived] = useState(0);
  const [tillPicked, setTillPicked] = useState(0);

  // Timers & Polling
  const [refreshSeconds, setRefreshSeconds] = useState(0);

  // Split Queue States
  const [myQueue, setMyQueue] = useState<Call[]>([]);
  const [callbacks, setCallbacks] = useState<Call[]>([]);
  const [history, setHistory] = useState<Call[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [callbacksCount, setCallbacksCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [callPage, setCallPage] = useState(1);
  const callPageSize = 5;

  const [loadingCrm, setLoadingCrm] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "callbacks" | "history">("queue");
  const [crmTab, setCrmTab] = useState<"ACTIVE" | "DISABLE">("ACTIVE");
  const [crmSearch, setCrmSearch] = useState("");
  const [crmPage, setCrmPage] = useState(1);
  const crmPageSize = 5;
  const [callDateRange, setCallDateRange] = useState<"LAST_WEEK" | "LAST_MONTH" | "CUSTOM_RANGE">("LAST_MONTH");
  const [customCallStartDate, setCustomCallStartDate] = useState(() => formatDatePart(new Date()));
  const [customCallEndDate, setCustomCallEndDate] = useState(() => formatDatePart(new Date()));

  // Modals state
  const [showHelpline, setShowHelpline] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const [ivrLanguageUsers, setIvrLanguageUsers] = useState<IvrLanguageUser[]>([]);
  const [ivrLanguageOptions, setIvrLanguageOptions] = useState<string[]>(["English", "Hindi", "Telugu", "Gujarati"]);
  const [ivrLanguageSearch, setIvrLanguageSearch] = useState("");
  const [ivrLanguageFilter, setIvrLanguageFilter] = useState("");
  const [ivrLanguagePage, setIvrLanguagePage] = useState(1);
  const [ivrLanguageTotal, setIvrLanguageTotal] = useState(0);
  const [ivrLanguageLoading, setIvrLanguageLoading] = useState(false);
  const ivrLanguageRows = 10;

  // Charts data
  const [langChartData, setLangChartData] = useState<any>(null);
  const [lineChartData, setLineChartData] = useState<any>(null);
  const [languageTooltip, setLanguageTooltip] = useState<ChartTooltipState | null>(null);
  const [analyticsTooltip, setAnalyticsTooltip] = useState<ChartTooltipState | null>(null);
  const [selectedGraphDate, setSelectedGraphDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    fetchSessionUser();
    refreshAllData();

    const pollId = setInterval(refreshAllData, 600000);
    const timerId = setInterval(() => {
      setRefreshSeconds(s => s + 1);
    }, 1000);

    // Set isInitialMount to false at the end of initial mount
    isInitialMount.current = false;

    return () => {
      clearInterval(pollId);
      clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    fetchLanguageGraph(selectedGraphDate);
  }, [selectedGraphDate]);

  useEffect(() => {
    setCrmPage(1);
  }, [crmSearch, crmTab]);

  useEffect(() => {
    setCallPage(1);
  }, [activeTab]);

  const parseCount = (res: any) => {
    if (!res) return 0;
    if (typeof res === 'number') return res;
    if (typeof res === 'object') return res.count ?? res.total ?? res.data ?? 0;
    return Number(res) || 0;
  };

  const fetchAllCounts = async () => {
    const dateFilters = getCallDateFilter(callDateRange, customCallStartDate, customCallEndDate);
    try {
      const qRes = await apiClient.get("provider/ivr/count", {
        params: { ...dateFilters, "callStatus-neq": "callCompleted", "userId-neq": "null" }
      });
      setQueueCount(parseCount(qRes.data));
    } catch (e) { console.error(e); }

    try {
      const cRes = await apiClient.get("provider/ivr/count", {
        params: { ...dateFilters, "callStatus-neq": "callCompleted,connected", "userId-eq": "null" }
      });
      setCallbacksCount(parseCount(cRes.data));
    } catch (e) { console.error(e); }

    try {
      const hRes = await apiClient.get("provider/ivr/count", {
        params: { ...dateFilters, "callStatus-eq": "callCompleted" }
      });
      setHistoryCount(parseCount(hRes.data));
    } catch (e) { console.error(e); }
  };

  // Handle Date Filter Changes (requires updating all counts + current active queue)
  useEffect(() => {
    if (isInitialMount.current) return;
    fetchAllCounts();
    if (activeTab === "queue") {
      fetchQueue();
    } else if (activeTab === "callbacks") {
      fetchCallbacks();
    } else if (activeTab === "history") {
      fetchHistory();
    }
  }, [callDateRange, customCallStartDate, customCallEndDate]);

  // Handle Tab Changes (only loads active queue, NO counts refetched!)
  useEffect(() => {
    if (isInitialMount.current) return;
    if (activeTab === "queue") {
      fetchQueue();
    } else if (activeTab === "callbacks") {
      fetchCallbacks();
    } else if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!showLanguages) return;
    fetchIvrLanguageOptions();
    fetchIvrLanguageUsers(1);
  }, [showLanguages]);

  useEffect(() => {
    if (!showLanguages) return;
    fetchIvrLanguageUsers(1);
  }, [ivrLanguageFilter]);


  const refreshAllData = () => {
    setRefreshSeconds(0);
    fetchAnalyticsMetrics();
    fetchAllCounts();
    if (activeTab === "queue") {
      fetchQueue();
    } else if (activeTab === "callbacks") {
      fetchCallbacks();
    } else if (activeTab === "history") {
      fetchHistory();
    }
    fetchSchedules();
    fetchCustomers();
    fetchAvailability();
    fetchLineGraph();
  };

  const formatDateTime = (dateInput: any) => {
    if (!dateInput) return "Recently";
    try {
      const d = new Date(dateInput);
      return isNaN(d.getTime()) ? String(dateInput) : d.toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return String(dateInput);
    }
  };

  const formatText = (value: any, fallback = "") => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "object") {
      if ("countryCode" in value || "number" in value) return formatPhone(value);
      if ("name" in value) return formatText(value.name, fallback);
      if ("label" in value) return formatText(value.label, fallback);
    }
    return fallback;
  };

  const formatPhone = (phoneData: any): string => {
    if (!phoneData) return "Unknown";
    if (typeof phoneData === 'string') return phoneData;
    if (typeof phoneData === 'object' && phoneData.number) {
      const countryCode = formatText(phoneData.countryCode);
      const number = formatText(phoneData.number);
      return countryCode ? `${countryCode} ${number}` : number;
    }
    return formatText(phoneData, "Unknown");
  };

  const mapCalls = (data: any) => {
    const rows = toArray(data);
    return rows.map((c: any) => ({
      id: c.uid || c.id || Math.random().toString(),
      phone: formatPhone(c.phone || c.phoneNumber || c.consumerPhone),
      customerName: formatText(c.customerName || c.consumerName || c.userName, "Guest"),
      time: c.createdDate ? formatDateTime(c.createdDate) : "Recently",
      status: formatText(c.callStatus, "connected"),
      assignedTo: formatText(c.userName, c.userId ? "Operator" : "Unassigned"),
      duration: formatText(c.duration || c.callDuration || c.totalDuration),
      remarks: formatText(c.notes)
    }));
  };

  const fetchSessionUser = async () => {
    try {
      const res = await apiClient.get("provider/user");
      const usersList = res.data;
      if (Array.isArray(usersList) && usersList.length > 0) {
        setUserId(usersList[0]?.id || "");
        setUserName(`${usersList[0]?.firstName || "Agent"} ${usersList[0]?.lastName || ""}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalyticsMetrics = async () => {
    try {
      const res = await apiClient.get("provider/ivr/analytics/count");
      if (res.data) {
        setTodayReceived(res.data.todayRecievedCalls || 0);
        setTodayPicked(res.data.todayPickedCalls || 0);
        setAllReceived(res.data.recievedCalls || 0);
        setTillPicked(res.data.pickedCalls || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQueue = async () => {
    setLoadingCalls(true);
    try {
      const res = await apiClient.get("provider/ivr", {
        params: {
          ...getCallDateFilter(callDateRange, customCallStartDate, customCallEndDate),
          from: 0,
          count: 5,
          "callStatus-neq": "callCompleted",
          "userId-neq": "null"
        }
      });
      setMyQueue(mapCalls(res.data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCalls(false);
    }
  };

  const fetchCallbacks = async () => {
    try {
      const res = await apiClient.get("provider/ivr", {
        params: {
          ...getCallDateFilter(callDateRange, customCallStartDate, customCallEndDate),
          from: 0,
          count: 5,
          "callStatus-neq": "callCompleted,connected",
          "userId-eq": "null"
        }
      });
      setCallbacks(mapCalls(res.data));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get("provider/ivr", {
        params: {
          ...getCallDateFilter(callDateRange, customCallStartDate, customCallEndDate),
          from: 0,
          count: 5,
          "callStatus-eq": "callCompleted"
        }
      });
      setHistory(mapCalls(res.data));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIvrLanguageOptions = async () => {
    try {
      const res = await apiClient.get("provider/ivr/settings");
      const languages = Array.isArray(res.data?.languages) ? res.data.languages : [];
      if (languages.length) {
        setIvrLanguageOptions(languages.map((language: any) => formatText(language)).filter(Boolean));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getIvrLanguageFilter = (page: number) => {
    const filter: Record<string, string | number> = {
      "extension-ge": 0,
      from: (page - 1) * ivrLanguageRows,
      count: ivrLanguageRows
    };
    if (ivrLanguageSearch.trim()) filter["userName-like"] = ivrLanguageSearch.trim();
    if (ivrLanguageFilter) filter["languages-eq"] = ivrLanguageFilter;
    return filter;
  };

  const fetchIvrLanguageUsers = async (page = ivrLanguagePage) => {
    setIvrLanguageLoading(true);
    const nextPage = Math.max(1, page);
    const params = getIvrLanguageFilter(nextPage);
    try {
      const [usersRes, countRes] = await Promise.all([
        apiClient.get("provider/ivr/users", { params }),
        apiClient.get("provider/ivr/users/count", { params: { ...params, from: undefined, count: undefined } })
      ]);
      const rows = toArray(usersRes.data).map((user: any) => ({
        userId: formatText(user.userId || user.id || user.uid),
        userName: formatText(user.userName || `${formatText(user.firstName)} ${formatText(user.lastName)}`.trim(), "User"),
        phone: formatPhone(user.phone || user.phoneNo || user.phoneNumber),
        languages: Array.isArray(user.languages) ? user.languages.map((language: any) => formatText(language)).filter(Boolean) : []
      }));
      setIvrLanguageUsers(rows);
      setIvrLanguageTotal(parseCount(countRes.data) || rows.length);
      setIvrLanguagePage(nextPage);
    } catch (error) {
      console.error(error);
    } finally {
      setIvrLanguageLoading(false);
    }
  };

  const handleIvrUserLanguageChange = async (targetUserId: string, languages: string[]) => {
    setIvrLanguageUsers((users) => users.map((user) => user.userId === targetUserId ? { ...user, languages } : user));
    try {
      await apiClient.put(`provider/ivr/users/${targetUserId}`, { languages });
    } catch (error) {
      console.error(error);
      fetchIvrLanguageUsers(ivrLanguagePage);
    }
  };

  const fetchLineGraph = async () => {
    try {
      const res = await apiClient.put("provider/ivr/graph", { category: "WEEKLY" });
      setLineChartData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLanguageGraph = async (date: string) => {
    try {
      let langs = [];
      try {
        const settingsRes = await apiClient.get("provider/ivr/settings");
        langs = settingsRes.data?.languages || [];
      } catch(err) {
        console.error("Failed to fetch settings for languages", err);
      }

      const res = await apiClient.put("provider/ivr/language/graph", { 
        startDate: date,
        interval: 1,
        languages: langs
      });
      setLangChartData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileImport = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("files", file, file.name);
    try {
      await apiClient.post("provider/dataimport/IvrCalls/migrate/direct", formData);
      alert("File imported successfully");
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert("Failed to import file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fetchSchedules = async () => {
    try {
      const res = await apiClient.get("provider/schedule");
      if (Array.isArray(res.data)) {
        const mapped: Schedule[] = res.data.map((s: any) => ({
          id: s.id || Math.random().toString(),
          name: formatText(s.name || s.customerName, "Schedule appointment"),
          phone: formatPhone(s.phone || s.phoneNumber),
          time: formatText(s.timeSlot || s.createdDate, "Scheduled slot"),
          reason: formatText(s.notes || s.reason, "General inquiries"),
          status: formatText(s.state, "pending")
        }));
        setSchedules(mapped);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCrm(true);
    try {
      const res = await apiClient.get("provider/customers");
      const customersList = res.data?.customers || res.data;
      if (Array.isArray(customersList)) {
        const mapped: Customer[] = customersList.map((cust: any) => ({
          id: cust.id || cust.uid || Math.random().toString(),
          name: `${formatText(cust.firstName)} ${formatText(cust.lastName)}`.trim() || "Valued Customer",
          phone: formatPhone(cust.phoneNo || cust.phoneNumber || cust.phone),
          email: formatText(cust.email, "No Email"),
          lastCall: formatText(cust.lastContactedDate, "None"),
          status: cust.status || "ACTIVE"
        }));
        setCustomers(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCrm(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await apiClient.get("provider/ivr/user/availability");
      if (res.data) setIsAvailable(res.data === "Available");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAvailableToggle = async () => {
    const nextState = !isAvailable;
    setIsAvailable(nextState);
    try {
      if (userId) {
        await apiClient.put(`provider/ivr/users/${userId}/${nextState ? "Available" : "Unavailable"}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = async (callId: string, action: string) => {
    try {
      if (action === "complete") {
        await apiClient.put(`provider/ivr/status/${callId}/callCompleted`);
        refreshAllData();
      } else if (action === "assign") {
        await apiClient.put("provider/ivr/assign", { callUid: callId });
        refreshAllData();
      } else if (action === "block") {
        await apiClient.put(`provider/customers/${callId}/changeStatus/DISABLE`);
        fetchCustomers();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to complete action.");
    }
  };

  const displayedCrm = customers.filter(cust => 
    cust.status === crmTab && 
    (cust.name.toLowerCase().includes(crmSearch.toLowerCase()) || cust.phone.includes(crmSearch))
  );
  const activeCalls = activeTab === "queue" ? myQueue : activeTab === "callbacks" ? callbacks : history;
  const callTotalPages = Math.max(1, Math.ceil(activeCalls.length / callPageSize));
  const normalizedCallPage = Math.min(callPage, callTotalPages);
  const callStart = activeCalls.length === 0 ? 0 : (normalizedCallPage - 1) * callPageSize + 1;
  const callEnd = Math.min(normalizedCallPage * callPageSize, activeCalls.length);
  const paginatedCalls = activeCalls.slice((normalizedCallPage - 1) * callPageSize, normalizedCallPage * callPageSize);
  const crmTotalPages = Math.max(1, Math.ceil(displayedCrm.length / crmPageSize));
  const normalizedCrmPage = Math.min(crmPage, crmTotalPages);
  const crmStart = displayedCrm.length === 0 ? 0 : (normalizedCrmPage - 1) * crmPageSize + 1;
  const crmEnd = Math.min(normalizedCrmPage * crmPageSize, displayedCrm.length);
  const paginatedCrm = displayedCrm.slice((normalizedCrmPage - 1) * crmPageSize, normalizedCrmPage * crmPageSize);

  const formatTimeText = (seconds: number) => {
    if (seconds < 60) return `Last Updated ${seconds} seconds ago`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `Last Updated ${m} min ${s} sec ago`;
  };

  const formatStatus = (status: string) => {
    return status
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const renderLineChart = () => {
    const chart = normalizeChartData(lineChartData, ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday"]);
    const labels = chart.labels;
    const maxValue = Math.max(1, ...chart.datasets.flatMap((dataset) => dataset.data));
    const pointsFor = (data: number[]) =>
      labels
        .map((_, index) => {
          const x = labels.length === 1 ? 50 : (index / (labels.length - 1)) * 100;
          const y = 100 - ((data[index] || 0) / maxValue) * 100;
          return `${x},${y}`;
        })
        .join(" ");

    return (
      <div className="relative h-40 ml-4 mb-8 pr-2">
        {analyticsTooltip ? <ChartTooltip {...analyticsTooltip} /> : null}
        <div className="absolute top-0 -left-6 text-xs text-gray-400">{maxValue}</div>
        <div className="absolute top-1/2 -left-6 text-xs text-gray-400">{Math.ceil(maxValue / 2)}</div>
        <div className="absolute bottom-0 -left-6 text-xs text-gray-400">0</div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible border-l border-b border-gray-200">
          {[0, 50, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#EBEDEF" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          ))}
          {chart.datasets.map((dataset) => (
            <polyline
              key={dataset.label}
              fill="none"
              points={pointsFor(dataset.data)}
              stroke={dataset.color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {chart.datasets.map((dataset) =>
            dataset.data.map((value, index) => {
              const x = labels.length === 1 ? 50 : (index / (labels.length - 1)) * 100;
              const y = 100 - ((value || 0) / maxValue) * 100;
              return (
                <circle
                  key={`${dataset.label}-${index}`}
                  cx={x}
                  cy={y}
                  r="1.8"
                  fill={dataset.color}
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={() =>
                    setAnalyticsTooltip({
                      x,
                      y,
                      label: String(labels[index]),
                      series: dataset.label,
                      value,
                      color: dataset.color
                    })
                  }
                  onMouseLeave={() => setAnalyticsTooltip(null)}
                />
              );
            })
          )}
        </svg>
        <div className="absolute -bottom-7 left-0 right-0 flex justify-between">
          {labels.map((day: string, idx: number) => (
            <span key={`${day}-${idx}`} className="text-xs text-gray-500">
              {String(day).substring(0, 3)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    const chart = normalizeLanguageChartData(langChartData);
    const maxValue = Math.max(
      1,
      ...chart.labels.map((_, index) => chart.datasets.reduce((sum, dataset) => sum + (dataset.data[index] || 0), 0))
    );
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {chart.datasets.map((dataset) => (
            <span key={dataset.label} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <span className="h-2 w-8 rounded-sm" style={{ backgroundColor: dataset.color }} />
              {dataset.label}
            </span>
          ))}
        </div>
      <div className="relative ml-4">
      {languageTooltip ? <ChartTooltip {...languageTooltip} /> : null}
      <div className="relative h-52 border-l border-b border-gray-200">
        <div className="absolute top-0 -left-6 text-xs text-gray-400">{maxValue}</div>
        <div className="absolute top-1/2 -left-6 text-xs text-gray-400">{Math.ceil(maxValue / 2)}</div>
        <div className="absolute bottom-0 -left-6 text-xs text-gray-400">0</div>
        <div className="absolute bottom-0 left-0 w-full h-full flex items-end justify-between px-2">
          {chart.labels.map((label, i) => {
            const total = chart.datasets.reduce((sum, dataset) => sum + (dataset.data[i] || 0), 0);
            const height = total > 0 ? Math.max(8, (total / maxValue) * 100) : 0;
            return (
              <div key={`${label}-${i}`} className="relative flex h-full w-[3%] min-w-3 items-end justify-center">
                <div className="w-full overflow-hidden rounded-t-sm" style={{ height: `${height}%` }}>
                  {chart.datasets.map((dataset) => {
                    const value = dataset.data[i] || 0;
                  if (!value || !total) return null;
                  const x = ((i + 0.5) / chart.labels.length) * 100;
                  return (
                    <div
                      key={dataset.label}
                      onMouseEnter={() =>
                        setLanguageTooltip({
                          x,
                          y: Math.max(8, 100 - height),
                          label: String(label),
                          series: dataset.label,
                          value,
                          color: dataset.color
                        })
                      }
                      onMouseLeave={() => setLanguageTooltip(null)}
                      style={{
                        height: `${(value / total) * 100}%`,
                        backgroundColor: dataset.color
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="relative h-20 px-2">
        <div className="absolute left-0 right-0 top-4 flex justify-between">
          {chart.labels.map((label, i) => (
            <span
              key={`${label}-${i}-axis`}
              className="w-[3%] min-w-3 origin-top-left rotate-[28deg] whitespace-nowrap text-xs text-gray-400"
            >
              {i % 2 === 0 ? label : ""}
            </span>
          ))}
        </div>
      </div>
      </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen" data-testid="ivr-dashboard">
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeader
          title={`Welcome back, ${userName}`}
          subtitle={`Today: ${todayReceived} Received, ${todayPicked} Picked | Till Date: ${allReceived} Received, ${tillPicked} Picked`}
          actions={
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
              <span className="text-green-700 font-bold text-xs sm:text-sm flex items-center gap-1 select-none">
                <span>🌟</span>
                <span>Available For Calls</span>
              </span>
              <button 
                onClick={handleAvailableToggle} 
                className={`w-10 h-5 rounded-full p-0.5 transition-colors relative outline-none ${isAvailable ? "bg-green-500" : "bg-gray-300"}`}
                title="Toggle Availability"
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-all ${isAvailable ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          }
        />

        <div className="flex flex-wrap gap-3">
          <button onClick={() => window.open("https://jaldeeuiscale.s3.ap-south-1.amazonaws.com/ivr/ivr-helpline.jpg", "_blank")} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold rounded shadow-sm">Helpline</button>
          <button onClick={() => navigate("/ivr/schedules")} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold rounded shadow-sm">IVR Schedules</button>
          <button onClick={() => setShowLanguages(true)} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold rounded shadow-sm">IVR Language</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-gray-800">Language Availability Analytics</h3>
              <div className="w-[220px]">
                <Input type="date" value={selectedGraphDate} onChange={(e) => setSelectedGraphDate(e.target.value)} />
              </div>
            </div>
            {renderBarChart()}
          </div>

          <div className="bg-white border border-gray-200 rounded p-4">
             <div className="text-center mb-6">
                <h3 className="text-base font-bold text-gray-800">Analytics</h3>
                <div className="flex justify-center gap-4 text-sm font-medium text-gray-500 mt-2">
                  <span className="flex items-center gap-1"><span className="w-4 h-2 bg-blue-400"></span> Answered Calls</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-2 bg-red-400"></span> Missed Call</span>
                </div>
             </div>
             {renderLineChart()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="hidden">
             <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 [&>button[aria-label]]:hidden">
                   <Button variant="outline" size="sm" iconOnly aria-label="Assign user"><span className="text-base leading-none">▣</span></Button>
                   <Button variant="outline" size="sm" iconOnly aria-label="Import XLSX" onClick={() => fileInputRef.current?.click()}><span className="text-base leading-none">⇧</span></Button>
                   <Button variant="outline" size="sm" iconOnly aria-label="Filter calls"><span className="text-base leading-none">▼</span></Button>
                   <h3 className="text-base font-bold text-slate-800">Calls</h3>
                   <Button variant="outline" size="sm" onClick={refreshAllData} icon={<Icon name="refresh" className="h-3.5 w-3.5" />} className="rounded-full border-green-500 text-green-600 hover:bg-green-50">
                     <span>↻</span> Refresh
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 [&>button:not(.ds-action)]:hidden">
                   <Button className="ds-action" variant="outline" size="sm" iconOnly aria-label="Assign user"><span className="text-base leading-none">▣</span></Button>
                   <Button className="ds-action" variant="outline" size="sm" iconOnly aria-label="Import XLSX" onClick={() => fileInputRef.current?.click()}><span className="text-base leading-none">⇧</span></Button>
                   <Button className="ds-action" variant="outline" size="sm" iconOnly aria-label="Filter calls"><span className="text-base leading-none">▼</span></Button>
                   <button className="p-1.5 border border-blue-700 rounded text-blue-700 hover:bg-slate-50"><span className="text-xs block font-bold leading-none">👤</span></button>
                   <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx" className="hidden" />
                   <button onClick={() => fileInputRef.current?.click()} className="p-1.5 border border-blue-700 rounded text-blue-700 hover:bg-slate-50" title="Import XLSX"><span className="text-xs block font-bold leading-none">📥</span></button>
                   <button className="p-1.5 border border-blue-700 rounded text-blue-700 hover:bg-slate-50"><span className="text-xs block font-bold leading-none">▼</span></button>
                   <Select
                     value="lastMonth"
                     onChange={() => undefined}
                     options={[
                       { value: "last7Days", label: "Last 7 Days" },
                       { value: "lastMonth", label: "Last Month" }
                     ]}
                     fullWidth={false}
                     className="min-w-[150px] border-blue-700 text-blue-800"
                   />
                </div>
             </div>
             <p className="text-sm text-gray-400 mb-4">{formatTimeText(refreshSeconds)}</p>

             <div className="border-b border-gray-200 flex gap-6 text-sm font-semibold text-gray-500 px-2">
                <button onClick={() => setActiveTab("queue")} className={`pb-2 border-b-2 flex gap-1 ${activeTab === "queue" ? "border-blue-700 text-blue-700" : "border-transparent"}`}><span>👤</span> My Queue({myQueue.length})</button>
                <button onClick={() => setActiveTab("callbacks")} className={`pb-2 border-b-2 flex gap-1 ${activeTab === "callbacks" ? "border-blue-700 text-blue-700" : "border-transparent"}`}><span>📞</span> CallBacks({callbacks.length})</button>
                <button onClick={() => setActiveTab("history")} className={`pb-2 border-b-2 flex gap-1 ${activeTab === "history" ? "border-blue-700 text-blue-700" : "border-transparent"}`}><span>🕒</span> Call History({history.length})</button>
             </div>

             <div className="min-h-[260px] divide-y divide-gray-100 text-sm">
                {loadingCalls ? <p className="py-10 text-center text-gray-500">Loading...</p> : activeCalls.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 font-medium">No calls found.</div>
                ) : (
                  paginatedCalls.map(c => (
                    <div key={c.id} className="flex items-start justify-between gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <p className="font-semibold text-slate-700">{c.customerName}</p>
                          <p className="font-semibold text-slate-900">{c.phone}</p>
                        </div>
                        <p className="mt-2 font-semibold text-slate-900">{c.time}</p>
                      </div>
                      <div className="min-w-[150px] text-left">
                        <p className="font-semibold text-blue-700">{c.assignedTo}</p>
                        <p className="mt-1 font-semibold text-green-700">{formatStatus(c.status)}</p>
                        {c.duration ? <p className="mt-1 font-semibold text-slate-900">{c.duration}</p> : null}
                      </div>
                      <Popover
                        align="end"
                        portal
                        contentClassName="w-36 p-1"
                        trigger={
                          <Button variant="ghost" size="sm" iconOnly aria-label={`Actions for ${c.customerName}`}>
                            <span className="text-lg leading-none">⋮</span>
                          </Button>
                        }
                      >
                        <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">View</button>
                        <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Call Log</button>
                        <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Labels</button>
                        <button onClick={() => handleAction(c.id, "block")} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Block</button>
                      </Popover>
                    </div>
                  ))
                )}
             </div>

             <div className="border-t border-gray-200 pt-4 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {callStart} to {callEnd} of {activeCalls.length} calls</span>
                <div className="flex items-center gap-1 [&>span]:hidden">
                  <button disabled={normalizedCallPage === 1} onClick={() => setCallPage(1)} className="px-2 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">«</button>
                  <button disabled={normalizedCallPage === 1} onClick={() => setCallPage((page) => Math.max(1, page - 1))} className="px-2 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">‹</button>
                  {Array.from({ length: Math.min(5, callTotalPages) }, (_, index) => {
                    const page = index + Math.max(1, Math.min(normalizedCallPage - 2, callTotalPages - 4));
                    return (
                      <button
                        key={page}
                        onClick={() => setCallPage(page)}
                        className={`h-8 w-8 rounded-full font-semibold ${normalizedCallPage === page ? "bg-indigo-100 text-indigo-800" : "text-gray-600 hover:bg-gray-100"}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button disabled={normalizedCallPage === callTotalPages} onClick={() => setCallPage((page) => Math.min(callTotalPages, page + 1))} className="px-2 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">›</button>
                  <button disabled={normalizedCallPage === callTotalPages} onClick={() => setCallPage(callTotalPages)} className="px-2 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">»</button>
                  <Select value={String(callPageSize)} onChange={() => undefined} options={[{ value: "5", label: "5" }]} fullWidth={false} disabled className="ml-2 w-16" />
                  <span className="text-gray-300">«</span><span className="text-gray-300">‹</span><span className="text-gray-300">›</span><span className="text-gray-300">»</span>
                </div>
             </div>
          </div>
          <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                   <h3 className="text-base font-bold text-slate-800">Calls</h3>
                   <button onClick={refreshAllData} className="text-sm text-green-500 border border-green-500 rounded-full px-2 py-0.5 flex items-center gap-1 hover:bg-green-50">
                     <span>↻</span> Refresh
                   </button>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-1.5 border border-blue-700 rounded text-blue-700 hover:bg-slate-50"><span className="text-xs block font-bold leading-none">▣</span></button>
                   <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx" className="hidden" />
                   <button onClick={() => fileInputRef.current?.click()} className="p-1.5 border border-blue-700 rounded text-blue-700 hover:bg-slate-50" title="Import XLSX"><span className="text-xs block font-bold leading-none">⇧</span></button>
                   <button className="p-1.5 border border-blue-700 rounded text-blue-700 hover:bg-slate-50"><span className="text-xs block font-bold leading-none">▼</span></button>
                   <select value={callDateRange} onChange={(event) => setCallDateRange(event.target.value as "LAST_WEEK" | "LAST_MONTH" | "CUSTOM_RANGE")} className="border border-blue-700 text-blue-700 text-sm font-semibold rounded px-2 py-1 outline-none ml-2">
                     <option value="LAST_WEEK">Last 7 Days</option>
                     <option value="LAST_MONTH">Last Month</option>
                     <option value="CUSTOM_RANGE">Date Range</option>
                   </select>
                </div>
             </div>
             <p className="text-sm text-gray-400 mb-4">{formatTimeText(refreshSeconds)}</p>
             {callDateRange === "CUSTOM_RANGE" ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <div className="w-[220px]">
                    <Input type="date" value={customCallStartDate} onChange={(event) => setCustomCallStartDate(event.target.value)} />
                  </div>
                  <span className="text-gray-400">to</span>
                  <div className="w-[220px]">
                    <Input type="date" value={customCallEndDate} onChange={(event) => setCustomCallEndDate(event.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="border-b border-gray-200 flex gap-6 text-sm font-semibold text-gray-500 px-2">
                 <button onClick={() => setActiveTab("queue")} className={`pb-2 border-b-2 flex gap-1 ${activeTab === "queue" ? "border-blue-700 text-blue-700" : "border-transparent"}`}>My Queue({queueCount})</button>
                 <button onClick={() => setActiveTab("callbacks")} className={`pb-2 border-b-2 flex gap-1 ${activeTab === "callbacks" ? "border-blue-700 text-blue-700" : "border-transparent"}`}>CallBacks({callbacksCount})</button>
                 <button onClick={() => setActiveTab("history")} className={`pb-2 border-b-2 flex gap-1 ${activeTab === "history" ? "border-blue-700 text-blue-700" : "border-transparent"}`}>Call History({historyCount})</button>
              </div>

             <div className="border-b border-gray-200 flex gap-6 text-sm font-semibold text-gray-500 px-2 mb-4">
                <button onClick={() => setCrmTab("ACTIVE")} className={`pb-2 border-b-2 ${crmTab === "ACTIVE" ? "border-blue-700 text-blue-700" : "border-transparent"}`}>Active</button>
                <button onClick={() => setCrmTab("DISABLE")} className={`pb-2 border-b-2 ${crmTab === "DISABLE" ? "border-blue-700 text-blue-700" : "border-transparent"}`}>Blocked</button>
             </div>
             <div className="relative mb-4">
                <input type="text" placeholder="Search clients" value={crmSearch} onChange={(e) => setCrmSearch(e.target.value)} className="w-full border border-gray-300 rounded pl-3 pr-10 py-2 text-sm outline-none focus:border-blue-700" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
             </div>
             <div className="space-y-0 text-sm min-h-[150px]">
                {displayedCrm.length === 0 ? <p className="text-gray-500 text-center py-8">No clients found.</p> : paginatedCrm.map(cust => (
                    <div key={cust.id} className="flex items-center justify-between border-b border-gray-100 py-3">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold"><span className="text-xs">👤</span></div>
                         <div>
                            <p className="font-medium text-gray-800">
                               Click on Edit to add client name {String(cust.id).slice(-3).replace(/\D/g, '') || "106"} <span className="text-blue-500 hover:underline cursor-pointer ml-1">Add client name 📝</span>
                            </p>
                            <p className="text-gray-800 font-semibold mt-0.5 text-sm">Phone : {cust.phone}</p>
                         </div>
                      </div>
                      <button className="text-gray-800 font-bold px-2 hover:bg-gray-100 rounded">⋮</button>
                    </div>
                  ))}
             </div>
             <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>Showing {crmStart} to {crmEnd} of {displayedCrm.length} clients</span>
                <div className="flex items-center gap-1">
                  <button disabled={normalizedCrmPage === 1} onClick={() => setCrmPage(1)} className="px-1 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">«</button>
                  <button disabled={normalizedCrmPage === 1} onClick={() => setCrmPage((page) => Math.max(1, page - 1))} className="px-1 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">‹</button>
                  {Array.from({ length: Math.min(5, crmTotalPages) }, (_, index) => {
                    const page = index + Math.max(1, Math.min(normalizedCrmPage - 2, crmTotalPages - 4));
                    return (
                      <button
                        key={page}
                        onClick={() => setCrmPage(page)}
                        className={`w-6 h-6 rounded-full font-bold flex items-center justify-center ${normalizedCrmPage === page ? "bg-indigo-100 text-indigo-800" : "text-gray-600 hover:bg-gray-100"}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button disabled={normalizedCrmPage === crmTotalPages} onClick={() => setCrmPage((page) => Math.min(crmTotalPages, page + 1))} className="px-1 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">›</button>
                  <button disabled={normalizedCrmPage === crmTotalPages} onClick={() => setCrmPage(crmTotalPages)} className="px-1 text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300">»</button>
                  <select className="border border-gray-300 rounded px-2 py-0.5 outline-none ml-2" value={crmPageSize} disabled><option>5</option></select>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showHelpline && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="hidden">
              <h3 className="font-bold text-gray-800 text-lg">☎️ Dedicated Helpline Numbers</h3>
              <button onClick={() => setShowHelpline(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-sky-50 rounded border border-sky-100"><span className="text-xs text-sky-600 uppercase font-bold tracking-wider block">Line A</span><span className="font-bold text-lg text-sky-800">+91 (080) 4123-5678</span></div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100"><span className="text-xs text-gray-500 uppercase font-bold tracking-wider block">Line B</span><span className="font-bold text-lg text-gray-700">+91 (080) 9999-8888</span></div>
            </div>
            <div className="mt-5 flex justify-end"><button onClick={() => setShowHelpline(false)} className="px-4 py-2 bg-blue-700 text-white rounded font-semibold text-sm">Close</button></div>
          </div>
        </div>
      )}

      {showSchedules && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="hidden">
              <h3 className="font-bold text-gray-800 text-lg">🗓️ IVR Active Callback Schedules</h3>
              <button onClick={() => setShowSchedules(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto text-sm">
              {schedules.map((s) => (
                <div key={s.id} className="p-3 border border-gray-100 rounded flex justify-between items-center gap-3">
                  <div><span className="font-semibold block text-gray-800">{s.name}</span><span className="text-xs text-gray-400">{s.reason}</span></div>
                  <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded flex-shrink-0">{s.time}</span>
                </div>
              ))}
              {schedules.length === 0 && <p className="py-6 text-center text-xs text-gray-400">No schedules loaded.</p>}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
              <button onClick={() => { setShowSchedules(false); navigate("/ivr/schedules"); }} className="text-blue-900 hover:underline font-bold text-sm">
                View All Schedules
              </button>
              <button onClick={() => setShowSchedules(false)} className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded font-bold text-sm transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showLanguages} onClose={() => setShowLanguages(false)} title="IVR Languages" size="lg" contentClassName="max-h-[90vh] overflow-y-auto" bodyClassName="space-y-0">
          <div>
            <div className="hidden">
              <h3 className="font-bold text-gray-800 text-lg">🌐 Active IVR Language</h3>
              <button onClick={() => setShowLanguages(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_204px] border-b border-gray-200 bg-gray-50">
                <div className="p-4 sm:border-r sm:border-gray-200">
                  <div className="font-medium text-gray-900">Name & Phone</div>
                  <div className="mt-2 flex">
                    <input
                      type="text"
                      value={ivrLanguageSearch}
                      onChange={(event) => { setIvrLanguageSearch(event.target.value); if (!event.target.value) fetchIvrLanguageUsers(1); }}
                      placeholder="Search User"
                      className="flex-1 h-10 border border-blue-700 rounded-l px-3 text-sm text-gray-800 outline-none focus:ring-1 focus:ring-blue-700"
                    />
                    <button onClick={() => fetchIvrLanguageUsers(1)} className="h-10 w-10 rounded-r bg-blue-900 hover:bg-blue-800 text-white flex items-center justify-center transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-medium text-gray-900">Language</div>
                  <Select
                    value={ivrLanguageFilter}
                    onChange={(event) => setIvrLanguageFilter(event.target.value)}
                    options={[{ value: "", label: "All" }, ...ivrLanguageOptions.map((language) => ({ value: language, label: language }))]}
                    containerClassName="mt-2"
                  />
                </div>
              </div>
              <div className="max-h-[580px] overflow-y-auto">
                {ivrLanguageLoading ? <div className="p-8 text-center text-sm text-gray-500">Loading users...</div> : ivrLanguageUsers.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No Users found.</div> : ivrLanguageUsers.map((user) => (
                  <div key={user.userId} className="grid grid-cols-1 sm:grid-cols-[1fr_204px] border-b border-gray-200 last:border-b-0">
                    <div className="p-4 sm:border-r sm:border-gray-200">
                      <div className="text-sm font-medium text-gray-800">{user.userName}</div>
                      <div className="mt-1 text-sm font-bold text-gray-900">{user.phone}</div>
                    </div>
                    <div className="p-4">
                      <MultiCombobox
                        value={user.languages}
                        onValueChange={(value) => handleIvrUserLanguageChange(user.userId, value)}
                        options={ivrLanguageOptions.map((language) => ({ value: language, label: language }))}
                        placeholder="Select language"
                        searchPlaceholder="Search language"
                        maxDisplay={10}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center gap-3 border-t border-gray-200 p-3 text-sm text-gray-500 sm:flex-row">
                <span>Showing {ivrLanguageUsers.length ? (ivrLanguagePage - 1) * ivrLanguageRows + 1 : 0} to {Math.min(ivrLanguagePage * ivrLanguageRows, ivrLanguageTotal)} of {ivrLanguageTotal} entries</span>
                <div className="flex items-center gap-2">
                  <button disabled={ivrLanguagePage === 1} onClick={() => fetchIvrLanguageUsers(1)} className="px-2 text-gray-400 disabled:opacity-50">«</button>
                  <button disabled={ivrLanguagePage === 1} onClick={() => fetchIvrLanguageUsers(ivrLanguagePage - 1)} className="px-2 text-gray-400 disabled:opacity-50">‹</button>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-medium text-indigo-700">{ivrLanguagePage}</span>
                  <button disabled={ivrLanguagePage * ivrLanguageRows >= ivrLanguageTotal} onClick={() => fetchIvrLanguageUsers(ivrLanguagePage + 1)} className="px-2 text-gray-400 disabled:opacity-50">›</button>
                  <button disabled={ivrLanguagePage * ivrLanguageRows >= ivrLanguageTotal} onClick={() => fetchIvrLanguageUsers(Math.max(1, Math.ceil(ivrLanguageTotal / ivrLanguageRows)))} className="px-2 text-gray-400 disabled:opacity-50">»</button>
                </div>
                <Select value={String(ivrLanguageRows)} disabled fullWidth={false} options={[{ value: "10", label: "10" }]} className="w-20" />
              </div>
            </div>
            <div className="hidden space-y-2 text-sm">
              {["English", "Hindi", "Tamil", "Malayalam", "Kannada"].map((lang) => (
                <div key={lang} onClick={() => setSelectedLang(lang)} className={`p-3 rounded border cursor-pointer flex justify-between items-center ${selectedLang === lang ? "border-teal-500 bg-teal-50 text-teal-800 font-semibold" : "border-gray-100"}`}>
                  <span>{lang}</span>{selectedLang === lang && <span className="text-teal-600 font-bold">✓</span>}
                </div>
              ))}
            </div>
            <div className="hidden">
              <button onClick={async () => {
                if (userId) await apiClient.put(`provider/ivr/users/${userId}`, { languages: [selectedLang] });
                setShowLanguages(false);
              }} className="px-4 py-2 bg-blue-700 text-white rounded font-semibold text-sm">Save</button>
            </div>
          </div>
      </Dialog>
    </div>
  );
}

type NormalizedChartDataset = {
  label: string;
  data: number[];
  color: string;
};

type NormalizedChartData = {
  labels: string[];
  datasets: NormalizedChartDataset[];
};

const CHART_COLORS = [
  "rgba(54, 162, 235, 0.5)",
  "rgba(255, 99, 132, 0.5)",
  "rgba(255, 159, 64, 0.5)",
  "rgba(255, 205, 86, 0.5)",
  "rgba(75, 192, 192, 0.5)",
  "rgba(153, 102, 255, 0.5)",
  "rgba(201, 203, 207, 0.5)"
];

function normalizeLanguageChartData(raw: any): NormalizedChartData {
  const hourlyLabels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00-${String(hour).padStart(2, "0")}:59`);
  return normalizeChartData(raw, hourlyLabels);
}

function normalizeChartData(raw: any, fallbackLabels: string[]): NormalizedChartData {
  const payload = pickChartPayload(raw);
  const labels = normalizeLabels(payload?.labels, fallbackLabels);
  const datasets = normalizeDatasets(payload, labels);

  return {
    labels,
    datasets: datasets.length
      ? datasets
      : [
          {
            label: "Data",
            data: labels.map(() => 0),
            color: CHART_COLORS[0]
          }
        ]
  };
}

function pickChartPayload(raw: any) {
  if (!raw) return {};
  if (raw.labels || raw.datasets) return raw;
  if (raw.data?.labels || raw.data?.datasets) return raw.data;
  if (raw.result?.labels || raw.result?.datasets) return raw.result;
  return raw.data ?? raw.result ?? raw;
}

function normalizeLabels(labels: any, fallbackLabels: string[]) {
  return Array.isArray(labels) && labels.length ? labels.map((label) => String(label)) : fallbackLabels;
}

function normalizeDatasets(payload: any, labels: string[]): NormalizedChartDataset[] {
  if (Array.isArray(payload?.datasets)) {
    return payload.datasets.map((dataset: any, index: number) => ({
      label: String(dataset?.label || dataset?.name || `Series ${index + 1}`),
      data: normalizeSeries(dataset?.data, labels),
      color: normalizeColor(dataset?.borderColor || dataset?.backgroundColor, index)
    }));
  }

  if (Array.isArray(payload)) {
    const keys = Array.from(
      new Set(payload.flatMap((item) => Object.keys(item || {}).filter((key) => !["label", "name", "date", "day", "hour", "time"].includes(key))))
    );
    return keys.map((key, index) => ({
      label: key,
      data: labels.map((_, labelIndex) => toNumber(payload[labelIndex]?.[key])),
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }

  return [];
}

function normalizeSeries(series: any, labels: string[]) {
  if (Array.isArray(series)) return labels.map((_, index) => toNumber(series[index]));
  if (series && typeof series === "object") return labels.map((label) => toNumber(series[label]));
  return labels.map(() => 0);
}

function normalizeColor(color: any, index: number) {
  if (Array.isArray(color)) return String(color[0] || CHART_COLORS[index % CHART_COLORS.length]);
  return String(color || CHART_COLORS[index % CHART_COLORS.length]);
}

function toNumber(value: any) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.ivrCalls)) return payload.ivrCalls;
  if (Array.isArray(payload?.calls)) return payload.calls;
  if (Array.isArray(payload?.list)) return payload.list;
  const nested = findCallRows(payload);
  if (nested.length) return nested;
  return [];
}

function findCallRows(payload: any): any[] {
  if (!payload || typeof payload !== "object") return [];
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.some((item) => item && typeof item === "object" && ("callStatus" in item || "uid" in item || "consumerPhone" in item))) {
      return value;
    }
    if (value && typeof value === "object") {
      const nested = findCallRows(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function getCallDateFilter(range: "LAST_WEEK" | "LAST_MONTH" | "CUSTOM_RANGE", customStartDate: string, customEndDate: string) {
  if (range === "CUSTOM_RANGE" && customStartDate && customEndDate) {
    return {
      "createdDate-ge": `${customStartDate} 00:00:00`,
      "createdDate-le": `${customEndDate} 23:59:59`
    };
  }

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (range === "LAST_WEEK" ? 6 : 29));

  return {
    "createdDate-ge": `${formatDatePart(start)} 00:00:00`,
    "createdDate-le": `${formatDatePart(end)} 23:59:59`
  };
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
