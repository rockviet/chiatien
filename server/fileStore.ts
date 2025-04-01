import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { 
  Session, InsertSession, 
  Member, InsertMember, 
  Expense, InsertExpense 
} from '@shared/schema';
import { IStorage } from './storage';

// Định nghĩa cấu trúc dữ liệu sẽ lưu trữ trong tệp JSON
interface StoredData {
  sessions: Session[];
  members: Member[];
  expenses: Expense[];
  counters: {
    sessionId: number;
    memberId: number;
    expenseId: number;
  };
}

/**
 * Lớp FileStore lưu trữ dữ liệu vào tệp JSON
 */
export class FileStore implements IStorage {
  private data: StoredData;
  private filePath: string;

  constructor(filePath: string = './data/bills.json') {
    this.filePath = filePath;
    
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
    
    // Đảm bảo thư mục tồn tại
    this.ensureDirectoryExists(path.dirname(filePath));
    
    // Tải dữ liệu nếu file tồn tại
    this.loadData();
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Đã tạo thư mục: ${dirPath}`);
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const rawData = fs.readFileSync(this.filePath, 'utf8');
        const parsedData = JSON.parse(rawData);
        
        // Đảm bảo dữ liệu hợp lệ với cấu trúc đã định nghĩa
        this.data = {
          sessions: Array.isArray(parsedData.sessions) ? parsedData.sessions : [],
          members: Array.isArray(parsedData.members) ? parsedData.members : [],
          expenses: Array.isArray(parsedData.expenses) ? parsedData.expenses : [],
          counters: {
            sessionId: typeof parsedData.counters?.sessionId === 'number' ? parsedData.counters.sessionId : 1,
            memberId: typeof parsedData.counters?.memberId === 'number' ? parsedData.counters.memberId : 1,
            expenseId: typeof parsedData.counters?.expenseId === 'number' ? parsedData.counters.expenseId : 1
          }
        };
        
        // Đảm bảo rằng participants trong expenses là các mảng
        this.data.expenses = this.data.expenses.map(expense => ({
          ...expense,
          participants: Array.isArray(expense.participants) 
            ? expense.participants.filter(p => typeof p === 'number')
            : []
        }));
        
        console.log('Đã tải dữ liệu từ file thành công.');
      } else {
        // Nếu file không tồn tại, lưu dữ liệu mặc định
        this.saveData();
        console.log('Đã tạo file dữ liệu mới.');
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
    }
  }

  // Phương thức Session
  async createSession(): Promise<Session> {
    const id = this.data.counters.sessionId++;
    const code = nanoid(6).toUpperCase();
    const now = new Date();
    
    const session: Session = {
      id,
      code,
      createdAt: now
    };
    
    this.data.sessions.push(session);
    this.saveData();
    
    return session;
  }

  async getSessionByCode(code: string): Promise<Session | undefined> {
    return this.data.sessions.find(s => s.code === code);
  }

  // Phương thức Member
  async getMembers(sessionId: number): Promise<Member[]> {
    return this.data.members.filter(m => m.sessionId === sessionId);
  }

  async getMember(id: number): Promise<Member | undefined> {
    return this.data.members.find(m => m.id === id);
  }

  async createMember(member: InsertMember): Promise<Member> {
    const id = this.data.counters.memberId++;
    
    const newMember: Member = {
      id,
      name: member.name,
      sessionId: member.sessionId
    };
    
    this.data.members.push(newMember);
    this.saveData();
    
    return newMember;
  }

  async updateMember(id: number, name: string): Promise<Member | undefined> {
    const index = this.data.members.findIndex(m => m.id === id);
    if (index === -1) return undefined;
    
    const updatedMember: Member = {
      ...this.data.members[index],
      name
    };
    
    this.data.members[index] = updatedMember;
    this.saveData();
    
    return updatedMember;
  }

  async deleteMember(id: number): Promise<boolean> {
    const memberIndex = this.data.members.findIndex(m => m.id === id);
    if (memberIndex === -1) return false;
    
    // Xóa thành viên
    this.data.members.splice(memberIndex, 1);
    
    // Xóa các chi phí mà thành viên này trả
    this.data.expenses = this.data.expenses.filter(e => e.payerId !== id);
    
    // Cập nhật danh sách người tham gia trong các chi phí
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

  // Phương thức Expense
  async getExpenses(sessionId: number): Promise<Expense[]> {
    return this.data.expenses.filter(e => e.sessionId === sessionId);
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    return this.data.expenses.find(e => e.id === id);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.data.counters.expenseId++;
    const now = new Date();
    
    // Chuyển đổi participants thành mảng số nguyên
    const participants: number[] = Array.isArray(expense.participants)
      ? expense.participants.map(p => Number(p))
      : [];
    
    // Chuẩn bị customAmounts, mặc định là {}
    const customAmounts: Record<number, number> = expense.customAmounts || {};
    
    const newExpense: Expense = {
      id,
      name: expense.name,
      sessionId: expense.sessionId,
      amount: expense.amount,
      payerId: expense.payerId,
      participants,
      customAmounts,
      isCustomSplit: expense.isCustomSplit || false,
      createdAt: now
    };
    
    this.data.expenses.push(newExpense);
    this.saveData();
    
    return newExpense;
  }

  async updateExpense(id: number, expenseData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const index = this.data.expenses.findIndex(e => e.id === id);
    if (index === -1) return undefined;
    
    // Chuẩn bị dữ liệu cập nhật
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
    
    const updatedExpense: Expense = {
      ...this.data.expenses[index],
      ...updateData
    };
    
    this.data.expenses[index] = updatedExpense;
    this.saveData();
    
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const index = this.data.expenses.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    this.data.expenses.splice(index, 1);
    this.saveData();
    
    return true;
  }
}