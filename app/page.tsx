"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  FlaskConical,
  Radar,
  FileCheck2,
  ArrowUpRight,
  Play,
  Terminal,
  CircleHelp,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Code2,
  Download,
  RefreshCw,
  LockKeyhole,
  BookOpen,
  Plus,
  Clock3,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type {
  Actor,
  Alert,
  Action,
  Check,
  LabState,
  Ticket,
} from "@/lib/security/engine";

type View =
  | "Overview"
  | "Security lab"
  | "Activity & alerts"
  | "Findings & fixes"
  | "Project guide";
type Data = LabState & { alerts: Alert[] };
const navigation = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: FlaskConical, label: "Security lab" },
  { icon: Radar, label: "Activity & alerts" },
  { icon: FileCheck2, label: "Findings & fixes" },
  { icon: BookOpen, label: "Project guide" },
] as const;
const titles: Record<View, [string, string, string]> = {
  Overview: [
    "SECURITY AT A GLANCE",
    "Know the risk. Prove the fix.",
    "Your application security and detection work, in one place.",
  ],
  "Security lab": [
    "CONTROLLED TEST ENVIRONMENT",
    "A small app. Real security decisions.",
    "Compare configurations and exercise ticket ownership with synthetic actors.",
  ],
  "Activity & alerts": [
    "DETECTION & INVESTIGATION",
    "Follow the signal.",
    "Correlated lab events with the evidence behind every alert.",
  ],
  "Findings & fixes": [
    "APPLICATION SECURITY",
    "From finding to verified fix.",
    "Inspect the latest checks, review the evidence, and compare your results.",
  ],
  "Project guide": [
    "BUILT TO BE UNDERSTOOD",
    "Behind the guardrail.",
    "Architecture, boundaries, and a repeatable investigation walkthrough.",
  ],
};
function Navigation({
  view,
  failed,
  onSelect,
}: {
  view: View;
  failed: number;
  onSelect: (view: View) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {navigation.map(({ icon: Icon, label }) => (
        <SidebarMenuItem key={label}>
          <SidebarMenuButton
            isActive={view === label}
            onClick={() => {
              onSelect(label);
              setOpenMobile(false);
            }}
          >
            <Icon />
            <span>{label}</span>
            {label === "Findings & fixes" && failed > 0 && (
              <span className="nav-count">{failed}</span>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
const time = (s: string) =>
  new Date(s).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const date = (s: string) =>
  new Date(s).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [selected, setSelected] = useState<Check | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actor, setActor] = useState<Actor>("alice");
  const [title, setTitle] = useState("");
  const [ticketResult, setTicketResult] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState("all");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/lab");
      const d = (await r.json()) as Data & {
        error?: string;
        message: string;
        ticket?: Ticket;
      };
      if (!r.ok) {
        setAuthRequired(r.status === 401);
        throw Error(d.error || "Unable to load lab.");
      }
      setData(d);
      setAuthRequired(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load lab.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const act = useCallback(async (action: Action) => {
    setBusy(true);
    setError("");
    setNotice("");
    setTicketResult(null);
    try {
      const r = await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const d = (await r.json()) as Data & {
        error?: string;
        message: string;
        ticket?: Ticket;
      };
      if (!r.ok) throw Error(d.error || "The action failed.");
      setData(d);
      setNotice(d.message);
      if (d.ticket) setTicketResult(d.ticket);
      if (action.action === "create_ticket") setTitle("");
      return {
        message: d.message,
        runs: d.runs.length,
        alerts: d.alerts.length,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "The action failed.");
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);
  const run = (action: Action) => {
    void act(action).catch(() => {});
  };
  useEffect(() => {
    type MC = {
      registerTool: (
        t: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        o: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: MC }).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "run_guardrail_checks",
          description:
            "Run and save baseline or hardened checks in the current synthetic security lab and update the dashboard.",
          inputSchema: {
            type: "object",
            properties: {
              profile: { type: "string", enum: ["baseline", "hardened"] },
            },
            required: ["profile"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (
              !input ||
              typeof input !== "object" ||
              !("profile" in input) ||
              ((input as { profile: unknown }).profile !== "baseline" &&
                (input as { profile: unknown }).profile !== "hardened")
            )
              throw Error("profile must be baseline or hardened");
            return act({
              action: "scan",
              profile: (input as { profile: "baseline" | "hardened" }).profile,
            });
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [act]);
  const latest = data?.runs[0];
  const baseline = data?.runs.find((r) => r.profile === "baseline");
  const hardened = data?.runs.find((r) => r.profile === "hardened");
  const failed = latest?.checks.filter((c) => !c.passed).length ?? 0;
  const passed = latest?.checks.filter((c) => c.passed).length ?? 0;
  const exportReport = () => {
    if (!data) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            project: "Guardrail",
            exportedAt: new Date().toISOString(),
            scope: "Synthetic isolated lab. Not a live website assessment.",
            runs: data.runs,
            alerts: data.alerts,
            events: data.events,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guardrail-evidence.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const empty = (text: string) => (
    <div className="empty-state">
      <FlaskConical size={26} />
      <p>{text}</p>
      <Button
        variant="outline"
        disabled={busy || !data}
        onClick={() => run({ action: "investigate" })}
      >
        Run investigation
      </Button>
    </div>
  );
  const checksTable = () =>
    latest ? (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CHECK / FINDING</TableHead>
            <TableHead>SEVERITY</TableHead>
            <TableHead>RESULT</TableHead>
            <TableHead>
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {latest.checks
            .filter(
              (c) =>
                filter === "all" ||
                (filter === "failed" ? !c.passed : c.passed),
            )
            .map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <button
                    className="finding-name"
                    onClick={() => setSelected(c)}
                  >
                    {c.name}
                    <small>{c.id}</small>
                  </button>
                </TableCell>
                <TableCell>
                  <span className={`severity ${c.severity.toLowerCase()}`}>
                    {c.severity}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`result ${c.passed ? "pass" : "fail"}`}>
                    {c.passed ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}{" "}
                    {c.passed ? "Passed" : "Failed"}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Inspect ${c.name}`}
                    onClick={() => setSelected(c)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    ) : (
      empty("Run a baseline investigation to collect your first evidence.")
    );
  const featured = (
    <section className="investigation">
      <div>
        <span className="tag">FEATURED INVESTIGATION · 01</span>
        <h2>One ticket. The wrong user.</h2>
        <p>
          Trace a broken access-control flaw from the first unauthorized request
          to a verified fix.
        </p>
        <div className="steps">
          <span>01 Test</span>
          <span>02 Detect</span>
          <span>03 Fix</span>
          <span>04 Verify</span>
        </div>
        <button
          className="text-action"
          disabled={busy || !data}
          onClick={() => run({ action: "investigate" })}
        >
          Run the investigation <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="terminal">
        <div className="terminal-header">
          <Terminal size={14} />
          ACCESS CONTROL CHECK
        </div>
        <p>
          <span className="code-dim">actor</span> alice · user
        </p>
        <p>
          <span className="code-dim">resource</span> TKT-1042 · owned by bob
        </p>
        <p>
          <span className="code-dim">expected</span> 403 Forbidden
        </p>
        <p className="terminal-result">
          {latest
            ? `${latest.profile} → ${latest.checks[0].passed ? "403 · blocked" : "200 · exposed in fixture"}`
            : "Ready to run"}
          <ArrowUpRight size={16} />
        </p>
      </div>
    </section>
  );
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="brand">
            <ShieldCheck />
            <span>
              guardrail<span className="brand-dot">.</span>
            </span>
          </div>
          <div className="workspace-label">SECURITY WORKSPACE</div>
        </SidebarHeader>
        <SidebarContent>
          <Navigation
            view={view}
            failed={failed}
            onSelect={(label) => {
              setView(label);
              setFilter("all");
            }}
          />
        </SidebarContent>
        <SidebarFooter>
          <div className="sidebar-note">
            <Terminal size={19} />
            <strong>Your own proving ground</strong>
            <p>Test. Investigate. Remediate.</p>
            <a
              href="https://github.com/mieklitoris/guardrail"
              target="_blank"
              rel="noreferrer"
            >
              <Code2 size={14} /> View source <ArrowUpRight size={13} />
            </a>
          </div>
          <div className="profile">
            <span className="avatar">AR</span>
            <div>
              <b>Aarav Rego</b>
              <small>Security engineering portfolio</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="topbar">
          <div>
            <SidebarTrigger />
            <span>
              Workspace / <b>{view}</b>
            </span>
          </div>
          <span className="environment">ISOLATED DEMO LAB</span>
        </header>
        <main className="workspace">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{titles[view][0]}</p>
              <h1>{titles[view][1]}</h1>
              <p>{titles[view][2]}</p>
            </div>
            <Button
              className="primary-action"
              disabled={busy || !data}
              onClick={() => run({ action: "investigate" })}
            >
              {busy ? (
                <RefreshCw size={16} className="spin" />
              ) : (
                <Play size={16} />
              )}{" "}
              {busy ? "Working…" : "Run investigation"}
            </Button>
          </div>
          {loading && (
            <p className="loading" role="status">
              Loading your lab workspace…
            </p>
          )}
          {error && (
            <div role="alert" className="error-box">
              <AlertTriangle size={18} />
              <span>{error}</span>
              {authRequired ? (
                <a href="/signin-with-chatgpt?return_to=%2F" target="_top">
                  Sign in
                </a>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void load()}
                >
                  Retry loading
                </Button>
              )}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          {view === "Overview" && (
            <>
              <div className="stats">
                {[
                  [
                    "Open findings",
                    latest ? String(failed) : "—",
                    latest
                      ? `Latest ${latest.profile} run`
                      : "Run your first security check",
                  ],
                  [
                    "Detection alerts",
                    data ? String(data.alerts.length) : "—",
                    "Correlated lab activity · retained history",
                  ],
                  [
                    "Passing checks",
                    latest ? `${passed} / 3` : "—",
                    latest
                      ? `Checked ${date(latest.at)}`
                      : "Evidence-backed verification",
                  ],
                ].map(([label, value, note]) => (
                  <section className="stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{note}</small>
                  </section>
                ))}
              </div>
              {featured}
              <div className="section-heading">
                <h2>Latest security checks</h2>
                <button
                  className="text-action"
                  onClick={() => setView("Findings & fixes")}
                >
                  View all evidence <ChevronRight size={15} />
                </button>
              </div>
              <section className="table-panel">{checksTable()}</section>
              <div className="overview-grid overview-bottom">
                <section className="panel">
                  <Radar className="panel-icon" />
                  <h3>Two rules. Every signal explained.</h3>
                  <p>
                    Three access denials or five failed logins by the same actor
                    within 60 seconds produce an alert.
                  </p>
                  <button
                    className="text-action"
                    onClick={() => setView("Activity & alerts")}
                  >
                    Investigate activity <ArrowUpRight size={15} />
                  </button>
                </section>
                <section className="panel">
                  <CircleHelp className="panel-icon" />
                  <h3>A lab with clear boundaries.</h3>
                  <p>
                    All actors, tickets, and events are synthetic. No external
                    targets are scanned. A passing result covers only the listed
                    checks.
                  </p>
                </section>
              </div>
            </>
          )}
          {view === "Security lab" && (
            <Tabs defaultValue="checks">
              <TabsList className="view-tabs">
                <TabsTrigger value="checks">Security checks</TabsTrigger>
                <TabsTrigger value="tickets">Ticket sandbox</TabsTrigger>
              </TabsList>
              <TabsContent value="checks">
                {featured}
                <div className="two-columns">
                  <section className="panel configuration">
                    <span className="severity high">BASELINE FIXTURE</span>
                    <h2>See what breaks.</h2>
                    <p>
                      Missing ownership enforcement, browser protections, and
                      secure cookie attributes. Evaluated in-process against
                      synthetic data.
                    </p>
                    <Button
                      variant="outline"
                      disabled={busy || !data}
                      onClick={() =>
                        run({ action: "scan", profile: "baseline" })
                      }
                    >
                      <FlaskConical size={16} />
                      Run baseline checks
                    </Button>
                  </section>
                  <section className="panel configuration">
                    <span className="result pass">HARDENED FIXTURE</span>
                    <h2>Verify the remediation.</h2>
                    <p>
                      The same checks with ownership enforced and protective
                      response headers applied. Your actual ticket sandbox
                      always uses this policy.
                    </p>
                    <Button
                      disabled={busy || !data}
                      onClick={() =>
                        run({ action: "scan", profile: "hardened" })
                      }
                    >
                      <ShieldCheck size={16} />
                      Run hardened checks
                    </Button>
                  </section>
                </div>
                <div className="section-heading">
                  <h2>Scan history</h2>
                  <span>Latest 40 runs retained</span>
                </div>
                <section className="table-panel">
                  {data?.runs.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>TIME</TableHead>
                          <TableHead>CONFIGURATION</TableHead>
                          <TableHead>PASSED</TableHead>
                          <TableHead>FAILED</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.runs.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{date(r.at)}</TableCell>
                            <TableCell className="capitalize">
                              {r.profile}
                            </TableCell>
                            <TableCell>
                              {r.checks.filter((c) => c.passed).length}
                            </TableCell>
                            <TableCell>
                              {r.checks.filter((c) => !c.passed).length}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    empty("No saved runs yet.")
                  )}
                </section>
              </TabsContent>
              <TabsContent value="tickets">
                <div className="lab-banner">
                  <LockKeyhole size={20} />
                  <p>
                    <strong>Secure policy always active.</strong> Choose a
                    synthetic actor and attempt a ticket read. The server
                    enforces ownership; admins can read every synthetic ticket.
                    This selector is a teaching control, not an authentication
                    system.
                  </p>
                </div>
                <div className="toolbar">
                  <label htmlFor="actor">Act as</label>
                  <Select
                    value={actor}
                    onValueChange={(v) => {
                      setActor(v as Actor);
                      setTicketResult(null);
                    }}
                  >
                    <SelectTrigger id="actor" className="actor-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alice">Alice · user</SelectItem>
                      <SelectItem value="bob">Bob · user</SelectItem>
                      <SelectItem value="admin">Morgan · admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="muted">
                    Actual workspace access uses ChatGPT sign-in.
                  </span>
                </div>
                <section className="table-panel">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RESOURCE</TableHead>
                        <TableHead>OWNER</TableHead>
                        <TableHead>POLICY</TableHead>
                        <TableHead>ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.tickets.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="mono">{t.id}</TableCell>
                          <TableCell className="capitalize">
                            {t.owner}
                          </TableCell>
                          <TableCell>
                            {actor === t.owner || actor === "admin" ? (
                              <span className="result pass">Read allowed</span>
                            ) : (
                              <span className="result fail">Read denied</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                run({
                                  action: "read_ticket",
                                  actor,
                                  ticketId: t.id,
                                })
                              }
                            >
                              Attempt read
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
                {ticketResult && (
                  <section className="ticket-detail">
                    <span className="result pass">
                      Authorized ticket content
                    </span>
                    <h3>{ticketResult.title}</h3>
                    <p>
                      {ticketResult.id} · {ticketResult.owner} ·{" "}
                      {ticketResult.status}
                    </p>
                  </section>
                )}
                <form
                  className="panel ticket-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run({ action: "create_ticket", actor, title });
                  }}
                >
                  <h3>Create a synthetic ticket</h3>
                  <label htmlFor="ticket-title">Title · owned by {actor}</label>
                  <div>
                    <Input
                      id="ticket-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      minLength={3}
                      maxLength={120}
                      required
                      placeholder="e.g. Review application permissions"
                    />
                    <Button disabled={busy || !data} type="submit">
                      <Plus size={16} />
                      Create ticket
                    </Button>
                  </div>
                  <p>
                    Use sample content only. Up to 100 tickets per workspace.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
          {view === "Activity & alerts" && (
            <>
              <div className="toolbar spread">
                <span className="muted">
                  {data?.events.length ?? 0} synthetic events · latest 500
                  retained
                </span>
                <Button
                  variant="outline"
                  disabled={busy || !data}
                  onClick={() => run({ action: "simulate_logins" })}
                >
                  <Play size={15} />
                  Simulate failed logins
                </Button>
              </div>
              <div className="section-heading">
                <h2>Detection alerts</h2>
                <span>Historical alerts remain after a fix</span>
              </div>
              <div className="alert-list">
                {data?.alerts.length ? (
                  data.alerts.map((a) => (
                    <button
                      className="alert-card"
                      key={a.id}
                      onClick={() => setSelectedAlert(a)}
                    >
                      <div className="alert-icon">
                        <Radar size={21} />
                      </div>
                      <div>
                        <strong>{a.name}</strong>
                        <p>
                          {a.actor} · {a.count} events · {a.rule}
                        </p>
                        <small>{date(a.last)}</small>
                      </div>
                      <span className={`severity ${a.severity.toLowerCase()}`}>
                        {a.severity}
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))
                ) : (
                  <div className="panel">
                    <h3>No detection alerts yet</h3>
                    <p>
                      Run the featured investigation or simulate failed logins
                      to generate a controlled event sequence.
                    </p>
                  </div>
                )}
              </div>
              <div className="section-heading">
                <h2>Event timeline</h2>
                <Clock3 size={17} />
              </div>
              <section className="table-panel">
                {data?.events.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TIME</TableHead>
                        <TableHead>EVENT</TableHead>
                        <TableHead>ACTOR</TableHead>
                        <TableHead>RESOURCE</TableHead>
                        <TableHead>STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...data.events].reverse().map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="mono">{time(e.at)}</TableCell>
                          <TableCell>{e.kind.replaceAll("_", " ")}</TableCell>
                          <TableCell>{e.actor}</TableCell>
                          <TableCell className="mono">{e.resource}</TableCell>
                          <TableCell>
                            <span
                              className={`result ${e.status < 400 ? "pass" : "fail"}`}
                            >
                              {e.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  empty("Your investigation events will appear here.")
                )}
              </section>
            </>
          )}
          {view === "Findings & fixes" && (
            <>
              <div className="toolbar spread">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger
                    className="filter-select"
                    aria-label="Filter findings"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All checks</SelectItem>
                    <SelectItem value="failed">Failed checks</SelectItem>
                    <SelectItem value="passed">Passed checks</SelectItem>
                  </SelectContent>
                </Select>
                <div className="button-group">
                  <Button
                    variant="outline"
                    disabled={!data?.runs.length}
                    onClick={exportReport}
                  >
                    <Download size={15} />
                    Export evidence
                  </Button>
                  <Button
                    disabled={busy || !data}
                    onClick={() => run({ action: "scan", profile: "hardened" })}
                  >
                    <CheckCircle2 size={15} />
                    Verify hardened fixture
                  </Button>
                </div>
              </div>
              <section className="table-panel">
                {checksTable()}
                {latest &&
                  filter !== "all" &&
                  !latest.checks.some((c) =>
                    filter === "passed" ? c.passed : !c.passed,
                  ) && (
                    <p className="filter-empty">
                      No {filter} checks in the latest run.
                    </p>
                  )}
              </section>
              <div className="section-heading">
                <h2>Before & after</h2>
                <span>Most recent run for each configuration</span>
              </div>
              <section className="table-panel">
                {baseline && hardened ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CHECK</TableHead>
                        <TableHead>BASELINE</TableHead>
                        <TableHead>HARDENED</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {baseline.checks.map((c) => {
                        const after = hardened.checks.find(
                          (x) => x.id === c.id,
                        );
                        return (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>
                              <span
                                className={`result ${c.passed ? "pass" : "fail"}`}
                              >
                                {c.passed ? "Passed" : "Failed"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`result ${after?.passed ? "pass" : "fail"}`}
                              >
                                {after?.passed ? "Passed" : "Failed"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="empty-state">
                    <FileCheck2 size={26} />
                    <p>
                      Run both baseline and hardened checks to compare the
                      evidence.
                    </p>
                    <div className="button-group">
                      <Button
                        variant="outline"
                        disabled={busy || !data}
                        onClick={() =>
                          run({ action: "scan", profile: "baseline" })
                        }
                      >
                        Run baseline
                      </Button>
                      <Button
                        disabled={busy || !data}
                        onClick={() =>
                          run({ action: "scan", profile: "hardened" })
                        }
                      >
                        Run hardened
                      </Button>
                    </div>
                  </div>
                )}
              </section>
              <p className="scope-note">
                “Verified” means the hardened fixture passed these checks. It
                does not mean a deployed application is free of vulnerabilities.
              </p>
            </>
          )}
          {view === "Project guide" && (
            <>
              <section className="panel guide">
                <h2>A repeatable five-minute demo</h2>
                <ol>
                  <li>
                    <strong>Run the investigation.</strong> The baseline fixture
                    exposes Bob’s ticket to Alice. Three subsequent attempts
                    against the secure policy are denied.
                  </li>
                  <li>
                    <strong>Inspect the alert.</strong> Open Activity & alerts.
                    Follow the three access-denied events that triggered the
                    60-second rule.
                  </li>
                  <li>
                    <strong>Review the finding.</strong> Open Findings & fixes,
                    then Ticket ownership enforcement. Read the status-code
                    evidence and remediation.
                  </li>
                  <li>
                    <strong>Verify the fix.</strong> Run the hardened checks.
                    Compare three failed baseline checks with three passing
                    hardened checks.
                  </li>
                  <li>
                    <strong>Exercise the policy.</strong> Open the ticket
                    sandbox. Alice can read her own tickets; Bob’s ticket
                    returns 403. A synthetic admin can read both.
                  </li>
                </ol>
              </section>
              <div className="two-columns">
                <section className="panel guide">
                  <h2>How it works</h2>
                  <p>
                    React + TypeScript interface → authenticated server API →
                    deterministic security engine → SQLite / Cloudflare D1.
                  </p>
                  <p>
                    Every saved workspace is scoped to the signed-in platform
                    user. Prepared SQL statements and revision checks prevent
                    cross-workspace reads and lost updates.
                  </p>
                  <a
                    className="text-action"
                    href="https://github.com/mieklitoris/guardrail"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the source <Code2 size={16} />
                  </a>
                </section>
                <section className="panel guide">
                  <h2>What this proves</h2>
                  <p>
                    Object-level authorization, response inspection, event
                    correlation, persistent evidence, and regression testing.
                  </p>
                  <h3>What it does not prove</h3>
                  <p>
                    This is a synthetic teaching lab, not a penetration-testing
                    scanner or production SIEM. Failed login events are
                    generated, not collected from real sign-ins. Selecting a
                    profile does not change the deployed app’s security.
                  </p>
                </section>
              </div>
            </>
          )}
          <footer className="workspace-footer">
            <ShieldCheck size={14} />
            <span>Guardrail / Security engineering lab</span>
            <span>Synthetic data. Reproducible evidence.</span>
          </footer>
        </main>
      </SidebarInset>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="evidence-sheet">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>
              {selected?.id} · latest {latest?.profile} run
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="sheet-body">
              <span className={`result ${selected.passed ? "pass" : "fail"}`}>
                {selected.passed ? "Passed" : "Failed"}
              </span>
              <h3>Observed evidence</h3>
              <pre>{selected.evidence}</pre>
              <h3>Remediation</h3>
              <p>{selected.fix}</p>
              {selected.id === "AUTHZ-01" && (
                <pre>{`if (!actor) return 401;\nif (actor.role !== "admin" &&\n    ticket.owner !== actor.id) {\n  return 403;\n}\nreturn 200;`}</pre>
              )}
              <h3>Verify</h3>
              <p>
                Rerun the identical checks against the hardened fixture, then
                compare the saved results.
              </p>
              <Button
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  run({ action: "scan", profile: "hardened" });
                }}
              >
                Run hardened checks
              </Button>
              <a
                className="text-action"
                href={selected.reference}
                target="_blank"
                rel="noreferrer"
              >
                OWASP reference <ArrowUpRight size={16} />
              </a>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Sheet
        open={!!selectedAlert}
        onOpenChange={(open) => {
          if (!open) setSelectedAlert(null);
        }}
      >
        <SheetContent className="evidence-sheet">
          <SheetHeader>
            <SheetTitle>{selectedAlert?.name}</SheetTitle>
            <SheetDescription>
              Synthetic detection · {selectedAlert?.actor}
            </SheetDescription>
          </SheetHeader>
          {selectedAlert && (
            <div className="sheet-body">
              <h3>Detection rule</h3>
              <p>{selectedAlert.rule}</p>
              <h3>Supporting events</h3>
              {data?.events
                .filter((e) => selectedAlert.evidenceIds.includes(e.id))
                .map((e) => (
                  <div className="event-evidence" key={e.id}>
                    <span className="mono">
                      {time(e.at)} · {e.status}
                    </span>
                    <strong>{e.kind.replaceAll("_", " ")}</strong>
                    <small>{e.resource}</small>
                  </div>
                ))}
              <h3>Analyst assessment</h3>
              <p>
                {selectedAlert.severity === "High"
                  ? "Repeated authorization failures can indicate attempts to enumerate other users’ resources. In this lab the attempts are intentional. The secure policy blocked access; review successful accesses separately."
                  : "Repeated authentication failures can indicate password guessing or a user having trouble signing in. These events are generated fixtures; no real credentials were submitted."}
              </p>
              <h3>Limitations & false positives</h3>
              <p>
                Rules use synthetic actor IDs and event-time windows. They do
                not identify source IPs, distributed attacks, or intent.
                Historical alerts are retained after verification.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
