# HR UI Automation Map

This file defines the selector contract for HR module UI automation, following the same stable `data-testid` approach used in the leads module.

## Naming Convention

- Page root: `hr-<module>-page`
- Primary create/open action: `hr-<module>-<action>`
- Row/card actions: `hr-<module>-<entity>-<action>-<id>`
- Dialog root: `hr-<module>-<entity>-<action>-dialog`
- Dialog controls: `hr-<module>-<entity>-<field|action>`
- View toggles: `hr-<module>-view-table`, `hr-<module>-view-cards`

## Auth

- Signup page: `shell-signup-page`
- Login page: `shell-login-page`

## Settings

- Page: `hr-settings-page`
- Company profile panel: `hr-settings-company-panel`
- Company save: `hr-settings-company-save`
- Departments add/edit/delete:
  - `hr-settings-departments-add`
  - `hr-settings-departments-edit-<id>`
  - `hr-settings-departments-delete-<id>`
- Designations add/edit/delete:
  - `hr-settings-designations-add`
  - `hr-settings-designations-edit-<id>`
  - `hr-settings-designations-delete-<id>`
- Shifts add/edit/delete:
  - `hr-settings-shifts-add`
  - `hr-settings-shifts-edit-<id>`
  - `hr-settings-shifts-delete-<id>`
- Leave policy add/edit/delete:
  - `hr-settings-leave-policy-create`
  - `hr-settings-leave-policy-edit-<id>`
  - `hr-settings-leave-policy-delete-<id>`
- Assign balance:
  - `hr-settings-leave-assignment-open`
  - `hr-settings-leave-assignment-confirm`
- Holidays add/edit/delete:
  - `hr-settings-holidays-add`
  - `hr-settings-holidays-edit-<id>`
  - `hr-settings-holidays-delete-<id>`
- Attendance rules update: `hr-settings-attendance-save`
- Payroll settings update: `hr-settings-payroll-save`

## Reports

- Export CSV: `hr-reports-export`

## Helpdesk

- Page: `hr-tickets-page`
- Search: `hr-tickets-search`
- Raise ticket: `hr-tickets-create-button`
- Submit ticket: `hr-tickets-submit`
- Close detail: `hr-tickets-detail-close`
- Reply input: `hr-tickets-reply-input`
- Reply send: `hr-tickets-reply-send`

## StaffSpace

- Page: `hr-announcements-page`
- New announcement: `hr-announcements-create-button`
- Disable announcement: `hr-announcements-disable-<id>`
- Search: `hr-announcements-search`

## Expenses

- Page: `hr-expenses-page`
- Submit open: `hr-expenses-submit-open`
- Submit save: `hr-expenses-submit-save`
- Search: `hr-expenses-search`
- View claim: `hr-expenses-view-<id>`
- Approve: `hr-expenses-approve-<id>`
- Decline: `hr-expenses-reject-<id>`
- Reimburse: `hr-expenses-reimburse-<id>`

## Assets

- Page section: `hr-assets-section`
- Register asset: `hr-assets-add`
- Filter indicator: `hr-assets-filter-indicator`
- Table: `hr-assets-table`
- Card: `hr-assets-card-<id>`
- Allocate: `hr-assets-allocate-<id>`
- View: `hr-assets-view-<id>`
- History: `hr-assets-history-<id>`
- Edit: `hr-assets-edit-<id>`
- Delete: `hr-assets-delete-<id>`
- Return / write-off: `hr-assets-return-<id>`

## Separation

- Page: `hr-separation-page`
- Raise exit request: `hr-separation-create-button`
- Open request: `hr-separation-open-<id>`
- Approve: `hr-separation-approve-<id>`
- Reject: `hr-separation-reject-<id>`
- Cancel: `hr-separation-cancel-<id>`

## Employee Master

- Page: `hr-employees-page`
- New employee: `hr-employees-create-button`
- Import CSV: `hr-employees-import-button`
- Export CSV: `hr-employees-export-button`
- Search: `hr-employees-search`
- Filter: `hr-employees-filter-indicator`
- View employee: `hr-employee-view-<id>`
- Edit employee: `hr-employee-edit-<id>`
- Delete employee: `hr-employee-delete-<id>`

## Employee Details

- Details page: `hr-employee-details-page`
- Edit page: `hr-employee-edit-page`
- Face ID open: `hr-employee-face-open`
- Profile save: `hr-employee-save`
- Login dialog: `hr-employee-login-dialog`
- Documents upload:
  - `hr-employee-document-file-upload`
  - `hr-employee-document-status-file-upload`

## Attendance

- Page: `hr-attendance-page`
- Actor select: `hr-attendance-actor`
- Mode select: `hr-attendance-mode`
- Location select: `hr-attendance-location`
- Face toggle: `hr-attendance-face-toggle`
- Punch: `hr-attendance-punch-button`
- Subtabs:
  - `hr-attendance-subtab-logs`
  - `hr-attendance-subtab-pending`
  - `hr-attendance-subtab-overtime`
  - `hr-attendance-subtab-field`
  - `hr-attendance-subtab-compoff`
  - `hr-attendance-subtab-onduty`
  - `hr-attendance-subtab-kiosk`
- Capture location: `hr-attendance-capture-location`

## Leave

- Page: `hr-leave-page`
- Apply: `hr-leave-apply-button`
- Apply submit: `hr-leave-apply-submit`
- Pending inspect: `hr-leave-pending-inspect-<id>`
- Ledger inspect: `hr-leave-ledger-inspect-<id>`
- Approve: `hr-leave-approve`
- Reject: `hr-leave-reject`
- Approve as loss of pay: `hr-leave-approve-lop`

## Payroll

- Page: `hr-payroll-page`
- New component: `hr-payroll-component-add`
- Edit component: `hr-payroll-component-edit-<id>`
- New structure: `hr-payroll-structure-add`
- Edit structure: `hr-payroll-structure-edit-<id>`
- Build add component: `hr-payroll-structure-build-add-component`
- Assign structure: `hr-payroll-assign-structure`
- Save overrides: `hr-payroll-assign-save-overrides`
- Process payroll: `hr-payroll-process-run`
- View payslip: `hr-payroll-payslip-view-<id>`
- Print payslip: `hr-payroll-payslip-print-<id>`
- New custom field: `hr-payroll-custom-field-add`
- Export: `hr-payroll-export`

## Organization

- Org chart page: `hr-org-page`
- Search: `hr-org-search`
- Collapse all: `hr-org-collapse-all`
- Expand all: `hr-org-expand-all`
- Departments add/edit: `hr-org-department-add`, `hr-org-department-edit-<id>`
- Designations add/edit/delete:
  - `hr-org-designation-add`
  - `hr-org-designation-edit-<id>`
  - `hr-org-designation-delete-<id>`
- Branch assign employee: `hr-org-branch-assign-employee-<id>`
- Headcount allocate/edit/delete:
  - `hr-org-headcount-allocate`
  - `hr-org-headcount-edit-<id>`
  - `hr-org-headcount-delete-<id>`
- Seniority add/edit/delete:
  - `hr-org-level-add`
  - `hr-org-level-edit-<id>`
  - `hr-org-level-delete-<id>`
- Transfer actions:
  - `hr-org-transfer-schedule`
  - `hr-org-transfer-effect-now-<id>`
  - `hr-org-transfer-remove-<id>`

## Recruitment

- Requisitions:
  - Search: `hr-recruitment-requisitions-search`
  - New: `hr-recruitment-new-requisition`
  - Publish/manage careers page:
    - `hr-recruitment-publish-<id>`
    - `hr-recruitment-publish-card-<id>`
- Candidates:
  - Search: `hr-recruitment-candidates-search`
  - New: `hr-recruitment-new-candidate`
  - View: `hr-recruitment-candidate-view-<id>`
  - Card view: `hr-recruitment-candidate-card-view-<id>`
- Applications:
  - Page: `hr-recruitment-applications-page`
  - Board wrap: `hr-recruitment-applications-board-wrap`
  - Card: `hr-recruitment-application-card-<id>`
  - Actions trigger: `hr-recruitment-application-actions-trigger-<id>`
  - Move stage:
    - `hr-recruitment-application-<id>-move-screening`
    - `hr-recruitment-application-<id>-move-interview`
  - Notes: `hr-recruitment-application-<id>-notes`
  - Rating: `hr-recruitment-application-<id>-rating`
  - Reject: `hr-recruitment-application-<id>-reject`
  - Hire/onboard: `hr-recruitment-application-<id>-hire`
  - Notes dialog:
    - `hr-recruitment-application-notes-dialog`
    - `hr-recruitment-application-notes-input`
    - `hr-recruitment-application-notes-save`
  - Rating dialog:
    - `hr-recruitment-application-rating-dialog`
    - `hr-recruitment-application-rating-input`
    - `hr-recruitment-application-rating-save`
  - Reject dialog:
    - `hr-recruitment-application-reject-dialog`
    - `hr-recruitment-application-reject-reason`
    - `hr-recruitment-application-reject-confirm`
- Interviews:
  - Search: `hr-recruitment-interviews-search`
  - Schedule: `hr-recruitment-schedule-interview`
  - Update row: `hr-recruitment-interview-update-<id>`
  - Update card: `hr-recruitment-interview-card-update-<id>`
  - Update dialog:
    - `hr-recruitment-interview-update-dialog`
    - `hr-recruitment-interview-update-status`
    - `hr-recruitment-interview-update-score`
    - `hr-recruitment-interview-update-feedback`
    - `hr-recruitment-interview-update-save`
- Offers:
  - New: `hr-recruitment-new-offer`
  - View: `hr-recruitment-offer-view-<id>`
  - Convert: `hr-recruitment-offer-convert-<id>`

## ESS

- Page: `hr-ess-page`
- Leave modal: `ess-leave-apply-modal`
- Leave type: `ess-leave-type`
- Leave reason: `ess-leave-reason`
- Document upload: `ess-documents-submit-file-upload`

