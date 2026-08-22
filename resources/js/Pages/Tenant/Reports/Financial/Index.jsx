import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const periods = [
    { value: 'daily', label: 'Harian', icon: 'fi-rr-calendar-day' },
    { value: 'monthly', label: 'Bulanan', icon: 'fi-rr-calendar' },
    { value: 'yearly', label: 'Tahunan', icon: 'fi-rr-calendar-clock' },
    { value: 'custom', label: 'Rentang', icon: 'fi-rr-calendar-lines' },
];

const currentYear = new Date().getFullYear();
const reportYears = Array.from(
    { length: currentYear - 1998 },
    (_, index) => currentYear + 1 - index,
);

function compactCurrency(value) {
    const number = Number(value);
    const absolute = Math.abs(number);
    const prefix = number < 0 ? '-' : '';

    if (absolute >= 1000000000) return `${prefix}${absolute / 1000000000}M`;
    if (absolute >= 1000000) return `${prefix}${absolute / 1000000}jt`;
    if (absolute >= 1000) return `${prefix}${absolute / 1000}rb`;

    return number;
}

function formatRupiah(value) {
    const number = Number(value || 0);
    const prefix = number < 0 ? '-Rp ' : 'Rp ';

    return `${prefix}${Math.abs(number).toLocaleString('id-ID')}`;
}

export default function Index({
    filters,
    periodLabel,
    summary,
    comparison,
    chart,
    chartMeta,
    topProducts,
    lowProducts,
    priceOptionSales,
}) {
    const [customStart, setCustomStart] = useState(filters.start_date);
    const [customEnd, setCustomEnd] = useState(filters.end_date);

    useEffect(() => {
        setCustomStart(filters.start_date);
        setCustomEnd(filters.end_date);
    }, [filters.start_date, filters.end_date]);

    const visit = (params) => {
        router.get(route('tenant.reports.financial.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changePeriod = (period) => visit({ period });
    const changeSelection = (key, value) =>
        visit({ period: filters.period, [key]: value });
    const applyCustomRange = () =>
        visit({
            period: 'custom',
            start_date: customStart,
            end_date: customEnd,
        });

    return (
        <AdminLayout header="Laporan Keuangan">
            <Head title="Laporan Keuangan" />

            <Breadcrumb
                items={[{ label: 'Laporan' }, { label: 'Keuangan' }]}
            />

            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Laporan Keuangan
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Ringkasan performa keuangan periode {periodLabel}.
                    </p>
                </div>

                <div className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:grid-cols-4 lg:w-auto">
                    {periods.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => changePeriod(item.value)}
                            className={`flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${
                                filters.period === item.value
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            <i className={`fi ${item.icon} text-xs`} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <PeriodPicker
                filters={filters}
                customStart={customStart}
                customEnd={customEnd}
                setCustomStart={setCustomStart}
                setCustomEnd={setCustomEnd}
                onChange={changeSelection}
                onApplyCustom={applyCustomRange}
            />

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Pendapatan"
                    value={summary.revenue}
                    icon="fi-rr-chart-line-up"
                    tone="emerald"
                    comparison={comparison.revenue}
                    comparisonLabel={comparison.label}
                />
                <SummaryCard
                    label="Pengeluaran"
                    value={summary.expenses}
                    icon="fi-rr-money-bill-wave"
                    tone="rose"
                    comparison={comparison.expenses}
                    comparisonLabel={comparison.label}
                    inverseComparison
                    footer={`Operasional ${summary.operatingExpenses} · supplier ${summary.supplierPayments}`}
                />
                <SummaryCard
                    label="Laba Bersih"
                    value={summary.netProfit}
                    icon="fi-rr-sack-dollar"
                    tone={summary.netProfitValue < 0 ? 'amber' : 'indigo'}
                    comparison={comparison.netProfit}
                    comparisonLabel={comparison.label}
                    footer={`HPP ${summary.costOfGoodsSold} · laba kotor ${summary.grossProfit}`}
                />
                <SummaryCard
                    label="Transaksi Selesai"
                    value={summary.transactionCount.toLocaleString('id-ID')}
                    icon="fi-rr-receipt"
                    tone="sky"
                    footer="Transaksi pada periode terpilih"
                />
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            {chartMeta.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                            {chartMeta.subtitle}
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                        <i className="fi fi-rr-calendar" />
                        {chartMeta.periodBadge}
                    </span>
                </div>

                <div className="px-2 py-5 sm:px-5" style={{ height: '22rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chart}
                            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
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
                                        stopOpacity={0.24}
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
                                stroke="var(--chart-grid)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                minTickGap={18}
                                tick={{
                                    fill: 'var(--chart-tick)',
                                    fontSize: 11,
                                }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                width={58}
                                tick={{
                                    fill: 'var(--chart-tick)',
                                    fontSize: 11,
                                }}
                                tickFormatter={compactCurrency}
                            />
                            <Tooltip
                                labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.fullLabel ?? ''
                                }
                                formatter={(value, name) => [
                                    formatRupiah(value),
                                    name,
                                ]}
                                contentStyle={{
                                    borderRadius: 12,
                                    backgroundColor:
                                        'var(--chart-tooltip-bg)',
                                    borderColor:
                                        'var(--chart-tooltip-border)',
                                    color: 'var(--chart-tooltip-text)',
                                    fontSize: 12,
                                }}
                                labelStyle={{
                                    color: 'var(--chart-tooltip-text)',
                                }}
                                cursor={{ stroke: 'var(--chart-grid)' }}
                            />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 12 }}
                            />
                            <Area
                                name="Pendapatan"
                                type="monotone"
                                dataKey="revenue"
                                stroke="#4f46e5"
                                strokeWidth={2.5}
                                fill="url(#financialRevenueFill)"
                            />
                            <Line
                                name="Pengeluaran"
                                type="monotone"
                                dataKey="expenses"
                                stroke="#f43f5e"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                name="Laba Bersih"
                                type="monotone"
                                dataKey="netProfit"
                                stroke="#059669"
                                strokeWidth={2}
                                dot={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <BreakdownTable
                rows={chart}
                granularityLabel={chartMeta.granularityLabel}
            />

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

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <i className="fi fi-rr-tags" />
                    </span>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Penjualan per Pilihan Harga</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Rincian jumlah dan omzet berdasarkan harga yang dipilih kasir.</p>
                    </div>
                </div>
                {priceOptionSales.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-6 py-3">Produk</th>
                                    <th className="px-6 py-3">Pilihan harga</th>
                                    <th className="px-6 py-3 text-right">Harga satuan</th>
                                    <th className="px-6 py-3 text-right">Terjual</th>
                                    <th className="px-6 py-3 text-right">Omzet</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {priceOptionSales.map((item, index) => (
                                    <tr key={`${item.product_name}-${item.price_option_name}-${item.unit_price}-${index}`} className="hover:bg-slate-50/70">
                                        <td className="px-6 py-3.5 font-semibold text-slate-800">{item.product_name}</td>
                                        <td className="px-6 py-3.5">
                                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">{item.price_option_name}</span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right text-slate-600">Rp {Number(item.unit_price).toLocaleString('id-ID')}</td>
                                        <td className="px-6 py-3.5 text-right font-semibold text-slate-700">{item.sold}</td>
                                        <td className="px-6 py-3.5 text-right font-bold text-emerald-600">Rp {Number(item.revenue).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="px-6 py-10 text-center text-sm text-slate-400">Belum ada pilihan harga yang terjual pada periode ini.</p>
                )}
            </section>
        </AdminLayout>
    );
}

function PeriodPicker({
    filters,
    customStart,
    customEnd,
    setCustomStart,
    setCustomEnd,
    onChange,
    onApplyCustom,
}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/40 sm:flex-row sm:items-end sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <i className="fi fi-rr-calendar-lines" />
            </div>

            {filters.period === 'daily' && (
                <FilterField label="Pilih Tanggal">
                    <input
                        type="date"
                        value={filters.date}
                        onChange={(event) => onChange('date', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-52"
                    />
                </FilterField>
            )}

            {filters.period === 'monthly' && (
                <FilterField label="Pilih Bulan">
                    <input
                        type="month"
                        value={filters.month}
                        onChange={(event) => onChange('month', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-52"
                    />
                </FilterField>
            )}

            {filters.period === 'yearly' && (
                <FilterField label="Pilih Tahun">
                    <select
                        value={filters.year}
                        onChange={(event) => onChange('year', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-40"
                    >
                        {reportYears.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </FilterField>
            )}

            {filters.period === 'custom' && (
                <>
                    <FilterField label="Tanggal Mulai">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(event) => setCustomStart(event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-48"
                        />
                    </FilterField>
                    <span className="hidden pb-3 text-slate-300 sm:block">—</span>
                    <FilterField label="Tanggal Selesai">
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(event) => setCustomEnd(event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-48"
                        />
                    </FilterField>
                    <button
                        type="button"
                        onClick={onApplyCustom}
                        disabled={!customStart || !customEnd}
                        className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Terapkan
                    </button>
                </>
            )}

            <p className="text-xs leading-5 text-slate-400 sm:ml-auto sm:max-w-xs sm:text-right">
                {filters.period === 'custom'
                    ? 'Maksimal 366 hari. Grafik otomatis menjadi bulanan untuk rentang panjang.'
                    : 'Seluruh ringkasan, grafik, rincian, dan produk mengikuti periode ini.'}
            </p>
        </div>
    );
}

function FilterField({ label, children }) {
    return (
        <label className="block w-full sm:w-auto">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </span>
            {children}
        </label>
    );
}

const summaryTones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
};

function SummaryCard({
    label,
    value,
    icon,
    tone,
    comparison,
    comparisonLabel,
    inverseComparison = false,
    footer,
}) {
    const percentage = comparison?.percentage;
    const favorable = inverseComparison
        ? percentage !== null && percentage <= 0
        : percentage !== null && percentage >= 0;

    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>
                </div>
                <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${summaryTones[tone]}`}
                >
                    <i className={`fi ${icon} text-lg`} />
                </span>
            </div>

            {comparison ? (
                <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-xs">
                        {percentage === null ? (
                            <span className="font-semibold text-slate-500">
                                Belum ada data pembanding
                            </span>
                        ) : (
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${
                                    favorable
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                }`}
                            >
                                <i
                                    className={`fi ${percentage >= 0 ? 'fi-rr-arrow-trend-up' : 'fi-rr-arrow-trend-down'}`}
                                />
                                {Math.abs(percentage).toLocaleString('id-ID')}%
                            </span>
                        )}
                        <span className="truncate text-slate-400">
                            {comparisonLabel}
                        </span>
                    </div>
                    {percentage !== null && (
                        <p className="mt-1.5 text-xs text-slate-400">
                            Sebelumnya {comparison.previousFormatted}
                        </p>
                    )}
                </div>
            ) : (
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                    {footer}
                </p>
            )}
        </div>
    );
}

function BreakdownTable({ rows, granularityLabel }) {
    return (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h3 className="text-sm font-semibold text-slate-900">
                    Rincian per {granularityLabel}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                    Breakdown angka yang membentuk ringkasan periode terpilih.
                </p>
            </div>
            <div className="scrollbar-thin max-h-[32rem] overflow-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-3.5">{granularityLabel}</th>
                            <th className="px-6 py-3.5 text-right">Pendapatan</th>
                            <th className="px-6 py-3.5 text-right">Pengeluaran</th>
                            <th className="px-6 py-3.5 text-right">Laba Bersih</th>
                            <th className="px-6 py-3.5 text-right">Transaksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => (
                            <tr key={row.key} className="transition hover:bg-slate-50/60">
                                <td className="px-6 py-3.5">
                                    <p className="font-medium text-slate-700">{row.label}</p>
                                    <p className="mt-0.5 text-xs text-slate-400">{row.fullLabel}</p>
                                </td>
                                <td className="px-6 py-3.5 text-right font-medium text-slate-700">
                                    {formatRupiah(row.revenue)}
                                </td>
                                <td className="px-6 py-3.5 text-right text-rose-600">
                                    {formatRupiah(row.expenses)}
                                </td>
                                <td
                                    className={`px-6 py-3.5 text-right font-semibold ${
                                        row.netProfit < 0 ? 'text-rose-600' : 'text-emerald-700'
                                    }`}
                                >
                                    {formatRupiah(row.netProfit)}
                                </td>
                                <td className="px-6 py-3.5 text-right text-slate-500">
                                    {row.transactions.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

const rankTones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
};

function ProductList({ title, subtitle, products, tone, icon, emptyMessage }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${rankTones[tone]}`}
                >
                    <i className={`fi ${icon}`} />
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
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
