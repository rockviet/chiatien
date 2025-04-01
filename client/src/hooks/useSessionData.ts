import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { Member, Expense } from '@shared/schema';
import { 
  calculateBalances, 
  calculateSettlements, 
  calculateExpenseSummary,
  getMemberSplitAmount,
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
      // Sử dụng hàm getMemberSplitAmount để tính toán chính xác với slots
      splitAmounts[member.id] = getMemberSplitAmount(expense, member.id, members);
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
