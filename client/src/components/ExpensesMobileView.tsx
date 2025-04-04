import { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { useSessionData } from '@/hooks/useSessionData';
import { getMemberColor } from '@/utils/colors';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, SplitSquareHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { AddExpenseModal } from './AddExpenseModal';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatVietnameseCurrency } from '@/utils/format';

export function ExpensesMobileView() {
  const { members, expenses, deleteExpense } = useSession();
  const { getMemberById, getMemberSplitAmounts, getMemberBalance } = useSessionData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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

  // Tính tổng chi tiêu và số dư cho mỗi thành viên
  const memberTotals = members.map(member => {
    const totalSpent = expenses.reduce((total, expense) => {
      const splitAmounts = getMemberSplitAmounts(expense);
      const isParticipant = expense.participants?.includes(member.id) || false;
      return total + (isParticipant ? (splitAmounts[member.id] || 0) : 0);
    }, 0);

    const balance = getMemberBalance(member.id);

    return {
      member,
      totalSpent,
      balance
    };
  });

  return (
    <div className="space-y-4">

      {/* Danh sách chi tiêu */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chi tiêu</h2>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white hover:bg-blue-600 flex items-center"
            size="sm"
            disabled={members.length === 0}
          >
            <Plus className="mr-1 h-4 w-4" /> Thêm
          </Button>
        </div>
        
        {expenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-sm text-gray-500">
            {members.length === 0 
              ? "Thêm thành viên để bắt đầu nhập chi tiêu"
              : "Chưa có chi tiêu nào. Thêm chi tiêu để bắt đầu."}
          </div>
        ) : (
          expenses.map(expense => {
            const payer = getMemberById(expense.payerId);
            const splitAmounts = getMemberSplitAmounts(expense);
            const participantCount = expense.participants?.length || 0;
            
            return (
              <Card key={expense.id} className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CardTitle className="text-base mr-2">{expense.name}</CardTitle>
                      {expense.isCustomSplit && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 text-primary border-primary">
                          <SplitSquareHorizontal className="h-3 w-3" />
                          Tự chia
                        </Badge>
                      )}
                    </div>
                    <div className="text-base font-medium text-right">
                      {expense.amount}k
                    </div>
                  </div>
                  <CardDescription className="flex justify-between mt-1 text-sm">
                    <div>
                      <span>Người trả: </span>
                      {payer && (
                        <span className="flex items-center text-xs font-medium ml-1">
                          <span 
                            className="inline-block w-3 h-3 rounded-full mr-1.5"
                            style={{ backgroundColor: getMemberColor(payer.id) }}
                          ></span>
                          {payer.name}
                        </span>
                      )}
                    </div>
                    <span>{participantCount} người tham gia</span>
                  </CardDescription>
                </CardHeader>
                
                <Accordion type="single" collapsible className="border-t border-gray-100">
                  <AccordionItem value="details" className="border-b-0">
                    <AccordionTrigger className="py-2 px-4 text-sm hover:no-underline">
                      Chi tiết
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <div className="space-y-1">
                        {members.map(member => {
                          const isParticipant = expense.participants?.includes(member.id) || false;
                          const amount = splitAmounts[member.id];
                          
                          if (!isParticipant) return null;
                          
                          return (
                            <div key={member.id} className="flex justify-between text-sm py-1">
                              <span className="flex items-center text-xs font-medium">
                                <span 
                                  className="inline-block w-3 h-3 rounded-full mr-1.5"
                                  style={{ backgroundColor: getMemberColor(member.id) }}
                                ></span>
                                {member.name}
                              </span>
                              <span className={`${expense.isCustomSplit ? 'text-primary font-medium' : ''}`}>
                                {amount}k
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <CardFooter className="flex justify-end gap-1 py-2 px-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-gray-500 hover:text-primary"
                    onClick={() => handleEditClick(expense)}
                  >
                    <Pencil size={16} className="mr-1" /> Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-gray-500 hover:text-red-500"
                    onClick={() => handleDeleteClick(expense)}
                  >
                    <Trash2 size={16} className="mr-1" /> Xóa
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
        
        <Card className="bg-gray-50 shadow-sm">
          <CardHeader className="py-3 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Tổng chi tiêu</CardTitle>
              <div className="text-base font-bold">{totalAmount}k</div>
            </div>
          </CardHeader>
        </Card>
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

      {/* Tổng chi tiêu và số dư */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">Chi tiêu mỗi thành viên</h3>
        <div className="space-y-2">
          {memberTotals.map(({ member, totalSpent, balance }) => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span 
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: getMemberColor(member.id) }}
                ></span>
                <span className="text-sm font-medium">{member.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatVietnameseCurrency(totalSpent)}</div>
                <div className={`text-xs ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {balance > 0 ? 'Được hoàn:' : 'Còn nợ:'} {formatVietnameseCurrency(balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}