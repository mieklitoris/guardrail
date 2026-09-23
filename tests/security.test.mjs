import test from "node:test";
import assert from "node:assert/strict";
import {
  canReadTicket,
  fixtureResponse,
  cookieIsHardened,
  inspectHeaders,
  runChecks,
  initialState,
  detect,
  event,
  applyAction,
  parseAction,
} from "../lib/security/engine.ts";
const ticket = {
  id: "TKT-1042",
  owner: "bob",
  title: "Private fixture",
  status: "Open",
};
const base = Date.parse("2026-01-01T12:00:00Z");
const ev = (kind, actor = "alice", seconds = 0) =>
  event(
    kind,
    actor,
    "TKT-1042",
    403,
    new Date(base + seconds * 1000).toISOString(),
  );
test("ownership matrix denies anonymous and foreign users; allows owner and admin", () => {
  for (const [actor, expected] of [
    [null, false],
    ["alice", false],
    ["bob", true],
    ["admin", true],
  ])
    assert.equal(canReadTicket(actor, ticket), expected);
});
test("hardened fixture returns no ticket body to an unauthorized reader", async () => {
  const response = fixtureResponse("hardened", "alice", ticket);
  assert.equal(response.status, 403);
  assert.equal(await response.text(), "");
});
test("anonymous access is rejected in both fixture configurations", () => {
  for (const profile of ["baseline", "hardened"])
    assert.equal(fixtureResponse(profile, null, ticket).status, 401);
});
test("baseline demonstrates the vulnerability and hardened fixture passes all three checks", () => {
  assert.deepEqual(
    runChecks("baseline").checks.map((c) => c.passed),
    [false, false, false],
  );
  assert.deepEqual(
    runChecks("hardened").checks.map((c) => c.passed),
    [true, true, true],
  );
});
test("cookie inspection requires attributes, not misleading values or substrings", () => {
  assert.equal(cookieIsHardened("sid=SecureHttpOnlySameSite=Lax"), false);
  assert.equal(
    cookieIsHardened("sid=x; Secure; HttpOnly; SameSite=None"),
    false,
  );
  assert.equal(
    cookieIsHardened("sid=x; Securely; HttpOnly; SameSite=Lax"),
    false,
  );
  assert.equal(
    cookieIsHardened("sid=x; Secure; HttpOnly; SameSite=Strict"),
    true,
  );
  assert.equal(cookieIsHardened(null), false);
});
test("header check rejects permissive frame ancestors and nosniff lookalikes", () => {
  assert.equal(
    inspectHeaders(
      new Headers({
        "Content-Security-Policy": "frame-ancestors *",
        "X-Content-Type-Options": "nosniff",
      }),
    ),
    false,
  );
  assert.equal(
    inspectHeaders(
      new Headers({
        "Content-Security-Policy": "frame-ancestors 'none'",
        "X-Content-Type-Options": "not-nosniff",
      }),
    ),
    false,
  );
});
test("access denial rule fires at threshold and correlates evidence", () => {
  const events = [ev("access_denied"), ev("access_denied", "alice", 20)];
  assert.equal(detect(events).length, 0);
  events.push(ev("access_denied", "alice", 60));
  const [alert] = detect(events);
  assert.equal(alert.count, 3);
  assert.equal(alert.evidenceIds.length, 3);
});
test("events outside 60 seconds or from different actors do not combine", () => {
  assert.equal(
    detect([
      ev("access_denied"),
      ev("access_denied", "alice", 30),
      ev("access_denied", "alice", 61),
    ]).length,
    0,
  );
  assert.equal(
    detect([
      ev("access_denied"),
      ev("access_denied"),
      ev("access_denied", "bob"),
    ]).length,
    0,
  );
});
test("out of order events are sorted and correlated without duplicates", () => {
  const events = [
    ev("access_denied", "alice", 40),
    ev("access_denied", "alice", 0),
    ev("access_denied", "alice", 20),
    ev("access_denied", "alice", 50),
  ];
  const alerts = detect(events);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].count, 4);
});
test("failed login rule needs five failures and ignores allowed access", () => {
  const events = Array.from({ length: 4 }, () => ev("login_failed", "bob"));
  assert.equal(detect([...events, ev("access_allowed", "bob")]).length, 0);
  assert.equal(detect([...events, ev("login_failed", "bob")])[0].count, 5);
});
test("ticket action enforces policy and records denials without leaking the ticket", () => {
  const state = initialState();
  const denied = applyAction(
    state,
    { action: "read_ticket", actor: "alice", ticketId: "TKT-1042" },
    base,
  );
  assert.equal(denied.ticket, undefined);
  assert.equal(denied.state.events[0].status, 403);
  assert.equal(state.events.length, 0);
  const allowed = applyAction(
    state,
    { action: "read_ticket", actor: "bob", ticketId: "TKT-1042" },
    base,
  );
  assert.equal(allowed.ticket.owner, "bob");
});
test("investigation and retest produce a reproducible before/after result", () => {
  const before = applyAction(initialState(), { action: "investigate" }, base);
  assert.equal(detect(before.state.events).length, 1);
  const after = applyAction(
    before.state,
    { action: "scan", profile: "hardened" },
    base + 1000,
  );
  assert.equal(after.state.runs.length, 2);
  assert.equal(
    after.state.runs[0].checks.every((c) => c.passed),
    true,
  );
  assert.equal(after.state.events.length, 4);
});
test("input validation rejects unsupported actors, profiles and oversized titles", () => {
  for (const value of [
    null,
    [],
    { action: "scan", profile: "https://internal/" },
    { action: "read_ticket", actor: "root", ticketId: "TKT-1042" },
    { action: "create_ticket", actor: "alice", title: "x".repeat(121) },
  ])
    assert.throws(() => parseAction(value));
});
test("created tickets have server-assigned IDs and belong to the selected synthetic actor", () => {
  const r = applyAction(
    initialState(),
    parseAction({
      action: "create_ticket",
      actor: "alice",
      title: "  Review permissions  ",
    }),
    base,
  );
  assert.equal(r.ticket.title, "Review permissions");
  assert.equal(r.ticket.owner, "alice");
  assert.ok(r.ticket.id.startsWith("TKT-"));
  assert.equal(r.state.tickets.length, 4);
});
test("evidence history remains bounded", () => {
  let state = initialState();
  for (let i = 0; i < 45; i++)
    state = applyAction(
      state,
      { action: "scan", profile: "baseline" },
      base + i * 1000,
    ).state;
  assert.equal(state.runs.length, 40);
  for (let i = 0; i < 110; i++)
    state = applyAction(
      state,
      { action: "simulate_logins" },
      base + i * 1000,
    ).state;
  assert.equal(state.events.length, 500);
});
