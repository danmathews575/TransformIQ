import { useState, type FormEvent } from "react";
import "./App.css";
import { createAssessment } from "./api";
import type { AssessmentInput, AssessmentResult } from "./types";

const initialInput: AssessmentInput = {
  monthly_queries: 10000,
  minutes_per_query: 8,
  hourly_labor_cost: 300,
  automation_rate: 0.3,
  implementation_cost: 50000,
  monthly_ai_cost: 10000,
};

const navigationItems = [
  { name: "Overview", icon: "⌂" },
  { name: "AI Opportunities", icon: "▥" },
  { name: "ROI Analysis", icon: "▤" },
  { name: "Roadmaps", icon: "◫" },
];

const opportunities = [
  {
    name: "Customer Support Automation",
    category: "Customer Experience",
  },
  {
    name: "Lead Qualification",
    category: "Sales Operations",
  },
  {
    name: "Invoice Processing",
    category: "Finance Operations",
  },
];

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [input, setInput] = useState<AssessmentInput>(initialInput);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await createAssessment(input);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete assessment. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof AssessmentInput, value: string) {
    const numericValue = Number(value);

    setInput((previous) => ({
      ...previous,
      [field]: numericValue,
    }));
  }

  const roi = result?.roi;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">
            Transform<span>IQ</span>
          </div>
          <div className="brand-caption">AI VALUE INTELLIGENCE</div>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          {navigationItems.map(({ name, icon }) => (
            <button
              key={name}
              type="button"
              className={`nav-item ${activePage === name ? "active" : ""}`}
              onClick={() => setActivePage(name)}
              aria-current={activePage === name ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {icon}
              </span>
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="workspace-label">
          <span>Workspace</span>
          <span className="workspace-line" />
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <div>
            Local prototype
            <small>Version 0.2</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">{activePage}</div>
          <div className="profile-button">
            <span className="avatar">TI</span>
            <span>Demo workspace</span>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <h1>Turn AI potential into measurable business value.</h1>
              <p>
                Evaluate automation opportunities, quantify financial impact,
                and plan your AI adoption strategy.
              </p>
            </div>

            <div className="sample-notice">
              <span className="notice-icon" aria-hidden="true">
                i
              </span>
              <div>
                <strong>
                  {result ? "Assessment complete" : "Sample scenario"}
                </strong>
                <span>
                  {result
                    ? "Results returned by the API."
                    : "Illustrative business data."}
                </span>
              </div>
            </div>
          </section>

          <section className="panel assessment-panel">
            <div className="panel-heading">
              <div>
                <h2>Business assessment</h2>
                <p>
                  Adjust the assumptions and calculate your estimated returns.
                </p>
              </div>
            </div>

            <form onSubmit={runAssessment}>
              <div className="form-grid">
                <Field
                  label="Monthly support queries"
                  value={input.monthly_queries}
                  step={1}
                  onChange={(value) =>
                    updateField("monthly_queries", value)
                  }
                />

                <Field
                  label="Handling time (minutes)"
                  value={input.minutes_per_query}
                  onChange={(value) =>
                    updateField("minutes_per_query", value)
                  }
                />

                <Field
                  label="Labor cost per hour (₹)"
                  value={input.hourly_labor_cost}
                  onChange={(value) =>
                    updateField("hourly_labor_cost", value)
                  }
                />

                <Field
                  label="Automation rate (%)"
                  value={input.automation_rate * 100}
                  min={0}
                  max={100}
                  onChange={(value) =>
                    updateField(
                      "automation_rate",
                      String(Number(value) / 100),
                    )
                  }
                />

                <Field
                  label="Implementation cost (₹)"
                  value={input.implementation_cost}
                  onChange={(value) =>
                    updateField("implementation_cost", value)
                  }
                />

                <Field
                  label="Monthly AI cost (₹)"
                  value={input.monthly_ai_cost}
                  onChange={(value) =>
                    updateField("monthly_ai_cost", value)
                  }
                />
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Calculating..." : "Generate assessment →"}
              </button>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              {result && !error && (
                <output className="form-success" aria-live="polite">
                  Assessment calculated successfully.
                </output>
              )}
            </form>
          </section>

          <section className="section-title">
            <div>
              <h2>Business value overview</h2>
              <p>
                {result
                  ? "Calculated using your submitted inputs."
                  : "Submit an assessment to calculate these metrics."}
              </p>
            </div>
          </section>

          <section className="metrics-grid">
            <MetricCard
              label="Monthly labor cost"
              value={roi ? currency(roi.monthly_labor_cost) : "—"}
              detail="Current baseline"
            />

            <MetricCard
              label="Monthly gross savings"
              value={roi ? currency(roi.monthly_gross_savings) : "—"}
              detail="Before AI operating costs"
            />

            <MetricCard
              label="Monthly net savings"
              value={roi ? currency(roi.monthly_net_savings) : "—"}
              detail="After AI operating costs"
              positive
            />

            <MetricCard
              label="First-year net benefit"
              value={roi ? currency(roi.annual_net_benefit) : "—"}
              detail="After implementation cost"
              positive
            />
          </section>

          <section className="content-grid">
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>AI opportunity rankings</h2>
                  <p>Scores returned by your prioritization engine</p>
                </div>
              </div>

              {result ? (
                result.opportunities.map((item) => {
                  const category =
                    opportunities.find(
                      (opportunity) => opportunity.name === item.name,
                    )?.category ?? "Business operations";

                  const score = Math.max(0, Math.min(100, item.score));

                  return (
                    <div className="ranking-row" key={item.name}>
                      <div className="ranking-top">
                        <div>
                          <strong>{item.name}</strong>
                          <span>{category}</span>
                        </div>
                        <strong>{item.score}/100</strong>
                      </div>

                      <progress
                        className="score-track"
                        aria-label={`${item.name} score`}
                        value={score}
                        max={100}
                      />
                    </div>
                  );
                })
              ) : (
                <p className="empty-state">
                  Your ranked opportunities will appear here after an
                  assessment.
                </p>
              )}
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>ROI snapshot</h2>
                  <p>Financial projection</p>
                </div>
              </div>

              <div className="payback-box">
                <div>
                  <div className="payback-value">
                    {roi?.payback_months != null
                      ? roi.payback_months.toFixed(2)
                      : "—"}
                    <span>
                      {roi?.payback_months != null ? " months" : ""}
                    </span>
                  </div>
                  <p>Estimated payback period</p>
                </div>
              </div>

              <div className="roi-details">
                <div>
                  <span>Implementation cost</span>
                  <strong>{currency(input.implementation_cost)}</strong>
                </div>
                <div>
                  <span>Monthly AI operating cost</span>
                  <strong>{currency(input.monthly_ai_cost)}</strong>
                </div>
                <div>
                  <span>Automation assumption</span>
                  <strong>
                    {(input.automation_rate * 100).toFixed(0)}%
                  </strong>
                </div>
              </div>

              <p className="disclaimer">
                Estimates depend on assumptions and do not guarantee actual
                savings. Opportunity ratings are currently predefined.
              </p>
            </div>
          </section>

          <footer className="page-footer">
            <span>TransformIQ · AI Transformation Intelligence</span>
            <span>Prototype v0.2 · Illustrative scenario</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
}: Readonly<{
  label: string;
  value: number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number | "any";
}>) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        required
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MetricCard({
  label,
  value,
  detail,
  positive = false,
}: Readonly<{
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
}>) {
  return (
    <article className="metric-card">
      <div className="metric-header">
        <span>{label}</span>
        {positive && (
          <span className="metric-icon positive" aria-hidden="true">
            ↗
          </span>
        )}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

export default App;
