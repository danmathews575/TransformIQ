import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { business } from "@/data/mockData";

export const Route = createFileRoute("/assessments/new")({
  head: () => ({
    meta: [
      { title: "New Assessment — TransformIQ" },
      { name: "description", content: "Run a 6-step AI readiness assessment for your e-commerce business." },
      { property: "og:title", content: "New Assessment — TransformIQ" },
      { property: "og:description", content: "Run a 6-step AI readiness assessment for your e-commerce business." },
    ],
  }),
  component: Wizard,
});

const req = (label: string) => z.string().trim().min(1, `${label} is required`).max(200, `${label} is too long`);
const reqList = (label: string) => z.array(z.string()).min(1, `Select at least one ${label}`);

const schemas = [
  z.object({
    name: req("Business name"), industry: req("Industry"), model: req("Business model"), size: req("Company size"),
    revenue: req("Revenue range"),
    employees: z.string().trim().min(1, "Employees is required").regex(/^\d+$/, "Enter a whole number"),
    market: req("Market"),
    website: z.string().trim().max(200).refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Enter a valid URL starting with http:// or https://"),
  }),
  z.object({
    channels: reqList("sales channel"), orderVolume: req("Order volume"), inventory: req("Inventory management"),
    service: req("Customer service"), marketing: req("Marketing"), logistics: req("Logistics"), finance: req("Finance"),
    bottlenecks: z.array(z.string()), bottleneckNotes: z.string().max(1000),
  }),
  z.object({
    platform: req("E-commerce platform"), crm: req("CRM/ERP"), analytics: req("Analytics tools"),
    dataQuality: req("Data quality"), existingAI: req("Existing AI/automation"),
  }),
  z.object({ challenges: reqList("challenge"), goals: req("Goals").pipe(z.string().max(1000, "Goals is too long")) }),
  z.object({ budget: req("Budget range"), timeline: req("Timeline"), readiness: req("Technical readiness"), risk: req("Risk tolerance"), buildBuy: req("Build vs buy") }),
] as const;

type Form = Record<string, string | string[]>;
const empty: Form = {
  name: "", industry: "", model: "", size: "", revenue: "", employees: "", market: "", website: "",
  channels: [], orderVolume: "", inventory: "", service: "", marketing: "", logistics: "", finance: "", bottlenecks: [], bottleneckNotes: "",
  platform: "", crm: "", analytics: "", dataQuality: "", existingAI: "",
  challenges: [], goals: "",
  budget: "", timeline: "", readiness: "", risk: "", buildBuy: "",
};

const sample: Form = {
  ...empty,
  name: business.name, industry: "Fashion & apparel", model: "Direct-to-consumer (D2C)", size: "Mid-size (51–200)",
  revenue: "$10M–$25M", employees: String(business.employees), market: "India and US", website: "https://urbanthreads.example",
  channels: ["Own website", "Marketplaces", "Social commerce"], orderVolume: "5,000–20,000 / month", inventory: "Spreadsheets",
  service: "Zendesk, in-house team", marketing: "In-house + agency", logistics: "3PL partners", finance: "Manual spreadsheets",
  bottlenecks: ["Customer support", "Inventory planning", "Reporting"], bottleneckNotes: "Support backlog spikes during Diwali and Black Friday.",
  platform: "Shopify", crm: "None", analytics: "Google Analytics, Shopify reports", dataQuality: "Fair", existingAI: "Basic email automation",
  challenges: ["High support workload", "Poor forecasting", "Stockouts", "Slow reporting"],
  goals: "Reduce support costs, improve stock availability, and speed up monthly reporting within 12 months.",
  budget: "$100K–$250K", timeline: "3–6 months", readiness: "Medium", risk: "Moderate", buildBuy: "Buy / partner",
};

const opts: Record<string, string[]> = {
  model: ["Direct-to-consumer (D2C)", "B2B", "Marketplace", "Hybrid"],
  size: ["Small (1–50)", "Mid-size (51–200)", "Large (200+)"],
  revenue: ["Under $1M", "$1M–$10M", "$10M–$25M", "$25M+"],
  orderVolume: ["Under 1,000 / month", "1,000–5,000 / month", "5,000–20,000 / month", "20,000+ / month"],
  inventory: ["Spreadsheets", "Shopify built-in", "Inventory software", "ERP"],
  dataQuality: ["Poor", "Fair", "Good", "Excellent"],
  budget: ["Under $50K", "$50K–$100K", "$100K–$250K", "$250K+"],
  timeline: ["Under 3 months", "3–6 months", "6–12 months", "12+ months"],
  readiness: ["Low", "Medium", "High"],
  risk: ["Conservative", "Moderate", "Aggressive"],
  buildBuy: ["Build in-house", "Buy / partner", "Not sure"],
};
const channelOpts = ["Own website", "Marketplaces", "Social commerce", "Retail stores", "Wholesale"];
const bottleneckOpts = ["Customer support", "Inventory planning", "Order fulfillment", "Marketing content", "Reporting", "Returns"];
const challengeOpts = ["High support workload", "Poor forecasting", "Stockouts", "Low conversion", "Manual data processing", "Slow reporting", "High costs", "Inefficient workflows"];

const steps = ["Business profile", "Operations", "Technology", "Challenges & goals", "Budget & readiness", "Review"];
const labels: Record<string, string> = {
  name: "Business name", industry: "Industry", model: "Business model", size: "Company size", revenue: "Revenue range", employees: "Employees",
  market: "Market", website: "Website", channels: "Sales channels", orderVolume: "Order volume", inventory: "Inventory management",
  service: "Customer service", marketing: "Marketing", logistics: "Logistics", finance: "Finance", bottlenecks: "Bottlenecks",
  bottleneckNotes: "Bottleneck notes", platform: "E-commerce platform", crm: "CRM/ERP", analytics: "Analytics tools", dataQuality: "Data quality",
  existingAI: "Existing AI/automation", challenges: "Challenges", goals: "Goals", budget: "Budget range", timeline: "Timeline",
  readiness: "Technical readiness", risk: "Risk tolerance", buildBuy: "Build vs buy",
};
const stepFields = schemas.map((s) => Object.keys(s.shape));

function Wizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"form" | "analyzing" | "done">("form");

  const set = (k: string, v: string | string[]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const validate = (i: number) => {
    const schema = schemas[i];
    if (!schema) return true;
    const r = schema.safeParse(form);
    if (r.success) { setErrors({}); return true; }
    const e: Record<string, string> = {};
    for (const iss of r.error.issues) { const k = String(iss.path[0]); if (!e[k]) e[k] = iss.message; }
    setErrors(e);
    return false;
  };
  const next = () => { if (validate(step)) { setStep((s) => s + 1); window.scrollTo(0, 0); } };
  const submit = () => {
    const bad = schemas.findIndex((_, i) => !schemas[i]!.safeParse(form).success);
    if (bad >= 0) { setStep(bad); validate(bad); return; }
    setPhase("analyzing");
    setTimeout(() => setPhase("done"), 2000);
  };

  if (phase === "analyzing") return (
    <Card className="mx-auto max-w-lg shadow-none"><CardContent className="flex flex-col items-center gap-3 p-10 text-center" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="font-medium">Analyzing your business…</p>
      <p className="text-sm text-muted-foreground">Identifying and scoring AI opportunities.</p>
    </CardContent></Card>
  );
  if (phase === "done") return (
    <Card className="mx-auto max-w-lg shadow-none"><CardContent className="flex flex-col items-center gap-3 p-10 text-center">
      <CheckCircle2 className="h-10 w-10 text-primary" />
      <p className="text-lg font-semibold">Assessment complete</p>
      <p className="text-sm text-muted-foreground">We identified AI opportunities for {String(form["name"])}. Results use sample data.</p>
      <Button asChild><Link to="/assessments/$id/results" params={{ id: "a1" }}>View results</Link></Button>
    </CardContent></Card>
  );

  const field = (k: string, type: "text" | "select" | "textarea" = "text", optional = false) => {
    const err = errors[k];
    const id = `f-${k}`;
    const props = { id, "aria-invalid": !!err, "aria-describedby": err ? `${id}-err` : undefined };
    return (
      <div className="space-y-1.5" key={k}>
        <Label htmlFor={id}>{labels[k]}{optional ? <span className="text-muted-foreground"> (optional)</span> : <span className="text-destructive"> *</span>}</Label>
        {type === "select" ? (
          <Select value={String(form[k])} onValueChange={(v) => set(k, v)}>
            <SelectTrigger {...props} className={err ? "border-destructive" : ""}><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{opts[k]!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        ) : type === "textarea" ? (
          <Textarea {...props} value={String(form[k])} onChange={(e) => set(k, e.target.value)} className={err ? "border-destructive" : ""} />
        ) : (
          <Input {...props} value={String(form[k])} onChange={(e) => set(k, e.target.value)} className={err ? "border-destructive" : ""} />
        )}
        {err && <p id={`${id}-err`} className="text-xs text-destructive">{err}</p>}
      </div>
    );
  };
  const checks = (k: string, options: string[], optional = false) => {
    const vals = form[k] as string[];
    return (
      <fieldset className="space-y-2" key={k}>
        <legend className="text-sm font-medium">{labels[k]}{optional ? <span className="text-muted-foreground"> (optional)</span> : <span className="text-destructive"> *</span>}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox checked={vals.includes(o)} onCheckedChange={(c) => set(k, c ? [...vals, o] : vals.filter((v) => v !== o))} />{o}
            </label>
          ))}
        </div>
        {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
      </fieldset>
    );
  };

  const body = [
    <div className="grid gap-4 sm:grid-cols-2">
      {field("name")}{field("industry")}{field("model", "select")}{field("size", "select")}
      {field("revenue", "select")}{field("employees")}{field("market")}{field("website", "text", true)}
    </div>,
    <div className="space-y-4">
      {checks("channels", channelOpts)}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("orderVolume", "select")}{field("inventory", "select")}{field("service")}{field("marketing")}{field("logistics")}{field("finance")}
      </div>
      {checks("bottlenecks", bottleneckOpts, true)}
      {field("bottleneckNotes", "textarea", true)}
    </div>,
    <div className="grid gap-4 sm:grid-cols-2">
      {field("platform")}{field("crm")}{field("analytics")}{field("dataQuality", "select")}{field("existingAI")}
    </div>,
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{labels["challenges"]}<span className="text-destructive"> *</span></legend>
        <div className="flex flex-wrap gap-2">
          {challengeOpts.map((c) => {
            const on = (form["challenges"] as string[]).includes(c);
            return (
              <button key={c} type="button" aria-pressed={on}
                onClick={() => set("challenges", on ? (form["challenges"] as string[]).filter((x) => x !== c) : [...(form["challenges"] as string[]), c])}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
                {c}
              </button>
            );
          })}
        </div>
        {errors["challenges"] && <p className="text-xs text-destructive">{errors["challenges"]}</p>}
      </fieldset>
      {field("goals", "textarea")}
    </div>,
    <div className="grid gap-4 sm:grid-cols-2">
      {field("budget", "select")}{field("timeline", "select")}{field("readiness", "select")}{field("risk", "select")}{field("buildBuy", "select")}
    </div>,
    <div className="space-y-4">
      {stepFields.map((fields, i) => (
        <div key={i} className="rounded-md border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{steps[i]}</h3>
            <button type="button" className="rounded text-sm font-medium text-primary hover:underline" onClick={() => setStep(i)}>Edit</button>
          </div>
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {fields.map((k) => {
              const v = form[k]!;
              const s = Array.isArray(v) ? v.join(", ") : v;
              return <div key={k} className="flex gap-2"><dt className="shrink-0 text-muted-foreground">{labels[k]}:</dt><dd>{s || "—"}</dd></div>;
            })}
          </dl>
        </div>
      ))}
    </div>,
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Step {step + 1} of {steps.length}: {steps[step]}</span>
          <span className="text-muted-foreground">{Math.round(((step + 1) / steps.length) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / steps.length) * 100} aria-label="Assessment progress" />
      </div>
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{steps[step]}</CardTitle>
          {step === 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => { setForm(sample); setErrors({}); }}>
              <Wand2 className="h-4 w-4" /> Fill with sample data
            </Button>
          )}
        </CardHeader>
        <CardContent>{body[step]}</CardContent>
      </Card>
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => { setErrors({}); setStep((s) => s - 1); }} disabled={step === 0}>Back</Button>
        {step < steps.length - 1 ? <Button onClick={next}>Continue</Button> : <Button onClick={submit}>Submit</Button>}
      </div>
    </div>
  );
}
