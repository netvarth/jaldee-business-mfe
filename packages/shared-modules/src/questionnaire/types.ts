export type QuestionnaireFieldType =
  | "plainText"
  | "number"
  | "date"
  | "bool"
  | "list"
  | "fileUpload"
  | "digitalSignature"
  | "dataGrid";

export interface QuestionnaireQuestionDefinition {
  id?: string | number;
  sectionName?: string;
  sectionOrder?: string | number;
  label: string;
  labelName: string;
  hint?: string;
  mandatory?: boolean;
  fieldDataType: QuestionnaireFieldType;
  labelValues?: string[];
  plainTextPropertie?: {
    minNoOfLetter?: number;
    maxNoOfLetter?: number;
  };
  numberPropertie?: {
    start?: number;
    end?: number;
  };
  listPropertie?: {
    maxAnswers?: number;
    minAnswers?: number;
  };
  dateProperties?: {
    startDate?: string;
    endDate?: string;
  };
  filePropertie?: {
    maxNoOfFile?: number;
    minNoOfFile?: number;
    allowedDocuments?: string[];
  };
}

export interface QuestionnaireQuestionItem {
  question: QuestionnaireQuestionDefinition;
  answerLine?: {
    labelName?: string;
    answer?: Record<string, unknown>;
  };
}

export interface QuestionnaireDefinition {
  id?: string | number;
  questionnaireId?: string | number;
  labels?: QuestionnaireQuestionItem[];
  questionAnswers?: Array<{
    question: QuestionnaireQuestionDefinition;
    answerLine?: {
      labelName?: string;
      answer?: Record<string, unknown>;
    };
  }>;
}

export interface QuestionnaireAnswerLine {
  labelName: string;
  answer: Record<string, unknown>;
}

export interface QuestionnaireSubmitPayload {
  questionnaireId: string | number;
  answerLine: QuestionnaireAnswerLine[];
}

export interface QuestionnaireFileValue {
  caption: string;
  mimeType: string;
  size: number;
}

export type QuestionnaireValue =
  | string
  | number
  | boolean
  | string[]
  | QuestionnaireFileValue[]
  | null
  | undefined;

export type QuestionnaireValueMap = Record<string, QuestionnaireValue>;

export interface QuestionnaireFormState {
  values: QuestionnaireValueMap;
  errors: Record<string, string>;
  files: Record<string, File[]>;
  payload: QuestionnaireSubmitPayload;
  isValid: boolean;
}
