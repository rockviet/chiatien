import { useSessionData } from '@/hooks/useSessionData';
import { useSession } from '@/context/SessionContext';
import { formatVietnameseCurrency } from '@/utils/format';
import { useMemo } from 'react';

export function StatsSummary() {
  const { summary } = useSessionData();
  const { members, expenses } = useSession();

  const additionalStats = useMemo(() => {
    if (!expenses.length) return null;

    // Tính toán chi tiêu trung bình
    const averageExpense = summary.totalAmount / summary.expenseCount;

    // Tính toán thành viên tốn nhiều/ít nhất (dựa trên số tiền phải trả)
    const memberSpending = members.map(member => {
      const totalSpent = expenses.reduce((sum, expense) => {
        if (!expense.participants?.includes(member.id)) return sum;
        
        if (expense.isCustomSplit && expense.customAmounts && expense.customAmounts[member.id] !== undefined) {
          return sum + expense.customAmounts[member.id];
        } else {
          const amountPerPerson = Math.round(expense.amount / (expense.participants?.length || 1));
          return sum + amountPerPerson;
        }
      }, 0);
      
      return { name: member.name, amount: totalSpent };
    });

    const topSpender = memberSpending.reduce((max, curr) => 
      curr.amount > max.amount ? curr : max
    , memberSpending[0]);

    const leastSpender = memberSpending.reduce((min, curr) => 
      curr.amount < min.amount ? curr : min
    , memberSpending[0]);

    // Tính trung bình thiệt hại mỗi người
    const avgDamagePerPerson = Math.round(
      memberSpending.reduce((sum, member) => sum + member.amount, 0) / members.length
    );

    // Tính thời gian từ khoản chi đầu tiên
    const sortedExpenses = [...expenses].sort((a, b) => {
      const createdAtA = typeof a.createdAt === 'number' ? a.createdAt * 1000 : new Date(a.createdAt).getTime();
      const createdAtB = typeof b.createdAt === 'number' ? b.createdAt * 1000 : new Date(b.createdAt).getTime();
      return createdAtA - createdAtB;
    });

    return {
      averageExpense,
      topSpender,
      leastSpender,
      avgDamagePerPerson
    };
  }, [expenses, members, summary]);

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm sm:text-base font-medium">Thống kê chi tiêu</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Tổng chi tiêu</div>
          <div className="text-2xl font-bold text-primary mt-1">
            {formatVietnameseCurrency(summary.totalAmount)}
          </div>
          {additionalStats && (
            <div className="text-sm text-gray-500 mt-2">
              Trung bình {formatVietnameseCurrency(additionalStats.averageExpense)}/khoản
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Số lượng chi tiêu</div>
          <div className="text-2xl font-bold text-primary mt-1">
            {summary.expenseCount}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Chi tiêu lớn nhất</div>
          <div className="text-lg font-bold text-primary mt-1">
            {summary.largestExpense 
              ? `${summary.largestExpense.name}: ${formatVietnameseCurrency(summary.largestExpense.amount)}`
              : "Chưa có chi tiêu"}
          </div>
        </div>

        {additionalStats && (
          <>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Tốn nhiều nhất</div>
              <div className="text-lg font-bold text-primary mt-1">
                {additionalStats.topSpender.name}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatVietnameseCurrency(additionalStats.topSpender.amount)}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Tốn ít nhất</div>
              <div className="text-lg font-bold text-primary mt-1">
                {additionalStats.leastSpender.name}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatVietnameseCurrency(additionalStats.leastSpender.amount)}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Trung bình thiệt hại</div>
              <div className="text-2xl font-bold text-primary mt-1">
                {formatVietnameseCurrency(additionalStats.avgDamagePerPerson)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                mỗi người
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
