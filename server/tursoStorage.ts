import { eq, sql, and, lt, not, exists } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./db";
import { 
  Session, InsertSession, Member, InsertMember, 
  Expense, InsertExpense, sessions, members, expenses 
} from "@shared/schema";
import { IStorage } from "./storage";

export class TursoStorage implements IStorage {
  // Session methods
  async createSession(): Promise<Session> {
    const code = nanoid(6).toUpperCase();
    const [session] = await db.insert(sessions)
      .values({ code })
      .returning();
    return session;
  }

  async getSessionByCode(code: string): Promise<Session | undefined> {
    const [session] = await db.select()
      .from(sessions)
      .where(eq(sessions.code, code));

    if (session) {
      // Update last access time
      await db.update(sessions)
        .set({ lastAccessTime: new Date() })
        .where(eq(sessions.id, session.id));
    }

    return session;
  }

  // Member methods
  async getMembers(sessionId: number): Promise<Member[]> {
    const memberList = await db.select()
      .from(members)
      .where(eq(members.sessionId, sessionId));
    return memberList;
  }

  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select()
      .from(members)
      .where(eq(members.id, id));
    return member;
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db.insert(members)
      .values(member)
      .returning();
    return newMember;
  }

  async updateMember(id: number, name: string): Promise<Member | undefined> {
    const [updatedMember] = await db.update(members)
      .set({ name })
      .where(eq(members.id, id))
      .returning();
    return updatedMember;
  }

  async deleteMember(id: number): Promise<boolean> {
    // First, delete expenses where this member is the payer
    await db.delete(expenses)
      .where(eq(expenses.payerId, id));

    // Then, update expenses where this member is a participant
    const expensesWithMember = await db.select()
      .from(expenses)
      .where(sql`json_array_length(json_extract(participants, '$[*]')) > 0`);

    for (const expense of expensesWithMember) {
      const participants = expense.participants as number[];
      if (participants.includes(id)) {
        const updatedParticipants = participants.filter(pid => pid !== id);
        await db.update(expenses)
          .set({ participants: updatedParticipants })
          .where(eq(expenses.id, expense.id));
      }
    }

    // Finally, delete the member
    const result = await db.delete(members)
      .where(eq(members.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Expense methods
  async getExpenses(sessionId: number): Promise<Expense[]> {
    const expenseList = await db.select()
      .from(expenses)
      .where(eq(expenses.sessionId, sessionId));
    return expenseList;
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    // Make sure we have the correct types
    const participants: number[] = Array.isArray(expense.participants) 
      ? expense.participants.map(p => Number(p)) 
      : [];
      
    const customAmounts: Record<number, number> = expense.customAmounts || {};
    const isCustomSplit: boolean = expense.isCustomSplit || false;

    const [newExpense] = await db.insert(expenses)
      .values({
        ...expense,
        participants,
        customAmounts,
        isCustomSplit
      })
      .returning();
    
    return newExpense;
  }

  async updateExpense(id: number, expenseData: Partial<InsertExpense>): Promise<Expense | undefined> {
    // Carefully handle array and object types
    const updateData: Partial<Expense> = {};
    
    if (expenseData.name !== undefined) {
      updateData.name = expenseData.name;
    }
    
    if (expenseData.amount !== undefined) {
      updateData.amount = expenseData.amount;
    }
    
    if (expenseData.payerId !== undefined) {
      updateData.payerId = expenseData.payerId;
    }
    
    if (expenseData.participants !== undefined) {
      updateData.participants = Array.isArray(expenseData.participants) 
        ? expenseData.participants.map(p => Number(p))
        : [];
    }
    
    if (expenseData.customAmounts !== undefined) {
      updateData.customAmounts = expenseData.customAmounts;
    }
    
    if (expenseData.isCustomSplit !== undefined) {
      updateData.isCustomSplit = expenseData.isCustomSplit;
    }

    const [updatedExpense] = await db.update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();
    
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses)
      .where(eq(expenses.id, id))
      .returning();
    return result.length > 0;
  }

  /**
   * Clean up inactive sessions that:
   * 1. Have not been accessed in the last 7 days
   * 2. Have no expenses
   */
  async cleanupInactiveSessions(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find sessions that have no expenses and haven't been accessed in 7 days
    const inactiveSessions = await db.select()
      .from(sessions)
      .where(
        and(
          lt(sessions.lastAccessTime, sevenDaysAgo),
          not(
            exists(
              db.select()
                .from(expenses)
                .where(eq(expenses.sessionId, sessions.id))
            )
          )
        )
      );

    // Delete members of inactive sessions
    for (const session of inactiveSessions) {
      await db.delete(members)
        .where(eq(members.sessionId, session.id));
    }

    // Delete inactive sessions
    await db.delete(sessions)
      .where(
        and(
          lt(sessions.lastAccessTime, sevenDaysAgo),
          not(
            exists(
              db.select()
                .from(expenses)
                .where(eq(expenses.sessionId, sessions.id))
            )
          )
        )
      );
  }
} 