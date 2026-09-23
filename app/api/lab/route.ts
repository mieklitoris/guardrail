import { applyVulnerabilityAction } from "@/lib/security/vulnerability-labs";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database } from "@/lib/database";
import {
  initialState,
  parseAction,
  applyAction,
  detect,
  type LabState,
} from "@/lib/security/engine";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function load(owner: string) {
  const db = database();
  await db
    .prepare(
      "INSERT OR IGNORE INTO lab_workspaces (owner,state,revision) VALUES (?,?,0)",
    )
    .bind(owner, JSON.stringify(initialState()))
    .run();
  const row = await db
    .prepare("SELECT state,revision FROM lab_workspaces WHERE owner=?")
    .bind(owner)
    .first<{ state: string; revision: number }>();
  if (!row) throw new Error("Workspace unavailable");
  return { state: JSON.parse(row.state) as LabState, revision: row.revision };
}
function publicState(state: LabState) {
  return {
    ...state,
    suiteRuns: state.suiteRuns ?? [],
    tickets: state.tickets.map(({ id, owner, status }) => ({
      id,
      owner,
      status,
    })),
    alerts: detect(state.events),
  };
}
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return response({ error: "Sign in to use your lab workspace." }, 401);
    const { state } = await load(user.userId);
    return response(publicState(state));
  } catch (error) {
    console.error("Lab load failed", error);
    return response(
      { error: "The lab could not load its saved data. Please retry." },
      503,
    );
  }
}
export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return response({ error: "Sign in to use your lab workspace." }, 401);
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return response({ error: "Same-origin requests are required." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return response({ error: "Send JSON." }, 415);
    const text = await request.text();
    if (text.length > 4096)
      return response({ error: "Request too large." }, 413);
    let action;
    try {
      action = parseAction(JSON.parse(text));
    } catch (error) {
      return response(
        { error: error instanceof Error ? error.message : "Invalid request." },
        400,
      );
    }
    const { state, revision } = await load(user.userId);
    if (Date.now() - state.lastActionAt < 800)
      return response(
        { error: "Please wait a moment before the next lab action." },
        429,
      );
    let result;
    try {
      result = action.action === "run_vulnerability_suite" || action.action === "record_xss_suite"
        ? await applyVulnerabilityAction(state, action)
        : applyAction(state, action);
    } catch (error) {
      return response(
        { error: error instanceof Error ? error.message : "Action failed." },
        400,
      );
    }
    const changed = await database()
      .prepare(
        "UPDATE lab_workspaces SET state=?,revision=revision+1 WHERE owner=? AND revision=?",
      )
      .bind(JSON.stringify(result.state), user.userId, revision)
      .run();
    if (changed.meta.changes !== 1)
      return response(
        {
          error:
            "Your workspace changed in another tab. Refresh and try again.",
        },
        409,
      );
    return response({
      ...publicState(result.state),
      message: result.message,
      ticket: "ticket" in result ? result.ticket : undefined,
    });
  } catch (error) {
    console.error("Lab action failed", error);
    return response(
      { error: "The action could not be saved. Please retry." },
      503,
    );
  }
}
