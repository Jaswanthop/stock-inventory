import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, title, message) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { id, type, title, message }]);
      window.setTimeout(() => dismiss(id), 4200);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast--${item.type}`}>
            <span className="toast__icon">
              {item.type === 'success' && <CheckCircle2 size={18} />}
              {item.type === 'error' && <XCircle size={18} />}
              {item.type === 'info' && <Info size={18} />}
            </span>
            <div className="toast__body">
              <p className="toast__title">{item.title}</p>
              {item.message && <p className="toast__message">{item.message}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={() => dismiss(item.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
