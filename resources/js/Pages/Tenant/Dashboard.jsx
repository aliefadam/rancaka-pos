import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const periods = [
    { value: 'today', label: 'Hari ini' },
    { value: '7days', label: '7 Hari' },
    { value: 'month', label: 'Bulan Ini' },
];

const cardTones = {
    ink: {
        card: 'border-slate-900 bg-slate-950 text-white shadow-slate-300',
        label: 'text-slate-400',
        sub: 'text-slate-400',
    },
    emerald: {
        card: 'border-emerald-100 bg-white text-slate-950 shadow-slate-200/50',
        label: 'text-emerald-700',
        sub: 'text-slate-400',
    },
    rose: {
        card: 'border-rose-100 bg-white text-slate-950 shadow-slate-200/50',
        label: 'text-rose-700',
        sub: 'text-slate-400',
    },
    blue: {
        card: 'border-blue-100 bg-white text-slate-950 shadow-slate-200/50',
        label: 'text-blue-700',
        sub: 'text-slate-400',
    },
};

const attentionTones = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
};

const paymentTones = {
    cash: 'bg-emerald-500',
    qris: 'bg-sky-500',
    online: 'bg-indigo-500',
    credit: 'bg-amber-500',
};

function compactCurrency(value) {
    const number = Number(value || 0);
    if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}M`;
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}jt`;
    if (number >= 1_000) return `${Math.round(number / 1_000)}rb`;
    return String(number);
}

function Comparison({ comparison, dark = false }) {
    const rising = comparison.direction > 0;
    const falling = comparison.direction < 0;
    const value = comparison.percentage === null
        ? 'Baru'
        : `${Math.abs(comparison.percentage).toLocaleString('id-ID')}%`;

    return (
        <div className={`mt-5 flex items-center gap-2 text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${
                    rising
                        ? dark ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                        : falling
                          ? dark ? 'bg-rose-400/15 text-rose-300' : 'bg-rose-50 text-rose-700'
                          : dark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'
                }`}
            >
                <i className={`fi ${rising ? 'fi-rr-arrow-trend-up' : falling ? 'fi-rr-arrow-trend-down' : 'fi-rr-minus'}`} />
                {value}
            </span>
            <span className="truncate">vs {comparison.label}</span>
        </div>
    );
}

function SummaryCard({ item }) {
    const tone = cardTones[item.tone] ?? cardTones.blue;
    const dark = item.tone === 'ink';

    return (
        <article className={`relative min-w-0 overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6 ${tone.card}`}>
            {dark && (
                <>
                    <span className="absolute -right-10 -top-14 h-40 w-40 rounded-full border-[24px] border-white/[0.035]" />
                    <span className="absolute -bottom-20 right-16 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
                </>
            )}
            <div className="relative">
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${tone.label}`}>{item.label}</p>
                <p className="mt-3 truncate text-[clamp(1.55rem,3vw,2.35rem)] font-black tracking-[-0.04em]">{item.value}</p>
                <p className={`mt-1 truncate text-xs ${tone.sub}`}>{item.subtitle}</p>
                <Comparison comparison={item.comparison} dark={dark} />
            </div>
        </article>
    );
}

function AttentionRow({ item }) {
    const content = (
        <div className="group flex items-center gap-3 rounded-xl px-1 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${attentionTones[item.tone]}`}>
                <i className={`fi ${item.icon}`} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{item.detail}</p>
            </div>
            {item.href && <i className="fi fi-rr-angle-small-right text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />}
        </div>
    );

    return item.href ? <Link href={item.href}>{content}</Link> : content;
}

export default function Dashboard({
    greetingName,
    todayLabel,
    filters,
    periodLabel,
    summary,
    salesTrend,
    trendTotal,
    topProducts,
    paymentMethods,
    attentionItems,
    activeShift,
    capabilities,
}) {
    const [refreshing, setRefreshing] = useState(false);

    const changePeriod = (period) => {
        router.get(route('tenant.dashboard'), { period }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const refresh = () => {
        setRefreshing(true);
        router.reload({ onFinish: () => setRefreshing(false) });
    };

    return (
        <AdminLayout header="Dashboard">
            <Head title="Dashboard" />

            <div className="max-w-[1440px]">
                <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Ringkasan toko</p>
                        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
                            Selamat datang, {greetingName}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">{todayLabel} · Kondisi toko dalam satu pandangan.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={refreshing}
                            aria-label="Perbarui dashboard"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-60"
                        >
                            <i className={`fi fi-rr-refresh ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <Link
                            href={route('tenant.pos.index')}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98]"
                        >
                            <i className="fi fi-rr-cash-register" />
                            Buka Kasir
                        </Link>
                    </div>
                </header>

                <div className="mt-7 flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    {periods.map((period) => (
                        <button
                            key={period.value}
                            type="button"
                            onClick={() => changePeriod(period.value)}
                            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition sm:px-4 ${
                                filters.period === period.value
                                    ? 'bg-slate-950 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>

                {activeShift && (
                    <div className={`mt-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${activeShift.is_stale ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-100 bg-emerald-50/60'}`}>
                        <div className="flex items-center gap-3">
                            <span className={`relative flex h-9 w-9 items-center justify-center rounded-full ${activeShift.is_stale ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {!activeShift.is_stale && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-20" />}
                                <i className="fi fi-rr-time-check relative" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Shift aktif · {activeShift.cashier}</p>
                                <p className="text-xs text-slate-500">Dibuka {activeShift.opened_at} · {activeShift.duration}</p>
                            </div>
                        </div>
                        <Link href={route('tenant.pos.index')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Lihat shift →</Link>
                    </div>
                )}

                <section className="mt-5 grid gap-3 md:grid-cols-3 lg:gap-4" aria-label="Ringkasan performa">
                    {summary.map((item) => <SummaryCard key={item.key} item={item} />)}
                </section>

                <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.8fr)]">
                    <article className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tren penjualan</p>
                                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">{periodLabel}</h2>
                            </div>
                            <p className="text-right text-sm font-black text-slate-900">{trendTotal}</p>
                        </div>

                        <div className="mt-5 h-64 sm:h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesTrend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="quietSalesFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.015} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 7" stroke="var(--chart-grid)" vertical={false} />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} width={54} tickFormatter={compactCurrency} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                                    <Tooltip
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.full_label ?? payload?.[0]?.payload?.label ?? ''}
                                        formatter={(value) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Penjualan']}
                                        contentStyle={{ borderRadius: 14, borderColor: 'var(--chart-tooltip-border)', background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', fontSize: 12, boxShadow: '0 12px 30px rgba(15, 23, 42, .1)' }}
                                        labelStyle={{ color: 'var(--chart-tooltip-text)', fontWeight: 700 }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} fill="url(#quietSalesFill)" activeDot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <aside className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">Perlu perhatian</p>
                                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Tindak lanjut</h2>
                            </div>
                            {attentionItems.length > 0 && <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-black text-amber-700">{attentionItems.length}</span>}
                        </div>

                        <div className="mt-4 divide-y divide-slate-100">
                            {attentionItems.map((item) => <AttentionRow key={item.key} item={item} />)}
                            {attentionItems.length === 0 && (
                                <div className="flex min-h-56 flex-col items-center justify-center text-center">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><i className="fi fi-rr-check" /></span>
                                    <p className="mt-3 text-sm font-bold text-slate-700">Semua terkendali</p>
                                    <p className="mt-1 max-w-48 text-xs leading-5 text-slate-400">Tidak ada stok, piutang, atau transaksi yang perlu segera ditangani.</p>
                                </div>
                            )}
                        </div>
                    </aside>
                </section>

                <section className="mt-5 grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">Produk terlaris</p>
                            <h2 className="mt-1 text-base font-black text-slate-900">Tiga pilihan pelanggan</h2>
                        </div>
                        <div className="divide-y divide-slate-100 px-5 sm:px-6">
                            {topProducts.map((product, index) => (
                                <div key={product.name} className="flex items-center gap-4 py-4">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${index === 0 ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-slate-800">{product.name}</p>
                                        <p className="mt-0.5 text-xs text-slate-400">{product.sold} produk terjual</p>
                                    </div>
                                    <p className="shrink-0 text-sm font-black text-slate-800">{product.revenue}</p>
                                </div>
                            ))}
                            {topProducts.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Belum ada produk terjual pada periode ini.</p>}
                        </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Metode pembayaran</p>
                        <h2 className="mt-1 text-base font-black text-slate-900">Komposisi penerimaan</h2>
                        <div className="mt-5 space-y-4">
                            {paymentMethods.map((method) => (
                                <div key={method.key}>
                                    <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                                        <span className="font-bold text-slate-600">{method.label}</span>
                                        <span className="font-black text-slate-800">{method.value} <span className="ml-1 font-medium text-slate-400">{method.percentage}%</span></span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div className={`h-full rounded-full transition-all duration-700 ${paymentTones[method.key]}`} style={{ width: `${method.percentage}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                {capabilities.can_view_financial_report && (
                    <div className="mt-5 flex justify-end">
                        <Link href={route('tenant.reports.financial.index')} className="text-xs font-bold text-slate-500 transition hover:text-indigo-600">Buka laporan keuangan lengkap →</Link>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
