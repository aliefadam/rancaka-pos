import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export default function ConfirmDialog({
    show,
    onClose = () => {},
    onConfirm = () => {},
    title = 'Konfirmasi',
    message,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    variant = 'danger',
    processing = false,
    icon = 'fi-sr-trash',
}) {
    const close = () => {
        if (!processing) onClose();
    };

    const iconWrapClass =
        variant === 'danger'
            ? 'bg-rose-50 text-rose-600'
            : 'bg-indigo-50 text-indigo-600';

    const confirmBtnClass =
        variant === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700'
            : 'bg-indigo-600 hover:bg-indigo-700';

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
                            <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
                                <div
                                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconWrapClass}`}
                                >
                                    <i className={`fi ${icon} text-lg`} />
                                </div>

                                <Dialog.Title className="mt-4 text-base font-semibold text-slate-900">
                                    {title}
                                </Dialog.Title>

                                {message && (
                                    <p className="mt-1.5 text-sm text-slate-500">
                                        {message}
                                    </p>
                                )}

                                <div className="mt-6 flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={close}
                                        disabled={processing}
                                        className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onConfirm}
                                        disabled={processing}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${confirmBtnClass}`}
                                    >
                                        {processing && (
                                            <i className="fi fi-sr-spinner animate-spin" />
                                        )}
                                        {confirmText}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
