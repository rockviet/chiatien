import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { Expense } from '@shared/schema';
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  expense?: Expense;
}

export function AddExpenseModal({ 
  isOpen, 
  onClose, 
  mode = 'add',
  expense
}: AddExpenseModalProps) {
  const { members, addExpense, updateExpense } = useSession();
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    payerId: '',
    participants: [] as number[]
  });
  const [errors, setErrors] = useState({
    name: '',
    amount: '',
    payerId: '',
    participants: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && expense) {
        setFormData({
          name: expense.name,
          amount: expense.amount.toString(),
          payerId: expense.payerId.toString(),
          participants: [...expense.participants]
        });
      } else {
        setFormData({
          name: '',
          amount: '',
          payerId: '',
          participants: []
        });
      }
      setErrors({
        name: '',
        amount: '',
        payerId: '',
        participants: ''
      });
    }
  }, [isOpen, mode, expense]);

  const validate = () => {
    const newErrors = {
      name: '',
      amount: '',
      payerId: '',
      participants: ''
    };
    
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên chi tiêu';
    }
    
    if (!formData.amount) {
      newErrors.amount = 'Vui lòng nhập số tiền';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Số tiền phải lớn hơn 0';
    }
    
    if (!formData.payerId) {
      newErrors.payerId = 'Vui lòng chọn người trả';
    }
    
    if (formData.participants.length === 0) {
      newErrors.participants = 'Vui lòng chọn ít nhất một người tham gia';
    }
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const expenseData = {
      name: formData.name.trim(),
      amount: parseInt(formData.amount, 10),
      payerId: parseInt(formData.payerId, 10),
      participants: formData.participants
    };
    
    if (mode === 'add') {
      addExpense(expenseData);
    } else if (mode === 'edit' && expense) {
      updateExpense(expense.id, expenseData);
    }
    
    onClose();
  };

  const handleParticipantToggle = (memberId: number) => {
    setFormData(prev => {
      const participants = prev.participants.includes(memberId)
        ? prev.participants.filter(id => id !== memberId)
        : [...prev.participants, memberId];
      
      return { ...prev, participants };
    });
    
    // Clear participant error if any are selected
    if (errors.participants && formData.participants.length === 0) {
      setErrors(prev => ({ ...prev, participants: '' }));
    }
  };

  const handleSelectAllParticipants = () => {
    setFormData(prev => ({
      ...prev,
      participants: members.map(member => member.id)
    }));
    
    // Clear participant error
    if (errors.participants) {
      setErrors(prev => ({ ...prev, participants: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Thêm chi tiêu' : 'Sửa chi tiêu'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            {/* Expense Name */}
            <div className="space-y-1">
              <Label htmlFor="expense-name">Tên chi tiêu</Label>
              <Input
                id="expense-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên chi tiêu"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
            
            {/* Amount */}
            <div className="space-y-1">
              <Label htmlFor="expense-amount">Số tiền (nghìn VNĐ)</Label>
              <Input
                id="expense-amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Nhập số tiền"
                min="1"
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
            </div>
            
            {/* Payer */}
            <div className="space-y-1">
              <Label htmlFor="expense-payer">Người trả</Label>
              <Select 
                value={formData.payerId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payerId: value }))}
              >
                <SelectTrigger className={errors.payerId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Chọn người trả" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payerId && <p className="text-sm text-red-500">{errors.payerId}</p>}
            </div>
            
            {/* Participants */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Người tham gia</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSelectAllParticipants}
                  className="text-xs text-primary h-auto py-1"
                >
                  Chọn tất cả
                </Button>
              </div>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`participant-${member.id}`}
                      checked={formData.participants.includes(member.id)}
                      onCheckedChange={() => handleParticipantToggle(member.id)}
                    />
                    <Label htmlFor={`participant-${member.id}`} className="text-sm cursor-pointer">
                      {member.name}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.participants && <p className="text-sm text-red-500">{errors.participants}</p>}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="bg-primary hover:bg-blue-600">
              {mode === 'add' ? 'Thêm' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
