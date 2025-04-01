import { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportData } from '@/utils/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportMenu() {
  const { members, expenses } = useSession();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    if (expenses.length === 0) return;
    
    setIsExporting(true);
    try {
      exportData(expenses, members, format);
    } catch (error) {
      console.error('Lỗi khi xuất dữ liệu:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-1" 
          disabled={expenses.length === 0 || isExporting}
          size="sm"
        >
          <Download className="h-4 w-4" />
          <span>Xuất dữ liệu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          Xuất CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          Xuất JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}