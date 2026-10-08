import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const API_BASE = "https://care-api.internal";

export interface Env {
  CARE_API: Fetcher;
  MCP_ACCESS_TOKEN: string;
  CC_EMAIL: string;
  CC_PASSWORD: string;
  MCP_ENABLE_WRITES?: string;
}

let cachedToken: { token: string; exp: number } | null = null;

function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

async function getToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const res = await env.CARE_API.fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: env.CC_EMAIL, password: env.CC_PASSWORD }),
  });
  if (!res.ok) throw new Error(`CareCircle login failed with status ${res.status}`);
  const data = (await res.json().catch(() => ({}))) as { token?: string };
  if (!data.token) throw new Error("CareCircle login did not return a token");
  cachedToken = { token: data.token, exp: jwtExp(data.token) };
  return data.token;
}

async function cc(env: Env, method: string, path: string, body?: unknown): Promise<Response> {
  const call = async (): Promise<Response> => {
    const token = await getToken(env);
    return env.CARE_API.fetch(`${API_BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };
  let res = await call();
  if (res.status === 401) {
    cachedToken = null;
    res = await call();
  }
  return res;
}

function ok(result: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
}
function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

async function api(env: Env, what: string, method: string, path: string, body?: unknown) {
  const res = await cc(env, method, path, body);
  const data = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ evt: "cc_api", what, method, status: res.status, ok: res.ok }));
  if (!res.ok) throw new Error(`${what} failed (${res.status})`);
  return data;
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

const TASK_STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
const BARRIER_STATUSES = ["IDENTIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "ESCALATED"] as const;
const BARRIER_TYPES = ["transport", "medications", "placement", "insurance", "family", "pending_test", "social", "other"] as const;
const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

const ID_SCHEMA = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "must be a UUID");

function requireWritesEnabled(env: Env): void {
  if (env.MCP_ENABLE_WRITES !== "true") {
    throw new Error("Write operations are disabled for this MCP deployment (MCP_ENABLE_WRITES is not set to true)");
  }
}


function buildServer(env: Env) {
  const server = new McpServer({ name: "care-circle", version: "1.0.0" });

  server.registerTool(
    "list_care_profiles",
    { description: "List care profiles (patient cases) accessible to this service account. Response contains PHI - do not forward outside the care circle.", inputSchema: {} },
    async () => { try { return ok(await api(env, "List profiles", "GET", "/api/care-profiles")); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "get_care_profile",
    { description: "Get one care profile by id, including medications, tasks, and barriers. Contains PHI.", inputSchema: { profile_id: ID_SCHEMA } },
    async ({ profile_id }) => { try { return ok(await api(env, "Get profile", "GET", `/api/care-profiles/${profile_id}`)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "create_care_profile",
    { description: "Create a new care profile (patient case).", inputSchema: { first_name: z.string(), last_name: z.string(), date_of_birth: z.string().optional(), primary_diagnosis: z.string().optional() } },
    async (a) => { try { requireWritesEnabled(env); return ok(await api(env, "Create profile", "POST", "/api/care-profiles", { firstName: a.first_name, lastName: a.last_name, dateOfBirth: a.date_of_birth, primaryDiagnosis: a.primary_diagnosis })); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "update_care_profile",
    { description: "Update an existing care profile. Only provided fields are changed.", inputSchema: { profile_id: ID_SCHEMA, first_name: z.string().optional(), last_name: z.string().optional(), date_of_birth: z.string().optional(), primary_diagnosis: z.string().optional() } },
    async (a) => { try { const body: Record<string, unknown> = {}; if (a.first_name) body.firstName = a.first_name; if (a.last_name) body.lastName = a.last_name; if (a.date_of_birth) body.dateOfBirth = a.date_of_birth; if (a.primary_diagnosis) body.primaryDiagnosis = a.primary_diagnosis; requireWritesEnabled(env); return ok(await api(env, "Update profile", "PATCH", `/api/care-profiles/${a.profile_id}`, body)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "list_tasks",
    { description: "List tasks for a care profile.", inputSchema: { profile_id: ID_SCHEMA } },
    async ({ profile_id }) => { try { return ok(await api(env, "List tasks", "GET", `/api/care-profiles/${profile_id}/tasks`)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "add_task",
    { description: "Add a task to a care profile. due_date format YYYY-MM-DD. template_id optionally seeds title/owner/due date.", inputSchema: { profile_id: ID_SCHEMA, title: z.string(), description: z.string().optional(), owner: z.string().optional(), due_date: z.string().optional(), template_id: z.string().optional() } },
    async (a) => { try { requireWritesEnabled(env); return ok(await api(env, "Add task", "POST", `/api/care-profiles/${a.profile_id}/tasks`, { title: a.title, description: a.description, owner: a.owner, dueDate: a.due_date, templateId: a.template_id })); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "update_task",
    { description: "Update a task. status is one of todo, in_progress, blocked, done, cancelled.", inputSchema: { profile_id: ID_SCHEMA, task_id: ID_SCHEMA, title: z.string().optional(), description: z.string().optional(), owner: z.string().optional(), due_date: z.string().optional(), status: z.enum(TASK_STATUSES).optional() } },
    async (a) => { try { const body: Record<string, unknown> = {}; if (a.title) body.title = a.title; if (a.description) body.description = a.description; if (a.owner) body.owner = a.owner; if (a.due_date) body.dueDate = a.due_date; if (a.status) body.status = a.status; requireWritesEnabled(env); return ok(await api(env, "Update task", "PATCH", `/api/care-profiles/${a.profile_id}/tasks/${a.task_id}`, body)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "list_medications",
    { description: "List medications for a care profile. Contains PHI.", inputSchema: { profile_id: ID_SCHEMA } },
    async ({ profile_id }) => { try { return ok(await api(env, "List medications", "GET", `/api/care-profiles/${profile_id}/medications`)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "add_medication",
    { description: "Add a medication to a care profile.", inputSchema: { profile_id: ID_SCHEMA, name: z.string(), dose: z.string().optional(), schedule: z.string().optional(), notes: z.string().optional() } },
    async (a) => { try { requireWritesEnabled(env); return ok(await api(env, "Add medication", "POST", `/api/care-profiles/${a.profile_id}/medications`, { name: a.name, dose: a.dose, schedule: a.schedule, notes: a.notes })); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "list_barriers",
    { description: "List discharge barriers for a care profile with type, priority, status, owner, and due dates.", inputSchema: { profile_id: ID_SCHEMA } },
    async ({ profile_id }) => { try { return ok(await api(env, "List barriers", "GET", `/api/barriers/${profile_id}`)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "add_barrier",
    { description: "Add a discharge barrier. type is one of transport, medications, placement, insurance, family, pending_test, social, other. priority is HIGH, MEDIUM, or LOW. due_date format YYYY-MM-DD.", inputSchema: { profile_id: ID_SCHEMA, description: z.string(), type: z.enum(BARRIER_TYPES).optional(), priority: z.enum(PRIORITIES).optional(), owner: z.string().optional(), due_date: z.string().optional() } },
    async (a) => { try { requireWritesEnabled(env); return ok(await api(env, "Add barrier", "POST", `/api/barriers/${a.profile_id}`, { description: a.description, type: a.type, priority: a.priority, owner: a.owner, dueDate: a.due_date })); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "update_barrier",
    { description: "Update a discharge barrier. status is one of IDENTIFIED, ASSIGNED, IN_PROGRESS, RESOLVED, ESCALATED. Setting status to RESOLVED requires resolution_note.", inputSchema: { profile_id: ID_SCHEMA, barrier_id: ID_SCHEMA, status: z.enum(BARRIER_STATUSES).optional(), resolution_note: z.string().optional(), priority: z.enum(PRIORITIES).optional(), owner: z.string().optional(), due_date: z.string().optional() } },
    async (a) => { try { const body: Record<string, unknown> = {}; if (a.status) body.status = a.status; if (a.resolution_note) body.resolutionNote = a.resolution_note; if (a.priority) body.priority = a.priority; if (a.owner) body.owner = a.owner; if (a.due_date) body.dueDate = a.due_date; requireWritesEnabled(env); return ok(await api(env, "Update barrier", "PATCH", `/api/barriers/${a.profile_id}/${a.barrier_id}`, body)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "get_readiness",
    { description: "Get discharge readiness for a care profile: GREEN (no open barriers), AMBER (open MEDIUM), RED (open HIGH).", inputSchema: { profile_id: ID_SCHEMA } },
    async ({ profile_id }) => { try { return ok(await api(env, "Get readiness", "GET", `/api/barriers/${profile_id}/readiness`)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "get_metrics",
    { description: "Get pilot metrics across accessible cases: same-day discharge rate, barrier SLA breach rate, open barrier count, median time-to-resolution by type.", inputSchema: {} },
    async () => { try { return ok(await api(env, "Get metrics", "GET", "/api/barriers/metrics")); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "export_care_profile_fhir",
    { description: "Export a care profile as a FHIR R4 Bundle (collection) with Patient, MedicationStatement, Task, Consent, and DocumentReference resources. Contains PHI - do not forward outside the care circle.", inputSchema: { profile_id: z.string() } },
    async ({ profile_id }) => { try { return ok(await api(env, "Export FHIR", "GET", `/api/care-profiles/${profile_id}/export/fhir`)); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "get_outcome_analytics",
    { description: "Get outcome-linked analytics for accessible cases: admissions, discharges, same-day discharge rate, median length of stay, SLA compliance, top delay-causing barrier types. Optional site filter. Contains PHI - do not forward outside the care circle.", inputSchema: { site: z.string().optional() } },
    async ({ site }) => { try { return ok(await api(env, "Get outcome analytics", "GET", site ? `/api/analytics/outcomes?site=${encodeURIComponent(site)}` : "/api/analytics/outcomes")); } catch (err) { return fail(err); } },
  );

  server.registerTool(
    "send_invitation",
    { description: "Invite someone to a care profile's circle. role is coordinator, caregiver, or family.", inputSchema: { profile_id: ID_SCHEMA, email: z.string(), role: z.enum(["coordinator", "caregiver", "family"]).optional() } },
    async (a) => { try { requireWritesEnabled(env); return ok(await api(env, "Send invitation", "POST", "/api/invitations/send", { caseId: a.profile_id, email: a.email, role: a.role })); } catch (err) { return fail(err); } },
  );

  return server;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") {
      return new Response(JSON.stringify({ service: "care-circle-mcp", endpoint: "/mcp" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!env.MCP_ACCESS_TOKEN || !token || !(await safeEqual(token, env.MCP_ACCESS_TOKEN))) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return createMcpHandler(() => buildServer(env))(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
