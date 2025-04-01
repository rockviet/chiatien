import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { MessageType, WebSocketMessage, Member, Expense, Session } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface SessionContextType {
  sessionCode: string | null;
  members: Member[];
  expenses: Expense[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: WebSocketMessage) => void;
  joinSession: (code: string) => void;
  createSession: () => void;
  addMember: (name: string) => void;
  updateMember: (id: number, name: string) => void;
  deleteMember: (id: number) => void;
  addExpense: (data: { name: string; amount: number; payerId: number; participants: number[] }) => void;
  updateExpense: (id: number, data: { name?: string; amount?: number; payerId?: number; participants?: number[] }) => void;
  deleteExpense: (id: number) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Check URL for session code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      joinSession(code);
    } else {
      setIsLoading(false);
    }
    
    // Cleanup
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const setupWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setError("Mất kết nối với máy chủ. Vui lòng tải lại trang.");
      toast({
        variant: "destructive",
        title: "Mất kết nối",
        description: "Mất kết nối với máy chủ. Vui lòng tải lại trang.",
      });
    };
    
    ws.onerror = () => {
      setError("Lỗi kết nối với máy chủ.");
      toast({
        variant: "destructive",
        title: "Lỗi kết nối",
        description: "Lỗi kết nối với máy chủ.",
      });
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        
        switch (data.type) {
          case MessageType.SESSION_DATA:
            setSessionId(data.payload.session.id);
            setSessionCode(data.payload.session.code);
            setMembers(data.payload.members);
            setExpenses(data.payload.expenses);
            setIsLoading(false);
            break;
            
          case MessageType.MEMBER_ADDED:
            setMembers(prev => [...prev, data.payload]);
            break;
            
          case MessageType.MEMBER_UPDATED:
            setMembers(prev => prev.map(member => 
              member.id === data.payload.id ? data.payload : member
            ));
            break;
            
          case MessageType.MEMBER_DELETED:
            setMembers(prev => prev.filter(member => member.id !== data.payload.id));
            break;
            
          case MessageType.EXPENSE_ADDED:
            setExpenses(prev => [...prev, data.payload]);
            break;
            
          case MessageType.EXPENSE_UPDATED:
            setExpenses(prev => prev.map(expense => 
              expense.id === data.payload.id ? data.payload : expense
            ));
            break;
            
          case MessageType.EXPENSE_DELETED:
            setExpenses(prev => prev.filter(expense => expense.id !== data.payload.id));
            break;
            
          case MessageType.ERROR:
            toast({
              variant: "destructive",
              title: "Lỗi",
              description: data.payload.message,
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    setSocket(ws);
    return ws;
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi kết nối",
        description: "Mất kết nối với máy chủ. Vui lòng tải lại trang.",
      });
    }
  };

  const joinSession = (code: string) => {
    setIsLoading(true);
    setError(null);
    
    // Update URL with session code
    const url = new URL(window.location.href);
    url.searchParams.set('code', code);
    window.history.pushState({}, '', url);
    
    // Close existing socket if any
    if (socket) {
      socket.close();
    }
    
    // Setup new WebSocket connection
    const ws = setupWebSocket();
    
    // Wait for connection to open before sending join message
    const checkAndSend = () => {
      if (ws.readyState === WebSocket.OPEN) {
        sendMessage({
          type: MessageType.JOIN_SESSION,
          payload: { code }
        });
      } else {
        setTimeout(checkAndSend, 100);
      }
    };
    
    checkAndSend();
  };

  const createSession = () => {
    setIsLoading(true);
    
    fetch('/api/sessions', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('Không thể tạo phiên mới');
        return res.json();
      })
      .then((data: Session) => {
        joinSession(data.code);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: err.message,
        });
      });
  };

  const addMember = (name: string) => {
    if (!sessionId) return;
    
    sendMessage({
      type: MessageType.MEMBER_ADDED,
      payload: {
        sessionId,
        name
      }
    });
  };

  const updateMember = (id: number, name: string) => {
    sendMessage({
      type: MessageType.MEMBER_UPDATED,
      payload: {
        id,
        name
      }
    });
  };

  const deleteMember = (id: number) => {
    sendMessage({
      type: MessageType.MEMBER_DELETED,
      payload: {
        id
      }
    });
  };

  const addExpense = (data: { name: string; amount: number; payerId: number; participants: number[] }) => {
    if (!sessionId) return;
    
    sendMessage({
      type: MessageType.EXPENSE_ADDED,
      payload: {
        sessionId,
        ...data
      }
    });
  };

  const updateExpense = (id: number, data: { name?: string; amount?: number; payerId?: number; participants?: number[] }) => {
    sendMessage({
      type: MessageType.EXPENSE_UPDATED,
      payload: {
        id,
        ...data
      }
    });
  };

  const deleteExpense = (id: number) => {
    sendMessage({
      type: MessageType.EXPENSE_DELETED,
      payload: {
        id
      }
    });
  };

  const contextValue = {
    sessionCode,
    members,
    expenses,
    isConnected,
    isLoading,
    error,
    sendMessage,
    joinSession,
    createSession,
    addMember,
    updateMember,
    deleteMember,
    addExpense,
    updateExpense,
    deleteExpense
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
