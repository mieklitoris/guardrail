# Demo and interview notes

## Narrative

“I built Guardrail to connect application-security testing with detection engineering. I can reproduce an authorization flaw, inspect the evidence, correlate a sequence of denied requests, and rerun the same checks against a corrected policy.”

Show baseline → alert → evidence → hardened retest → ticket sandbox. Explain that every result comes from synthetic fixtures and that actor selection is a teaching control. Do not present generated login events as real incident telemetry.

## Decisions worth explaining

- Authentication and authorization are separate. Real platform identity scopes storage; a separate synthetic policy teaches ticket ownership.
- Vulnerable responses are constructed internally instead of exposing an exploitable web endpoint.
- A passing header check is a narrow assertion, not an overall security score.
- Prepared queries stop SQL input from becoming executable SQL.
- An expected revision detects concurrent writes rather than silently dropping updates.
- Alert evidence is retained; fixing a policy does not erase what happened.
- Small deterministic tests target security boundaries and detection edge cases.

## Suggested résumé wording after reviewing the code

Built a TypeScript security lab combining object-level authorization tests, HTTP configuration checks, and time-window event correlation, with per-user SQLite persistence, evidence export, and automated regression tests.

Only claim work you can explain. Add measured test counts or performance results after running and verifying them; do not invent incident volume or accuracy metrics.
