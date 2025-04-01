import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session table to store active bill-splitting sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member table to store group members for each session
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
});

// Expense table to store expenses for each session
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(), // Stored in thousand VND
  payerId: integer("payer_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  participants: jsonb("participants").notNull().$type<number[]>(), // Array of member IDs
  customAmounts: jsonb("custom_amounts").notNull().$type<Record<number, number>>(), // Custom amounts for each participant
  isCustomSplit: boolean("is_custom_split").default(false).notNull(), // Flag for custom split
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
