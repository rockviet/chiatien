import { 
  Session, InsertSession, Member, InsertMember, 
  Expense, InsertExpense, sessions, members, expenses 
} from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // Session methods
  createSession(): Promise<Session>;
  getSessionByCode(code: string): Promise<Session | undefined>;
  
  // Member methods
  getMembers(sessionId: number): Promise<Member[]>;
  getMember(id: number): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, name: string): Promise<Member | undefined>;
  deleteMember(id: number): Promise<boolean>;

  // Expense methods
  getExpenses(sessionId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
}

import { TursoStorage } from './tursoStorage';

// Use TursoStorage for persistent data storage
export const storage = new TursoStorage();
