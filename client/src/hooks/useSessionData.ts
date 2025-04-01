import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { Member, Expense } from '@shared/schema';
import { 
  calculateBalances, 
  calculateSettlements, 
  calculateExpenseSummary,
  Settlement, 
  ExpenseSummary,
  MemberGroup
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
  
  // State cho các nhóm thành viên
  const [memberGroups, setMemberGroups] = useState<MemberGroup[]>([]);
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(false);

  useEffect(() => {
    if (members.length > 0 && expenses.length > 0) {
      // Tính toán các giao dịch thanh toán với hoặc không có nhóm
      if (isGroupingEnabled && memberGroups.length > 0) {
        setSettlements(calculateSettlements(members, expenses, memberGroups));
      } else {
        setSettlements(calculateSettlements(members, expenses));
      }
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
  }, [members, expenses, memberGroups, isGroupingEnabled]);

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
  
  // Thêm một nhóm thành viên mới
  const addMemberGroup = (group: MemberGroup) => {
    setMemberGroups(prev => [...prev, group]);
  };
  
  // Xóa một nhóm thành viên
  const removeMemberGroup = (groupId: string) => {
    setMemberGroups(prev => prev.filter(group => group.id !== groupId));
  };
  
  // Cập nhật một nhóm thành viên
  const updateMemberGroup = (groupId: string, updatedGroup: Partial<MemberGroup>) => {
    setMemberGroups(prev => 
      prev.map(group => 
        group.id === groupId 
          ? { ...group, ...updatedGroup } 
          : group
      )
    );
  };
  
  // Bật/tắt tính năng nhóm thành viên
  const toggleGrouping = (enabled: boolean) => {
    setIsGroupingEnabled(enabled);
  };
  
  // Lấy nhóm của một thành viên
  const getMemberGroup = (memberId: number): MemberGroup | undefined => {
    return memberGroups.find(group => group.memberIds.includes(memberId));
  };

  return {
    settlements,
    summary,
    getMemberById,
    getMemberSplitAmounts,
    memberGroups,
    isGroupingEnabled,
    addMemberGroup,
    removeMemberGroup,
    updateMemberGroup,
    toggleGrouping,
    getMemberGroup
  };
}
