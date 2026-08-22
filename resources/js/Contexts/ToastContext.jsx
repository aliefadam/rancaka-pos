import { Transition } from '@headlessui/react';
import { createContext, Fragment, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

const variantConfig = {
    success: {
        icon: 'fi-rr-check-circle',
        iconClass: 'bg-emerald-50 text-emerald-600',
    },
    error: {
        icon: 'fi-rr-cross-circle',
        iconClass: 'bg-rose-50 text-rose-600',
    },
    info: {
        icon: 'fi-rr-info',
        iconClass: 'bg-indigo-50 text-indigo-600',
    },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts((current) => current.filter((item) => item.id !== id));
    }, []);

    const dismiss = useCallback((id) => {
        setToasts((current) =>
            current.map((item) =>
                item.id === id ? { ...item, show: false } : item,
            ),
        );
    }, []);

    const push = useCallback(
        (variant, message, duration = 4000) => {
            const id = ++idCounter;
            setToasts((current) => [
                ...current,
                { id, variant, message, show: true },
            ]);

            if (duration) {
                setTimeout(() => dismiss(id), duration);
            }
        },
        [dismiss],
    );

    const toast = {
        success: (message, duration) => push('success', message, duration),
        error: (message, duration) => push('error', message, duration),
        info: (message, duration) => push('info', message, duration),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}

            <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
                {toasts.map((item) => (
                    <Toast
                        key={item.id}
                        {...item}
                        onDismiss={() => dismiss(item.id)}
                        onLeaveComplete={() => remove(item.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function Toast({ variant, message, show, onDismiss, onLeaveComplete }) {
    const config = variantConfig[variant] ?? variantConfig.info;

    return (
        <Transition
            show={show}
            appear
            as={Fragment}
            enter="transition duration-300 ease-out"
            enterFrom="opacity-0 -translate-y-2 sm:translate-y-0 sm:translate-x-4"
            enterTo="opacity-100 translate-y-0 sm:translate-x-0"
            leave="transition duration-200 ease-in"
            leaveFrom="opacity-100 translate-y-0 sm:translate-x-0"
            leaveTo="opacity-0 -translate-y-2 sm:translate-y-0 sm:translate-x-4"
            afterLeave={onLeaveComplete}
        >
            <div className="app-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60">
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.iconClass}`}
                >
                    <i className={`fi ${config.icon}`} />
                </span>
                <p className="flex-1 pt-1 text-sm font-medium leading-snug text-slate-700">
                    {message}
                </p>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                    <i className="fi fi-rr-cross-small text-xs" />
                </button>
            </div>
        </Transition>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    return context;
}
