import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("lab_workspaces", {
  owner: text("owner").primaryKey(),
  state: text("state").notNull(),
  revision: integer("revision").notNull().default(0),
});
