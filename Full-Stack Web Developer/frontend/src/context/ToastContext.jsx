import { createContext, useCallback, useContext, useRef, useState } from 'react';

// Pengganti React untuk helper global showToast() versi lama.
// Komponen mana pun bisa memanggil const toast = useToast(); toast('pesan', 'error').
const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', type: 'default', show: false });
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = 'default') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, type, show: true });
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className={`toast${toast.show ? ' show' : ''}`}
        style={{ background: toast.type === 'error' ? '#e84040' : 'var(--forest)' }}
      >
        {toast.msg}
      </div>
    </ToastContext.Provider>
  );
}
