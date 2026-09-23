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
