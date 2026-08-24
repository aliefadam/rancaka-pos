import BrandLogo from '@/Components/BrandLogo';
import GoogleAuthButton from '@/Components/GoogleAuthButton';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const fields = [
    ['store_name', 'Nama toko', 'Nama usaha Anda'], ['owner_name', 'Nama owner', 'Nama lengkap'],
    ['email', 'Email bisnis', 'nama@email.com'], ['phone', 'Nomor WhatsApp', '08xxxxxxxxxx'],
    ['username', 'Username', 'Tanpa spasi'], ['password', 'Password', 'Minimal 8 karakter'],
    ['password_confirmation', 'Ulangi password', 'Ketik ulang password'],
];

export default function Register({ googleAuthEnabled, branchNetworkEnabled = false }) {
    const form = useForm({ ...Object.fromEntries(fields.map(([key]) => [key, ''])), account_type: 'standalone', referral_code: '', network_code: '' });
    const [visiblePasswords, setVisiblePasswords] = useState({ password: false, password_confirmation: false });
    const branch = form.data.account_type === 'branch';
    const chooseType = (type) => form.setData((data) => ({ ...data, account_type: type, referral_code: type === 'branch' ? '' : data.referral_code, network_code: type === 'standalone' ? '' : data.network_code }));
    const togglePassword = (key) => setVisiblePasswords((current) => ({ ...current, [key]: !current[key] }));
    const googleParams = branch ? { account_type: 'branch', network_code: form.data.network_code } : form.data.referral_code ? { referral_code: form.data.referral_code } : {};

    return <><Head title="Daftar Toko" /><div className="min-h-screen bg-[#f4f5f7] px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,.10)] lg:grid-cols-[.78fr_1.22fr]">
            <aside className="relative overflow-hidden bg-slate-950 p-8 text-white lg:p-12">
                <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-white/10" /><div className="absolute -right-8 top-36 h-44 w-44 rounded-full border border-emerald-300/20" />
                <div className="relative flex items-center gap-3"><BrandLogo className="h-11 w-11" /><div><p className="text-lg font-black">Rancaka</p><p className="text-[10px] font-bold uppercase tracking-[.22em] text-slate-500">POS untuk bertumbuh</p></div></div>
                <div className="relative mt-20"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">7 hari untuk mencoba</p><h1 className="mt-4 max-w-sm text-4xl font-black leading-[1.08] tracking-[-.04em]">Satu toko atau satu jaringan, mulai dari sini.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">Stok tiap cabang tetap terpisah. Billing jaringan tetap rapi di pusat.</p></div>
                <div className="relative mt-12 grid gap-3 text-sm text-slate-300">{['Kasir dan stok siap pakai', 'Laporan operasional real-time', 'Tanpa kartu kredit'].map((item) => <div key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-300"><i className="fi fi-rr-check text-[10px]" /></span>{item}</div>)}</div>
            </aside>
            <main className="p-6 sm:p-10 lg:p-12"><p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600">Buat akun owner</p><h2 className="mt-2 text-3xl font-black tracking-[-.03em] text-slate-950">Daftarkan toko Anda</h2><p className="mt-2 text-sm text-slate-500">Pilih bentuk akun, lalu lengkapi informasi dasar.</p>
                {branchNetworkEnabled && <div className="mt-7 grid gap-3 sm:grid-cols-2">{[['standalone','Toko mandiri','Kelola dan bayar subscription sendiri','fi-rr-store-alt'],['branch','Cabang jaringan','Terhubung ke tenant pusat','fi-rr-chart-network']].map(([value,title,description,icon]) => <button type="button" key={value} onClick={() => chooseType(value)} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${form.data.account_type === value ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-300' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${form.data.account_type === value ? 'bg-white/10 text-emerald-300' : 'bg-slate-100 text-slate-500'}`}><i className={`fi ${icon}`} /></span><span><strong className="block text-sm">{title}</strong><span className={`mt-1 block text-xs ${form.data.account_type === value ? 'text-slate-400' : 'text-slate-500'}`}>{description}</span></span></button>)}</div>}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    {branch ? <><label className="text-xs font-black uppercase tracking-[.12em] text-slate-500" htmlFor="network_code">Kode jaringan pusat <span className="text-rose-500">*</span></label><input id="network_code" value={form.data.network_code} onChange={(e) => form.setData('network_code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''))} placeholder="CONTOH-PUSAT" className="mt-2 w-full rounded-xl border-slate-200 bg-white font-bold uppercase tracking-wide" /><p className="mt-2 text-xs text-slate-500">Akses dimulai setelah disetujui owner pusat dan superadmin.</p>{form.errors.network_code && <p className="mt-1 text-xs text-rose-600">{form.errors.network_code}</p>}</>
                    : <><label className="text-xs font-black uppercase tracking-[.12em] text-slate-500" htmlFor="referral_code">Kode referral <span className="font-medium normal-case tracking-normal text-slate-400">(opsional)</span></label><input id="referral_code" value={form.data.referral_code} onChange={(e) => form.setData('referral_code', e.target.value.toUpperCase().replace(/\s/g,''))} placeholder="SALESBUDI" className="mt-2 w-full rounded-xl border-slate-200 bg-white font-bold uppercase tracking-wide" />{form.errors.referral_code && <p className="mt-1 text-xs text-rose-600">{form.errors.referral_code}</p>}</>}
                </div>
                {googleAuthEnabled && <><div className="mt-5"><GoogleAuthButton label="Daftar dengan Google" href={route('auth.google.redirect', googleParams)} /></div><div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau isi formulir<span className="h-px flex-1 bg-slate-200" /></div></>}
                <form onSubmit={(event) => { event.preventDefault(); form.post(route('register')); }} className={`${googleAuthEnabled ? '' : 'mt-6'} grid gap-4 sm:grid-cols-2`}>
                    {fields.map(([key,label,placeholder]) => {
                        const isPassword = key.includes('password');
                        const isVisible = visiblePasswords[key] ?? false;

                        return <div key={key} className={!isPassword && key === 'store_name' ? 'sm:col-span-2' : ''}><label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor={key}>{label} <span className="text-rose-500">*</span></label><div className={isPassword ? 'relative' : ''}><input id={key} type={isPassword ? (isVisible ? 'text' : 'password') : key === 'email' ? 'email' : 'text'} autoComplete={isPassword ? 'new-password' : undefined} value={form.data[key]} onChange={(e) => form.setData(key,e.target.value)} placeholder={placeholder} className={`w-full rounded-xl border-slate-200 text-sm focus:border-slate-500 focus:ring-slate-200 ${isPassword ? 'pr-11' : ''}`} />{isPassword && <button type="button" onClick={() => togglePassword(key)} aria-label={isVisible ? `Sembunyikan ${label.toLowerCase()}` : `Tampilkan ${label.toLowerCase()}`} aria-controls={key} aria-pressed={isVisible} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-300"><i className={`fi ${isVisible ? 'fi-rr-eye-crossed' : 'fi-rr-eye'}`} /></button>}</div>{form.errors[key] && <p className="mt-1 text-xs text-rose-600">{form.errors[key]}</p>}</div>;
                    })}
                    <button disabled={form.processing} className="mt-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:col-span-2">{form.processing ? 'Mendaftarkan...' : branch ? 'Kirim Pengajuan Cabang' : 'Mulai Trial 7 Hari'}</button>
                </form><p className="mt-5 text-center text-sm text-slate-500">Sudah punya akun? <Link href={route('login')} className="font-bold text-indigo-600">Masuk</Link></p>
            </main>
        </div>
    </div></>;
}
