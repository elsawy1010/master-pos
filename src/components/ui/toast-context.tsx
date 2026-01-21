import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
    id: string
    message: string
    type: ToastType
    duration?: number
}

interface ToastContextType {
    toast: (message: string, type?: ToastType, duration?: number) => void
    removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const toast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast: Toast = { id, message, type, duration }

        setToasts((prev) => [...prev, newToast])

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }, [removeToast])

    return (
        <ToastContext.Provider value={{ toast, removeToast }}>
            {children}
            {typeof document !== 'undefined' && createPortal(
                <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                    {toasts.map((t) => (
                        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />
    }

    const bgColors = {
        success: 'bg-slate-800 border-green-500/30',
        error: 'bg-slate-800 border-red-500/30',
        warning: 'bg-slate-800 border-yellow-500/30',
        info: 'bg-slate-800 border-blue-500/30'
    }

    return (
        <div
            className={`
        pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg transform transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 fade-in
        ${bgColors[toast.type]}
      `}
            role="alert"
        >
            <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1 text-sm font-medium text-white">{toast.message}</div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
