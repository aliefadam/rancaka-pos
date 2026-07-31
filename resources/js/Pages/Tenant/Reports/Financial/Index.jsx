import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
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
    { value: 'daily', label: 'Harian' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' },
];

function compactCurrency(value) {
    const number = Number(value);

    if (number >= 1000000000) return `${number / 1000000000}M`;
    if (number >= 1000000) return `${number / 1000000}jt`;
    if (number >= 1000) return `${number / 1000}rb`;

    return number;
}

export default function Index({
    period,
    periodLabel,
    summary,
    annualChart,
    chartYear,
    topProducts,
    lowProducts,
}) {
    const changePeriod = (value) => {
        router.get(
            route('tenant.reports.financial.index'),
            { period: value },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: [
                    'period',
                    'periodLabel',
                    'summary',
                    'topProducts',
                    'lowProducts',
                ],
            },
        );
    };

    return (
        <AdminLayout header="Laporan Keuangan">
            <Head title="Laporan Keuangan" />

            <Breadcrumb
                items={[{ label: 'Laporan' }, { label: 'Keuangan' }]}
            />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Laporan Keuangan
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Ringkasan performa keuangan periode {periodLabel}.
                    </p>
                </div>

                <div className="financial-period-tabs rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    {periods.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => changePeriod(item.value)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                period === item.value
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryCard
                    label="Pendapatan"
                    value={summary.revenue}
                    icon="fi-rr-chart-line-up"
                    tone="emerald"
                />
                <SummaryCard
                    label="Pengeluaran"
                    value={summary.expenses}
                    icon="fi-rr-money-bill-wave"
                    tone="rose"
                />
                <SummaryCard
                    label="Laba Bersih"
                    value={summary.netProfit}
                    icon="fi-rr-sack-dollar"
                    tone={summary.netProfitValue < 0 ? 'amber' : 'indigo'}
                />
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            Total Pendapatan 1 Tahun
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Pendapatan bulanan sepanjang {chartYear}
                        </p>
                    </div>
                    <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 sm:mt-0">
                        <i className="fi fi-rr-calendar" />
                        Jan–Des {chartYear}
                    </span>
                </div>

                <div
                    className="px-2 py-5 sm:px-5"
                    style={{ height: '20rem' }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={annualChart}
                            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="financialRevenueFill"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#4f46e5"
                                        stopOpacity={0.28}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#4f46e5"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="4 6"
                                stroke="#e2e8f0"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                width={52}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={compactCurrency}
                            />
                            <Tooltip
                                labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.fullMonth ?? ''
                                }
                                formatter={(value) => [
                                    `Rp ${Number(value).toLocaleString('id-ID')}`,
                                    'Pendapatan',
                                ]}
                                contentStyle={{
                                    borderRadius: 12,
                                    borderColor: '#e2e8f0',
                                    fontSize: 12,
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#4f46e5"
                                strokeWidth={2.5}
                                fill="url(#financialRevenueFill)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="financial-product-grid mt-6 gap-4">
                <ProductList
                    title="Produk Terlaris"
                    subtitle={`Penjualan tertinggi periode ${periodLabel}`}
                    products={topProducts}
                    tone="emerald"
                    icon="fi-rr-chart-line-up"
                    emptyMessage="Belum ada produk terjual pada periode ini."
                />
                <ProductList
                    title="Produk Kurang Laku"
                    subtitle={`Penjualan terendah periode ${periodLabel}`}
                    products={lowProducts}
                    tone="amber"
                    icon="fi-rr-triangle-warning"
                    emptyMessage="Belum ada produk aktif untuk dianalisis."
                />
            </div>
        </AdminLayout>
    );
}

const summaryTones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
};

function SummaryCard({ label, value, icon, tone }) {
    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>
                </div>
                <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${summaryTones[tone]}`}
                >
                    <i className={`fi ${icon} text-lg`} />
                </span>
            </div>
        </div>
    );
}

const rankTones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
};

function ProductList({
    title,
    subtitle,
    products,
    tone,
    icon,
    emptyMessage,
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${rankTones[tone]}`}
                >
                    <i className={`fi ${icon}`} />
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                        {title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
                </div>
            </div>

            {products.length > 0 ? (
                <div className="divide-y divide-slate-100">
                    {products.map((product, index) => (
                        <div
                            key={product.id}
                            className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/60"
                        >
                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankTones[tone]}`}
                            >
                                {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {product.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {product.formattedRevenue}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {product.sold} terjual
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="px-6 py-14 text-center">
                    <p className="text-sm text-slate-400">{emptyMessage}</p>
                </div>
            )}
        </section>
    );
}
