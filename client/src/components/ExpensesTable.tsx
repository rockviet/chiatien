import { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { useSessionData } from '@/hooks/useSessionData';
import { useResponsive } from '@/hooks/use-responsive';
import { getMemberColor, getContrastTextColor } from '@/utils/colors';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, SplitSquareHorizontal } from 'lucide-react';
import { AddExpenseModal } from './AddExpenseModal';
import { ExpensesMobileView } from './ExpensesMobileView';
import { Expense } from '@shared/schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ExpensesTable() {
  const { members, expenses, deleteExpense } = useSession();
  const { getMemberById, getMemberSplitAmounts } = useSessionData();
  const { isMobileOrTablet } = useResponsive();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Nếu là mobile hoặc tablet, hiển thị giao diện dành cho thiết bị nhỏ
  if (isMobileOrTablet) {
    return <ExpensesMobileView />;
  }

  const handleEditClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditModal(true);
  };

  const handleDeleteClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedExpense) {
      deleteExpense(selectedExpense.id);
      setShowDeleteDialog(false);
    }
  };

  // Calculate totals
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const memberTotals: { [key: number]: number } = {};
  
  members.forEach(member => {
    memberTotals[member.id] = 0;
  });
  
  expenses.forEach(expense => {
    const splitAmounts = getMemberSplitAmounts(expense);
    for (const [memberId, amount] of Object.entries(splitAmounts)) {
      memberTotals[Number(memberId)] += amount;
    }
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Chi tiêu</h2>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white hover:bg-blue-600 flex items-center"
          size="sm"
          disabled={members.length === 0}
        >
          <Plus className="mr-1 h-4 w-4" /> Thêm chi tiêu
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="table-container overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                  Chi tiêu
                </th>
                <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng tiền (nghìn VNĐ)
                </th>
                <th scope="col" className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người trả
                </th>
                {members.map(member => {
                  const color = getMemberColor(member.id);
                  return (
                    <th key={member.id} scope="col" className="py-3 px-4 text-center text-xs font-medium uppercase tracking-wider">
                      <span className="flex items-center justify-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-1.5"
                          style={{ backgroundColor: color }}
                        ></span>
                        {member.name} {member.slots > 1 ? `(${member.slots})` : ''}
                      </span>
                    </th>
                  );
                })}
                <th scope="col" className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5 + members.length} className="py-4 px-4 text-sm text-center text-gray-500">
                    {members.length === 0 
                      ? "Thêm thành viên để bắt đầu nhập chi tiêu"
                      : "Chưa có chi tiêu nào. Thêm chi tiêu để bắt đầu."}
                  </td>
                </tr>
              ) : (
                expenses.map(expense => {
                  const payer = getMemberById(expense.payerId);
                  const splitAmounts = getMemberSplitAmounts(expense);
                  
                  return (
                    <tr key={expense.id} className="expense-row">
                      <td className="py-3 px-4 text-sm font-medium">
                        <div className="flex items-center">
                          {expense.name}
                          {expense.isCustomSplit && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="ml-1 inline-flex items-center">
                                    <SplitSquareHorizontal className="h-4 w-4 text-primary" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Tự chia tiền</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{expense.amount}</td>
                      <td className="py-3 px-4 text-sm">
                        {payer && (
                          <span className="flex items-center text-xs font-medium">
                            <span 
                              className="inline-block w-3 h-3 rounded-full mr-1.5"
                              style={{ backgroundColor: getMemberColor(payer.id) }}
                            ></span>
                            {payer.name} {payer.slots > 1 ? `(${payer.slots})` : ''}
                          </span>
                        )}
                      </td>
                      
                      {members.map(member => (
                        <td key={member.id} className="py-3 px-4 text-sm text-center">
                          <div className="flex justify-center">
                            <Checkbox 
                              checked={expense.participants.includes(member.id)} 
                              disabled 
                              className="h-4 w-4 text-primary focus:ring-primary rounded"
                            />
                          </div>
                          {expense.participants.includes(member.id) && (
                            <div className={`text-xs mt-1 ${expense.isCustomSplit ? 'font-medium text-primary' : 'text-gray-600'}`}>
                              {splitAmounts[member.id]}
                            </div>
                          )}
                        </td>
                      ))}
                      
                      <td className="py-3 px-4 text-sm text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-primary p-0 h-auto"
                          onClick={() => handleEditClick(expense)}
                          aria-label="Sửa chi tiêu"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-danger ml-2 p-0 h-auto"
                          onClick={() => handleDeleteClick(expense)}
                          aria-label="Xóa chi tiêu"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {expenses.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="py-3 px-4 text-sm font-semibold">Tổng</td>
                  <td className="py-3 px-4 text-sm font-semibold">{totalAmount}</td>
                  <td className="py-3 px-4"></td>
                  {members.map(member => (
                    <td key={member.id} className="py-3 px-4 text-sm font-semibold text-center">
                      {memberTotals[member.id]}
                    </td>
                  ))}
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        mode="add"
      />

      {/* Edit Expense Modal */}
      {selectedExpense && (
        <AddExpenseModal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)} 
          mode="edit"
          expense={selectedExpense}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chi tiêu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa chi tiêu {selectedExpense?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
