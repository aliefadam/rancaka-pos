import BrandLogo from '@/Components/BrandLogo';
import GoogleAuthButton from '@/Components/GoogleAuthButton';
import { Head, Link, useForm } from '@inertiajs/react';

const fields = [
    ['store_name', 'Nama toko', 'Nama usaha Anda'],
    ['owner_name', 'Nama owner', 'Nama lengkap'],
    ['email', 'Email bisnis', 'nama@email.com'],
    ['phone', 'Nomor WhatsApp', '08xxxxxxxxxx'],
    ['username', 'Username', 'Tanpa spasi'],
    ['password', 'Password', 'Minimal 8 karakter'],
    ['password_confirmation', 'Ulangi password', 'Ketik ulang password'],
];

export default function Register({ googleAuthEnabled }) {
    const { data, setData, post, processing, errors } = useForm(
        Object.fromEntries(fields.map(([key]) => [key, ''])),
    );
    const submit = (event) => {
        event.preventDefault();
        post(route('register'));
    };

    return (
        <>
            <Head title="Daftar Toko" />
            <div className="min-h-screen bg-slate-50 px-5 py-10">
                <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-[0.8fr_1.2fr]">
                    <aside className="bg-gradient-to-br from-indigo-600 to-violet-800 p-8 text-white lg:p-12">
                        <div className="flex items-center gap-3">
                            <BrandLogo className="h-12 w-12" />
                            <span className="text-xl font-bold">Rancaka</span>
                        </div>
                        <h1 className="mt-16 text-3xl font-extrabold leading-tight">
                            Mulai kelola toko tanpa biaya selama 14 hari.
                        </h1>
                        <ul className="mt-8 space-y-4 text-sm text-indigo-100">
                            {[
                                'Kasir dan pengelolaan stok',
                                'Laporan transaksi dan keuangan',
                                'Tidak memerlukan kartu kredit',
                            ].map((item) => (
                                <li key={item} className="flex gap-3">
                                    <i className="fi fi-rr-check-circle text-emerald-300" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <main className="p-7 sm:p-10">
                        <h2 className="text-2xl font-bold text-slate-900">
                            Daftarkan toko Anda
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Akun owner langsung aktif setelah pendaftaran.
                        </p>
                        {googleAuthEnabled && (
                            <>
                                <div className="mt-6"><GoogleAuthButton label="Daftar dengan Google" /></div>
                                <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>atau isi formulir</span><span className="h-px flex-1 bg-slate-200" /></div>
                            </>
                        )}
                        <form
                            onSubmit={submit}
                            className={`${googleAuthEnabled ? '' : 'mt-7'} grid gap-4 sm:grid-cols-2`}
                        >
                            {fields.map(([key, label, placeholder]) => (
                                <div
                                    key={key}
                                    className={
                                        key.includes('password')
                                            ? ''
                                            : key === 'store_name'
                                              ? 'sm:col-span-2'
                                              : ''
                                    }
                                >
                                    <label
                                        className="mb-1.5 block text-sm font-medium text-slate-700"
                                        htmlFor={key}
                                    >
                                        {label}
                                    </label>
                                    <input
                                        id={key}
                                        type={
                                            key.includes('password')
                                                ? 'password'
                                                : key === 'email'
                                                  ? 'email'
                                                  : 'text'
                                        }
                                        value={data[key]}
                                        onChange={(e) =>
                                            setData(key, e.target.value)
                                        }
                                        placeholder={placeholder}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                    {errors[key] && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors[key]}
                                        </p>
                                    )}
                                </div>
                            ))}
                            <button
                                disabled={processing}
                                className="mt-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 sm:col-span-2"
                            >
                                {processing
                                    ? 'Mendaftarkan...'
                                    : 'Mulai Trial 14 Hari'}
                            </button>
                        </form>
                        <p className="mt-5 text-center text-sm text-slate-500">
                            Sudah punya akun?{' '}
                            <Link
                                href={route('login')}
                                className="font-semibold text-indigo-600"
                            >
                                Masuk
                            </Link>
                        </p>
                    </main>
                </div>
            </div>
        </>
    );
}
