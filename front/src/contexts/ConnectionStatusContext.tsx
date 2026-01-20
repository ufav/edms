import React, { createContext, useContext, ReactNode } from 'react';
import { useConnectionStatusWebSocket } from '../hooks/useConnectionStatusWebSocket';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

interface ConnectionStatusContextType {
  status: ConnectionStatus;
}

const ConnectionStatusContext = createContext<ConnectionStatusContextType | undefined>(undefined);

export const ConnectionStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Одно WebSocket соединение на все приложение
  const { status } = useConnectionStatusWebSocket({
    pingInterval: 30000, // Ping каждые 30 секунд
    reconnectInterval: 5000, // Переподключение каждые 5 секунд при ошибке
  });

  return (
    <ConnectionStatusContext.Provider value={{ status }}>
      {children}
    </ConnectionStatusContext.Provider>
  );
};

export const useConnectionStatus = (): ConnectionStatusContextType => {
  const context = useContext(ConnectionStatusContext);
  if (context === undefined) {
    throw new Error('useConnectionStatus must be used within a ConnectionStatusProvider');
  }
  return context;
};
