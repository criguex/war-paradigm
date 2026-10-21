// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
export type Priority = 'must' | 'should';

export type Requirement = { id: string; priority: Priority; text: string };
export type Boundary = { id: string; text: string };

/** The INPUT: a user story the agent is asked to write a test plan for. */
export type Story = {
  id: string;
  title: string;
  roles: string[];
  /** action → who may do it and which status a successful call returns */
  permissions: Record<string, { allowed: string[]; ok: number }>;
  requirements: Requirement[];
  boundaries: Boundary[];
};

/** What must be pinned before a run is worth evaluating. */
export type RunMeta = {
  model: string;
  temperature: number;
  promptVersion: string;
  traceId: string;
};

export type Scenario = {
  id: string;
  title: string;
  actor: string;
  action: string;
  /** requirement / boundary ids this scenario exercises */
  covers: string[];
  /** where in the story this scenario comes from, e.g. "US-42/R-2" */
  source: string;
  steps: string[];
  expected: { status: number };
};

/** The OUTPUT: the artifact the agent produced (a test plan as data). */
export type Artifact = {
  story: string;
  meta: RunMeta;
  scenarios: Scenario[];
  risks: string[];
  assumptions: string[];
};

export type CriterionStatus = 'met' | 'partial' | 'failed';

export type CriterionResult = {
  id: string;
  title: string;
  priority: Priority;
  weight: number;
  status: CriterionStatus;
  /** 0..1 — share of the criterion that is satisfied */
  fraction: number;
  evidence: string[];
};

export type Verdict = 'approved' | 'rejected';

export type Report = {
  verdict: Verdict;
  score: number;
  gate: number;
  reasons: string[];
  schemaErrors: string[];
  pinWarnings: string[];
  criteria: CriterionResult[];
  meta?: RunMeta;
};
