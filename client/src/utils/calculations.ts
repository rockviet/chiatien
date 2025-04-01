import { Member, Expense } from '@shared/schema';

export interface Settlement {
  fromId: number;
  toId: number;
  amount: number;
  fromGroupId?: string;
  toGroupId?: string;
}

export interface MemberBalance {
  memberId: number;
  balance: number; // Positive means they are owed money, negative means they owe money
  groupId?: string; // Optional group ID for grouped settlements
}

export interface ExpenseSummary {
  totalAmount: number;
  expenseCount: number;
  largestExpense: {
    name: string;
    amount: number;
  } | null;
  expensesByCategory: {
    name: string;
    amount: number;
  }[];
}

// Calculate how much each member spent and received
export function calculateBalances(members: Member[], expenses: Expense[]): MemberBalance[] {
  const balances: { [key: number]: number } = {};
  
  // Initialize balances for all members
  members.forEach(member => {
    balances[member.id] = 0;
  });
  
  // Calculate net balance for each member based on expenses
  expenses.forEach(expense => {
    const { payerId, amount, participants, isCustomSplit, customAmounts } = expense;
    
    // Add the full amount to payer's balance (they paid for everyone)
    balances[payerId] += amount;
    
    if (isCustomSplit && Object.keys(customAmounts).length > 0) {
      // Use custom split amounts
      participants.forEach(participantId => {
        const customAmount = customAmounts[participantId] || 0;
        balances[participantId] -= customAmount;
      });
    } else {
      // Split the expense evenly among participants
      const sharePerPerson = amount / participants.length;
      participants.forEach(participantId => {
        balances[participantId] -= sharePerPerson;
      });
    }
  });
  
  return Object.entries(balances).map(([id, balance]) => ({
    memberId: Number(id),
    balance: Math.round(balance * 100) / 100, // Round to 2 decimal places
    groupId: `individual-${id}` // Default group ID for individuals - used in settlement grouping
  }));
}

// MemberGroup interface to define groups of members
export interface MemberGroup {
  id: string;
  memberIds: number[];
  name: string;
}

// Calculate settlements - who pays whom
export function calculateSettlements(
  members: Member[], 
  expenses: Expense[], 
  memberGroups: MemberGroup[] = []
): Settlement[] {
  // Xử lý với nhóm thành viên nếu được cung cấp
  if (memberGroups.length > 0) {
    return calculateSettlementsWithGroups(members, expenses, memberGroups);
  }
  
  // Logic tính toán cũ nếu không có nhóm
  const balances = calculateBalances(members, expenses);
  const settlements: Settlement[] = [];
  
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = balances.filter(bal => bal.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(bal => bal.balance < 0).sort((a, b) => a.balance - b.balance);
  
  // Create settlements by matching debtors with creditors
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    
    // Calculate settlement amount (minimum of absolute values)
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
    
    if (amount > 0) {
      settlements.push({
        fromId: debtor.memberId,
        toId: creditor.memberId,
        amount: Math.round(amount), // Round to nearest thousand
        fromGroupId: debtor.groupId,
        toGroupId: creditor.groupId
      });
    }
    
    // Update balances
    debtor.balance += amount;
    creditor.balance -= amount;
    
    // Remove entries with zero balance
    if (Math.abs(debtor.balance) < 0.01) {
      debtors.shift();
    }
    
    if (Math.abs(creditor.balance) < 0.01) {
      creditors.shift();
    }
  }
  
  return settlements;
}

// Calculate settlements with member groups
function calculateSettlementsWithGroups(
  members: Member[], 
  expenses: Expense[], 
  memberGroups: MemberGroup[]
): Settlement[] {
  // Tính toán các số dư ban đầu
  const individualBalances = calculateBalances(members, expenses);
  const settlements: Settlement[] = [];
  
  // Tạo một bản đồ ID thành viên -> ID nhóm
  const memberToGroupMap: Record<number, string> = {};
  memberGroups.forEach(group => {
    group.memberIds.forEach(memberId => {
      memberToGroupMap[memberId] = group.id;
    });
  });
  
  // Tạo nhóm các số dư
  const groupBalances: Record<string, number> = {};
  const groupToRepresentativeMember: Record<string, number> = {};
  
  // Tính số dư cho các nhóm
  individualBalances.forEach(balance => {
    const memberId = balance.memberId;
    const groupId = memberToGroupMap[memberId] || `individual-${memberId}`;
    
    if (!groupBalances[groupId]) {
      groupBalances[groupId] = 0;
      groupToRepresentativeMember[groupId] = memberId;
    }
    
    groupBalances[groupId] += balance.balance;
  });
  
  // Chuyển đổi balances từ object sang array
  const groupBalanceArray: MemberBalance[] = Object.entries(groupBalances).map(([groupId, balance]) => ({
    memberId: groupToRepresentativeMember[groupId], // Đại diện nhóm
    balance: Math.round(balance * 100) / 100,
    groupId
  }));
  
  // Phân tách creditors và debtors
  const creditors = groupBalanceArray.filter(bal => bal.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = groupBalanceArray.filter(bal => bal.balance < 0).sort((a, b) => a.balance - b.balance);
  
  // Tạo các giao dịch thanh toán
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    
    // Tính số tiền thanh toán
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
    
    if (amount > 0) {
      settlements.push({
        fromId: debtor.memberId,
        toId: creditor.memberId,
        amount: Math.round(amount), // Làm tròn đến hàng nghìn
        fromGroupId: debtor.groupId,
        toGroupId: creditor.groupId
      });
    }
    
    // Cập nhật số dư
    debtor.balance += amount;
    creditor.balance -= amount;
    
    // Loại bỏ các mục có số dư = 0
    if (Math.abs(debtor.balance) < 0.01) {
      debtors.shift();
    }
    
    if (Math.abs(creditor.balance) < 0.01) {
      creditors.shift();
    }
  }
  
  return settlements;
}

// Calculate expense summary statistics
export function calculateExpenseSummary(expenses: Expense[]): ExpenseSummary {
  if (expenses.length === 0) {
    return {
      totalAmount: 0,
      expenseCount: 0,
      largestExpense: null,
      expensesByCategory: []
    };
  }
  
  let totalAmount = 0;
  let largestExpense = expenses[0];
  const categoryMap: { [key: string]: number } = {};
  
  expenses.forEach(expense => {
    totalAmount += expense.amount;
    
    if (expense.amount > largestExpense.amount) {
      largestExpense = expense;
    }
    
    // Use expense name as category for now
    // We could add categories in the future
    const category = expense.name;
    categoryMap[category] = (categoryMap[category] || 0) + expense.amount;
  });
  
  const expensesByCategory = Object.entries(categoryMap).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount);
  
  return {
    totalAmount,
    expenseCount: expenses.length,
    largestExpense: {
      name: largestExpense.name,
      amount: largestExpense.amount
    },
    expensesByCategory
  };
}

// Get member split amount for an expense
export function getMemberSplitAmount(expense: Expense, memberId: number): number {
  if (!expense.participants.includes(memberId)) {
    return 0;
  }
  
  if (expense.isCustomSplit && expense.customAmounts && typeof expense.customAmounts[memberId] === 'number') {
    return expense.customAmounts[memberId];
  }
  
  return Math.round(expense.amount / expense.participants.length);
}
