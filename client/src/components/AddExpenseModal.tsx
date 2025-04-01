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
import { Switch } from "@/components/ui/switch";
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
    participants: [] as number[],
    isCustomSplit: false,
    customAmounts: {} as Record<number, number>
  });
  const [errors, setErrors] = useState({
    name: '',
    amount: '',
    payerId: '',
    participants: '',
    customAmounts: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && expense) {
        setFormData({
          name: expense.name,
          amount: expense.amount.toString(),
          payerId: expense.payerId.toString(),
          participants: [...expense.participants],
          isCustomSplit: expense.isCustomSplit || false,
          customAmounts: expense.customAmounts || {}
        });
      } else {
        setFormData({
          name: '',
          amount: '',
          payerId: '',
          participants: [],
          isCustomSplit: false,
          customAmounts: {}
        });
      }
      setErrors({
        name: '',
        amount: '',
        payerId: '',
        participants: '',
        customAmounts: ''
      });
    }
  }, [isOpen, mode, expense]);

  const validate = () => {
    const newErrors = {
      name: '',
      amount: '',
      payerId: '',
      participants: '',
      customAmounts: ''
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
    
    // Validate custom amounts if using custom split
    if (formData.isCustomSplit) {
      const totalCustomAmount = Object.values(formData.customAmounts)
        .reduce((sum, amount) => sum + amount, 0);
      
      const totalExpense = parseFloat(formData.amount);
      
      if (Math.abs(totalCustomAmount - totalExpense) > 0.01) {
        newErrors.customAmounts = `Tổng số tiền tùy chỉnh (${totalCustomAmount}) phải bằng tổng chi phí (${totalExpense})`;
      }
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
      participants: formData.participants,
      isCustomSplit: formData.isCustomSplit,
      customAmounts: formData.isCustomSplit ? formData.customAmounts : {}
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
      
      // Update customAmounts when removing a participant
      const customAmounts = { ...prev.customAmounts };
      if (!participants.includes(memberId) && customAmounts[memberId] !== undefined) {
        delete customAmounts[memberId];
      } else if (participants.includes(memberId) && customAmounts[memberId] === undefined && prev.isCustomSplit) {
        // Add default amount
        const totalAmount = parseFloat(prev.amount) || 0;
        const defaultAmount = Math.round(totalAmount / participants.length);
        customAmounts[memberId] = defaultAmount;
      }
      
      return { ...prev, participants, customAmounts };
    });
    
    // Clear participant error if any are selected
    if (errors.participants && formData.participants.length === 0) {
      setErrors(prev => ({ ...prev, participants: '' }));
    }
  };

  const handleSelectAllParticipants = () => {
    setFormData(prev => {
      const allParticipants = members.map(member => member.id);
      
      // Update custom amounts if using custom split
      let customAmounts = { ...prev.customAmounts };
      if (prev.isCustomSplit) {
        const totalAmount = parseFloat(prev.amount) || 0;
        const equalAmount = Math.round(totalAmount / allParticipants.length);
        
        customAmounts = allParticipants.reduce((acc, id) => {
          acc[id] = equalAmount;
          return acc;
        }, {} as Record<number, number>);
      }
      
      return {
        ...prev,
        participants: allParticipants,
        customAmounts
      };
    });
    
    // Clear participant error
    if (errors.participants) {
      setErrors(prev => ({ ...prev, participants: '' }));
    }
  };
  
  const handleToggleCustomSplit = (checked: boolean) => {
    setFormData(prev => {
      let customAmounts = {};
      
      if (checked) {
        // Initialize custom amounts with equal split
        const totalAmount = parseFloat(prev.amount) || 0;
        const equalAmount = Math.round(totalAmount / prev.participants.length);
        
        customAmounts = prev.participants.reduce((acc, id) => {
          acc[id] = equalAmount;
          return acc;
        }, {} as Record<number, number>);
      }
      
      return { ...prev, isCustomSplit: checked, customAmounts };
    });
  };
  
  const handleCustomAmountChange = (memberId: number, value: string) => {
    const amount = parseInt(value, 10) || 0;
    
    setFormData(prev => ({
      ...prev,
      customAmounts: { ...prev.customAmounts, [memberId]: amount }
    }));
    
    // Clear errors
    if (errors.customAmounts) {
      setErrors(prev => ({ ...prev, customAmounts: '' }));
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
                onChange={(e) => {
                  const newAmount = e.target.value;
                  setFormData(prev => {
                    // Update customAmounts if using custom split
                    let customAmounts = { ...prev.customAmounts };
                    if (prev.isCustomSplit && prev.participants.length > 0) {
                      const totalAmount = parseFloat(newAmount) || 0;
                      const equalAmount = Math.round(totalAmount / prev.participants.length);
                      
                      customAmounts = prev.participants.reduce((acc, id) => {
                        acc[id] = equalAmount;
                        return acc;
                      }, {} as Record<number, number>);
                    }
                    
                    return { ...prev, amount: newAmount, customAmounts: prev.isCustomSplit ? customAmounts : prev.customAmounts };
                  });
                }}
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
            
            {/* Custom Split Toggle */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Switch
                  id="custom-split"
                  checked={formData.isCustomSplit}
                  onCheckedChange={handleToggleCustomSplit}
                />
                <Label htmlFor="custom-split" className="cursor-pointer">
                  Tự chia tiền
                </Label>
              </div>
              
              {/* Custom Split Amounts */}
              {formData.isCustomSplit && formData.participants.length > 0 && (
                <div className="mt-2">
                  <div className="bg-gray-50 p-3 rounded-md space-y-2">
                    {formData.participants.map(participantId => {
                      const member = members.find(m => m.id === participantId);
                      if (!member) return null;
                      
                      return (
                        <div key={`amount-${participantId}`} className="flex items-center space-x-2">
                          <Label htmlFor={`amount-${participantId}`} className="text-sm min-w-[100px]">
                            {member.name}
                          </Label>
                          <Input
                            id={`amount-${participantId}`}
                            type="number"
                            value={formData.customAmounts[participantId] || 0}
                            onChange={(e) => handleCustomAmountChange(participantId, e.target.value)}
                            className="w-24"
                            min="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {errors.customAmounts && (
                    <p className="text-sm text-red-500 mt-1">{errors.customAmounts}</p>
                  )}
                  
                  {/* Show total */}
                  <div className="flex justify-between mt-2 text-sm font-medium">
                    <span>Tổng số tiền tùy chỉnh:</span>
                    <span>
                      {Object.values(formData.customAmounts).reduce((sum, amount) => sum + amount, 0)} / {formData.amount || 0}
                    </span>
                  </div>
                </div>
              )}
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
