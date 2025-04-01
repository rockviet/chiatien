import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialName?: string;
  onSubmit?: (name: string) => void;
}

export function AddMemberModal({ 
  isOpen, 
  onClose, 
  mode = 'add',
  initialName = '',
  onSubmit
}: AddMemberModalProps) {
  const { addMember } = useSession();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError('');
    }
  }, [isOpen, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên thành viên');
      return;
    }
    
    if (mode === 'add') {
      addMember(trimmedName);
    } else if (mode === 'edit' && onSubmit) {
      onSubmit(trimmedName);
    }
    
    setName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Thêm thành viên' : 'Sửa thành viên'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-1">
              Tên thành viên
            </Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Nhập tên thành viên"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
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
