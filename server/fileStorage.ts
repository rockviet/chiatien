import {
  Session, InsertSession, Member, InsertMember,
  Expense, InsertExpense
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { nanoid } from "nanoid";
import { IStorage } from './storage';

// Đảm bảo thư mục data tồn tại
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created: ${dirPath}`);
  }
};

// Define the data structure we'll store in the JSON file
interface StorageData {
  sessions: Session[];
  members: Member[];
  expenses: Expense[];
  counters: {
    sessionId: number;
    memberId: number;
    expenseId: number;
  };
}

export class FileStorage implements IStorage {
  private data: StorageData;
  private filePath: string;
  private initialized: boolean = false;

  constructor(filePath: string = 'data.json') {
    this.filePath = filePath;

    // Đảm bảo thư mục chứa file tồn tại
    const directory = path.dirname(filePath);
    ensureDirectoryExists(directory);

    // Default empty data structure
    this.data = {
      sessions: [],
      members: [],
      expenses: [],
      counters: {
        sessionId: 1,
        memberId: 1,
        expenseId: 1
      }
    };

    // Load data from file if it exists
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileData = fs.readFileSync(this.filePath, 'utf8');
        const rawData = JSON.parse(fileData);

        // Convert ISO date strings to Date objects
        this.data = {
          ...rawData,
          sessions: rawData.sessions.map(session => ({
            ...session,
            createdAt: new Date(session.createdAt),
            lastAccessTime: session.lastAccessTime ? new Date(session.lastAccessTime) : new Date(session.createdAt)
          })),
          expenses: rawData.expenses.map(expense => ({
            ...expense,
            createdAt: new Date(expense.createdAt)
          }))
        };

        this.initialized = true;
        console.log('Data loaded from file successfully.');
      } else {
        // Create the file with empty data structure
        this.saveData();
        this.initialized = true;
        console.log('Created new data file.');
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
      // Continue with empty data structure
      this.initialized = true;
    }
  }

  private saveData(): void {
    try {
      // Convert Date objects to ISO strings before saving
      const dataToSave = {
        ...this.data,
        sessions: this.data.sessions.map(session => ({
          ...session,
          createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
          lastAccessTime: session.lastAccessTime instanceof Date ? session.lastAccessTime.toISOString() : session.lastAccessTime
        })),
        expenses: this.data.expenses.map(expense => ({
          ...expense,
          createdAt: expense.createdAt instanceof Date ? expense.createdAt.toISOString() : expense.createdAt
        }))
      };

      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      console.log('Data saved to file successfully with timestamp:', new Date().toISOString());
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }

  // Session methods
  async createSession(): Promise<Session> {
    // Delete empty sessions before creating new one
    await this.deleteEmptySessions();

    const id = this.data.counters.sessionId++;
    const code = nanoid(6).toUpperCase();
    const now = new Date();

    const session: Session = {
      id,
      code,
      createdAt: now,
      lastAccessTime: now
    };

    this.data.sessions.push(session);
    this.saveData();

    return session;
  }

  async getSessionByCode(code: string): Promise<Session> {
    const session = this.data.sessions.find(session => session.code === code);
    
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }
    
    // Update lastAccessTime when session is accessed
    const now = new Date();
    console.log(`Updating lastAccessTime for session ${session.code} to ${now.toISOString()}`);
    session.lastAccessTime = now;
    this.saveData();
    
    return session;
  }

  // Member methods
  async getMembers(sessionId: number): Promise<Member[]> {
    return this.data.members.filter(member => member.sessionId === sessionId);
  }

  async getMember(id: number): Promise<Member | undefined> {
    return this.data.members.find(member => member.id === id);
  }

  async createMember(member: InsertMember): Promise<Member> {
    const id = this.data.counters.memberId++;
    const newMember: Member = { ...member, id };

    this.data.members.push(newMember);
    this.saveData();

    return newMember;
  }

  async updateMember(id: number, name: string): Promise<Member | undefined> {
    const memberIndex = this.data.members.findIndex(member => member.id === id);
    if (memberIndex === -1) return undefined;

    const updatedMember = {
      ...this.data.members[memberIndex],
      name
    };

    this.data.members[memberIndex] = updatedMember;
    this.saveData();

    return updatedMember;
  }

  async deleteMember(id: number): Promise<boolean> {
    // Find member index
    const memberIndex = this.data.members.findIndex(member => member.id === id);
    if (memberIndex === -1) return false;

    // Remove the member
    this.data.members.splice(memberIndex, 1);

    // Delete expenses where member is payer
    this.data.expenses = this.data.expenses.filter(expense => expense.payerId !== id);

    // Update expenses: remove member from participants
    this.data.expenses = this.data.expenses.map(expense => {
      if (expense.participants.includes(id)) {
        return {
          ...expense,
          participants: expense.participants.filter(pid => pid !== id)
        };
      }
      return expense;
    });

    this.saveData();
    return true;
  }

  // Expense methods
  async getExpenses(sessionId: number): Promise<Expense[]> {
    return this.data.expenses.filter(expense => expense.sessionId === sessionId);
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    return this.data.expenses.find(expense => expense.id === id);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.data.counters.expenseId++;
    const now = new Date();

    // Chắc chắn participants là một mảng số
    const participants = Array.isArray(expense.participants)
      ? expense.participants.map(p => Number(p))
      : [];

    const newExpense: Expense = {
      ...expense,
      participants,
      id,
      createdAt: now
    };

    this.data.expenses.push(newExpense);
    this.saveData();

    return newExpense;
  }

  async updateExpense(id: number, expenseData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expenseIndex = this.data.expenses.findIndex(expense => expense.id === id);
    if (expenseIndex === -1) return undefined;

    // Xử lý participants nếu được cung cấp
    let processedData: Partial<InsertExpense> = { ...expenseData };

    if (expenseData.participants) {
      processedData = {
        ...processedData,
        participants: Array.isArray(expenseData.participants)
          ? expenseData.participants.map(p => Number(p))
          : []
      };
    }

    const updatedExpense: Expense = {
      ...this.data.expenses[expenseIndex],
      ...processedData
    };

    this.data.expenses[expenseIndex] = updatedExpense;
    this.saveData();

    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const expenseIndex = this.data.expenses.findIndex(expense => expense.id === id);
    if (expenseIndex === -1) return false;

    this.data.expenses.splice(expenseIndex, 1);
    this.saveData();

    return true;
  }

  async deleteEmptySessions(): Promise<number> {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const now = new Date();

    // Get sessions with expenses
    const sessionIdsWithExpenses = new Set(
      this.data.expenses.map(expense => expense.sessionId)
    );

    // Filter sessions that are both empty and inactive for 7 days
    const oldEmptySessions = this.data.sessions.filter(session => {
      const isEmptySession = !sessionIdsWithExpenses.has(session.id);
      const daysSinceLastAccess = now.getTime() - new Date(session.lastAccessTime).getTime();
      const isInactive = daysSinceLastAccess >= SEVEN_DAYS_MS;
      
      return isEmptySession && isInactive;
    });

    if (oldEmptySessions.length === 0) {
      return 0;
    }

    const oldEmptySessionIds = oldEmptySessions.map(session => session.id);

    // Remove old empty sessions
    this.data.sessions = this.data.sessions.filter(
      session => !oldEmptySessionIds.includes(session.id)
    );

    // Remove members from old empty sessions
    this.data.members = this.data.members.filter(
      member => !oldEmptySessionIds.includes(member.sessionId)
    );

    this.saveData();

    return oldEmptySessions.length;
  }
}