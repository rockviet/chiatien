import { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SessionCode() {
  const { sessionCode } = useSession();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (!sessionCode) return;
    
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        toast({
          description: "Đã sao chép liên kết vào bộ nhớ tạm"
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast({
          variant: "destructive",
          description: "Không thể sao chép liên kết"
        });
      });
  };

  if (!sessionCode) return null;

  return (
    <div className="text-sm bg-gray-100 px-3 py-1 rounded-md flex items-center">
      <span>Mã: <span className="font-medium">{sessionCode}</span></span>
      <Button 
        onClick={copyToClipboard} 
        variant="ghost" 
        size="sm" 
        className="ml-1 p-0 h-auto text-primary hover:text-blue-700 hover:bg-transparent"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </Button>
    </div>
  );
}
