import { useSessionData } from '@/hooks/useSessionData';
import { ExportMenu } from './ExportMenu';

export function StatsSummary() {
  const { summary } = useSessionData();

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Tổng kết chi tiêu</h3>
        <ExportMenu />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Tổng chi tiêu</div>
          <div className="text-2xl font-bold text-primary mt-1">
            {summary.totalAmount} nghìn VNĐ
          </div>
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
              ? `${summary.largestExpense.name}: ${summary.largestExpense.amount} nghìn VNĐ`
              : "Chưa có chi tiêu"}
          </div>
        </div>
      </div>
    </div>
  );
}
