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

export class MemStorage implements IStorage {
  private sessions: Map<number, Session>;
  private members: Map<number, Member>;
  private expenses: Map<number, Expense>;
  
  private sessionIdCounter: number;
  private memberIdCounter: number;
  private expenseIdCounter: number;

  constructor() {
    this.sessions = new Map();
    this.members = new Map();
    this.expenses = new Map();
    
    this.sessionIdCounter = 1;
    this.memberIdCounter = 1;
    this.expenseIdCounter = 1;
  }

  // Session methods
  async createSession(): Promise<Session> {
    const id = this.sessionIdCounter++;
    const code = nanoid(6).toUpperCase();
    const now = new Date();
    
    const session: Session = {
      id,
      code,
      createdAt: now
    };
    
    this.sessions.set(id, session);
    return session;
  }

  async getSessionByCode(code: string): Promise<Session | undefined> {
    return Array.from(this.sessions.values()).find(session => session.code === code);
  }

  // Member methods
  async getMembers(sessionId: number): Promise<Member[]> {
    return Array.from(this.members.values()).filter(member => member.sessionId === sessionId);
  }

  async getMember(id: number): Promise<Member | undefined> {
    return this.members.get(id);
  }

  async createMember(member: InsertMember): Promise<Member> {
    const id = this.memberIdCounter++;
    const newMember: Member = { ...member, id };
    this.members.set(id, newMember);
    return newMember;
  }

  async updateMember(id: number, name: string): Promise<Member | undefined> {
    const member = this.members.get(id);
    if (!member) return undefined;
    
    const updatedMember = { ...member, name };
    this.members.set(id, updatedMember);
    return updatedMember;
  }

  async deleteMember(id: number): Promise<boolean> {
    // Delete member
    const deleted = this.members.delete(id);
    
    // Update expenses: remove member from participants and delete expenses where they were the payer
    Array.from(this.expenses.values()).forEach(expense => {
      if (expense.payerId === id) {
        // Delete expense where this member was the payer
        this.expenses.delete(expense.id);
      } else if (expense.participants.includes(id)) {
        // Remove member from participants list
        const updatedParticipants = expense.participants.filter(pid => pid !== id);
        const updatedExpense = { ...expense, participants: updatedParticipants };
        this.expenses.set(expense.id, updatedExpense);
      }
    });
    
    return deleted;
  }

  // Expense methods
  async getExpenses(sessionId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.sessionId === sessionId);
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.expenseIdCounter++;
    const now = new Date();
    
    const newExpense: Expense = { 
      ...expense, 
      id,
      createdAt: now
    };
    
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(id: number, expenseData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...expenseData };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }
}

import { FileStore } from './fileStore';

// Sử dụng FileStore thay vì MemStorage để lưu trữ dữ liệu giữa các phiên làm việc
export const storage = new FileStore('./data/bills.json');
