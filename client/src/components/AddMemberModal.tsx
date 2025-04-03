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
import { X, Plus, UserCircle2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [currentName, setCurrentName] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>(mode === 'edit' && initialName ? [initialName] : []);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialName) {
        setMemberNames([initialName]);
        setCurrentName('');
      } else if (mode === 'add') {
        // Không reset danh sách nếu đang thêm nhiều thành viên
        setCurrentName('');
      }
      setError('');
    }
  }, [isOpen, initialName, mode]);

  const addToList = () => {
    const trimmedName = currentName.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên thành viên');
      return false;
    }
    
    // Thêm vào danh sách
    setMemberNames(prev => [...prev, trimmedName]);
    setCurrentName('');
    setError('');
    return true;
  };

  const removeMember = (index: number) => {
    setMemberNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mode === 'add') {
      e.preventDefault();
      addToList();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Thêm thành viên đang nhập vào danh sách (nếu có)
    if (currentName.trim()) {
      const added = addToList();
      if (!added && mode === 'edit') return; // Không tiếp tục nếu nhập liệu không hợp lệ trong chế độ sửa
    }
    
    // Không cho phép danh sách rỗng
    if (memberNames.length === 0 && currentName.trim() === '') {
      setError('Vui lòng nhập ít nhất một tên thành viên');
      return;
    }
    
    if (mode === 'add') {
      // Thêm tuần tự từng thành viên theo đúng thứ tự
      for (const name of memberNames) {
        await addMember(name);
      }
    } else if (mode === 'edit' && onSubmit && memberNames.length > 0) {
      // Trong chế độ sửa, chỉ lấy tên đầu tiên
      onSubmit(memberNames[0]);
    }
    
    // Reset và đóng
    setMemberNames([]);
    setCurrentName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Thêm thành viên' : 'Sửa thành viên'}
          </DialogTitle>
          {mode === 'add' && (
            <DialogDescription>
              Nhập tên các thành viên, nhấn Enter để thêm nhiều người
            </DialogDescription>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            {/* Danh sách thành viên đã thêm */}
            {mode === 'add' && memberNames.length > 0 && (
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Danh sách ({memberNames.length})
                </Label>
                <ScrollArea className="h-24 rounded-md border p-2">
                  <div className="flex flex-wrap gap-2">
                    {memberNames.map((name, index) => (
                      <Badge key={index} variant="secondary" className="py-1.5 pl-2 pr-1 flex items-center gap-1 bg-slate-100">
                        <UserCircle2 className="h-3.5 w-3.5 text-primary" />
                        {name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-slate-200 rounded-full"
                          onClick={() => removeMember(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          
            {/* Input nhập tên */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-1">
                  {mode === 'add' ? 'Tên thành viên' : 'Tên thành viên'}
                </Label>
                {mode === 'add' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary"
                    onClick={addToList}
                    disabled={!currentName.trim()}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Thêm vào danh sách
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="member-name"
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder={mode === 'add' ? "Nhập tên, nhấn Enter để thêm nhiều" : "Nhập tên thành viên"}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
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
              {mode === 'add' 
                ? `Lưu${memberNames.length ? ` (${memberNames.length} người)` : ''}` 
                : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
