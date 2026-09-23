# Detection specification

All input is labelled `source: simulation`. This app does not ingest real endpoint, identity-provider, or network telemetry.

| ID             | Predicate               | Group           | Threshold | Window                |
| -------------- | ----------------------- | --------------- | --------- | --------------------- |
| Access denials | `kind == access_denied` | synthetic actor | 3         | 60 seconds, inclusive |
| Login failures | `kind == login_failed`  | synthetic actor | 5         | 60 seconds, inclusive |

The engine sorts ISO timestamps, evaluates a sliding candidate window, and creates an alert at threshold. Additional matching events within 60 seconds of that alert's first supporting event update its count. Subsequent qualifying clusters create new alerts. Rules never combine actors or event types. Alert IDs derive from the first supporting event. Each alert retains event IDs, count, start/end times, and rule text.

Retention: last 500 events; alerts are rebuilt from that retained history. An alert can disappear when its evidence is no longer retained. Verification does not delete historical events or imply the historical alert was a false positive.

False positives: legitimate users retrying access, stale links, or mistyped passwords. In this lab all sequences are intentional. Success events are retained but do not trigger these rules. Low-and-slow, distributed, or cross-actor activity is not detected.
