import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { Member, Expense, MessageType, SessionData } from '@shared/schema';
import { 
  calculateBalances, 
  calculateSettlements, 
  calculateExpenseSummary,
  Settlement, 
  ExpenseSummary,
  MemberGroup
} from '@/utils/calculations';

export function useSessionData() {
  const { members, expenses, sendMessage, sessionData } = useSession();
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalAmount: 0,
    expenseCount: 0,
    largestExpense: null,
    expensesByCategory: []
  });

  useEffect(() => {
    if (members.length > 0 && expenses.length > 0) {
      // Tính toán settlements mới
      const newSettlements = calculateSettlements(
        members, 
        expenses, 
        sessionData.isGroupingEnabled ? sessionData.memberGroups : undefined
      );
      
      // Chỉ gửi lên server nếu settlements thay đổi
      if (JSON.stringify(newSettlements) !== JSON.stringify(sessionData.settlements)) {
        sendMessage({
          type: MessageType.SESSION_DATA_UPDATED,
          payload: {
            ...sessionData,
            settlements: newSettlements
          }
        });
      }

      setSummary(calculateExpenseSummary(expenses));
    } else {
      // Chỉ gửi lên server nếu đang có settlements
      if (sessionData.settlements.length > 0) {
        sendMessage({
          type: MessageType.SESSION_DATA_UPDATED,
          payload: {
            ...sessionData,
            settlements: []
          }
        });
      }
      setSummary({
        totalAmount: 0,
        expenseCount: 0,
        largestExpense: null,
        expensesByCategory: []
      });
    }
  }, [members, expenses, sessionData, sendMessage]);

  const getMemberById = (id: number): Member | undefined => {
    return members.find(member => member.id === id);
  };

  const getMemberSplitAmounts = (expense: Expense): { [key: number]: number } => {
    const splitAmounts: { [key: number]: number } = {};
    
    members.forEach(member => {
      if (!expense.participants || !expense.participants.includes(member.id)) {
        splitAmounts[member.id] = 0;
        return;
      }
      
      if (expense.isCustomSplit && expense.customAmounts && expense.customAmounts[member.id] !== undefined) {
        // Use custom amount if defined
        splitAmounts[member.id] = expense.customAmounts[member.id];
      } else {
        // Equal split
        const amountPerPerson = Math.round(expense.amount / (expense.participants?.length || 1));
        splitAmounts[member.id] = amountPerPerson;
      }
    });
    
    return splitAmounts;
  };
  
  // Thêm một nhóm thành viên mới
  const addMemberGroup = (group: MemberGroup) => {
    sendMessage({
      type: MessageType.SESSION_DATA_UPDATED,
      payload: {
        ...sessionData,
        memberGroups: [...sessionData.memberGroups, group]
      }
    });
  };
  
  // Xóa một nhóm thành viên
  const removeMemberGroup = (groupId: string) => {
    sendMessage({
      type: MessageType.SESSION_DATA_UPDATED,
      payload: {
        ...sessionData,
        memberGroups: sessionData.memberGroups.filter(g => g.id !== groupId)
      }
    });
  };
  
  // Cập nhật một nhóm thành viên
  const updateMemberGroup = (groupId: string, updatedGroup: Partial<MemberGroup>) => {
    sendMessage({
      type: MessageType.SESSION_DATA_UPDATED,
      payload: {
        ...sessionData,
        memberGroups: sessionData.memberGroups.map(group => 
          group.id === groupId ? { ...group, ...updatedGroup } : group
        )
      }
    });
  };
  
  // Bật/tắt tính năng nhóm thành viên
  const toggleGrouping = (enabled: boolean) => {
    sendMessage({
      type: MessageType.SESSION_DATA_UPDATED,
      payload: {
        ...sessionData,
        isGroupingEnabled: enabled
      }
    });
  };
  
  // Lấy nhóm của một thành viên
  const getMemberGroup = (memberId: number): MemberGroup | undefined => {
    return sessionData.memberGroups.find(group => group.memberIds.includes(memberId));
  };

  // Tính toán số dư của mỗi thành viên (số dương là trả trước, số âm là còn nợ)
  const getMemberBalance = (memberId: number): number => {
    // Tổng số tiền đã trả
    const totalPaid = expenses
      .filter(e => e.payerId === memberId)
      .reduce((sum, e) => sum + e.amount, 0);

    // Tổng số tiền phải trả
    const totalOwed = expenses.reduce((sum, e) => {
      if (!e.participants?.includes(memberId)) return sum;
      
      if (e.isCustomSplit && e.customAmounts && e.customAmounts[memberId] !== undefined) {
        return sum + e.customAmounts[memberId];
      } else {
        const amountPerPerson = Math.round(e.amount / (e.participants?.length || 1));
        return sum + amountPerPerson;
      }
    }, 0);

    return totalPaid - totalOwed;
  };

  return {
    settlements: sessionData.settlements,
    summary,
    getMemberById,
    getMemberSplitAmounts,
    memberGroups: sessionData.memberGroups,
    isGroupingEnabled: sessionData.isGroupingEnabled,
    addMemberGroup,
    removeMemberGroup,
    updateMemberGroup,
    toggleGrouping,
    getMemberGroup,
    getMemberBalance
  };
}
