import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';

export default function PasswordConfirmDialog({
    show,
    onClose,
    onConfirm,
    processing = false,
    errors = {},
    title,
    message,
    count = 1,
    totalLabel,
    actionLabel,
    reasonLabel = 'Alasan',
    reasonPlaceholder = 'Tuliskan alasan tindakan ini…',
    icon = 'fi-rr-shield-exclamation',
}) {
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (show) {
            setPassword('');
            setReason('');
            setShowPassword(false);
        }
    }, [show]);

    const close = () => {
        if (!processing) onClose();
    };

    const submit = (event) => {
        event.preventDefault();
        onConfirm({ password, reason });
    };

    return (
        <Transition show={show} as={Fragment} leave="duration-200">
            <Dialog as="div" className="relative z-50" onClose={close}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" /></Transition.Child>
                <div className="fixed inset-0 z-50 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4"><Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-5 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-5 scale-95">
                    <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/20">
                        <form onSubmit={submit}>
                            <div className="relative overflow-hidden bg-slate-950 px-6 py-6 text-white"><div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[18px] border-rose-400/10" /><span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/20"><i className={`fi ${icon}`} /></span><Dialog.Title className="relative mt-4 text-xl font-black tracking-tight">{title}</Dialog.Title><p className="relative mt-1.5 text-sm leading-6 text-slate-300">{message}</p></div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-900 shadow-sm">{count}</span><div><p className="text-xs font-bold text-slate-700">{count === 1 ? '1 data akan diproses' : `${count} data akan diproses`}</p>{totalLabel && <p className="mt-0.5 text-[11px] text-slate-400">Total nominal {totalLabel}</p>}</div></div>
                                <div className="mt-5 space-y-4">
                                    <div><label htmlFor="destructive-reason" className="mb-1.5 block text-xs font-bold text-slate-700">{reasonLabel}</label><textarea id="destructive-reason" rows="3" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={reasonPlaceholder} className="w-full rounded-xl border-slate-200 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-100" />{errors.reason && <p className="mt-1 text-xs font-medium text-rose-600">{errors.reason}</p>}</div>
                                    <div><label htmlFor="destructive-password" className="mb-1.5 block text-xs font-bold text-slate-700">Password akun Anda</label><div className="relative"><input id="destructive-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Masukkan password untuk konfirmasi" className="w-full rounded-xl border-slate-200 py-2.5 pl-10 pr-10 text-sm focus:border-indigo-400 focus:ring-indigo-100" /><i className="fi fi-rr-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}><i className={`fi ${showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'}`} /></button></div>{errors.password && <p className="mt-1 text-xs font-medium text-rose-600">{errors.password}</p>}</div>
                                    {(errors.transactions || errors.expenses) && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">{errors.transactions || errors.expenses}</p>}
                                </div>
                            </div>
                            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4"><button type="button" onClick={close} disabled={processing} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Batal</button><button type="submit" disabled={processing || !password || !reason.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{processing && <i className="fi fi-rr-spinner animate-spin" />}{actionLabel}</button></div>
                        </form>
                    </Dialog.Panel>
                </Transition.Child></div></div>
            </Dialog>
        </Transition>
    );
}
