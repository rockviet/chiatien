import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { Member, Expense } from '@shared/schema';
import { 
  calculateBalances, 
  calculateSettlements, 
  calculateExpenseSummary,
  Settlement, 
  ExpenseSummary
} from '@/utils/calculations';

export function useSessionData() {
  const { members, expenses } = useSession();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalAmount: 0,
    expenseCount: 0,
    largestExpense: null,
    expensesByCategory: []
  });

  useEffect(() => {
    if (members.length > 0 && expenses.length > 0) {
      setSettlements(calculateSettlements(members, expenses));
      setSummary(calculateExpenseSummary(expenses));
    } else {
      setSettlements([]);
      setSummary({
        totalAmount: 0,
        expenseCount: 0,
        largestExpense: null,
        expensesByCategory: []
      });
    }
  }, [members, expenses]);

  const getMemberById = (id: number): Member | undefined => {
    return members.find(member => member.id === id);
  };

  const getMemberSplitAmounts = (expense: Expense): { [key: number]: number } => {
    const splitAmounts: { [key: number]: number } = {};
    
    members.forEach(member => {
      if (!expense.participants.includes(member.id)) {
        splitAmounts[member.id] = 0;
        return;
      }
      
      if (expense.isCustomSplit && expense.customAmounts && expense.customAmounts[member.id] !== undefined) {
        // Use custom amount if defined
        splitAmounts[member.id] = expense.customAmounts[member.id];
      } else {
        // Equal split
        const amountPerPerson = Math.round(expense.amount / expense.participants.length);
        splitAmounts[member.id] = amountPerPerson;
      }
    });
    
    return splitAmounts;
  };

  return {
    settlements,
    summary,
    getMemberById,
    getMemberSplitAmounts
  };
}
