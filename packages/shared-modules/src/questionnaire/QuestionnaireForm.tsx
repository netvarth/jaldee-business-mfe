import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Checkbox,
  DatePicker,
  FileUpload,
  FormSection,
  Input,
  RadioGroup,
  SectionCard,
  Textarea,
} from "@jaldee/design-system";
import type {
  QuestionnaireAnswerLine,
  QuestionnaireDefinition,
  QuestionnaireFileValue,
  QuestionnaireFormState,
  QuestionnaireQuestionDefinition,
  QuestionnaireQuestionItem,
  QuestionnaireSubmitPayload,
  QuestionnaireValue,
  QuestionnaireValueMap,
} from "./types";

interface QuestionnaireFormProps {
  questionnaire: QuestionnaireDefinition | null | undefined;
  initialAnswers?: QuestionnaireSubmitPayload | QuestionnaireAnswerLine[];
  disabled?: boolean;
  onChange?: (state: QuestionnaireFormState) => void;
  className?: string;
}

type GroupedSection = {
  key: string;
  title: string;
  questions: QuestionnaireQuestionDefinition[];
};

function getQuestionItems(questionnaire: QuestionnaireDefinition | null | undefined) {
  if (!questionnaire) return [];
  if (Array.isArray(questionnaire.labels)) return questionnaire.labels;
  if (Array.isArray(questionnaire.questionAnswers)) return questionnaire.questionAnswers;
  return [];
}

function getQuestionnaireId(questionnaire: QuestionnaireDefinition | null | undefined) {
  return questionnaire?.id ?? questionnaire?.questionnaireId ?? "";
}

function normalizeQuestion(item: QuestionnaireQuestionItem | QuestionnaireQuestionDefinition) {
  if ("question" in item) {
    return item.question;
  }
  return item;
}

function groupQuestions(items: Array<QuestionnaireQuestionItem | QuestionnaireQuestionDefinition>): GroupedSection[] {
  const sectionMap = new Map<string, GroupedSection>();

  items.forEach((item, index) => {
    const question = normalizeQuestion(item);
    const sectionKey = String(question.sectionOrder ?? question.sectionName ?? index);
    const sectionTitle = question.sectionName?.trim() || "Questions";
    const existing = sectionMap.get(sectionKey);

    if (existing) {
      existing.questions.push(question);
      return;
    }

    sectionMap.set(sectionKey, {
      key: sectionKey,
      title: sectionTitle,
      questions: [question],
    });
  });

  return [...sectionMap.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, value]) => value);
}

function normalizeDateInput(value: unknown) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function extractAnswerValue(question: QuestionnaireQuestionDefinition, rawAnswer: unknown): QuestionnaireValue {
  if (rawAnswer === undefined || rawAnswer === null) {
    return question.fieldDataType === "list" ? [] : "";
  }

  switch (question.fieldDataType) {
    case "list":
      return Array.isArray(rawAnswer) ? rawAnswer.map(String) : [String(rawAnswer)];
    case "bool":
      return typeof rawAnswer === "boolean" ? rawAnswer : String(rawAnswer).toLowerCase() === "true";
    case "number":
      return rawAnswer === "" ? "" : Number(rawAnswer);
    case "date":
      return normalizeDateInput(rawAnswer);
    case "fileUpload":
    case "digitalSignature":
      return Array.isArray(rawAnswer) ? (rawAnswer as QuestionnaireFileValue[]) : [];
    default:
      return String(rawAnswer);
  }
}

function buildInitialValues(
  items: Array<QuestionnaireQuestionItem | QuestionnaireQuestionDefinition>,
  initialAnswers?: QuestionnaireSubmitPayload | QuestionnaireAnswerLine[]
) {
  const values: QuestionnaireValueMap = {};
  const answerLines = Array.isArray(initialAnswers)
    ? initialAnswers
    : initialAnswers?.answerLine ?? [];
  const answerMap = new Map(answerLines.map((line) => [line.labelName, line.answer]));

  items.forEach((item) => {
    const question = normalizeQuestion(item);
    const lineAnswer =
      answerMap.get(question.labelName) ??
      ("answerLine" in item ? item.answerLine?.answer : undefined);
    const rawValue = lineAnswer?.[question.fieldDataType];
    values[question.labelName] = extractAnswerValue(question, rawValue);
  });

  return values;
}

function validateQuestion(question: QuestionnaireQuestionDefinition, value: QuestionnaireValue) {
  if (question.fieldDataType === "dataGrid") {
    return "";
  }

  if (
    question.mandatory &&
    (value === "" ||
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0))
  ) {
    return "This field is required.";
  }

  if (question.fieldDataType === "plainText" && typeof value === "string") {
    const min = question.plainTextPropertie?.minNoOfLetter;
    const max = question.plainTextPropertie?.maxNoOfLetter;

    if (min && value.length > 0 && value.length < min) {
      return `Minimum ${min} characters required.`;
    }
    if (max && value.length > max) {
      return `Maximum ${max} characters allowed.`;
    }
  }

  if (question.fieldDataType === "number" && value !== "" && value !== undefined) {
    const numericValue = Number(value);
    const min = question.numberPropertie?.start;
    const max = question.numberPropertie?.end;

    if (Number.isNaN(numericValue)) {
      return "Enter a valid number.";
    }
    if (min !== undefined && numericValue < min) {
      return `Value must be at least ${min}.`;
    }
    if (max !== undefined && numericValue > max) {
      return `Value must be at most ${max}.`;
    }
  }

  if (question.fieldDataType === "list" && Array.isArray(value)) {
    const min = question.listPropertie?.minAnswers;
    const max = question.listPropertie?.maxAnswers;

    if (min && value.length > 0 && value.length < min) {
      return `Select at least ${min} option${min > 1 ? "s" : ""}.`;
    }
    if (max && value.length > max) {
      return `Select at most ${max} option${max > 1 ? "s" : ""}.`;
    }
  }

  return "";
}

function buildPayload(
  questionnaireId: string | number,
  questions: QuestionnaireQuestionDefinition[],
  values: QuestionnaireValueMap
): QuestionnaireSubmitPayload {
  const answerLine: QuestionnaireAnswerLine[] = questions.flatMap((question) => {
    if (question.fieldDataType === "dataGrid") {
      return [];
    }

    const value = values[question.labelName];
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return [];
    }

    return [
      {
        labelName: question.labelName,
        answer: {
          [question.fieldDataType]: value,
        },
      },
    ];
  });

  return {
    questionnaireId,
    answerLine,
  };
}

function toFilePayload(file: File): QuestionnaireFileValue {
  return {
    caption: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

function isStringArray(value: QuestionnaireValue): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isQuestionnaireFileValueArray(value: QuestionnaireValue): value is QuestionnaireFileValue[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && "caption" in item);
}

export function QuestionnaireForm({
  questionnaire,
  initialAnswers,
  disabled = false,
  onChange,
  className,
}: QuestionnaireFormProps) {
  const items = useMemo(() => getQuestionItems(questionnaire), [questionnaire]);
  const sections = useMemo(() => groupQuestions(items), [items]);
  const questions = useMemo(
    () => sections.flatMap((section) => section.questions),
    [sections]
  );
  const questionnaireId = getQuestionnaireId(questionnaire);

  const [values, setValues] = useState<QuestionnaireValueMap>(() =>
    buildInitialValues(items, initialAnswers)
  );
  const [files, setFiles] = useState<Record<string, File[]>>({});

  useEffect(() => {
    setValues(buildInitialValues(items, initialAnswers));
    setFiles({});
  }, [items, initialAnswers]);

  const errors = useMemo(() => {
    return questions.reduce<Record<string, string>>((acc, question) => {
      const error = validateQuestion(question, values[question.labelName]);
      if (error) {
        acc[question.labelName] = error;
      }
      return acc;
    }, {});
  }, [questions, values]);

  const payload = useMemo(
    () => buildPayload(questionnaireId, questions, values),
    [questionnaireId, questions, values]
  );

  const isValid = Object.keys(errors).length === 0;

  useEffect(() => {
    onChange?.({
      values,
      errors,
      files,
      payload,
      isValid,
    });
  }, [errors, files, isValid, onChange, payload, values]);

  function updateValue(labelName: string, nextValue: QuestionnaireValue) {
    setValues((current) => ({
      ...current,
      [labelName]: nextValue,
    }));
  }

  function renderQuestion(question: QuestionnaireQuestionDefinition) {
    const value = values[question.labelName];
    const error = errors[question.labelName];
    const label = question.mandatory ? `${question.label} *` : question.label;

    if (question.fieldDataType === "dataGrid") {
      return (
        <div key={question.labelName} className="md:col-span-2">
          <Alert variant="info" title={question.label}>
            Data grid questions are not supported in this reusable form yet.
          </Alert>
        </div>
      );
    }

    if (question.fieldDataType === "plainText") {
      const maxLength = question.plainTextPropertie?.maxNoOfLetter;
      if (maxLength && maxLength > 100) {
        return (
          <Textarea
            key={question.labelName}
            label={label}
            hint={question.hint}
            error={error}
            value={String(value ?? "")}
            maxLength={maxLength}
            minLength={question.plainTextPropertie?.minNoOfLetter}
            disabled={disabled}
            onChange={(event) => updateValue(question.labelName, event.target.value)}
          />
        );
      }

      return (
        <Input
          key={question.labelName}
          label={label}
          hint={question.hint}
          error={error}
          value={String(value ?? "")}
          maxLength={maxLength}
          minLength={question.plainTextPropertie?.minNoOfLetter}
          disabled={disabled}
          onChange={(event) => updateValue(question.labelName, event.target.value)}
        />
      );
    }

    if (question.fieldDataType === "number") {
      return (
        <Input
          key={question.labelName}
          type="number"
          label={label}
          hint={question.hint}
          error={error}
          value={value === undefined || value === null ? "" : String(value)}
          min={question.numberPropertie?.start}
          max={question.numberPropertie?.end}
          disabled={disabled}
          onChange={(event) => updateValue(question.labelName, event.target.value)}
        />
      );
    }

    if (question.fieldDataType === "date") {
      return (
        <DatePicker
          key={question.labelName}
          label={label}
          hint={question.hint}
          error={error}
          value={normalizeDateInput(value)}
          min={normalizeDateInput(question.dateProperties?.startDate)}
          max={normalizeDateInput(question.dateProperties?.endDate)}
          disabled={disabled}
          onChange={(event) => updateValue(question.labelName, event.target.value)}
        />
      );
    }

    if (question.fieldDataType === "bool") {
      const options = (question.labelValues?.length ? question.labelValues : ["Yes", "No"]).map((option) => ({
        value: option.toLowerCase() === "yes" ? "true" : "false",
        label: option,
        disabled,
      }));

      return (
        <div key={question.labelName} className="md:col-span-2">
          <RadioGroup
            name={question.labelName}
            label={label}
            options={options}
            value={typeof value === "boolean" ? String(value) : ""}
            error={error}
            onChange={(nextValue) => updateValue(question.labelName, nextValue === "true")}
          />
        </div>
      );
    }

    if (question.fieldDataType === "list") {
      const maxAnswers = question.listPropertie?.maxAnswers ?? 1;
      const options = (question.labelValues ?? []).map((option) => ({
        value: option,
        label: option,
        disabled,
      }));

      if (maxAnswers <= 1) {
        return (
          <div key={question.labelName} className="md:col-span-2">
            <RadioGroup
              name={question.labelName}
              label={label}
              options={options}
              value={isStringArray(value) ? value[0] ?? "" : ""}
              error={error}
              onChange={(nextValue) => updateValue(question.labelName, [nextValue])}
            />
          </div>
        );
      }

      const selectedValues = isStringArray(value) ? value : [];
      return (
        <div key={question.labelName} className="space-y-2 md:col-span-2">
          <div className="space-y-1">
            <div className="ds-form-label">{label}</div>
            {question.hint ? (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">{question.hint}</p>
            ) : null}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {options.map((option) => {
              const checked = selectedValues.includes(option.value);
              return (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={checked}
                  disabled={disabled}
                  error={undefined}
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((selected) => selected !== option.value);
                    updateValue(question.labelName, nextValues);
                  }}
                />
              );
            })}
          </div>
          {error ? <p className="m-0 text-xs text-[var(--color-danger)]">{error}</p> : null}
        </div>
      );
    }

    if (
      question.fieldDataType === "fileUpload" ||
      question.fieldDataType === "digitalSignature"
    ) {
      const maxNoOfFile = question.filePropertie?.maxNoOfFile ?? 1;
      const selectedFiles = isQuestionnaireFileValueArray(value) ? value : [];

      return (
        <div key={question.labelName} className="space-y-3 md:col-span-2">
          <FileUpload
            label={label}
            multiple={maxNoOfFile > 1}
            error={error}
            onUpload={(uploadedFiles) => {
              setFiles((current) => ({
                ...current,
                [question.labelName]: uploadedFiles,
              }));
              updateValue(question.labelName, uploadedFiles.map(toFilePayload));
            }}
          />
          {selectedFiles.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {selectedFiles.map((fileValue, index) => (
                <div
                  key={`${question.labelName}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm text-slate-700"
                >
                  <span className="truncate">{fileValue.caption}</span>
                  <button
                    type="button"
                    className="text-sm font-medium text-rose-600"
                    onClick={() => {
                      const nextValues = selectedFiles.filter((_, itemIndex) => itemIndex !== index);
                      const nextFiles = (files[question.labelName] ?? []).filter(
                        (_, itemIndex) => itemIndex !== index
                      );
                      setFiles((current) => ({
                        ...current,
                        [question.labelName]: nextFiles,
                      }));
                      updateValue(question.labelName, nextValues);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    return null;
  }

  if (!questions.length) {
    return (
      <SectionCard className={className}>
        <div className="py-4 text-sm text-slate-500">No questionnaire available.</div>
      </SectionCard>
    );
  }

  return (
    <div className={className}>
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6">
          {sections.map((section, index) => (
            <FormSection
              key={section.key}
              title={section.title || `Section ${index + 1}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              {section.questions.map(renderQuestion)}
            </FormSection>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
