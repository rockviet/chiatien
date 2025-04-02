import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session table to store active bill-splitting sessions
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  lastAccessTime: integer("last_access_time", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Member table to store group members for each session
export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
});

// Expense table to store expenses for each session
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(), // Stored in thousand VND
  payerId: integer("payer_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  participants: blob("participants", { mode: "json" }).$type<number[]>(), // Array of member IDs
  customAmounts: blob("custom_amounts", { mode: "json" }).$type<Record<number, number>>(), // Custom amounts for each participant
  isCustomSplit: integer("is_custom_split", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Schemas for data validation
export const insertSessionSchema = createInsertSchema(sessions).pick({
  code: true,
});

export const insertMemberSchema = createInsertSchema(members).pick({
  sessionId: true,
  name: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  sessionId: true,
  name: true,
  amount: true,
  payerId: true,
  participants: true,
  customAmounts: true,
  isCustomSplit: true,
});

// Types for TypeScript
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// WebSocket message types
export enum MessageType {
  JOIN_SESSION = 'JOIN_SESSION',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_UPDATED = 'MEMBER_UPDATED',
  MEMBER_DELETED = 'MEMBER_DELETED',
  EXPENSE_ADDED = 'EXPENSE_ADDED',
  EXPENSE_UPDATED = 'EXPENSE_UPDATED',
  EXPENSE_DELETED = 'EXPENSE_DELETED',
  SESSION_DATA = 'SESSION_DATA',
  ERROR = 'ERROR'
}

export interface WebSocketMessage {
  type: MessageType;
  payload: any;
}
