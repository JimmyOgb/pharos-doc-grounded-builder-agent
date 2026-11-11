export type WorkflowIntent =
  | 'CANONICAL_CONTRACT_QUERY'
  | 'ACCOUNT_STATE_INSPECTION'
  | 'TRANSACTION_PREPARATION'
  | 'UNDOCUMENTED_OR_UNKNOWN';

export type WorkflowStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'FAILED'
  | 'NOT_EXECUTED'
  | 'UNSUPPORTED'
  | 'AWAITING_USER_SIGNATURE';

export type StepType = 'READ_ONLY' | 'STATE_CHANGING';

export interface DocCitation {
  title: string;
  url: string;
  contentExcerpt: string;
}

export interface PlanStep {
  stepNumber: number;
  description: string;
  targetTool: string;
  stepType: StepType;
  safetyNotes: string;
  expectedOutcome: string;
}

export interface ActionPlan {
  workflowName: string;
  prerequisites: string[];
  targetNetwork: string;
  chainId: number;
  steps: PlanStep[];
}

export interface ExecutionStepResult {
  stepNumber: number;
  tool: string;
  inputs: Record<string, any>;
  rawOutput: any;
  decodedOutput?: any;
  success: boolean;
  error?: string;
}

export interface UnsignedTransaction {
  chainId: number;
  network: string;
  from?: string;
  to: string;
  value: string;
  valueFormatted: string;
  data: string;
  nonce?: number;
  gasLimit: string;
  gasPriceGwei: string;
  maxFeePerGasGwei?: string;
  maxPriorityFeePerGasGwei?: string;
  description: string;
  signed: false;
  broadcast: false;
  userActionRequired: string;
}

export interface VerificationResult {
  status: WorkflowStatus;
  plannedOutcome: string;
  actualOutcome: string;
  isMatch: boolean;
  evidenceDetails: string;
  explorerUrl?: string;
}

export interface BuilderAgentResponse {
  requestId: string;
  timestamp: string;
  userQuestion: string;
  intent: WorkflowIntent;
  documentationCoverage: boolean;
  documentationSources: DocCitation[];
  missingDocumentation?: string;
  actionPlan?: ActionPlan;
  executionResults: ExecutionStepResult[];
  unsignedTransaction?: UnsignedTransaction;
  verification: VerificationResult;
  finalStatus: WorkflowStatus;
  summary: string;
}
