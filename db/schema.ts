import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const experiences = sqliteTable("experiences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  displayName: text("display_name").notNull().default("Anonymous"),
  location: text("location").notNull().default("Location withheld"),
  experienceYear: text("experience_year").notNull().default(""),
  experienceType: text("experience_type").notNull().default("Other"),
  transcript: text("transcript").notNull().default(""),
  privacy: text("privacy").notNull().default("archive"),
  recordingMode: text("recording_mode").notNull().default("text"),
  mediaKey: text("media_key"),
  mediaType: text("media_type"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
