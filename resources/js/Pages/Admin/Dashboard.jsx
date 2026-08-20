import AdminLayout from '@/Layouts/AdminLayout';
import { Head, usePage } from '@inertiajs/react';

const stats = [
    {
        label: 'Penjualan Hari Ini',
        value: 'Rp 2.450.000',
        delta: '+12,4%',
        icon: 'fi-rr-sack-dollar',
        accent: 'bg-[#2a78d6]',
        soft: 'bg-[#2a78d6]/10 text-[#2a78d6]',
    },
    {
        label: 'Transaksi Hari Ini',
        value: '48',
        delta: '+5,1%',
        icon: 'fi-rr-receipt',
        accent: 'bg-[#eb6834]',
        soft: 'bg-[#eb6834]/10 text-[#eb6834]',
    },
    {
        label: 'Total Produk',
        value: '186',
        delta: '+3 baru',
        icon: 'fi-rr-box-open',
        accent: 'bg-[#1baf7a]',
        soft: 'bg-[#1baf7a]/10 text-[#1baf7a]',
    },
    {
        label: 'Pelanggan Baru',
        value: '9',
        delta: '+2,0%',
        icon: 'fi-rr-users-alt',
        accent: 'bg-[#eda100]',
        soft: 'bg-[#eda100]/10 text-[#eda100]',
    },
];

const quickActions = [
    { label: 'Tambah Produk', icon: 'fi-rr-box-open' },
    { label: 'Transaksi Baru', icon: 'fi-rr-shopping-cart-add' },
    { label: 'Lihat Laporan', icon: 'fi-rr-chart-histogram' },
    { label: 'Kelola Pengguna', icon: 'fi-rr-users-alt' },
];

export default function Dashboard() {
    const { auth } = usePage().props;
    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <AdminLayout header="Dashboard">
            <Head title="Dashboard" />

            <div className="relative overflow-hidden rounded-2xl bg-indigo-600 p-6 text-white sm:p-8">
                <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />
                <div className="relative">
                    <p className="text-sm text-indigo-100">{today}</p>
                    <h2 className="mt-1 text-2xl font-bold">
                        Selamat datang, {auth.user.name} 👋
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-indigo-100">
                        Berikut ringkasan performa toko Anda. Data di bawah
                        ini adalah data contoh untuk keperluan tampilan.
                    </p>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-sm shadow-slate-200/40 sm:p-5"
                    >
                        <div className="flex items-center justify-between">
                            <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${stat.soft}`}
                            >
                                <i className={`fi ${stat.icon} text-lg`} />
                            </span>
                            <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-emerald-600 sm:text-xs">
                                <i className="fi fi-rr-arrow-trend-up" />
                                {stat.delta}
                            </span>
                        </div>
                        <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1rem,4vw,1.5rem)] font-bold tracking-tight text-slate-900 sm:mt-4">
                            {stat.value}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                        Aktivitas Terbaru
                    </h3>
                    <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                            <i className="fi fi-rr-inbox text-2xl" />
                        </span>
                        <p className="mt-4 text-sm font-medium text-slate-600">
                            Belum ada aktivitas
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            Aktivitas transaksi &amp; penjualan akan muncul di
                            sini.
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
                    <h3 className="text-sm font-semibold text-slate-900">
                        Aksi Cepat
                    </h3>
                    <div className="mt-4 space-y-2">
                        {quickActions.map((action) => (
                            <div
                                key={action.label}
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                                    <i className={`fi ${action.icon}`} />
                                </span>
                                {action.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
