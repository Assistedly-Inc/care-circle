export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function hoursUntilDue(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  return (due - now) / (1000 * 60 * 60);
}

export function isOverdue(dueDate) {
  return hoursUntilDue(dueDate) < 0;
}

export function isWithin24h(dueDate) {
  const h = hoursUntilDue(dueDate);
  return h >= 0 && h <= 24;
}

export function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export function errorResponse(message, status = 400, corsHeaders = {}) {
  return jsonResponse({ success: false, error: message }, status, corsHeaders);
}

export const corsHeadersBase = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
