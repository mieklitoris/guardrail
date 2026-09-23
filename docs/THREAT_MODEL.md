# Threat model

## Assets and trust boundaries

Assets: each real user's saved workspace, synthetic ticket content, evidence integrity, service availability. Browser input is untrusted. The hosted Sites gateway authenticates users and supplies trusted identity headers; it must strip visitor-supplied identity headers. The Worker must not be exposed directly outside that gateway. Local mock identity is for loopback development only.

Alice/Bob/admin are lab personas within an authenticated workspace, not real accounts. Their selection is deliberately controllable. They must never authorize access to a different real user's workspace.

| Threat                             | Mitigation                                                                             | Residual limitation                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Cross-user data access             | Every read/update uses server-derived platform user ID                                 | Depends on gateway header integrity; direct Worker exposure unsupported                 |
| Object-level authorization failure | Server policy checks synthetic owner/admin on each read; denied read returns no ticket | Directory intentionally exposes synthetic IDs and owners within the workspace           |
| SQL injection                      | Prepared statements, no SQL interpolation                                              | Schema migration privileges remain deployment-sensitive                                 |
| Stored script injection            | React escapes ticket strings; no HTML rendering                                        | No rich-text support                                                                    |
| CSRF                               | Exact Origin comparison on JSON write API; no permissive CORS                          | Requires normal gateway request origin semantics                                        |
| Lost concurrent writes             | Conditional update with expected revision, HTTP 409 on conflict                        | Caller must refresh and retry                                                           |
| Request / storage abuse            | 4 KB accepted JSON bound, 800 ms workspace throttle, bounded history and tickets       | Body is read before size validation; edge request-size/rate limits are future hardening |
| Secret exposure                    | No real credentials or outbound scanning; reports omit account identity                | Never enter private content in synthetic tickets                                        |
| Unsafe vulnerable mode             | Vulnerable fixture runs only in-process; sandbox reads always use secure policy        | Fixture source deliberately illustrates insecure behavior                               |
| SSRF                               | No user-supplied network destinations or outbound fetches                              | Any future scanner needs strict allowlisting, redirect and DNS defenses                 |

## Validation

Automated tests exercise authorization, response privacy, cookie/header parsing, rule windows, actor separation, schema execution, prepared queries and conditional revisions. Browser/API checks cover the live local lab workflow. Unit tests do not certify the hosting gateway or make a full security-audit claim.

## Vulnerability lab boundaries

XSS probes are a fixed source-controlled set. They execute only inside `sandbox="allow-scripts"` frames, without `allow-same-origin`, forms, popups, or top-level navigation. A restrictive CSP blocks external subresources and connections; the only image is an invalid data URL used to trigger a local error handler. The parent accepts events only from the exact child WindowProxy, opaque origin (`null`), and per-probe random channel. Ready/completion handshakes distinguish an execution-free result from a failed probe. Arbitrary JavaScript input is not accepted.

Client-reported XSS observations are not trustworthy audit attestations: a workspace owner can forge their own report. They cannot use those reports to modify another user's workspace. Probe input/evidence is rendered as escaped text in React everywhere outside the isolated frames.

Prompt test documents are stored as bounded text in the same owner-scoped workspace and never executed as JavaScript. The agent is a deterministic interpreter, not an LLM. Its tool requests are recorded, never dispatched. The canary is public synthetic fixture data. Passing this simulator cannot establish real model safety.

Auth suite keys are fresh, non-extractable Web Crypto HMAC keys per run. Synthetic sessions never authenticate to Guardrail and are not persisted/exported. Expiry, signature, revocation and ownership checks belong only to this fixture verifier; real app authentication remains the platform gateway.

Historical workspaces without `suiteRuns` are read compatibly and receive suite history on their first new test. No schema change or destructive migration is required.
