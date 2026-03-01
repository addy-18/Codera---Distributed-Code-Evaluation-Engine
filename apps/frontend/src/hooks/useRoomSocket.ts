import { useEffect, useRef, useState, useCallback } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';

export interface RoomParticipant {
  userId: string;
  username: string;
  role: 'host' | 'collaborator';
  canEdit: boolean;
}

interface RoomEvent {
  type: string;
  [key: string]: any;
}

interface UseRoomSocketProps {
  roomId: string;
  userId: string;
  onMessage?: (msg: RoomEvent) => void;
}

interface UseRoomSocketReturn {
  isConnected: boolean;
  participants: RoomParticipant[];
  canEdit: boolean;
  sendMessage: (msg: any) => void;
  setInitialParticipants: (participants: RoomParticipant[]) => void;
}

export function useRoomSocket({ roomId, userId, onMessage }: UseRoomSocketProps): UseRoomSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const ws = useRef<ReconnectingWebSocket | null>(null);
  const latestOnMessage = useRef(onMessage);

  useEffect(() => {
    latestOnMessage.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!roomId || !userId) return;

    const socket = new ReconnectingWebSocket('ws://localhost:3000/ws');
    ws.current = socket;

    const handleOpen = () => {
      setIsConnected(true);
      // Authenticate
      socket.send(JSON.stringify({ type: 'auth', userId }));
      // Join room
      socket.send(JSON.stringify({ type: 'join_room', roomId }));
    };

    const handleClose = () => {
      setIsConnected(false);
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as RoomEvent;
        console.log('[RoomSocket] Received data:', data);
        
        if (latestOnMessage.current) {
          latestOnMessage.current(data);
        }

        switch (data.type) {
          case 'presence_update':
            setParticipants(data.participants || []);
            // Update own canEdit status
            const me = (data.participants as RoomParticipant[])?.find(p => p.userId === userId);
            if (me) setCanEdit(me.canEdit);
            break;

          case 'permission_update':
            setParticipants(prev => prev.map(p => 
              p.userId === data.targetUserId ? { ...p, canEdit: data.canEdit } : p
            ));
            if (data.targetUserId === userId) {
              setCanEdit(data.canEdit);
            }
            break;

          case 'user_joined':
          case 'user_left':
          case 'cursor_update':
          case 'language_change':
          case 'run_result':
          case 'submit_result':
            // These are handled by the parent component via lastEvent
            break;
        }
      } catch (e) {
        console.error('[RoomSocket] Parse error', e);
      }
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('message', handleMessage);
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave_room', roomId }));
        socket.close();
      }
    };
  }, [roomId, userId]);

  const sendMessage = useCallback((msg: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  const setInitialParticipants = useCallback((initial: RoomParticipant[]) => {
    setParticipants(initial);
    const me = initial.find(p => p.userId === userId);
    if (me) setCanEdit(me.canEdit);
  }, [userId]);

  return { isConnected, participants, canEdit, sendMessage, setInitialParticipants };
}
