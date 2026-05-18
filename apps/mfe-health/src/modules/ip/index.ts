export type {
  IpAdmissionRow,
  IpBedRow,
  IpBillingRow,
  IpDataset,
  IpDetail,
  IpPatientRow,
  IpPatientStatus,
  IpSummary,
  IpUserLite,
  IpViewKey,
} from "./types";
export { IpModule } from "./IpModule";
export { IpDetails } from "./components/IpDetails";
export { IpOverview } from "./components/IpOverview";
export { IpPatientsList } from "./components/IpPatientsList";
export { IpAdmissionsList } from "./components/IpAdmissionsList";
export { IpBedsList } from "./components/IpBedsList";
export { IpBillingList } from "./components/IpBillingList";
export { IpSettings } from "./components/IpSettings";
export {
  useIpAdmissions,
  useIpBeds,
  useIpBilling,
  useIpDataset,
  useIpDetail,
  useIpPatients,
} from "./queries/ip";
export { loadIpDataset } from "./services/ip";

