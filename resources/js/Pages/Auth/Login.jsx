import { Head, useForm } from '@inertiajs/react';
import BrandLogo from '@/Components/BrandLogo';
import { useState } from 'react';

const DEMO_USERNAME = 'owner.josjis';
const DEMO_PASSWORD = '123123';

export default function Login({ status }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const fillDemoAccount = () => {
        setData({
            ...data,
            username: DEMO_USERNAME,
            password: DEMO_PASSWORD,
        });
    };

    return (
        <>
            <Head title="Masuk" />

            <div className="flex min-h-screen bg-slate-50">
                <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex">
                    <div className="flex items-center gap-3">
                        <BrandLogo className="h-12 w-12" />
                        <span className="text-xl font-bold tracking-tight">
                            Rancaka
                        </span>
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-4xl font-extrabold leading-tight">
                            Kelola bisnis Anda
                            <br />
                            lebih mudah &amp; cepat.
                        </h1>
                        <p className="mt-4 max-w-md text-indigo-100">
                            Satu dashboard untuk memantau penjualan, produk,
                            dan transaksi toko Anda secara real-time.
                        </p>
                    </div>

                    <p className="relative z-10 text-sm text-indigo-200">
                        &copy; {new Date().getFullYear()} Rancaka. All
                        rights reserved.
                    </p>

                    <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -top-16 -left-10 h-56 w-56 rounded-full bg-white/10" />
                </div>

                <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
                    <div className="mx-auto w-full max-w-sm">
                        <div className="mb-8 flex items-center gap-3 lg:hidden">
                            <BrandLogo className="h-11 w-11" />
                            <span className="text-lg font-bold text-slate-900">
                                Rancaka
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900">
                            Selamat datang kembali
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Masuk ke akun Anda untuk melanjutkan ke admin
                            panel.
                        </p>

                        {status && (
                            <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                {status}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={fillDemoAccount}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        >
                            <i className="fi fi-rr-user-add" />
                            Isi Akun Demo
                        </button>

                        <form onSubmit={submit} className="mt-6 space-y-5">
                            <div>
                                <label
                                    htmlFor="username"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Username
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                        <i className="fi fi-rr-user" />
                                    </span>
                                    <input
                                        id="username"
                                        type="text"
                                        name="username"
                                        value={data.username}
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(e) =>
                                            setData(
                                                'username',
                                                e.target.value,
                                            )
                                        }
                                        className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        placeholder="Masukkan username"
                                    />
                                </div>
                                {errors.username && (
                                    <p className="mt-1.5 text-sm text-red-600">
                                        {errors.username}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                        <i className="fi fi-rr-lock" />
                                    </span>
                                    <input
                                        id="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        name="password"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(e) =>
                                            setData(
                                                'password',
                                                e.target.value,
                                            )
                                        }
                                        className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        placeholder="Masukkan password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        <i
                                            className={
                                                showPassword
                                                    ? 'fi fi-rr-eye-crossed'
                                                    : 'fi fi-rr-eye'
                                            }
                                        />
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1.5 text-sm text-red-600">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <label className="flex select-none items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) =>
                                        setData('remember', e.target.checked)
                                    }
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-600">
                                    Ingat saya
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {processing ? (
                                    <i className="fi fi-rr-spinner animate-spin" />
                                ) : (
                                    <i className="fi fi-rr-sign-in-alt" />
                                )}
                                Masuk
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
