import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🟢 [Socket.IO Client] Connected to clinic realtime hub:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('🔴 [Socket.IO Client] Disconnected from clinic realtime hub');
    });
  }
  return socket;
};

