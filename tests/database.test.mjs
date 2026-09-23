import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
test("database scopes workspaces by owner and rejects stale concurrent revisions", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("../drizzle/0000_yummy_mister_sinister.sql", import.meta.url),
      "utf8",
    ),
  );
  const insert = db.prepare(
    "INSERT INTO lab_workspaces (owner,state,revision) VALUES (?,?,0)",
  );
  insert.run("user-a", '{"private":"a"}');
  insert.run("user-b", '{"private":"b"}');
  assert.equal(
    db.prepare("SELECT state FROM lab_workspaces WHERE owner=?").get("user-b")
      .state,
    '{"private":"b"}',
  );
  assert.equal(
    db
      .prepare("SELECT state FROM lab_workspaces WHERE owner=?")
      .get("user-a' OR 1=1 --"),
    undefined,
  );
  const update = db.prepare(
    "UPDATE lab_workspaces SET state=?,revision=revision+1 WHERE owner=? AND revision=?",
  );
  assert.equal(update.run('{"private":"updated"}', "user-a", 0).changes, 1);
  assert.equal(update.run('{"private":"stale"}', "user-a", 0).changes, 0);
  assert.equal(
    db.prepare("SELECT state FROM lab_workspaces WHERE owner=?").get("user-b")
      .state,
    '{"private":"b"}',
  );
  db.close();
});
