import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);
// Use the same URL as the API backend
const SOCKET_URL = 'http://localhost:3000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { accessToken, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only connect if the user is authenticated and has a token
    if (isAuthenticated && accessToken) {
      const newSocket = io(SOCKET_URL, {
        auth: { token: accessToken },
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('[SocketContext] Connected to server:', newSocket.id);
      });

      newSocket.on('connect_error', (err) => {
        console.error('[SocketContext] Connection error:', err.message);
      });

      return () => {
        console.log('[SocketContext] Disconnecting socket...');
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [isAuthenticated, accessToken]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
