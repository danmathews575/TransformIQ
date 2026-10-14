
import type { AssessmentInput, AssessmentResult } from "./types";

export async function createAssessment(
  input: AssessmentInput,
): Promise<AssessmentResult> {
  const response = await fetch("/api/v1/assessments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.detail;

    throw new Error(
      typeof detail === "string"
        ? detail
        : "Assessment failed. Check your inputs and try again.",
    );
  }

  return response.json() as Promise<AssessmentResult>;
}
