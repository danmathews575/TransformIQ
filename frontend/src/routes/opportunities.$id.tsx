import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, MessageSquare, Plus, Calculator, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUSD, opportunities, opportunityDetails } from "@/data/mockData";

export const Route = createFileRoute("/opportunities/$id")({
  loader: ({ params }) => {
    const opp = opportunities.find((o) => o.id === params.id);
    const detail = opportunityDetails[params.id];
    if (!opp || !detail) throw notFound();
    return { opp, detail };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.opp.name} — TransformIQ` : "Opportunity — TransformIQ" },
      { name: "description", content: loaderData?.opp.whyItMatters ?? "AI opportunity detail." },
      { property: "og:title", content: loaderData ? `${loaderData.opp.name} — TransformIQ` : "Opportunity — TransformIQ" },
      { property: "og:description", content: loaderData?.opp.whyItMatters ?? "AI opportunity detail." },
    ],
  }),
  component: OpportunityDetail,
});

function List({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function OpportunityDetail() {
  const { opp, detail } = Route.useLoaderData();
  const [onRoadmap, setOnRoadmap] = useState(false);

  const toggleRoadmap = () => {
    const next = !onRoadmap;
    setOnRoadmap(next);
    toast.success(next ? `${opp.name} added to roadmap` : `${opp.name} removed from roadmap`);
  };

  const money = [
    { label: "Est. investment", value: formatUSD(opp.investmentUSD) },
    { label: "Est. recurring cost / yr", value: formatUSD(opp.recurringCostUSD) },
    { label: "Est. gross benefit / yr", value: formatUSD(opp.grossAnnualBenefitUSD) },
    { label: "Est. net benefit / yr", value: formatUSD(opp.netAnnualBenefitUSD) },
    { label: "Est. payback", value: `${opp.paybackMonths} months` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to="/opportunities" className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All opportunities
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{opp.name}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">{opp.function}</Badge>
            <Badge variant={opp.impact === "High" ? "default" : "secondary"}>Impact: {opp.impact}</Badge>
            <Badge variant="outline">Feasibility {opp.feasibility}</Badge>
            <Badge variant="outline">Effort: {opp.effort}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={onRoadmap ? "secondary" : "default"} onClick={toggleRoadmap} aria-pressed={onRoadmap}>
            {onRoadmap ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {onRoadmap ? "On roadmap" : "Add to roadmap"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/consultant" search={{ topic: opp.id }}><MessageSquare className="h-4 w-4" /> Ask AI Consultant</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/roi" search={{ opportunity: opp.id }}><Calculator className="h-4 w-4" /> View ROI</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:order-2">
          <div className="rounded-lg border-2 border-primary bg-accent p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">Calculated score</p>
            <p className="mt-1 text-4xl font-bold text-accent-foreground">{opp.priorityScore}<span className="text-base font-medium">/100</span></p>
            <p className="mt-1 text-xs text-accent-foreground">Priority score from impact, feasibility, effort and estimated payback.</p>
          </div>
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Estimated costs and benefits</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {money.map((m) => (
                  <div key={m.label} className="flex justify-between gap-2 border-b pb-2 last:border-0">
                    <dt className="text-muted-foreground">{m.label}</dt>
                    <dd className="font-medium tabular-nums">{m.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">Estimates only, not guaranteed results.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none lg:col-span-2 lg:order-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> AI-generated explanation (sample)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Section title="Business problem"><p className="text-sm">{detail.problem}</p></Section>
            <Section title="Proposed AI solution"><p className="text-sm">{detail.solution}</p></Section>
            <Section title="Why this fits Urban Threads"><p className="text-sm">{detail.fit}</p></Section>
            <Section title="Expected outcomes"><List items={detail.outcomes} /></Section>
            <Section title="Required data and integrations"><List items={detail.data} /></Section>
            <Section title="Risks and dependencies"><List items={detail.risks} /></Section>
            <Section title="Success metrics"><List items={detail.metrics} /></Section>
            <Section title="Supporting sources">
              <ul className="space-y-1.5 text-sm">
                {detail.sources.map((s) => (
                  <li key={s.title} className="flex items-center gap-2">
                    <Badge variant="outline">{s.publisher}</Badge>{s.title}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Next steps">
              <ol className="list-decimal space-y-1 pl-5 text-sm">{detail.nextSteps.map((n) => <li key={n}>{n}</li>)}</ol>
            </Section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
