import { Badge, Button, EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useCustomerQuestionnaire } from "../queries/customers";
import type { Customer } from "../types";

interface CustomerQuestionnaireCardProps {
  customer: Customer;
  customerLabel: string;
}

export function CustomerQuestionnaireCard({ customer, customerLabel }: CustomerQuestionnaireCardProps) {
  const { basePath, product } = useSharedModulesContext();
  const questionnaireQuery = useCustomerQuestionnaire();
  const submitted = customer.questionnaires ?? [];
  const hasConfiguredQuestionnaire = Boolean(questionnaireQuery.data?.id);

  function getQuestionnaireBasePath() {
    if (basePath.endsWith("/customers")) {
      return `${basePath.slice(0, -"/customers".length)}/questionnaire`;
    }

    if (basePath.endsWith("/patients")) {
      return `${basePath.slice(0, -"/patients".length)}/questionnaire`;
    }

    return `/${product}/questionnaire`;
  }

  function openQuestionnaire(mode: "new" | "resubmit") {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.origin + getQuestionnaireBasePath());
    url.searchParams.set("customerId", customer.id);
    url.searchParams.set("source", "customers");
    url.searchParams.set("mode", mode);
    if (questionnaireQuery.data?.id) {
      url.searchParams.set("questionnaireId", questionnaireQuery.data.id);
    }
    window.location.assign(url.pathname + url.search);
  }

  return (
    <SectionCard
      title="Questionnaire"
      actions={
        hasConfiguredQuestionnaire ? (
          <Button
            data-testid="customer-questionnaire-open"
            size="sm"
            onClick={() => openQuestionnaire(submitted.length ? "resubmit" : "new")}
          >
            {submitted.length ? "Update Questionnaire" : "Open Questionnaire"}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4" data-testid="customer-questionnaire-card">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Review questionnaire status for this {customerLabel.toLowerCase()} and launch the configured form flow.
        </p>

        {!hasConfiguredQuestionnaire && !questionnaireQuery.isLoading ? (
          <EmptyState
            title="No questionnaire configured"
            description="Configure a consumer questionnaire before collecting answers from this record."
          />
        ) : null}

        {submitted.length ? (
          <div className="space-y-3">
            {submitted.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                data-testid={`customer-questionnaire-item-${item.id || index}`}
                className="rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_22%,white)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label || "Questionnaire"}</div>
                    {item.submittedAt ? (
                      <div className="text-xs text-[var(--color-text-secondary)]">{item.submittedAt}</div>
                    ) : null}
                  </div>
                  {item.status ? <Badge variant="info">{item.status}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        ) : hasConfiguredQuestionnaire && !questionnaireQuery.isLoading ? (
          <EmptyState
            title="No questionnaire answers"
            description={`No questionnaire has been submitted yet for this ${customerLabel.toLowerCase()}.`}
          />
        ) : null}
      </div>
    </SectionCard>
  );
}
