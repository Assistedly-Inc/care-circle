import fs from "node:fs/promises";

const API_KEY = process.env.FIRECRAWL_API_KEY;

if (!API_KEY) {
  console.error("Set FIRECRAWL_API_KEY first.");
  process.exit(1);
}

const prompt = `
Research the existing software products and platforms in the hospital discharge
planning and patient flow management space.

Products to research:
1. Signal 1 (https://signal1.ai), focused on discharge prediction and patient flow
2. LeanTaaS (https://leantaas.com), focused on patient flow, scheduling, and capacity management
3. Qventus (https://qventus.com), focused on OR scheduling and patient flow
4. CarePort / WellSky (https://careporthealth.com), focused on care transitions
5. Any other relevant discharge planning software, patient flow platforms,
   bed management tools, or care transition products

For each product, find:
- What it does specifically for discharge planning
- Pricing model and estimated price
- Target customer, including hospital size and department
- Key features
- Market position and estimated revenue or headcount
- Gaps or weaknesses that a new entrant could exploit

Goals:
- Product unfunded start up can develop which has a moat
- Has minimal compliance requirements,  few or no competitors with $1b+ in revenue

Also research the discharge planning software and patient flow management market:
- Market size
- Growth rate
- Key players
- Market definition and scope
- Major trends

Use official company websites, product pages, documentation, customer case studies,
job postings, public filings, reputable industry reports, and credible third-party
sources. Clearly distinguish verified facts, estimates, and analyst inferences.
Do not invent pricing, revenue, or headcount. If information is unavailable, say so.
Include source URLs for every substantive claim and publication dates when available.
Prefer recent sources.
`;

const schema = {
  type: "object",
  properties: {
    executive_summary: { type: "string" },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          website: { type: "string" },
          discharge_planning_functionality: { type: "string" },
          pricing_model: { type: "string" },
          estimated_price: { type: "string" },
          target_customer: { type: "string" },
          key_features: { type: "array", items: { type: "string" } },
          market_position: { type: "string" },
          estimated_revenue: { type: "string" },
          estimated_headcount: { type: "string" },
          gaps_or_weaknesses: { type: "array", items: { type: "string" } },
          sources: { type: "array", items: { type: "string" } }
        },
        required: ["name", "website", "discharge_planning_functionality", "target_customer", "key_features", "gaps_or_weaknesses", "sources"]
      }
    },
    market: {
      type: "object",
      properties: {
        market_definition: { type: "string" },
        estimated_market_size: { type: "string" },
        growth_rate: { type: "string" },
        key_players: { type: "array", items: { type: "string" } },
        market_trends: { type: "array", items: { type: "string" } },
        sources: { type: "array", items: { type: "string" } }
      },
      required: ["market_definition", "key_players", "market_trends", "sources"]
    },
    research_limitations: { type: "array", items: { type: "string" } }
  },
  required: ["executive_summary", "products", "market", "research_limitations"]
};

async function firecrawl(path, options = {}) {
  const response = await fetch(`https://api.firecrawl.dev/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Firecrawl error ${response.status}: ${JSON.stringify(body, null, 2)}`);
  }
  return body;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  await fs.mkdir(".firecrawl", { recursive: true });
  console.log("Starting research job...");
  const started = await firecrawl("/agent", {
    method: "POST",
    body: JSON.stringify({ prompt, schema, model: "spark-2", maxCredits: 200 })
  });
  const jobId = started.id;
  if (!jobId) { throw new Error(`No job ID returned:\n${JSON.stringify(started, null, 2)}`); }
  console.log(`Job started: ${jobId}`);
  while (true) {
    const status = await firecrawl(`/agent/${jobId}`, { method: "GET" });
    console.log(`Status: ${status.status}`);
    if (status.status === "completed") {
      await fs.writeFile(".firecrawl/discharge-planning-research.json", JSON.stringify(status.data, null, 2));
      console.log("Saved results to .firecrawl/discharge-planning-research.json");
      console.log("\nExecutive summary:\n");
      console.log(status.data?.executive_summary || "No summary returned.");
      return;
    }
    if (status.status === "failed") {
      await fs.writeFile(".firecrawl/discharge-planning-failed.json", JSON.stringify(status, null, 2));
      throw new Error(`Research failed:\n${JSON.stringify(status, null, 2)}`);
    }
    await sleep(15000);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
