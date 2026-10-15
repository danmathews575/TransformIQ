import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { activity, assessments, business, currentUser, kpis, opportunities, opportunitiesByFunction, formatUSD } from "@/data/mockData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — TransformIQ" },
      { name: "description", content: "AI transformation overview: KPIs, priority opportunities and assessments for your e-commerce business." },
      { property: "og:title", content: "Overview — TransformIQ" },
      { property: "og:description", content: "AI transformation overview: KPIs, priority opportunities and assessments." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);
  if (loading) return <OverviewSkeleton />;
  return <OverviewContent />;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" /><Skeleton className="h-72" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

const levelVariant = (l: string) => (l === "High" ? "default" : l === "Medium" ? "secondary" : "outline") as "default" | "secondary" | "outline";

function OverviewContent() {
  const navigate = useNavigate();
  const latest = assessments[0]!;
  const top3 = [...opportunities].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3);
  const chartData = opportunitiesByFunction();
  const kpiCards = [
    { label: "Completed assessments", value: String(kpis.completedAssessments) },
    { label: "Estimated annual value potential", value: kpis.estimatedAnnualValue, note: "estimate" },
    { label: "High-priority opportunities", value: String(kpis.highPriorityOpportunities) },
    { label: "Avg estimated payback", value: `${kpis.avgPaybackMonths} mo`, note: "estimate" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Welcome back, {currentUser.name.split(" ")[0]}</h2>
          <p className="text-sm text-muted-foreground">
            Workspace: {business.name} · Latest assessment {latest.date} — <span className="font-medium text-foreground">{latest.status}</span>
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/assessments/new"><Plus className="h-4 w-4" /> New Assessment</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold">{k.value}</p>
              {k.note && <p className="text-xs text-muted-foreground">Estimated</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Opportunities & estimated net annual value by function</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} onClick={(e) => {
                const fn = e?.activeLabel;
                if (fn) navigate({ to: "/opportunities", search: { function: String(fn) } });
              }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="function" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis yAxisId="v" tickFormatter={formatUSD} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} formatter={(v: number, n) => n === "value" ? [`${formatUSD(v)} (estimated)`, "Value"] : [v, "Opportunities"]} />
                <YAxis yAxisId="c" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Bar yAxisId="v" dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                <Bar dataKey="count" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} yAxisId="c" className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <p className="px-6 pb-4 text-xs text-muted-foreground">
            {chartData.map((d) => `${d.function}: ${d.count}`).join(" · ")} — click a bar to filter
          </p>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Priority opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {top3.map((o) => (
              <Link key={o.id} to="/opportunities/$id" params={{ id: o.id }} className="block rounded-md border p-3 transition-colors hover:bg-muted">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">{o.whyItMatters}</p>
                  </div>
                  <span className="rounded bg-accent px-2 py-0.5 text-sm font-semibold text-accent-foreground">{o.priorityScore}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline">{o.function}</Badge>
                  <Badge variant={levelVariant(o.impact)}>Impact: {o.impact}</Badge>
                  <Badge variant="outline">Feasibility {o.feasibility}</Badge>
                  <Badge variant="outline">Effort: {o.effort}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent assessments</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Opps</TableHead><TableHead>Est. value</TableHead><TableHead>Top opportunity</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.date}</TableCell>
                    <TableCell><Badge variant={a.status === "Completed" ? "secondary" : "outline"}>{a.status}</Badge></TableCell>
                    <TableCell className="text-right">{a.opportunitiesCount}</TableCell>
                    <TableCell>{a.valuePotential}</TableCell>
                    <TableCell>{a.topOpportunity}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild disabled={a.status !== "Completed"}>
                        <Link to="/assessments">Open report</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent activity</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div><p>{a.text}</p><p className="text-xs text-muted-foreground">{a.time}</p></div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-accent shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent-foreground" />
            <p className="text-sm text-accent-foreground">Not sure where to start? Ask your AI Consultant to identify your highest-value AI opportunities.</p>
          </div>
          <Button asChild variant="default"><Link to="/consultant">Ask the consultant <ArrowRight className="h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
