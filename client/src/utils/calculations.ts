import { Member, Expense } from '@shared/schema';

export interface Settlement {
  fromId: number;
  toId: number;
  amount: number;
}

export interface MemberBalance {
  memberId: number;
  balance: number; // Positive means they are owed money, negative means they owe money
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
    const { payerId, amount, participants } = expense;
    
    // Add the full amount to payer's balance (they paid for everyone)
    balances[payerId] += amount;
    
    // Split the expense among participants and subtract from each
    const sharePerPerson = amount / participants.length;
    participants.forEach(participantId => {
      balances[participantId] -= sharePerPerson;
    });
  });
  
  return Object.entries(balances).map(([id, balance]) => ({
    memberId: Number(id),
    balance: Math.round(balance * 100) / 100 // Round to 2 decimal places
  }));
}

// Calculate settlements - who pays whom
export function calculateSettlements(members: Member[], expenses: Expense[]): Settlement[] {
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
        amount: Math.round(amount) // Round to nearest thousand
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
  
  return Math.round(expense.amount / expense.participants.length);
}
