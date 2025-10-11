export type WorkflowRole = 'planner' | 'researcher' | 'builder' | 'reviewer';

export interface WorkflowTrigger {
  type: 'supabase' | 'lovable';
  channel?: string;
  schedule?: string;
  table?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface WorkflowStepConfig {
  id: string;
  role: WorkflowRole;
  summary?: string;
  input?: Record<string, unknown>;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStepConfig[];
  triggers?: WorkflowTrigger[];
}

export interface WorkflowRequest {
  goal: string;
  metadata?: Record<string, unknown>;
}
