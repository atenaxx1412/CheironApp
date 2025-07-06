import React from 'react';
import Toast, { ToastProps } from './Toast';

interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div
      className="fixed top-0 right-0 z-50 p-6 space-y-4"
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="transform transition-all duration-300 ease-in-out animate-slide-in-right"
        >
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;