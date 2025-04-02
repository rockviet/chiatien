import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { MessageType, WebSocketMessage } from "@shared/schema";
import { z } from "zod";

// Map to store all active WebSocket connections by session code
const sessionClients: Map<string, Set<WebSocket>> = new Map();
// Map to store session ID for each WebSocket connection
const clientSessions: Map<WebSocket, number> = new Map();

// Helper to broadcast message to all clients in a session
function broadcastToSession(sessionCode: string, message: WebSocketMessage) {
  const clients = sessionClients.get(sessionCode);
  if (!clients) return;

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Helper to send complete session data to a client
async function sendSessionData(ws: WebSocket, sessionCode: string) {
  try {
    const session = await storage.getSessionByCode(sessionCode);
    if (!session) return;

    const members = await storage.getMembers(session.id);
    const expenses = await storage.getExpenses(session.id);
    const sessionData = await storage.getSessionData(session.id);

    const message: WebSocketMessage = {
      type: MessageType.SESSION_DATA,
      payload: {
        session,
        members,
        expenses,
        sessionData
      }
    };

    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error("Error sending session data:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup API routes with /api prefix
  app.get("/api/sessions/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const session = await storage.getSessionByCode(code);
      
      if (!session) {
        return res.status(404).json({ message: "Phiên không tồn tại" });
      }
      
      const members = await storage.getMembers(session.id);
      const expenses = await storage.getExpenses(session.id);
      
      res.json({ session, members, expenses });
    } catch (error) {
      res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const session = await storage.createSession();
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: "Lỗi máy chủ" });
    }
  });

  // CORS middleware for Express
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // Setup WebSocket Server (on a distinct path)
  console.log("Setting up WebSocket server on path: /ws");
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false, // Disable per-message deflate to avoid compatibility issues
    clientTracking: true, // Enable client tracking
    // Detailed client verification for debugging
    verifyClient: (info, callback) => {
      console.log("WebSocket connection attempt from:", info.req.headers.origin);
      console.log("With headers:", info.req.headers);
      // Accept all connections
      callback(true);
    }
  });

  wss.on('connection', (ws, req) => {
    console.log("WebSocket connection established from:", req.headers.origin);
    console.log("Client IP:", req.socket.remoteAddress);
    let currentSessionCode: string | null = null;
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      // Clean up session mappings
      clientSessions.delete(ws);
      if (currentSessionCode && sessionClients.has(currentSessionCode)) {
        sessionClients.get(currentSessionCode)?.delete(ws);
        
        // Clean up empty session
        if (sessionClients.get(currentSessionCode)?.size === 0) {
          sessionClients.delete(currentSessionCode);
        }
      }
    });

    ws.on('message', async (rawData) => {
      try {
        const message = JSON.parse(rawData.toString()) as WebSocketMessage;
        const sessionId = clientSessions.get(ws);

        if (!sessionId && message.type !== MessageType.JOIN_SESSION) {
          ws.send(JSON.stringify({
            type: MessageType.ERROR,
            payload: { message: 'Not connected to any session' }
          }));
          return;
        }

        switch (message.type) {
          case MessageType.JOIN_SESSION: {
            const sessionCode = message.payload.code;
            
            // Check if session exists
            const session = await storage.getSessionByCode(sessionCode);
            if (!session) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Phiên không tồn tại" }
              }));
              return;
            }
            
            // Save the client in the sessions map
            if (!sessionClients.has(sessionCode)) {
              sessionClients.set(sessionCode, new Set());
            }
            sessionClients.get(sessionCode)?.add(ws);
            currentSessionCode = sessionCode;
            
            // Save session ID for this client
            clientSessions.set(ws, session.id);
            
            // Send complete session data to the client
            await sendSessionData(ws, sessionCode);
            break;
          }
          
          case MessageType.MEMBER_ADDED: {
            if (!currentSessionCode) break;
            
            const schema = z.object({
              sessionId: z.number(),
              name: z.string().min(1)
            });
            
            const result = schema.safeParse(message.payload);
            if (!result.success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Dữ liệu không hợp lệ" }
              }));
              break;
            }
            
            const member = await storage.createMember(result.data);
            broadcastToSession(currentSessionCode, {
              type: MessageType.MEMBER_ADDED,
              payload: member
            });
            break;
          }
          
          case MessageType.MEMBER_UPDATED: {
            if (!currentSessionCode) break;
            
            const schema = z.object({
              id: z.number(),
              name: z.string().min(1)
            });
            
            const result = schema.safeParse(message.payload);
            if (!result.success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Dữ liệu không hợp lệ" }
              }));
              break;
            }
            
            const member = await storage.updateMember(result.data.id, result.data.name);
            if (!member) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Thành viên không tồn tại" }
              }));
              break;
            }
            
            broadcastToSession(currentSessionCode, {
              type: MessageType.MEMBER_UPDATED,
              payload: member
            });
            break;
          }
          
          case MessageType.MEMBER_DELETED: {
            if (!currentSessionCode) break;
            
            const schema = z.object({
              id: z.number()
            });
            
            const result = schema.safeParse(message.payload);
            if (!result.success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Dữ liệu không hợp lệ" }
              }));
              break;
            }
            
            const success = await storage.deleteMember(result.data.id);
            if (!success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Thành viên không tồn tại" }
              }));
              break;
            }
            
            broadcastToSession(currentSessionCode, {
              type: MessageType.MEMBER_DELETED,
              payload: { id: result.data.id }
            });
            break;
          }
          
          case MessageType.EXPENSE_ADDED: {
            if (!currentSessionCode) break;
            
            const schema = z.object({
              sessionId: z.number(),
              name: z.string().min(1),
              amount: z.number().positive(),
              payerId: z.number(),
              participants: z.array(z.number()),
              customAmounts: z.record(z.string(), z.number()).optional().default({}),
              isCustomSplit: z.boolean().optional().default(false)
            });
            
            const result = schema.safeParse(message.payload);
            if (!result.success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Dữ liệu không hợp lệ" }
              }));
              break;
            }
            
            // Validate that participants list is not empty
            if (result.data.participants.length === 0) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Phải có ít nhất một người tham gia" }
              }));
              break;
            }
            
            const expense = await storage.createExpense(result.data);
            broadcastToSession(currentSessionCode, {
              type: MessageType.EXPENSE_ADDED,
              payload: expense
            });
            break;
          }
          
          case MessageType.EXPENSE_UPDATED: {
            if (!currentSessionCode) break;
            
            const schema = z.object({
              id: z.number(),
              name: z.string().min(1).optional(),
              amount: z.number().positive().optional(),
              payerId: z.number().optional(),
              participants: z.array(z.number()).optional(),
              customAmounts: z.record(z.string(), z.number()).optional(),
              isCustomSplit: z.boolean().optional()
            });
            
            const result = schema.safeParse(message.payload);
            if (!result.success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Dữ liệu không hợp lệ" }
              }));
              break;
            }
            
            // Validate that participants list is not empty if provided
            if (result.data.participants && result.data.participants.length === 0) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Phải có ít nhất một người tham gia" }
              }));
              break;
            }
            
            const { id, ...updateData } = result.data;
            const expense = await storage.updateExpense(id, updateData);
            
            if (!expense) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Chi tiêu không tồn tại" }
              }));
              break;
            }
            
            broadcastToSession(currentSessionCode, {
              type: MessageType.EXPENSE_UPDATED,
              payload: expense
            });
            break;
          }
          
          case MessageType.EXPENSE_DELETED: {
            if (!currentSessionCode) break;
            
            const schema = z.object({
              id: z.number()
            });
            
            const result = schema.safeParse(message.payload);
            if (!result.success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Dữ liệu không hợp lệ" }
              }));
              break;
            }
            
            const success = await storage.deleteExpense(result.data.id);
            if (!success) {
              ws.send(JSON.stringify({
                type: MessageType.ERROR,
                payload: { message: "Chi tiêu không tồn tại" }
              }));
              break;
            }
            
            broadcastToSession(currentSessionCode, {
              type: MessageType.EXPENSE_DELETED,
              payload: { id: result.data.id }
            });
            break;
          }
          
          case MessageType.SESSION_DATA_UPDATED:
            if (!sessionId || !currentSessionCode) break;
            
            const updatedSession = await storage.updateSessionData(sessionId, message.payload);
            if (updatedSession) {
              // Broadcast to all clients in the session
              broadcastToSession(currentSessionCode, {
                type: MessageType.SESSION_DATA_UPDATED,
                payload: updatedSession.sessionData
              });
            }
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: MessageType.ERROR,
          payload: { message: 'Internal server error' }
        }));
      }
    });
  });

  return httpServer;
}
