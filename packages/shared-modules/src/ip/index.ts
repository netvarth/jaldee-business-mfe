export type {
  IpAdmissionRow,
  IpBedRow,
  IpBillingRow,
  IpDataset,
  IpPatientRow,
  IpPatientStatus,
  IpSummary,
  IpViewKey,
} from "./types";
export { IpModule } from "./IpModule";
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
  useIpPatients,
} from "./queries/ip";
export { getIpDataset } from "./services/ip";
