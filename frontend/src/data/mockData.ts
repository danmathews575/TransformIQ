export type Level = "High" | "Medium" | "Low";

export interface Business {
  name: string;
  industry: string;
  stack: string[];
  employees: number;
  annualRevenueUSD: number;
  markets: string[];
}

export interface Opportunity {
  id: string;
  name: string;
  function: string;
  impact: Level;
  feasibility: number;
  effort: Level;
  investmentUSD: number;
  recurringCostUSD: number;
  grossAnnualBenefitUSD: number;
  netAnnualBenefitUSD: number;
  paybackMonths: number;
  priorityScore: number;
  whyItMatters: string;
}

export interface Assessment {
  id: string;
  name: string;
  date: string;
  status: "Completed" | "In progress";
  opportunitiesCount: number;
  valuePotential: string;
  topOpportunity: string;
}

export interface Activity {
  id: string;
  text: string;
  time: string;
}

export const business: Business = {
  name: "Urban Threads Co.",
  industry: "Direct-to-consumer fashion e-commerce",
  stack: ["Shopify", "Zendesk"],
  employees: 85,
  annualRevenueUSD: 12_000_000,
  markets: ["India", "US"],
};

export const currentUser = { name: "Priya Sharma", initials: "PS" };

export const workspaces = ["Urban Threads Co.", "Sandbox workspace"];

export const opportunities: Opportunity[] = [
  { id: "1", name: "Customer Support Automation", function: "Customer Service", impact: "High", feasibility: 85, effort: "Medium", investmentUSD: 60000, recurringCostUSD: 18000, grossAnnualBenefitUSD: 120000, netAnnualBenefitUSD: 102000, paybackMonths: 7, priorityScore: 92, whyItMatters: "Deflects repetitive Zendesk tickets like order status and returns." },
  { id: "2", name: "Demand Forecasting & Inventory Optimization", function: "Inventory", impact: "High", feasibility: 72, effort: "High", investmentUSD: 120000, recurringCostUSD: 30000, grossAnnualBenefitUSD: 160000, netAnnualBenefitUSD: 130000, paybackMonths: 11, priorityScore: 88, whyItMatters: "Reduces stockouts and overstock across India and US markets." },
  { id: "3", name: "Personalized Product Recommendations", function: "Marketing", impact: "Medium", feasibility: 80, effort: "Medium", investmentUSD: 45000, recurringCostUSD: 10000, grossAnnualBenefitUSD: 80000, netAnnualBenefitUSD: 70000, paybackMonths: 8, priorityScore: 81, whyItMatters: "Lifts average order value on the Shopify storefront." },
  { id: "4", name: "Automated Financial Reporting", function: "Finance", impact: "Medium", feasibility: 90, effort: "Low", investmentUSD: 25000, recurringCostUSD: 5000, grossAnnualBenefitUSD: 55000, netAnnualBenefitUSD: 50000, paybackMonths: 6, priorityScore: 74, whyItMatters: "Cuts manual month-end close work for the finance team." },
  { id: "5", name: "Marketing Content Generation", function: "Marketing", impact: "Low", feasibility: 78, effort: "Low", investmentUSD: 20000, recurringCostUSD: 6000, grossAnnualBenefitUSD: 40000, netAnnualBenefitUSD: 34000, paybackMonths: 7, priorityScore: 69, whyItMatters: "Speeds up product descriptions and campaign copy." },
];

export const assessments: Assessment[] = [
  { id: "a1", name: "Urban Threads Co.", date: "12 Oct 2026", status: "Completed", opportunitiesCount: 5, valuePotential: "$455K", topOpportunity: "Customer Support Automation" },
  { id: "a2", name: "Urban Threads Co.", date: "14 Jul 2026", status: "Completed", opportunitiesCount: 4, valuePotential: "$380K", topOpportunity: "Demand Forecasting" },
  { id: "a3", name: "Urban Threads Co.", date: "02 Oct 2026", status: "In progress", opportunitiesCount: 0, valuePotential: "n/a", topOpportunity: "n/a" },
];

export const kpis = {
  completedAssessments: 2,
  estimatedAnnualValue: "$455K",
  highPriorityOpportunities: 3,
  avgPaybackMonths: 7.8,
};

export const activity: Activity[] = [
  { id: "1", text: "Assessment completed for Urban Threads Co.", time: "3 days ago" },
  { id: "2", text: "Customer Support Automation ranked top priority", time: "3 days ago" },
  { id: "3", text: "New assessment started", time: "13 days ago" },
  { id: "4", text: "Business case drafted for Demand Forecasting", time: "3 weeks ago" },
];

export function opportunitiesByFunction() {
  const map = new Map<string, { function: string; count: number; value: number }>();
  for (const o of opportunities) {
    const e = map.get(o.function) ?? { function: o.function, count: 0, value: 0 };
    e.count += 1;
    e.value += o.netAnnualBenefitUSD;
    map.set(o.function, e);
  }
  return [...map.values()];
}

export const formatUSD = (n: number) =>
  n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

export const overallReadinessPct = 68;

export const dataLimitations =
  "Estimates are based on self-reported assessment answers and industry benchmarks, not audited financials. Ticket volumes, inventory history and conversion data were not connected, so figures may vary by ±25%.";

export interface OpportunityDetail {
  problem: string;
  solution: string;
  fit: string;
  outcomes: string[];
  data: string[];
  risks: string[];
  metrics: string[];
  sources: { title: string; publisher: string }[];
  nextSteps: string[];
}

export const opportunityDetails: Record<string, OpportunityDetail> = {
  "1": {
    problem: "The 6-person support team handles roughly 9,000 Zendesk tickets a month. About 60% are repetitive: \"where is my order\", size exchanges and return labels. First response time has drifted to 14 hours during sale events, and Diwali and Black Friday peaks require temporary staff.",
    solution: "An AI agent inside Zendesk that answers order-status, return and sizing questions using live Shopify order data and the return policy, drafts replies for agents on complex tickets, and hands off to a human with full context when confidence is low.",
    fit: "Urban Threads already runs Shopify and Zendesk, both with mature APIs, so no data migration is needed. Ticket history in both India and US markets gives enough examples to tune tone and policy answers per region.",
    outcomes: ["40–55% of tickets resolved without an agent", "First response time under 1 hour, including sale peaks", "Avoids 2–3 seasonal hires per year", "Agents focus on exchanges, complaints and VIP customers"],
    data: ["Zendesk ticket history (12+ months)", "Shopify orders and fulfillment status API", "Shipping carrier tracking (Delhivery, UPS)", "Return and exchange policy documents per market"],
    risks: ["Wrong answers on refunds could create chargebacks — keep refunds human-approved", "Hindi/Hinglish queries need testing before India launch", "Depends on accurate carrier tracking data"],
    metrics: ["Automated resolution rate", "First response time", "CSAT on automated vs human tickets", "Cost per ticket"],
    sources: [{ title: "State of customer service automation in retail", publisher: "Sample source" }, { title: "Benchmark: AI deflection rates for apparel e-commerce", publisher: "Sample source" }],
    nextSteps: ["Export 3 months of tickets and tag top 10 intents", "Shortlist 2 Zendesk-native AI vendors", "Pilot on US order-status tickets for 4 weeks"],
  },
  "2": {
    problem: "Buying is done in spreadsheets from last season's sales. Best-selling sizes of core styles stock out within weeks while slow colours sit in the warehouse, tying up an estimated $900K in excess inventory and forcing end-of-season markdowns.",
    solution: "A forecasting model that predicts demand by style, size and market using sales history, seasonality, promotions and regional festivals, then recommends reorder quantities and flags slow movers early for markdown or reallocation.",
    fit: "With two markets that peak at different times (Diwali vs Black Friday/holiday), Urban Threads benefits strongly from market-level forecasts. Shopify holds 3+ years of order history, enough to train reliable models.",
    outcomes: ["20–30% fewer stockouts on core styles", "10–15% lower excess inventory", "Fewer deep end-of-season markdowns", "Buying decisions made in days, not weeks"],
    data: ["Shopify order and inventory history (3 years)", "Purchase orders and supplier lead times", "Promotion and marketing calendar", "Warehouse stock levels per location"],
    risks: ["Highest effort: requires clean SKU and size data", "New styles have no history — needs similar-item logic", "Buying team adoption; model must be explainable", "Supplier lead-time variability can limit gains"],
    metrics: ["Forecast accuracy (MAPE) by category", "Stockout rate", "Inventory turnover", "Markdown percentage"],
    sources: [{ title: "Demand forecasting outcomes in fashion retail", publisher: "Sample source" }, { title: "Inventory optimization for DTC brands", publisher: "Sample source" }],
    nextSteps: ["Audit SKU, size and variant data quality", "Run a backtest on last two seasons", "Define reorder workflow with the buying team"],
  },
  "3": {
    problem: "The storefront shows the same \"bestsellers\" to every visitor. Average order value is flat at about $62, and returning customers rarely see items related to what they bought before.",
    solution: "Personalized recommendations on product pages, cart and email that use browsing behaviour, past purchases, size and regional preferences to suggest complementary items and complete-the-look outfits.",
    fit: "Shopify supports recommendation apps and APIs out of the box, and fashion is well suited to complete-the-look bundles. Separate India and US catalogues can be modelled per market.",
    outcomes: ["5–8% higher average order value", "Higher repeat purchase rate", "Better click-through on post-purchase emails"],
    data: ["Shopify product catalogue with attributes", "Order history and customer profiles", "On-site browsing events", "Email engagement data"],
    risks: ["Cold start for new visitors and new products", "Must respect consent and privacy rules in both markets", "Poor product tagging lowers recommendation quality"],
    metrics: ["Average order value", "Recommendation click-through rate", "Revenue from recommended items", "Repeat purchase rate"],
    sources: [{ title: "Personalization impact on apparel e-commerce", publisher: "Sample source" }, { title: "Cross-sell benchmarks for Shopify stores", publisher: "Sample source" }],
    nextSteps: ["Clean up product tags (style, colour, occasion)", "A/B test a recommendation app on product pages", "Extend to post-purchase emails"],
  },
  "4": {
    problem: "Month-end close takes the 3-person finance team about 8 working days. Revenue, refunds, payment gateway fees and multi-currency (INR/USD) figures are reconciled by hand across Shopify, Razorpay, Stripe and the bank.",
    solution: "Automated reconciliation that pulls payouts, fees and refunds from each source, matches them to orders, flags mismatches, and generates draft P&L and channel reports with an AI-written variance summary.",
    fit: "Data sources are standard and API-accessible, making this the most feasible opportunity (90). It is low effort and can be live within a quarter, building internal confidence in AI.",
    outcomes: ["Month-end close cut from 8 to 3 days", "Fewer reconciliation errors", "Weekly management reports instead of monthly"],
    data: ["Shopify payouts and orders", "Razorpay and Stripe settlement reports", "Bank statements", "Chart of accounts"],
    risks: ["Currency conversion rules must be agreed with the accountant", "Edge cases (partial refunds, chargebacks) need human review"],
    metrics: ["Days to close", "Unmatched transaction rate", "Hours spent on reconciliation"],
    sources: [{ title: "Finance automation in mid-size e-commerce", publisher: "Sample source" }, { title: "Reconciliation time benchmarks", publisher: "Sample source" }],
    nextSteps: ["Map all payment and payout sources", "Pilot automated reconciliation on one month", "Add AI variance summary to the monthly report"],
  },
  "5": {
    problem: "Each new collection needs 150–200 product descriptions, ad variants and email copy. A small marketing team writes them manually, delaying launches by 1–2 weeks and producing inconsistent tone between the India and US sites.",
    solution: "An AI writing assistant trained on the brand voice that drafts product descriptions, SEO metadata, ad variants and emails from product attributes and photos, with human review before publishing.",
    fit: "Low effort and quick to adopt with existing tools. Brand guidelines and past top-performing copy already exist to guide the model.",
    outcomes: ["Collection copy ready in days, not weeks", "Consistent brand voice across markets", "More ad variants to test"],
    data: ["Product attributes and photos", "Brand voice guidelines", "Past high-performing copy", "SEO keyword list"],
    risks: ["Generic or inaccurate claims if not reviewed", "Lower impact than other opportunities", "Copyright and claims checks needed"],
    metrics: ["Time to launch a collection", "Copy production hours", "Ad click-through rate", "Organic search traffic to product pages"],
    sources: [{ title: "Generative AI for retail marketing teams", publisher: "Sample source" }, { title: "Content velocity benchmarks for DTC brands", publisher: "Sample source" }],
    nextSteps: ["Document brand voice with 20 example descriptions", "Trial on the next collection launch", "Set up a review checklist"],
  },
};

export const functions = Array.from(new Set(opportunities.map((o) => o.function)));
