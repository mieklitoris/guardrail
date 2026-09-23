import { parseVulnerabilityAction, type VulnerabilityAction, type SuiteRun } from "./vulnerability-labs.ts";
/** Pure, deterministic lab logic. No outbound requests or live vulnerable routes. */
export type Actor = "alice" | "bob" | "admin";
export type Profile = "baseline" | "hardened";
export type Ticket = {
  id: string;
  owner: Actor;
  title: string;
  status: "Open" | "Resolved";
};
export type SecurityEvent = {
  id: string;
  at: string;
  actor: Actor;
  kind: "access_denied" | "access_allowed" | "login_failed" | "ticket_created";
  resource: string;
  status: number;
  source: "simulation";
};
export type Check = {
  id: string;
  name: string;
  severity: "High" | "Medium";
  passed: boolean;
  evidence: string;
  fix: string;
  reference: string;
};
export type Run = { id: string; at: string; profile: Profile; checks: Check[] };
export type Alert = {
  id: string;
  name: string;
  actor: Actor;
  count: number;
  first: string;
  last: string;
  severity: "High" | "Medium";
  evidenceIds: string[];
  rule: string;
};
export type LabState = {
  version: number;
  runs: Run[];
  events: SecurityEvent[];
  tickets: Ticket[];
  lastActionAt: number;
  suiteRuns?: SuiteRun[];
};
export const initialState = (): LabState => ({
  version: 1,
  runs: [],
  events: [],
  lastActionAt: 0,
  tickets: [
    {
      id: "TKT-1041",
      owner: "alice",
      title: "Update account notification preferences",
      status: "Open",
    },
    {
      id: "TKT-1042",
      owner: "bob",
      title: "Review workspace access request",
      status: "Open",
    },
    {
      id: "TKT-1043",
      owner: "alice",
      title: "Enable audit log export",
      status: "Resolved",
    },
  ],
});
export function canReadTicket(actor: Actor | null, ticket: Ticket): boolean {
  return actor !== null && (actor === "admin" || actor === ticket.owner);
}
/** The insecure branch is an in-process fixture, never an exposed HTTP route. */
export function fixtureResponse(
  profile: Profile,
  actor: Actor | null,
  ticket: Ticket,
): Response {
  if (!actor) return new Response(null, { status: 401 });
  if (profile === "hardened" && !canReadTicket(actor, ticket))
    return new Response(null, { status: 403 });
  const headers: Record<string, string> =
    profile === "hardened"
      ? {
          "Content-Type": "application/json",
          "Content-Security-Policy":
            "default-src 'none'; frame-ancestors 'none'",
          "X-Content-Type-Options": "nosniff",
          "Set-Cookie":
            "session=fixture-only; Path=/; HttpOnly; Secure; SameSite=Lax",
        }
      : {
          "Content-Type": "application/json",
          "Set-Cookie": "session=fixture-only; Path=/",
        };
  return Response.json(ticket, { headers });
}
export function cookieIsHardened(value: string | null): boolean {
  if (!value) return false;
  const parts = value
    .split(";")
    .slice(1)
    .map((p) => p.trim().toLowerCase());
  return (
    parts.includes("httponly") &&
    parts.includes("secure") &&
    parts.some((p) => /^samesite=(lax|strict)$/.test(p))
  );
}
export function inspectHeaders(headers: Headers): boolean {
  const csp = headers.get("content-security-policy") || "";
  const directives = csp
    .toLowerCase()
    .split(";")
    .map((d) => d.trim().split(/\s+/));
  const frames = directives.find((d) => d[0] === "frame-ancestors");
  return (
    headers.get("x-content-type-options")?.toLowerCase() === "nosniff" &&
    !!frames &&
    frames.length === 2 &&
    frames[1] === "'none'"
  );
}
export function runChecks(
  profile: Profile,
  at = new Date().toISOString(),
): Run {
  const ticket = initialState().tickets[1];
  const foreign = fixtureResponse(profile, "alice", ticket);
  const own = fixtureResponse(profile, "bob", ticket);
  const admin = fixtureResponse(profile, "admin", ticket);
  const anon = fixtureResponse(profile, null, ticket);
  return {
    id: crypto.randomUUID(),
    at,
    profile,
    checks: [
      {
        id: "AUTHZ-01",
        name: "Ticket ownership enforcement",
        severity: "High",
        passed:
          foreign.status === 403 &&
          own.status === 200 &&
          admin.status === 200 &&
          anon.status === 401,
        evidence: `Foreign user: ${foreign.status} (expected 403). Owner: ${own.status} (200). Admin: ${admin.status} (200). Anonymous: ${anon.status} (401).`,
        fix: "Authenticate first, then allow a ticket read only when the actor owns it or has the admin role. Enforce this on every server request.",
        reference:
          "https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/05-Authorization_Testing/02-Testing_for_Bypassing_Authorization_Schema",
      },
      {
        id: "HEADERS-01",
        name: "Browser response protections",
        severity: "Medium",
        passed: inspectHeaders(own.headers),
        evidence: `Content-Security-Policy: ${own.headers.get("content-security-policy") || "missing"}. X-Content-Type-Options: ${own.headers.get("x-content-type-options") || "missing"}.`,
        fix: "Set a suitable Content Security Policy and X-Content-Type-Options: nosniff. This lab checks frame-ancestors 'none'; it does not validate a complete CSP.",
        reference: "https://owasp.org/projects/secure-headers-project",
      },
      {
        id: "COOKIE-01",
        name: "Session cookie attributes",
        severity: "Medium",
        passed: cookieIsHardened(own.headers.get("set-cookie")),
        evidence: `Set-Cookie: ${own.headers.get("set-cookie")}`,
        fix: "Use HttpOnly, Secure and an appropriate SameSite policy for session cookies. Use HTTPS. The fixture cookie is synthetic and never installed in your browser.",
        reference:
          "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html",
      },
    ],
  };
}
export function event(
  kind: SecurityEvent["kind"],
  actor: Actor,
  resource: string,
  status: number,
  at = new Date().toISOString(),
): SecurityEvent {
  return {
    id: crypto.randomUUID(),
    at,
    actor,
    resource,
    status,
    kind,
    source: "simulation",
  };
}
/** Windows are event-time based. Each threshold cluster produces one alert per actor/rule. */
export function detect(events: SecurityEvent[]): Alert[] {
  const alerts: Alert[] = [];
  for (const [kind, threshold, name, severity] of [
    ["access_denied", 3, "Repeated access denials", "High"],
    ["login_failed", 5, "Repeated failed logins", "Medium"],
  ] as const) {
    for (const actor of ["alice", "bob", "admin"] as const) {
      const sorted = events
        .filter((e) => e.kind === kind && e.actor === actor)
        .sort((a, b) => a.at.localeCompare(b.at));
      let pending: SecurityEvent[] = [];
      let current: Alert | undefined;
      for (const e of sorted) {
        pending = pending.filter(
          (p) => Date.parse(e.at) - Date.parse(p.at) <= 60_000,
        );
        pending.push(e);
        if (current && Date.parse(e.at) - Date.parse(current.first) <= 60_000) {
          current.count++;
          current.last = e.at;
          current.evidenceIds.push(e.id);
          continue;
        }
        current = undefined;
        if (pending.length >= threshold) {
          current = {
            id: `${kind}:${actor}:${pending[0].id}`,
            name,
            actor,
            count: pending.length,
            first: pending[0].at,
            last: e.at,
            severity,
            evidenceIds: pending.map((p) => p.id),
            rule: `${threshold}+ ${kind.replaceAll("_", " ")} by the same actor within 60 seconds`,
          };
          alerts.push(current);
          pending = [];
        }
      }
    }
  }
  return alerts.sort((a, b) => b.last.localeCompare(a.last));
}
export type Action =
  | VulnerabilityAction
  | { action: "scan"; profile: Profile }
  | { action: "investigate" }
  | { action: "simulate_logins" }
  | { action: "read_ticket"; actor: Actor; ticketId: string }
  | { action: "create_ticket"; actor: Actor; title: string };
export function parseAction(value: unknown): Action {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Choose a supported lab action.");
  const v = value as Record<string, unknown>;
  const vulnerabilityAction = parseVulnerabilityAction(v);
  if (vulnerabilityAction) return vulnerabilityAction;
  if (v.action === "investigate" || v.action === "simulate_logins")
    return { action: v.action };
  if (
    v.action === "scan" &&
    (v.profile === "baseline" || v.profile === "hardened")
  )
    return { action: "scan", profile: v.profile };
  const actor = v.actor;
  if (actor !== "alice" && actor !== "bob" && actor !== "admin")
    throw new Error("Choose a valid synthetic actor.");
  if (
    v.action === "read_ticket" &&
    typeof v.ticketId === "string" &&
    /^TKT-[a-zA-Z0-9-]{1,40}$/.test(v.ticketId)
  )
    return { action: "read_ticket", actor, ticketId: v.ticketId };
  if (
    v.action === "create_ticket" &&
    typeof v.title === "string" &&
    v.title.trim().length >= 3 &&
    v.title.trim().length <= 120
  )
    return { action: "create_ticket", actor, title: v.title.trim() };
  throw new Error("Invalid action. Ticket titles must be 3–120 characters.");
}
export function applyAction(
  state: LabState,
  action: Action,
  now = Date.now(),
): { state: LabState; message: string; ticket?: Ticket } {
  const next = structuredClone(state);
  const at = new Date(now).toISOString();
  let message = "";
  let ticket: Ticket | undefined;
  if (action.action === "scan") {
    next.runs.unshift(runChecks(action.profile, at));
    message = `${action.profile === "hardened" ? "Hardened" : "Baseline"} checks completed.`;
  }
  if (action.action === "investigate") {
    next.runs.unshift(runChecks("baseline", at));
    next.events.push(
      event("access_allowed", "alice", "fixture:TKT-1042", 200, at),
    );
    for (let i = 0; i < 3; i++)
      next.events.push(
        event("access_denied", "alice", "fixture:TKT-1042", 403, at),
      );
    message =
      "Baseline tested. Three attempts against the secure policy were blocked and correlated into an alert. Run the hardened checks to verify the fix.";
  }
  if (action.action === "simulate_logins") {
    for (let i = 0; i < 5; i++)
      next.events.push(
        event("login_failed", "bob", "fixture:sign-in", 401, at),
      );
    message =
      "Five synthetic login failures recorded. Open Activity & alerts to investigate.";
  }
  if (action.action === "read_ticket") {
    const found = next.tickets.find((t) => t.id === action.ticketId);
    if (!found) throw new Error("Ticket not found.");
    const allowed = canReadTicket(action.actor, found);
    next.events.push(
      event(
        allowed ? "access_allowed" : "access_denied",
        action.actor,
        found.id,
        allowed ? 200 : 403,
        at,
      ),
    );
    if (allowed) ticket = found;
    message = allowed
      ? `200 OK — ${action.actor} can read this ticket.`
      : `403 Forbidden — ${action.actor} does not own this ticket.`;
  }
  if (action.action === "create_ticket") {
    if (next.tickets.length >= 100)
      throw new Error("This lab workspace has reached its 100-ticket limit.");
    ticket = {
      id: `TKT-${crypto.randomUUID().slice(0, 8)}`,
      owner: action.actor,
      title: action.title,
      status: "Open",
    };
    next.tickets.unshift(ticket);
    next.events.push(event("ticket_created", action.actor, ticket.id, 201, at));
    message = "Synthetic ticket created.";
  }
  next.runs = next.runs.slice(0, 40);
  next.events = next.events.slice(-500);
  next.lastActionAt = now;
  return { state: next, message, ticket };
}
