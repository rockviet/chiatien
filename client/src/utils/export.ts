import { Expense, Member } from "@shared/schema";
import { calculateBalances, calculateSettlements, getMemberSplitAmount } from "./calculations";

/**
 * Tạo nội dung CSV từ dữ liệu chi tiêu và thành viên
 */
export function generateCSV(expenses: Expense[], members: Member[]): string {
  // Tạo header
  let csv = "Tên chi tiêu,Số tiền,Người trả,";
  
  // Thêm tên các thành viên vào header
  members.forEach(member => {
    csv += `${member.name},`;
  });
  
  csv += "Ngày tạo\n";
  
  // Thêm dữ liệu chi tiêu
  expenses.forEach(expense => {
    const payer = members.find(m => m.id === expense.payerId);
    csv += `"${expense.name}",${expense.amount},"${payer?.name || ''}",`;
    
    // Thêm số tiền chia cho từng thành viên
    members.forEach(member => {
      const isParticipant = expense.participants.includes(member.id);
      const amount = isParticipant ? getMemberSplitAmount(expense, member.id) : 0;
      csv += `${amount},`;
    });
    
    // Thêm ngày tạo
    csv += `${new Date(expense.createdAt).toLocaleDateString('vi-VN')}\n`;
  });
  
  // Thêm dòng tổng
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  csv += `"TỔNG CHI TIÊU",${totalAmount},,`;
  
  // Thêm tổng chi tiêu của mỗi thành viên
  const memberTotals: { [key: number]: number } = {};
  members.forEach(member => {
    memberTotals[member.id] = 0;
  });
  
  expenses.forEach(expense => {
    members.forEach(member => {
      if (expense.participants.includes(member.id)) {
        memberTotals[member.id] += getMemberSplitAmount(expense, member.id);
      }
    });
  });
  
  members.forEach(member => {
    csv += `${memberTotals[member.id]},`;
  });
  
  csv += "\n\n";
  
  // Thêm phần tính toán số tiền cần thanh toán
  csv += "BẢNG THANH TOÁN\n";
  csv += "Người trả,Người nhận,Số tiền\n";
  
  const settlements = calculateSettlements(members, expenses);
  settlements.forEach(settlement => {
    const from = members.find(m => m.id === settlement.fromId);
    const to = members.find(m => m.id === settlement.toId);
    csv += `"${from?.name || ''}","${to?.name || ''}",${settlement.amount}\n`;
  });
  
  return csv;
}

/**
 * Tạo dữ liệu JSON từ chi tiêu và thành viên
 */
export function generateJSON(expenses: Expense[], members: Member[]): string {
  const balances = calculateBalances(members, expenses);
  const settlements = calculateSettlements(members, expenses);
  
  const exportData = {
    date: new Date().toLocaleDateString('vi-VN'),
    expenses: expenses.map(expense => {
      const payer = members.find(m => m.id === expense.payerId);
      return {
        name: expense.name,
        amount: expense.amount,
        payer: payer?.name,
        participants: expense.participants.map(id => {
          const member = members.find(m => m.id === id);
          return {
            name: member?.name,
            amount: getMemberSplitAmount(expense, id)
          };
        }),
        isCustomSplit: expense.isCustomSplit,
        date: new Date(expense.createdAt).toLocaleDateString('vi-VN')
      };
    }),
    totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    members: members.map(member => {
      const balance = balances.find(b => b.memberId === member.id);
      return {
        name: member.name,
        balance: balance?.balance || 0
      };
    }),
    settlements: settlements.map(settlement => {
      const from = members.find(m => m.id === settlement.fromId);
      const to = members.find(m => m.id === settlement.toId);
      return {
        from: from?.name,
        to: to?.name,
        amount: settlement.amount
      };
    })
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Download file với dữ liệu đã tạo
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Export dữ liệu theo định dạng được chọn
 */
export function exportData(expenses: Expense[], members: Member[], format: 'csv' | 'json' = 'csv') {
  const date = new Date().toISOString().split('T')[0];
  
  if (format === 'csv') {
    const csvContent = generateCSV(expenses, members);
    downloadFile(csvContent, `chi-tieu-${date}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const jsonContent = generateJSON(expenses, members);
    downloadFile(jsonContent, `chi-tieu-${date}.json`, 'application/json');
  }
}