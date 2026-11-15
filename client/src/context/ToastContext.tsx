import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Accessible live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          let bgColor = 'var(--color-surface)';
          let borderColor = 'var(--color-border)';
          let textColor = 'var(--color-text-main)';

          if (toast.type === 'success') {
            bgColor = 'var(--color-success-bg)';
            borderColor = 'var(--color-success-border)';
            textColor = 'var(--color-success)';
          } else if (toast.type === 'warning') {
            bgColor = 'var(--color-warning-bg)';
            borderColor = 'var(--color-warning-border)';
            textColor = 'var(--color-warning)';
          } else if (toast.type === 'error') {
            bgColor = 'var(--color-danger-bg)';
            borderColor = 'var(--color-danger-border)';
            textColor = 'var(--color-danger)';
          }

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                minWidth: '280px',
                maxWidth: '420px',
                padding: '14px 20px',
                backgroundColor: bgColor,
                color: textColor,
                border: `2px solid ${borderColor}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                fontWeight: 600,
                fontSize: 'var(--font-size-base)',
              }}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
