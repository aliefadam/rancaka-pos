import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '4xl': 'sm:max-w-4xl',
};

export default function Modal({
    show,
    onClose = () => {},
    maxWidth = 'md',
    closeable = true,
    children,
}) {
    const close = () => {
        if (closeable) onClose();
    };

    return (
        <Transition show={show} as={Fragment} leave="duration-200">
            <Dialog as="div" className="relative z-50" onClose={close}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 scale-95"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-4 scale-95"
                        >
                            <Dialog.Panel
                                className={`relative flex max-h-[85vh] w-full ${maxWidthClasses[maxWidth]} flex-col overflow-hidden rounded-2xl bg-white text-left shadow-xl`}
                            >
                                {closeable && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <i className="fi fi-rr-cross-small" />
                                    </button>
                                )}
                                {children}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

Modal.Header = function ModalHeader({ children }) {
    return (
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-6">
            {children}
        </div>
    );
};

Modal.Body = function ModalBody({ children }) {
    return (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {children}
        </div>
    );
};

Modal.Footer = function ModalFooter({ children }) {
    return (
        <div className="flex h-16 shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-6">
            {children}
        </div>
    );
};
