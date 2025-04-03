import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { MessageType, WebSocketMessage, Member, Expense, Session, SessionData } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface SessionContextType {
  sessionCode: string | null;
  members: Member[];
  expenses: Expense[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  sessionData: SessionData;
  sendMessage: (message: WebSocketMessage) => void;
  joinSession: (code: string) => void;
  createSession: () => void;
  addMember: (name: string) => void;
  updateMember: (id: number, name: string) => void;
  deleteMember: (id: number) => void;
  addExpense: (data: { 
    name: string; 
    amount: number; 
    payerId: number; 
    participants: number[]; 
    customAmounts?: Record<number, number>;
    isCustomSplit?: boolean;
  }) => void;
  updateExpense: (id: number, data: { 
    name?: string; 
    amount?: number; 
    payerId?: number; 
    participants?: number[]; 
    customAmounts?: Record<number, number>;
    isCustomSplit?: boolean;
  }) => void;
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
  const [sessionData, setSessionData] = useState<SessionData>({
    memberGroups: [],
    isGroupingEnabled: false,
    settlements: []
  });
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
    try {
      // Tạo URL cho kết nối WebSocket dựa trên giao thức hiện tại
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Sử dụng window.location.host để lấy cả hostname và port
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`Đang kết nối tới WebSocket tại: ${wsUrl}`);
      
      // Đóng kết nối cũ nếu có
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        console.log("Đóng kết nối WebSocket cũ");
        socket.close();
      }
      
      const ws = new WebSocket(wsUrl);
      console.log("Đối tượng WebSocket đã được tạo:", ws);
      
      // Đặt timeout cho kết nối
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log("Kết nối WebSocket timeout");
          ws.close();
        }
      }, 10000);
      
      ws.onopen = () => {
        console.log("WebSocket connection opened successfully");
        console.log("WebSocket readyState:", ws.readyState);
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setError(null);
        
        // Sau khi kết nối thành công, gửi ping định kỳ để giữ kết nối
        const intervalId = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Gửi ping message
            ws.send(JSON.stringify({ type: "PING" }));
          } else {
            clearInterval(intervalId);
          }
        }, 30000);
        
        // Lưu interval ID để xóa sau khi đóng
        (ws as any).pingInterval = intervalId;
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        console.log("Close event details:", {
          wasClean: event.wasClean,
          code: event.code,
          reason: event.reason,
          type: event.type
        });
        
        // Xóa interval ping
        if ((ws as any).pingInterval) {
          clearInterval((ws as any).pingInterval);
        }
        
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        
        // Nếu kết nối đóng không sạch, thử kết nối lại
        if (!event.wasClean || event.code === 1006) {
          console.log("Kết nối không sạch, thử kết nối lại sau 3 giây");
          setTimeout(() => {
            console.log("Đang thử kết nối lại...");
            setupWebSocket();
          }, 3000);
          
          setError("Mất kết nối với máy chủ. Đang thử kết nối lại...");
          toast({
            variant: "destructive",
            title: "Mất kết nối",
            description: `Mất kết nối với máy chủ. Đang thử kết nối lại...`,
          });
        } else {
          setError("Mất kết nối với máy chủ. Vui lòng tải lại trang.");
          toast({
            variant: "destructive",
            title: "Mất kết nối",
            description: `Mất kết nối với máy chủ. Mã lỗi: ${event.code}`,
          });
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket connection error:", error);
        console.error("Error type:", error.type);
        console.error("Error target:", error.target);
        
        clearTimeout(connectionTimeout);
        
        // Lỗi kết nối sẽ được xử lý trong onclose, không cần thử kết nối lại ở đây
        setError("Lỗi kết nối với máy chủ.");
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
              setSessionData(data.payload.sessionData);
              setIsLoading(false);
              break;
              
            case MessageType.SESSION_DATA_UPDATED:
              // Cập nhật sessionData khi nhận được từ server
              if (data.payload) {
                setSessionData(data.payload);
              }
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
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      setSocket(ws);
      return ws;
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      setError("Lỗi thiết lập kết nối với máy chủ.");
      return new WebSocket("ws://chiatien.viet241.com");  // Return a dummy websocket to prevent null errors
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi kết nối",
        description: "Mất kết nối với máy chủ. Đang thử kết nối lại...",
      });
      
      // Thử kết nối lại
      setupWebSocket();
      return false;
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
    const maxRetries = 20;
    let retries = 0;
    
    const checkAndSend = () => {
      if (retries >= maxRetries) {
        setError("Không thể kết nối tới máy chủ sau nhiều lần thử.");
        setIsLoading(false);
        return;
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: MessageType.JOIN_SESSION,
          payload: { code }
        }));
      } else if (ws.readyState === WebSocket.CONNECTING) {
        retries++;
        setTimeout(checkAndSend, 300);
      } else {
        setError("Lỗi kết nối đến máy chủ.");
        setIsLoading(false);
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

  const addExpense = (data: { 
    name: string; 
    amount: number; 
    payerId: number; 
    participants: number[];
    customAmounts?: Record<number, number>;
    isCustomSplit?: boolean; 
  }) => {
    if (!sessionId) return;
    
    sendMessage({
      type: MessageType.EXPENSE_ADDED,
      payload: {
        sessionId,
        ...data
      }
    });
  };

  const updateExpense = (id: number, data: { 
    name?: string; 
    amount?: number; 
    payerId?: number; 
    participants?: number[];
    customAmounts?: Record<number, number>;
    isCustomSplit?: boolean;
  }) => {
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
    sessionData,
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