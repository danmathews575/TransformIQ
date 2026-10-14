
export interface AssessmentInput {
  monthly_queries: number;
  minutes_per_query: number;
  hourly_labor_cost: number;
  automation_rate: number;
  implementation_cost: number;
  monthly_ai_cost: number;
}

export interface OpportunityResult {
  name: string;
  score: number;
}

export interface ROIResult {
  monthly_labor_cost: number;
  monthly_gross_savings: number;
  monthly_net_savings: number;
  annual_net_benefit: number;
  payback_months: number | null;
}

export interface AssessmentResult {
  opportunities: OpportunityResult[];
  roi: ROIResult;
  note: string;
}
