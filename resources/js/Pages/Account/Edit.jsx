import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

function FieldError({ message }) {
    return message ? <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p> : null;
}

export default function Edit({ account }) {
    const profile = useForm({ name: account.name, username: account.username });
    const avatar = useForm({ avatar: null });
    const password = useForm({ password: '', password_confirmation: '' });
    const [preview, setPreview] = useState(account.avatar_url || null);
    const fileInput = useRef(null);

    useEffect(() => () => {
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    }, [preview]);

    const chooseAvatar = (file) => {
        if (!file) return;
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
        avatar.setData('avatar', file);
        avatar.clearErrors();
        setPreview(URL.createObjectURL(file));
    };

    const submitAvatar = (event) => {
        event.preventDefault();
        avatar.post(route('account.avatar.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => avatar.reset(),
        });
    };

    const submitPassword = (event) => {
        event.preventDefault();
        password.put(route('account.password.update'), {
            preserveScroll: true,
            onSuccess: () => password.reset(),
        });
    };

    return (
        <AdminLayout header="Akun Saya">
            <Head title="Akun Saya" />
            <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Akun Saya' }]} />
            <div className="max-w-3xl space-y-5">
                <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="font-bold text-slate-900">Foto profil</h2>
                        <p className="mt-1 text-sm text-slate-500">Gunakan foto yang jelas agar akun mudah dikenali.</p>
                    </div>
                    <form onSubmit={submitAvatar} className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-indigo-50 ring-4 ring-indigo-50">
                            {preview ? (
                                <img src={preview} alt="Preview foto profil" className="h-full w-full object-cover" />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-indigo-600">{account.name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
                            <div className="flex flex-wrap gap-2.5">
                                <button type="button" onClick={() => fileInput.current?.click()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                    <i className="fi fi-rr-camera mr-2" />Pilih foto
                                </button>
                                <button type="submit" disabled={!avatar.data.avatar || avatar.processing} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                                    {avatar.processing ? 'Mengunggah...' : 'Simpan foto'}
                                </button>
                            </div>
                            <p className="mt-2.5 text-xs text-slate-400">JPG, PNG, atau WebP. Maksimal 2 MB.</p>
                            <FieldError message={avatar.errors.avatar} />
                        </div>
                    </form>
                </section>

                <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><i className="fi fi-rr-user text-lg" /></span>
                        <div><h2 className="font-bold text-slate-900">Informasi akun</h2><p className="text-sm text-slate-500">{account.email || 'Akun username dan password'}</p></div>
                    </div>
                    <form onSubmit={(event) => { event.preventDefault(); profile.put(route('account.update'), { preserveScroll: true }); }} className="mt-6 space-y-5">
                        {[['name', 'Nama'], ['username', 'Username']].map(([key, label]) => <div key={key}><label htmlFor={key} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label><input id={key} value={profile.data[key]} onChange={(event) => profile.setData(key, event.target.value)} className={inputClass} /><FieldError message={profile.errors[key]} /></div>)}
                        <button disabled={profile.processing} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50">Simpan perubahan</button>
                    </form>
                </section>

                <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><i className="fi fi-rr-lock text-lg" /></span>
                        <div><h2 className="font-bold text-slate-900">Reset password</h2><p className="text-sm text-slate-500">Buat password baru dengan minimal 8 karakter.</p></div>
                    </div>
                    <form onSubmit={submitPassword} className="mt-6 space-y-5">
                        {[['password', 'Password baru', 'Minimal 8 karakter'], ['password_confirmation', 'Konfirmasi password baru', 'Ulangi password baru']].map(([key, label, placeholder]) => <div key={key}><label htmlFor={key} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label><input id={key} type="password" autoComplete="new-password" value={password.data[key]} onChange={(event) => password.setData(key, event.target.value)} placeholder={placeholder} className={inputClass} /><FieldError message={password.errors[key]} /></div>)}
                        <button disabled={password.processing} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">{password.processing ? 'Mereset...' : 'Reset password'}</button>
                    </form>
                </section>
            </div>
        </AdminLayout>
    );
}
