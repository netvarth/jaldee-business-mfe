import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    useCalendars,
    type AccountLocation,
    type CreateCalendarPayload,
    type CreateSchedulePayload,
} from '../../services/useCalendars';
import { useServices } from '../../services/useServices';
import { useUsers } from '../../services/useUsers';
import { X, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import {
    Button,
    Checkbox,
    cn,
    DataTable,
    EmptyState,
    Input,
    PageHeader,
    Select,
    Textarea,
    TimePicker,
    type ColumnDef,
} from '@jaldee/design-system';
import DualListServicesModal, { Service } from './components/DualListServicesModal';
import DualListUsersModal, { User } from './components/DualListUsersModal';
import LabelSelectorModal from '../../components/LabelSelectorModal';
import { useCustomerLabels } from '../../services/useCustomerLabels';

function normalizeStringList(
    values: unknown,
    fallbackKeys: string[] = ['name', 'displayName', 'label', 'title', 'uid', 'id'],
) {
    if (!Array.isArray(values)) {
        if (typeof values === 'string' && values.trim()) {
            return [values.trim()];
        }
        return [];
    }

    return values
        .map((value) => {
            if (typeof value === 'string') {
                return value.trim();
            }

            if (value && typeof value === 'object') {
                for (const key of fallbackKeys) {
                    const candidate = (value as Record<string, unknown>)[key];
                    if (typeof candidate === 'string' && candidate.trim()) {
                        return candidate.trim();
                    }
                }
            }

            return '';
        })
        .filter((value): value is string => Boolean(value));
}

function toBookingChannels(channels: { online: boolean; walkin: boolean; phonein: boolean; ivr: boolean }) {
    const values: string[] = [];
    if (channels.online) values.push('ONLINE');
    if (channels.walkin) values.push('WALK_IN');
    if (channels.phonein) values.push('PHONE_IN');
    if (channels.ivr) values.push('IVR');
    return values;
}

function withSeconds(value: string) {
    return value.split(':').length === 2 ? `${value}:00` : value;
}

function buildServicesPayload(
    selectedServices: Service[],
    serviceUsers: Record<string, User[]>,
) {
    return selectedServices.map((service) => {
        const serviceUid = service.uid ?? service.id;
        const assignedUsers = serviceUsers[service.id] ?? [];

        return {
            serviceUid,
            users: assignedUsers.map((user) => ({
                userUid: user.id,
            })),
        };
    });
}

function WizardStepper({ step }: { step: number }) {
    const steps = [
        { label: 'Create Calendar', description: 'Basic information', mobileLabel: 'Calendar', mobileDescription: 'Basic info' },
        { label: 'Set Services', description: 'Assign Services & Users', mobileLabel: 'Services', mobileDescription: 'Assign' },
        { label: 'Create Schedules', description: 'Set availability', mobileLabel: 'Schedules', mobileDescription: 'Availability' },
    ] as const;

    return (
        <div className="mb-6 md:mb-8 flex items-center justify-center md:justify-start w-full">
            <div className="flex w-full items-start justify-between bg-white border border-slate-200 rounded-[2rem] px-4 py-4 shadow-sm md:inline-flex md:w-auto md:items-center md:rounded-full md:px-8 md:py-4">
                {steps.map((item, index) => {
                    const stepNumber = index + 1;
                    const isCurrent = step === stepNumber;
                    const isComplete = step > stepNumber;
                    const isLast = index === steps.length - 1;

                    return (
                        <React.Fragment key={item.label}>
                            <div className="flex flex-1 flex-col items-center md:flex-none md:flex-row md:gap-3">
                                <span
                                    className={cn(
                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold z-10 bg-white",
                                        (isCurrent || isComplete)
                                            ? "border-[#5B2D8E] bg-[#F3E8FF] text-[#5B2D8E]"
                                            : "border-slate-300 text-slate-500"
                                    )}
                                >
                                    {stepNumber}
                                </span>
                                <div className="mt-2 flex flex-col items-center text-center md:mt-0 md:items-start md:text-left">
                                    <span className={cn(
                                        "text-[11px] sm:text-xs md:text-sm font-bold leading-tight whitespace-normal md:whitespace-nowrap",
                                        (isCurrent || isComplete) ? "text-slate-900" : "text-slate-500"
                                    )}>
                                        <span className="md:hidden">{item.mobileLabel}</span>
                                        <span className="hidden md:inline">{item.label}</span>
                                    </span>
                                    <span className="mt-1 md:mt-0 text-[10px] md:text-[11px] font-medium leading-tight text-slate-500 whitespace-normal md:whitespace-nowrap">
                                        <span className="md:hidden">{item.mobileDescription}</span>
                                        <span className="hidden md:inline">{item.description}</span>
                                    </span>
                                </div>
                            </div>
                            {!isLast ? <div className="mx-1 mt-4 h-px flex-1 shrink-0 bg-slate-300 md:mx-4 md:mt-0 md:w-16 md:flex-none" /> : null}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

export default function CalendarWizard() {
    const navigate = useNavigate();
    const locationState = useLocation().state as { calendar?: any, returnTo?: string, wizardState?: any, restoreServicesModal?: boolean } | null;
    const returnTo = locationState?.returnTo || '/calendars';
    const initialCalendar = locationState?.calendar;
    const ws = locationState?.wizardState;
    const initialBookingChannels = normalizeStringList(
        initialCalendar?.bookingChannels,
        ['channel', 'value', 'label', 'title', 'uid', 'id'],
    );
    const initialLabels = normalizeStringList(initialCalendar?.tags ?? initialCalendar?.label);

    const { createCalendar, updateCalendar, createSchedule, getLocations } = useCalendars();
    const { services, refresh: refreshServices } = useServices();
    const { users, loading: usersLoading, error: usersError } = useUsers();
    
    const [step, setStep] = useState(ws?.step ?? 1);
    const [draftUid, setDraftUid] = useState<string | null>(ws?.draftUid ?? initialCalendar?.uid ?? null);
    
    // Step 1 State
    const [name, setName] = useState(ws?.name ?? initialCalendar?.name ?? '');
    const [description, setDescription] = useState(ws?.description ?? initialCalendar?.description ?? '');
    const [location, setLocation] = useState(
        ws?.locationId != null
            ? String(ws.locationId)
            : initialCalendar?.locationId != null
                ? String(initialCalendar.locationId)
                : ws?.location ?? initialCalendar?.locationName ?? '',
    );
    const [locations, setLocations] = useState<AccountLocation[]>([]);
    const [channels, setChannels] = useState(ws?.channels ?? {
        online: initialBookingChannels.includes('ONLINE') || initialBookingChannels.length === 0,
        walkin: initialBookingChannels.includes('WALK_IN'),
        phonein: initialBookingChannels.includes('PHONE_IN'),
        ivr: initialBookingChannels.includes('IVR'),
    });
    
    // Step 2 State
    const [selectedServices, setSelectedServices] = useState<Service[]>(ws?.selectedServices ?? []);
    const [defaultServiceId, setDefaultServiceId] = useState<string>(ws?.defaultServiceId ?? '');
    const [serviceUsers, setServiceUsers] = useState<Record<string, User[]>>(ws?.serviceUsers ?? {});
    
    // Modals State
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(locationState?.restoreServicesModal ?? false);
    const [usersModalServiceId, setUsersModalServiceId] = useState<string | null>(null);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [labels, setLabels] = useState<string[]>(ws?.labels ?? initialLabels);
    const { labels: availableLabels } = useCustomerLabels();

    // Step 3 State
    const [schedules, setSchedules] = useState<any[]>(ws?.schedules ?? [
        {
            id: 'sch-1',
            name: 'Default Schedule',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            timeWindows: [
                {
                    id: 'tw-1',
                    weekDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
                    startTime: '09:00',
                    endTime: '17:00',
                    duration: 30,
                    capacity: 1
                }
            ]
        }
    ]);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        async function loadLocations() {
            try {
                const data = await getLocations();
                if (!cancelled) setLocations(data);
            } catch {
                if (!cancelled) setLocations([]);
            }
        }
        void loadLocations();
        return () => {
            cancelled = true;
        };
    }, [getLocations]);

    const locationOptions = useMemo(
        () => locations.map((entry) => ({ value: String(entry.id), label: entry.name, id: entry.id, uid: entry.uid })),
        [locations],
    );
    const resolvedLocationOption = useMemo(
        () => locationOptions.find((option) => String(option.id) === location || option.label === location),
        [locationOptions, location],
    );

    React.useEffect(() => {
        if (!location || !locations.length) {
            return;
        }

        const matchedLocation = locations.find((entry) => String(entry.id) === location || entry.name === location);
        if (matchedLocation && String(matchedLocation.id) !== location) {
            setLocation(String(matchedLocation.id));
        }
    }, [location, locations]);

    const availableServices = useMemo<Service[]>(
        () => services.map((service) => {
            const assignedUserNames = (service.assignedProviders || [])
                .map(uid => users.find(u => u.userUid === uid)?.displayName)
                .filter(Boolean)
                .join(', ');

            return {
                id: service.uid ?? service.id,
                uid: service.uid ?? service.id,
                name: service.name,
                code: service.serviceType,
                assignedProviders: service.assignedProviders,
                assignedUserNames: assignedUserNames || undefined,
            };
        }),
        [services, users],
    );

    const availableUsers = useMemo<User[]>(
        () =>
            users.map((user) => ({
                id: user.userUid,
                name: user.displayName,
                role: user.title || user.status,
            })),
        [users],
    );
    const initializedRef = React.useRef(false);
    React.useEffect(() => {
        if (!initializedRef.current && availableServices.length > 0) {
            initializedRef.current = true;
            if (!ws?.selectedServices && selectedServices.length === 0 && !initialCalendar) {
                setSelectedServices([availableServices[0]]);
            }
        }
    }, [availableServices, ws, selectedServices.length, initialCalendar]);

    const handleNext = () => setStep(s => Math.min(3, s + 1));
    const handlePrev = () => setStep(s => Math.max(1, s - 1));

    const [validationError, setValidationError] = useState<string | null>(null);

    const handleNextStep1 = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setValidationError(null);
        setSubmitError(null);
        if (!name || !name.trim()) {
            setValidationError("Name is required.");
            return;
        }
        if (!location) {
            setValidationError("Location is required.");
            return;
        }
        setSubmitting(true);
        const bookingChannels = toBookingChannels(channels);
        const resolvedLocationId = resolvedLocationOption?.id ?? Number(location || 0);
        const payload: CreateCalendarPayload = {
            name: name || "Draft Calendar",
            description,
            locationId: Number.isFinite(resolvedLocationId) ? resolvedLocationId : 0,
            locationUid: resolvedLocationOption?.uid,
            locationName: resolvedLocationOption?.label ?? location,
            services: [],
            users: [],
            channel: bookingChannels[0] ?? 'ONLINE',
            label: labels,
            qrLinkRequired: true,
            feature: 'BASE_CRM',
            status: 'DRAFT',
            color: '#0f172a',
            bookingChannels,
            capacityOverride: 0,
            tags: [],
        };
        try {
            if (!draftUid) {
                const created = await createCalendar(payload);
                if (created.uid) setDraftUid(created.uid);
            } else {
                await updateCalendar(draftUid, { ...payload, uid: draftUid });
            }
            handleNext();
        } catch (e) {
            console.error("Failed to save draft", e);
            setSubmitError(e instanceof Error ? e.message : "Failed to create calendar.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleNextStep2 = async () => {
        setSubmitError(null);
        if (!draftUid) return handleNext();
        setSubmitting(true);
        const bookingChannels = toBookingChannels(channels);
        const resolvedLocationId = resolvedLocationOption?.id ?? Number(location || 0);
        
        const payload: CreateCalendarPayload = {
            uid: draftUid,
            name: name || "Draft Calendar",
            description,
            locationId: Number.isFinite(resolvedLocationId) ? resolvedLocationId : 0,
            locationUid: resolvedLocationOption?.uid,
            locationName: resolvedLocationOption?.label ?? location,
            services: buildServicesPayload(selectedServices, serviceUsers),
            users: [],
            channel: bookingChannels[0] ?? 'ONLINE',
            defaultServiceId: defaultServiceId || undefined,
            label: labels,
            qrLinkRequired: true,
            feature: 'BASE_CRM',
            status: 'DRAFT',
            color: '#0f172a',
            bookingChannels,
            capacityOverride: 0,
            tags: [],
        };
        try {
            await updateCalendar(draftUid, payload);
            handleNext();
        } catch (e) {
            console.error("Failed to save services", e);
            setSubmitError(e instanceof Error ? e.message : "Failed to save calendar services.");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePublish = async () => {
        if (!draftUid) return;
        const hasServices = selectedServices.length > 0;
        const hasSchedule = schedules.length > 0;
        const hasTimeWindows = schedules.some((schedule) => Array.isArray(schedule.timeWindows) && schedule.timeWindows.length > 0);
        if (!hasServices || !hasSchedule || !hasTimeWindows) {
            console.error("Calendar is incomplete for publishing");
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            const bookingChannels = toBookingChannels(channels);
            const resolvedLocationId = resolvedLocationOption?.id ?? Number(location || 0);
            await updateCalendar(draftUid, {
                uid: draftUid,
                name,
                description,
                locationId: Number.isFinite(resolvedLocationId) ? resolvedLocationId : 0,
                locationUid: resolvedLocationOption?.uid,
                locationName: resolvedLocationOption?.label ?? location,
                services: buildServicesPayload(selectedServices, serviceUsers),
                users: [],
                channel: bookingChannels[0] ?? 'ONLINE',
                defaultServiceId: defaultServiceId || undefined,
                label: labels,
                qrLinkRequired: true,
                feature: 'BASE_CRM',
                status: 'ACTIVE',
                color: '#0f172a',
                bookingChannels,
                capacityOverride: 0,
                tags: [],
            });

            for (const schedule of schedules) {
                const schedulePayload: CreateSchedulePayload = {
                    name: schedule.name,
                    description: description || schedule.name,
                    calendarUid: draftUid,
                    calendarName: name,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate || undefined,
                    qrLinkRequired: true,
                    timeWindows: schedule.timeWindows.map((timeWindow: any) => ({
                        calendarUid: draftUid,
                        calendarName: name,
                        scheduleName: schedule.name,
                        weekDays: timeWindow.weekDays,
                        startTime: withSeconds(timeWindow.startTime),
                        endTime: withSeconds(timeWindow.endTime),
                        slotDuration: Number(timeWindow.duration) || 0,
                        channel: bookingChannels[0] ?? 'ONLINE',
                        label: [],
                        qrLinkRequired: true,
                    })),
                };
                await createSchedule(draftUid, schedulePayload);
            }
            navigate(returnTo);
        } catch (error) {
            console.error(error);
            setSubmitError(error instanceof Error ? error.message : "Failed to publish calendar.");
        } finally {
            setSubmitting(false);
        }
    };

    const publishBlockedReason = useMemo(() => {
        if (selectedServices.length === 0) return "Add at least one service before publishing.";
        if (schedules.length === 0) return "Add a schedule before publishing.";
        if (!schedules.some((schedule) => Array.isArray(schedule.timeWindows) && schedule.timeWindows.length > 0)) {
            return "Add at least one time window before publishing.";
        }
        for (const sch of schedules) {
            for (const tw of sch.timeWindows) {
                if (Number(tw.capacity) < 1) return "Time window capacity must be at least 1.";
            }
        }
        return "";
    }, [schedules, selectedServices.length]);

    const handleDeleteService = (serviceId: string) => {
        setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
        const newUsers = { ...serviceUsers };
        delete newUsers[serviceId];
        setServiceUsers(newUsers);
    };

    const serviceColumns = useMemo<ColumnDef<Service>[]>(() => [
        {
            key: 'name',
            header: 'Services',
            render: (service) => <div className="font-semibold text-slate-900">{service.name}</div>,
        },
        {
            key: 'users',
            header: 'Users',
            render: (service) => serviceUsers[service.id]?.length ? (
                <div className="text-sm text-slate-700">
                    {serviceUsers[service.id].map(u => u.name).join(', ')}
                </div>
            ) : <span className="text-sm italic text-slate-400">No users assigned</span>,
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (service) => (
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={(event) => {
                        event.stopPropagation();
                        setUsersModalServiceId(service.id);
                    }}>
                        Assign Users
                    </Button>
                    <Button variant="danger" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>} aria-label={`Remove ${service.name}`} onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteService(service.id);
                    }} />
                </div>
            ),
        },
    ], [serviceUsers]);

    return (
        <>
            <section id="page-create-calendar" className="page-section active h-full flex flex-col relative overflow-hidden bg-white" style={{ display: 'flex' }}>
                <div className="sticky top-0 z-30 flex flex-col justify-center bg-white px-4 md:px-8 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => navigate(returnTo)}
                        className="flex w-fit items-center gap-2 border-0 bg-transparent p-0 text-lg font-bold text-slate-900 transition-colors hover:text-[#5B2D8E]"
                        aria-label="Back to calendars"
                    >
                        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        Create Calendar
                    </button>
                    <p className="mt-1.5 text-sm text-slate-500 hidden md:block">Configure calendar details, services, users, and availability.</p>
                </div>

                <div className="wizard-content-container flex-1 overflow-y-auto bg-white px-4 md:px-8 pb-8 pt-4 md:pt-8">
                    <div className="max-w-4xl w-full mx-auto md:mx-0">
                    <WizardStepper step={step} />
                    {/* STEP 1 VIEW */}
                    <div className={step === 1 ? 'block' : 'hidden'}>
                        <h2 className="text-xl font-bold text-[#1e3a8a] mb-4 md:mb-6 px-1 md:px-0">Basic Details</h2>
                        <form className="wizard-form bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6" onSubmit={(e) => { e.preventDefault(); handleNextStep1(); }}>
                            <div className="form-group">
                                <Input
                                    type="text" 
                                    id="wizard-calendar-name" 
                                    label="Calendar Name"
                                    required 
                                    placeholder="Morning Shiftment - Morning Shift"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <Textarea
                                    id="wizard-calendar-desc" 
                                    label="Calendar Description"
                                    rows={4} 
                                    placeholder="Brief description of this calendar"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <Select
                                    id="wizard-calendar-location" 
                                    label="Location"
                                    required 
                                    className="custom-select"
                                    value={location}
                                    placeholder="Select Location"
                                    options={locationOptions.map((option) => ({ value: String(option.id), label: option.label }))}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>

                            <div className="wizard-channels-section">
                                <h3 className="subsection-title">Booking Channel Setup</h3>
                                <p className="subsection-help">Configure which channels customers can use to book appointments for this time window</p>
                                
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.online}
                                        onChange={(e) => setChannels({...channels, online: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">🖥️ Online</span>
                                            <span className="chk-subtext">Allow customers to book appointments online</span>
                                        </div>}
                                    />
                                </div>
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.walkin}
                                        onChange={(e) => setChannels({...channels, walkin: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">📍 Walk-in</span>
                                            <span className="chk-subtext">Accept walk-in appointments without prior booking</span>
                                        </div>}
                                    />
                                </div>
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.phonein}
                                        onChange={(e) => setChannels({...channels, phonein: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">📞 Phone-in</span>
                                            <span className="chk-subtext">Accept booked over the phone</span>
                                        </div>}
                                    />
                                </div>
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.ivr}
                                        onChange={(e) => setChannels({...channels, ivr: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">IVR</span>
                                            <span className="chk-subtext">Allow bookings initiated through interactive voice response</span>
                                        </div>}
                                    />
                                </div>
                            </div>

                            <div className="wizard-labels-section">
                                <h3 className="subsection-title label-title-color">Label</h3>
                                <p className="subsection-help">Label helps you tag a booking to a specified group. Examples: VIP, Family, etc.</p>
                                <div className="labels-container">
                                    <div className="label-chips flex flex-wrap gap-2 mb-2">
                                        {labels.map(labelId => {
                                            const labelObj = availableLabels.find(l => l.id === labelId || l.name === labelId);
                                            const displayName = labelObj ? labelObj.name : labelId;
                                            return (
                                            <span key={labelId} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                                {displayName}
                                                <button type="button" onClick={() => setLabels(labels.filter(l => l !== labelId))} className="text-slate-400 hover:text-slate-600">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        )})}
                                    </div>
                                    <Button type="button" variant="link" size="inline" className="btn-add-label" onClick={() => setIsLabelModalOpen(true)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                                        Add Label
                                    </Button>
                                </div>
                            </div>

                            {validationError && (
                                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 border border-red-200">
                                    {validationError}
                                </div>
                            )}
                            {submitError && (
                                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 border border-red-200">
                                    {submitError}
                                </div>
                            )}
                            <div className="wizard-footer-actions">
                                <Button type="submit" loading={submitting}>{submitting ? 'Saving...' : 'Continue'}</Button>
                            </div>
                        </form>
                    </div>

                    {/* STEP 2 VIEW */}
                    <div className={step === 2 ? 'block' : 'hidden'}>
                        <div className="section-header-row mb-4 px-1 md:px-0">
                            <h2 className="section-title">Set Services & Users</h2>
                            <Button variant="secondary" className="btn-icon-plus whitespace-nowrap" onClick={() => setIsServicesModalOpen(true)}>
                                <span className="hidden sm:inline">⊕ Add Services</span>
                                <span className="sm:hidden">+ Service</span>
                            </Button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
                            <div className="overflow-x-auto w-full">
                                <div className="min-w-[600px]">
                                    <DataTable
                                        data={selectedServices}
                                        columns={serviceColumns}
                                        getRowId={(service) => service.id}
                                        emptyState={<EmptyState title="No services added" description='Click "Add Services" to configure this calendar.' />}
                                        data-testid="bookings-calendar-wizard-services"
                                    />
                                </div>
                                
                                {selectedServices.length > 0 && (
                                    <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                                        <h3 className="text-sm font-bold text-slate-800 mb-2">Default Service (Optional)</h3>
                                        <p className="text-xs text-slate-500 mb-4">Select the primary service for this calendar. This service will be pre-selected when booking appointments.</p>
                                        <Select
                                            value={defaultServiceId}
                                            onChange={(e) => setDefaultServiceId(e.target.value)}
                                            options={[
                                                { value: '', label: 'No Default Service' },
                                                ...selectedServices.map(s => ({ value: s.uid ?? s.id, label: s.name }))
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        {submitError && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                                {submitError}
                            </div>
                        )}

                        <div className="wizard-footer-actions mt-8">
                            <Button variant="secondary" className="btn-wizard-back" onClick={handlePrev}>Back</Button>
                            <Button onClick={handleNextStep2} loading={submitting}>{submitting ? 'Saving...' : 'Continue'}</Button>
                        </div>
                    </div>

                    {/* STEP 3 VIEW */}
                    <div className={step === 3 ? 'block' : 'hidden'}>
                        <div>
                            <div className="flex items-center justify-between mb-4 px-1 md:px-0 md:mb-8">
                                <h2 className="text-lg font-bold text-[#0F172A] md:text-xl">Schedules</h2>
                                <Button
                                    variant="primary"
                                    className="bg-[#2D3748] hover:bg-[#1A202C] border-none text-white font-medium"
                                    onClick={() => {
                                        setSchedules([...schedules, {
                                            id: `sch-${Date.now()}`,
                                            name: `Schedule ${schedules.length + 1}`,
                                            startDate: new Date().toISOString().split('T')[0],
                                            endDate: '',
                                            timeWindows: [{
                                                id: `tw-${Date.now()}`,
                                                weekDays: [1, 2, 3, 4, 5],
                                                startTime: '09:00',
                                                endTime: '17:00',
                                                duration: 30,
                                                capacity: 1
                                            }]
                                        }]);
                                    }}
                                >
                                    <PlusCircle size={16} className="mr-1.5 inline" />
                                    <span className="hidden sm:inline">Add Schedule</span>
                                    <span className="sm:hidden">Add</span>
                                </Button>
                            </div>

                            <div className="flex flex-col gap-6" id="wizard-schedules-container">
                                {schedules.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center bg-slate-50">
                                        <p className="text-slate-500 text-sm font-medium">No schedules defined yet. Add a schedule to set practitioner availability.</p>
                                    </div>
                                ) : (
                                    schedules.map((sch, sIdx) => (
                                        <div key={sch.id} className="relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm md:p-6">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-[#5B2D8E]">{sch.name || 'New Schedule'} Settings</h3>
                                                {sIdx > 0 && (
                                                    <button type="button" onClick={() => setSchedules(schedules.filter((_, i) => i !== sIdx))} className="text-red-500 hover:text-red-700 p-1">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-4">
                                                <Input
                                                    type="text" 
                                                    label="Schedule Name"
                                                    required
                                                    value={sch.name}
                                                    onChange={(e) => {
                                                        const newSch = [...schedules];
                                                        newSch[sIdx].name = e.target.value;
                                                        setSchedules(newSch);
                                                    }}
                                                />
                                                <Input
                                                    type="date" 
                                                    label="Start Date"
                                                    required
                                                    value={sch.startDate}
                                                    onChange={(e) => {
                                                        const newSch = [...schedules];
                                                        newSch[sIdx].startDate = e.target.value;
                                                        setSchedules(newSch);
                                                    }}
                                                />
                                                <Input
                                                    type="date" 
                                                    label="End Date"
                                                    value={sch.endDate}
                                                    onChange={(e) => {
                                                        const newSch = [...schedules];
                                                        newSch[sIdx].endDate = e.target.value;
                                                        setSchedules(newSch);
                                                    }}
                                                />
                                            </div>
                                            
                                            <div className="mt-6 flex flex-col gap-4">
                                                {sch.timeWindows.map((tw: any, twIdx: number) => (
                                                    <div key={tw.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 relative">
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <h4 className="text-sm font-bold text-slate-900">Time Window</h4>
                                                            {twIdx > 0 && (
                                                                <button type="button" onClick={() => {
                                                                    const newSch = [...schedules];
                                                                    newSch[sIdx].timeWindows = newSch[sIdx].timeWindows.filter((_: any, i: number) => i !== twIdx);
                                                                    setSchedules(newSch);
                                                                }} className="text-red-500 hover:text-red-700 p-1">
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="mb-5">
                                                            <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Select Weekdays</label>
                                                            <div className="flex justify-between w-full sm:justify-start sm:gap-2">
                                                                {[
                                                                    { c: 'S', f: 'Sun' }, { c: 'M', f: 'Mon' }, { c: 'T', f: 'Tue' },
                                                                    { c: 'W', f: 'Wed' }, { c: 'T', f: 'Thu' }, { c: 'F', f: 'Fri' }, { c: 'S', f: 'Sat' }
                                                                ].map((day, i) => {
                                                                    const d = i === 0 ? 7 : i; // Sunday is 7
                                                                    const checked = tw.weekDays.includes(d);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={d}
                                                                            onClick={() => {
                                                                                const newSch = [...schedules];
                                                                                let days = [...newSch[sIdx].timeWindows[twIdx].weekDays];
                                                                                if (checked) {
                                                                                    days = days.filter(dayId => dayId !== d);
                                                                                } else {
                                                                                    days.push(d);
                                                                                }
                                                                                newSch[sIdx].timeWindows[twIdx].weekDays = days;
                                                                                setSchedules(newSch);
                                                                            }}
                                                                            className={cn(
                                                                                "flex h-8 w-8 sm:w-11 items-center justify-center rounded-[8px] border text-[11px] font-bold transition-colors",
                                                                                checked ? "border-[#5B2D8E] bg-[#F3E8FF] text-[#5B2D8E]" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                                                            )}
                                                                        >
                                                                            <span className="sm:hidden">{day.c}</span>
                                                                            <span className="hidden sm:inline">{day.f}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        <div className="mb-5 w-full">
                                                            <label className="mb-2 block text-[10px] font-bold uppercase text-[#51769B]">Working Hours</label>
                                                            <div className="flex items-center gap-1 sm:gap-3 w-full [&_input]:w-full [&_input]:min-w-[60px] [&_input]:text-xs [&_input]:px-1 [&_input]:py-1">
                                                                <div className="flex-1 min-w-0">
                                                                    <TimePicker
                                                                        className="text-[#005696] font-medium"
                                                                        value={tw.startTime}
                                                                        onChange={(e) => {
                                                                            const newSch = [...schedules];
                                                                            newSch[sIdx].timeWindows[twIdx].startTime = e.target.value;
                                                                            setSchedules(newSch);
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs sm:text-sm text-[#8EA6BC] shrink-0">to</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <TimePicker
                                                                        className="text-[#005696] font-medium"
                                                                        value={tw.endTime}
                                                                        onChange={(e) => {
                                                                            const newSch = [...schedules];
                                                                            newSch[sIdx].timeWindows[twIdx].endTime = e.target.value;
                                                                            setSchedules(newSch);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mb-2">
                                                            <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Slot Duration</label>
                                                            <div className="flex gap-3">
                                                                <div className="flex-1">
                                                                    <Input
                                                                        type="number" 
                                                                        label="Duration (m)"
                                                                        value={tw.duration} 
                                                                        min="1"
                                                                        onKeyDown={(e) => { if (['-', 'e', 'E', '+', '.'].includes(e.key)) e.preventDefault(); }}
                                                                        onBlur={(e) => {
                                                                            const val = Number(e.target.value);
                                                                            if (val < 1 || isNaN(val)) {
                                                                                const newSch = [...schedules];
                                                                                newSch[sIdx].timeWindows[twIdx].duration = 1;
                                                                                setSchedules(newSch);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            const newSch = [...schedules];
                                                                            newSch[sIdx].timeWindows[twIdx].duration = parseInt(e.target.value);
                                                                            setSchedules(newSch);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                <button
                                                    type="button"
                                                    className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#5B2D8E] hover:underline"
                                                    onClick={() => {
                                                        const newSch = [...schedules];
                                                        newSch[sIdx].timeWindows.push({
                                                            id: `temp-tw-${Date.now()}`,
                                                            weekDays: [1, 2, 3, 4, 5],
                                                            startTime: "09:00",
                                                            endTime: "17:00",
                                                            duration: 30,
                                                            capacity: 1
                                                        });
                                                        setSchedules(newSch);
                                                    }}
                                                >
                                                    <span className="text-lg leading-none">+</span> Add New Time Window
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 flex w-full gap-4 md:mt-8 md:justify-end">
                                <Button type="button" variant="outline" className="flex-1 md:flex-none border-slate-300" onClick={handlePrev}>Back</Button>
                                <Button variant="primary" className="flex-1 bg-[#4C1D95] hover:bg-[#3B0764] md:flex-none" onClick={handlePublish} loading={submitting} disabled={Boolean(publishBlockedReason)}>
                                    {submitting ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                            {publishBlockedReason ? (
                                <p className="mt-2 text-center text-sm text-amber-700 md:text-right">{publishBlockedReason}</p>
                            ) : null}
                            {submitError && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                                    {submitError}
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            </section>

            {/* Modals rendered via Portal or conditionally here */}
            <DualListServicesModal 
                isOpen={isServicesModalOpen}
                onClose={() => setIsServicesModalOpen(false)}
                allServices={availableServices}
                initialSelectedServices={selectedServices}
                onSave={(selected) => {
                    setSelectedServices(selected);
                    const newUsers = { ...serviceUsers };
                    selected.forEach(svc => {
                        if (!newUsers[svc.id] && svc.assignedProviders && svc.assignedProviders.length > 0) {
                            const matchedUsers = availableUsers.filter(u => svc.assignedProviders?.includes(u.id));
                            if (matchedUsers.length > 0) {
                                newUsers[svc.id] = matchedUsers;
                            }
                        }
                    });
                    setServiceUsers(newUsers);
                }}
            />

            {usersModalServiceId && (
                <DualListUsersModal 
                    isOpen={true}
                    onClose={() => setUsersModalServiceId(null)}
                    serviceName={selectedServices.find(s => s.id === usersModalServiceId)?.name || ''}
                    allUsers={availableUsers}
                    initialSelectedUsers={serviceUsers[usersModalServiceId] || []}
                    loading={usersLoading}
                    error={usersError}
                    onSave={(users) => setServiceUsers(prev => ({ ...prev, [usersModalServiceId]: users }))}
                />
            )}
            <LabelSelectorModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                selectedLabels={labels}
                onSave={setLabels}
            />
        </>
    );
}
