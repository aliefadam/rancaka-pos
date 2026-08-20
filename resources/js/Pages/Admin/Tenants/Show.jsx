import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const rupiah = (value) => `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
const date = (value, withTime = false) =>
    value
        ? new Date(value).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
          })
        : '-';
const compact = (value) =>
    Number(value) >= 1000000
        ? `${(Number(value) / 1000000).toFixed(1)}jt`
        : Number(value) >= 1000
          ? `${(Number(value) / 1000).toFixed(0)}rb`
          : value;

const statusTone = {
    active: 'bg-emerald-50 text-emerald-700',
    paid: 'bg-emerald-50 text-emerald-700',
    approved: 'bg-emerald-50 text-emerald-700',
    trialing: 'bg-blue-50 text-blue-700',
    pending: 'bg-amber-50 text-amber-700',
    open: 'bg-amber-50 text-amber-700',
    inactive: 'bg-slate-100 text-slate-600',
    rejected: 'bg-rose-50 text-rose-700',
    overdue: 'bg-rose-50 text-rose-700',
};

function Badge({ value }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone[value] ?? 'bg-slate-100 text-slate-600'}`}
        >
            {value ?? '-'}
        </span>
    );
}

function Stat({ icon, label, value, note, tone = 'indigo' }) {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        blue: 'bg-blue-50 text-blue-600',
    };
    return (
        <div className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-sm shadow-slate-200/30 sm:p-4">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${tones[tone]}`}>
                    <i className={`fi ${icon}`} />
                </span>
                <p className="min-w-0 truncate text-[11px] font-medium text-slate-400 sm:text-xs">{label}</p>
            </div>
            <div className="min-w-0">
                <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.95rem,3.8vw,1.25rem)] font-bold tracking-tight text-slate-900">
                    {value}
                </p>
                {note && (
                    <p className="mt-1 truncate text-[10px] text-slate-400 sm:text-xs">
                        {note}
                    </p>
                )}
            </div>
        </div>
    );
}

function Section({ title, subtitle, children, className = '' }) {
    return (
        <section className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/30 ${className}`}>
            <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

export default function Show({
    tenant,
    subscription,
    accounts,
    invoices,
    metrics,
    salesTrend,
    paymentMethods,
    topProducts,
    recentTransactions,
    recentShifts,
}) {
    const startImpersonation = () =>
        router.post(route('admin.tenants.impersonate', tenant.id));

    return (
        <AdminLayout header="Detail Tenant">
            <Head title={`Detail ${tenant.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link
                        href={route('admin.tenants.index')}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-indigo-600"
                    >
                        <i className="fi fi-rr-arrow-small-left" />
                        Kembali ke Tenant
                    </Link>
                    <div className="mt-3 flex items-center gap-3">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200" />
                        ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-lg font-bold text-indigo-600">
                                {tenant.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tenant.name}</h2>
                                <Badge value={tenant.status} />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">Bergabung sejak {date(tenant.created_at)}</p>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={startImpersonation}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber-200 transition hover:bg-amber-600"
                >
                    <i className="fi fi-rr-sign-in-alt" />
                    Impersonate Tenant
                </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
                <Stat icon="fi-rr-coins" label="Omzet Bulan Ini" value={rupiah(metrics.month_revenue)} note={`${metrics.month_transactions} transaksi`} tone="emerald" />
                <Stat icon="fi-rr-calendar-day" label="Omzet Hari Ini" value={rupiah(metrics.today_revenue)} tone="blue" />
                <Stat icon="fi-rr-receipt" label="Total Transaksi" value={metrics.all_time_transactions.toLocaleString('id-ID')} note={`Rata-rata ${rupiah(metrics.average_order)}`} />
                <Stat icon="fi-rr-shopping-bag" label="Item Terjual" value={metrics.items_sold.toLocaleString('id-ID')} tone="amber" />
                <Stat icon="fi-rr-box-open" label="Produk" value={metrics.products.toLocaleString('id-ID')} note={`${metrics.categories} kategori`} />
                <Stat icon="fi-rr-users" label="Karyawan" value={metrics.employees.toLocaleString('id-ID')} note={`${metrics.open_shifts} shift aktif`} tone="blue" />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <Section title="Tren Penjualan 30 Hari" subtitle={`Total omzet sepanjang waktu ${rupiah(metrics.all_time_revenue)}`} className="xl:col-span-2">
                    <div className="h-72 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="adminTenantSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid)" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={compact} tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                                <Tooltip formatter={(value) => [rupiah(value), 'Omzet']} contentStyle={{ borderRadius: 12, borderColor: 'var(--chart-tooltip-border)', background: 'var(--chart-tooltip-bg)', fontSize: 12 }} />
                                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} fill="url(#adminTenantSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Section>

                <Section title="Subscription" subtitle="Status paket dan masa aktif tenant">
                    <div className="space-y-4 p-5">
                        {subscription ? (
                            <>
                                <div className="rounded-xl bg-slate-900 p-4 text-white">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs text-slate-400">Paket aktif</p>
                                            <p className="mt-1 text-lg font-bold">{subscription.plan_name}</p>
                                        </div>
                                        <Badge value={subscription.status} />
                                    </div>
                                    <p className="mt-4 overflow-hidden text-ellipsis whitespace-nowrap text-xl font-bold sm:text-2xl">{rupiah(subscription.price)}<span className="text-xs font-normal text-slate-400"> /periode</span></p>
                                </div>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Periode mulai</dt><dd className="font-medium text-slate-700">{date(subscription.current_period_start)}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Berakhir</dt><dd className="font-medium text-slate-700">{date(subscription.current_period_end ?? subscription.trial_ends_at)}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Grandfathered</dt><dd className="font-medium text-slate-700">{subscription.is_grandfathered ? 'Ya' : 'Tidak'}</dd></div>
                                </dl>
                            </>
                        ) : <p className="py-10 text-center text-sm text-slate-400">Belum ada subscription.</p>}
                    </div>
                </Section>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Section title="Produk Terlaris" subtitle="Berdasarkan seluruh transaksi selesai">
                    <div className="divide-y divide-slate-100 px-5">
                        {topProducts.map((product, index) => (
                            <div key={product.name} className="flex items-center gap-3 py-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span>
                                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{product.name}</p><p className="text-xs text-slate-400">{product.sold} item terjual</p></div>
                                <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-700">{rupiah(product.revenue)}</p>
                            </div>
                        ))}
                        {topProducts.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Belum ada produk terjual.</p>}
                    </div>
                </Section>

                <Section title="Metode Pembayaran" subtitle={`Pengeluaran bulan ini ${rupiah(metrics.month_expenses)}`}>
                    <div className="grid grid-cols-2 gap-3 p-3 sm:p-5">
                        {paymentMethods.map((method) => (
                            <div key={method.method} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-700"><i className={`fi ${method.method === 'cash' ? 'fi-rr-money-bill-wave' : 'fi-rr-qrcode'}`} />{method.method}</div>
                                <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-slate-900 sm:text-lg">{rupiah(method.revenue)}</p>
                                <p className="mt-1 text-xs text-slate-400">{method.transactions} transaksi</p>
                            </div>
                        ))}
                        {paymentMethods.length === 0 && <p className="col-span-2 py-10 text-center text-sm text-slate-400">Belum ada pembayaran.</p>}
                    </div>
                </Section>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <Section title="Akun Terdaftar" subtitle={`${accounts.length} akun pada tenant ini`}>
                    <div className="divide-y divide-slate-100 px-5">
                        {accounts.map((account) => (
                            <div key={account.id} className="flex items-center gap-3 py-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">{account.name.charAt(0).toUpperCase()}</span>
                                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{account.name}</p><p className="truncate text-xs text-slate-400">@{account.username}</p></div>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">{account.role}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section title="Transaksi Terbaru" subtitle="10 transaksi selesai terakhir" className="xl:col-span-2">
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><th className="px-5 py-3 font-semibold">Invoice</th><th className="px-5 py-3 font-semibold">Kasir</th><th className="px-5 py-3 font-semibold">Metode</th><th className="px-5 py-3 font-semibold">Waktu</th><th className="px-5 py-3 text-right font-semibold">Total</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentTransactions.map((transaction) => <tr key={transaction.id}><td className="px-5 py-3 font-medium text-slate-700">{transaction.invoice_number}</td><td className="px-5 py-3 text-slate-500">{transaction.user?.name ?? '-'}</td><td className="px-5 py-3 uppercase text-slate-500">{transaction.payment_method}</td><td className="px-5 py-3 text-slate-500">{date(transaction.created_at, true)}</td><td className="px-5 py-3 text-right font-semibold text-slate-800">{rupiah(transaction.total)}</td></tr>)}
                                {recentTransactions.length === 0 && <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-400">Belum ada transaksi.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Section>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Section title="Riwayat Shift" subtitle="Aktivitas kasir terbaru">
                    <div className="divide-y divide-slate-100 px-5">
                        {recentShifts.map((shift) => <div key={shift.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium text-slate-800">{shift.user?.name ?? '-'}</p><p className="mt-0.5 text-xs text-slate-400">Dibuka {date(shift.opened_at, true)}</p></div><div className="text-right"><Badge value={shift.closed_at ? 'closed' : 'active'} /><p className="mt-1 text-xs text-slate-400">Modal {rupiah(shift.opening_cash)}</p></div></div>)}
                        {recentShifts.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Belum ada shift.</p>}
                    </div>
                </Section>

                <Section title="Invoice & Pembayaran Subscription" subtitle="10 invoice terbaru">
                    <div className="divide-y divide-slate-100 px-5">
                        {invoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium text-slate-800">{invoice.number}</p><p className="mt-0.5 text-xs text-slate-400">Jatuh tempo {date(invoice.due_at)} · {invoice.payments?.length ?? 0} pembayaran</p></div><div className="text-right"><p className="text-sm font-semibold text-slate-800">{rupiah(invoice.amount)}</p><div className="mt-1"><Badge value={invoice.status} /></div></div></div>)}
                        {invoices.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Belum ada invoice.</p>}
                    </div>
                </Section>
            </div>

            <Section title="Informasi Tenant" subtitle="Data kontak dan alamat terdaftar" className="mt-4">
                <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-xs text-slate-400">Email</dt><dd className="mt-1 text-sm font-medium text-slate-700">{tenant.email}</dd></div>
                    <div><dt className="text-xs text-slate-400">Telepon</dt><dd className="mt-1 text-sm font-medium text-slate-700">{tenant.phone || '-'}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Alamat</dt><dd className="mt-1 text-sm font-medium text-slate-700">{tenant.address || '-'}</dd></div>
                </dl>
            </Section>
        </AdminLayout>
    );
}
