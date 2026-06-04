import type { Page } from "@playwright/test";

export const testUser = {
  id: "e2e-user",
  name: "E2E Owner",
  email: "e2e.owner@example.com",
  roles: [{ id: "role-owner", name: "Owner", tier: "owner" }],
  permissions: ["*"],
};

export const testAccount = {
  id: "e2e-tenant",
  tenantUid: "e2e-tenant",
  name: "E2E Business",
  licensedProducts: ["health", "bookings", "karty", "finance", "lending"],
  enabledModules: ["customers", "leads", "tasks", "users", "finance", "analytics", "reports", "drive", "membership", "audit-log", "settings"],
  theme: { primaryColor: "#5B21D1", logoUrl: "" },
  plan: "growth",
  domain: "healthcare",
  labels: {
    customer: "Patient",
    staff: "Doctor",
    service: "Service",
    appointment: "Appointment",
    order: "Order",
    lead: "Lead",
  },
};

export const testLocation = {
  id: "loc-e2e",
  uid: "loc-e2e",
  name: "E2E Main",
  code: "E2E",
};

export const testPipeline = {
  uid: "pipe-e2e-standard",
  name: "E2E Standard Sales",
  pipelineName: "E2E Standard Sales",
  description: "Automated test pipeline",
  isDefault: true,
  default: true,
  isActive: true,
  stagesInSequentialOrder: true,
  stages: [
    {
      uid: "stage-e2e-new",
      pipelineUid: "pipe-e2e-standard",
      pipelineName: "E2E Standard Sales",
      stageName: "New Inquiry",
      stageOrder: 1,
      sequenceOrder: 1,
      color: "#6366f1",
      taskCompletionMode: "ALL",
      autogenerateTasks: true,
      active: true,
      isActive: true,
      movementRule: "Strict Block",
      taskTemplates: [
        {
          uid: "task-template-e2e-call",
          title: "Call customer",
          type: "TASK",
          required: true,
          autoCreate: true,
          dueOffsetHours: 24,
          assigneeRule: "Owner",
          priority: "NORMAL",
          outcomeRequired: false,
          active: true,
        },
      ],
    },
    {
      uid: "stage-e2e-contacted",
      pipelineUid: "pipe-e2e-standard",
      pipelineName: "E2E Standard Sales",
      stageName: "Contacted",
      stageOrder: 2,
      sequenceOrder: 2,
      color: "#22c55e",
      taskCompletionMode: "NONE",
      autogenerateTasks: false,
      active: true,
      isActive: true,
      movementRule: "No Restriction",
      taskTemplates: [],
    },
  ],
};

export const testProduct = {
  uid: "product-e2e-membership",
  name: "E2E Membership",
  displayName: "E2E Membership",
  productEnum: "CUSTOM",
  productType: "Membership",
  productTypeEnum: "CUSTOM",
  status: "Enabled",
  defaultPipelineUid: testPipeline.uid,
  defaultPipelineName: testPipeline.name,
};

export const testChannel = {
  uid: "channel-e2e-web",
  name: "E2E Web Form",
  channelType: "WEBSITE",
  status: "ACTIVE",
  productUid: testProduct.uid,
  productUids: [testProduct.uid],
  productName: testProduct.name,
};

export const testLead = {
  uid: "lead-e2e-001",
  referenceNo: "E2E-001",
  leadDate: "2026-06-04T08:00:00.000Z",
  consumerFirstName: "Anjali",
  consumerLastName: "Nair",
  consumerEmail: "anjali.e2e@example.com",
  consumerPhone: "+919999999999",
  company: "E2E Clinic",
  channelUid: testChannel.uid,
  channelName: testChannel.name,
  productUid: testProduct.uid,
  productName: testProduct.name,
  pipelineUid: testPipeline.uid,
  pipelineName: testPipeline.name,
  currentPipelineStageUid: "stage-e2e-new",
  currentPipelineStageName: "New Inquiry",
  priority: "NORMAL",
  internalStatus: "ACTIVE",
  ownerId: testUser.id,
  ownerName: "E2E Owner",
  createdAt: "2026-06-04T08:00:00.000Z",
  updatedAt: "2026-06-04T08:00:00.000Z",
  lastActivityAt: "2026-06-04T08:00:00.000Z",
  stageTasks: [
    {
      uid: "task-e2e-call",
      title: "Call customer",
      type: "TASK",
      required: true,
      completed: false,
      isManual: false,
      createdAt: "2026-06-04T08:00:00.000Z",
      priority: "NORMAL",
    },
  ],
  stageHistory: [],
  generalNotes: [],
  attachments: [],
  assignees: [],
  tags: [],
  isRejected: false,
  isConverted: false,
  isDuplicate: false,
};

export async function seedAuthenticatedShell(page: Page) {
  await page.addInitScript(({ user, account, location }) => {
    window.localStorage.setItem(
      "jaldee-shell-store",
      JSON.stringify({
        state: {
          user,
          account,
          accessToken: "e2e-token",
          isAuthenticated: true,
          onboardingStatus: "complete",
          activeLocation: location,
          availableLocations: [location],
          activeProduct: "health",
        },
        version: 2,
      }),
    );
    window.localStorage.setItem(
      "jaldee-token-session",
      JSON.stringify({
        accessToken: "e2e-token",
        refreshToken: "e2e-refresh-token",
        accessExpiresAt: Date.now() + 3_600_000,
        refreshExpiresAt: Date.now() + 86_400_000,
      }),
    );
  }, { user: testUser, account: testAccount, location: testLocation });
}

export async function mockShellAndLeadApis(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const isApiRequest = pathname.includes("/api/");

    if (isApiRequest && (pathname.includes("/auth/") || pathname.includes("/users/me"))) {
      await route.fulfill({ json: { user: testUser, account: testAccount, locations: [testLocation], token: "e2e-token" } });
      return;
    }

    if (pathname.endsWith("/provider/locations") || pathname.includes("/base-service/v1/api/tenant/locations")) {
      await route.fulfill({ json: [testLocation] });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/signup/issue-otp")) {
      await route.fulfill({ json: { otpId: "otp-e2e", maskedTarget: "e2e***@example.com", targetType: "EMAIL", expiresInSeconds: 300, nextResendInSeconds: 30 } });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/signup/verify-otp")) {
      await route.fulfill({ json: { accessToken: "e2e-token", refreshToken: "e2e-refresh-token", accessExpiresInSeconds: 3600, refreshExpiresInSeconds: 86400 } });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenants/e2e-tenant")) {
      await route.fulfill({ json: { uid: "e2e-tenant", tenantName: "E2E Business", tenantProfile: { businessName: "E2E Business" } } });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/settings")) {
      await route.fulfill({ json: { health: true, booking: true, finance: true, eCommerce: true, lending: true } });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/crm/leads/search")) {
      await route.fulfill({ json: { content: [testLead], totalElements: 1 } });
      return;
    }

    if (pathname.endsWith(`/base-service/v1/api/tenant/crm/leads/${testLead.uid}`)) {
      if (request.method() === "PUT") {
        const payload = request.postDataJSON();
        await route.fulfill({ json: { ...payload, uid: testLead.uid } });
        return;
      }
      await route.fulfill({ json: testLead });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/crm/leads")) {
      const payload = request.method() === "POST" ? request.postDataJSON() : {};
      await route.fulfill({
        json: {
          ...testLead,
          ...payload,
          uid: "lead-e2e-created",
          referenceNo: "E2E-NEW",
          createdAt: "2026-06-04T09:00:00.000Z",
          updatedAt: "2026-06-04T09:00:00.000Z",
        },
      });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/crm/leads/pipelines/search")) {
      await route.fulfill({ json: { content: [testPipeline], totalElements: 1 } });
      return;
    }

    if (pathname.endsWith(`/base-service/v1/api/tenant/crm/leads/pipelines/${testPipeline.uid}`)) {
      await route.fulfill({ json: testPipeline });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/crm/leads/products/search")) {
      await route.fulfill({ json: { content: [testProduct], totalElements: 1 } });
      return;
    }

    if (
      pathname.endsWith("/base-service/v1/api/tenant/crm/leads/channels/search") ||
      pathname.endsWith("/base-service/v1/api/tenant/crm/leads/channel/search")
    ) {
      await route.fulfill({ json: { content: [testChannel], totalElements: 1 } });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/crm/leads/templates/search")) {
      await route.fulfill({ json: { content: [], totalElements: 0 } });
      return;
    }

    if (pathname.endsWith("/base-service/v1/api/tenant/audit-logs")) {
      await route.fulfill({ json: { content: [], totalElements: 0 } });
      return;
    }

    await route.continue();
  });
}
