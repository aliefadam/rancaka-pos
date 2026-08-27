import Breadcrumb from '@/Components/Breadcrumb';
import Pagination from '@/Components/Pagination';
import Select from '@/Components/Select';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value || 0);
const date = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const statusMeta = {
    paid: ['Lunas', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
    unpaid: ['Belum dibayar', 'bg-amber-50 text-amber-800 ring-amber-200'],
    partial: ['Sebagian', 'bg-sky-50 text-sky-700 ring-sky-200'],
    overdue: ['Terlambat', 'bg-rose-50 text-rose-700 ring-rose-200'],
    void: ['Dibatalkan', 'bg-slate-100 text-slate-600 ring-slate-200'],
};
const clean = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));

export default function Index({ purchases, summary, openingCostCount, filters, suppliers }) {
    const can = usePermission();
    const [form, setForm] = useState(filters);
    const activeFilters = Object.entries(filters).filter(([key, value]) => key !== 'search' && value).length;
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const apply = (event) => {
        event.preventDefault();
        router.get(route('tenant.purchases.index'), clean(form), { preserveState: true, replace: true });
    };
    const reset = () => {
        const empty = { search: '', supplier_id: '', payment_status: '', purchase_from: '', purchase_to: '', due_from: '', due_to: '' };
        setForm(empty);
        router.get(route('tenant.purchases.index'), {}, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout header="Pembelian">
            <Head title="Pembelian" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Pembelian' }]} />
            <div className="space-y-5">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-600">Persediaan masuk</p>
                        <h1 className="mt-1 text-2xl font-bold text-slate-950">Pembelian</h1>
                        <p className="mt-1 text-sm text-slate-600">Nilai bulan ini <b className="text-slate-800">{money(summary.month_total)}</b><span className="mx-2 text-slate-300">·</span>Hutang <b className="text-rose-700">{money(summary.payable)}</b></p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row"><Link href={route('tenant.reports.purchases.index')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"><i className="fi fi-rr-chart-histogram" /> Laporan</Link>{can('purchases.create') && <Link href={route('tenant.purchases.create')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"><i className="fi fi-rr-add" /> Catat pembelian</Link>}</div>
                </header>

                {openingCostCount > 0 && <Link href={route('tenant.purchases.opening-costs.index')} className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 transition hover:border-amber-300"><span><b>{openingCostCount} bahan baku</b> perlu saldo awal HPP sebelum pembelian baru.</span><span className="shrink-0 font-bold">Atur sekarang →</span></Link>}

                <form onSubmit={apply} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><i className="fi fi-rr-settings-sliders" /></span><div><h2 className="text-sm font-bold text-slate-900">Saring dokumen</h2><p className="text-xs text-slate-500">Temukan pembelian tanpa menelusuri satu per satu.</p></div></div>
                        {activeFilters > 0 && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">{activeFilters} filter aktif</span>}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="md:col-span-2"><span className="text-xs font-semibold text-slate-600">Cari dokumen</span><div className="relative mt-1.5"><i className="fi fi-rr-search pointer-events-none absolute left-3.5 top-3 text-sm text-slate-400" /><input value={form.search} onChange={(event) => set('search', event.target.value)} placeholder="Nomor pembelian, faktur, atau supplier" className="w-full rounded-xl border-slate-200 py-2.5 pl-10 text-sm" /></div></label>
                        <label><span className="text-xs font-semibold text-slate-600">Supplier</span><Select value={form.supplier_id} onChange={(value) => set('supplier_id', value)} options={[{ value: '', label: 'Semua supplier' }, ...suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name }))]} className="mt-1.5" searchPlaceholder="Cari supplier..." /></label>
                        <label><span className="text-xs font-semibold text-slate-600">Status pembayaran</span><Select value={form.payment_status} onChange={(value) => set('payment_status', value)} searchable={false} options={[{ value: '', label: 'Semua status' }, ...Object.entries(statusMeta).map(([value, [label]]) => ({ value, label }))]} className="mt-1.5" /></label>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[['purchase_from', 'Pembelian mulai'], ['purchase_to', 'Pembelian sampai'], ['due_from', 'Jatuh tempo mulai'], ['due_to', 'Jatuh tempo sampai']].map(([key, label]) => <label key={key}><span className="text-xs font-semibold text-slate-600">{label}</span><input type="date" value={form[key]} onChange={(event) => set(key, event.target.value)} className="mt-1.5 w-full rounded-xl border-slate-200 py-2.5 text-sm" /></label>)}
                    </div>
                    <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Reset</button><button className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">Terapkan filter</button></div>
                </form>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
                    <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Daftar pembelian</h2><p className="mt-0.5 text-xs text-slate-500">{purchases.total} dokumen ditemukan</p></div>
                    <div className="hidden grid-cols-[1.2fr_1fr_.8fr_.8fr] gap-4 border-b bg-slate-50/80 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:grid"><span>Dokumen</span><span>Supplier</span><span>Nilai</span><span>Status</span></div>
                    <div className="divide-y divide-slate-100">
                        {purchases.data.map((purchase) => {
                            const [label, tone] = statusMeta[purchase.payment_status] || [purchase.payment_status, statusMeta.unpaid[1]];
                            return <article key={purchase.id} className="grid gap-3 px-5 py-4 transition hover:bg-slate-50/70 md:grid-cols-[1.2fr_1fr_.8fr_.8fr] md:items-center md:gap-4"><div><Link href={route('tenant.purchases.show', purchase.id)} className="font-bold text-slate-950 hover:text-indigo-700">{purchase.number}</Link><p className="mt-1 text-xs text-slate-500">{date(purchase.purchase_date)}{purchase.supplier_invoice_number ? ` · Faktur ${purchase.supplier_invoice_number}` : ''}</p></div><div><Link href={route('tenant.suppliers.show', purchase.supplier.id)} className="text-sm font-semibold text-slate-700 hover:text-indigo-700">{purchase.supplier.name}</Link></div><div><p className="text-sm font-bold text-slate-900">{money(purchase.total_amount)}</p>{Number(purchase.balance_amount) > 0 && <p className="mt-1 text-xs font-medium text-rose-700">Sisa {money(purchase.balance_amount)}</p>}</div><div className="flex items-center justify-between md:block"><span className="text-xs text-slate-400 md:hidden">Status</span><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${tone}`}>{label}</span></div></article>;
                        })}
                    </div>
                    {!purchases.data.length && <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><i className="fi fi-rr-document" /></span><p className="mt-3 text-sm font-semibold text-slate-700">Tidak ada pembelian sesuai filter</p><button type="button" onClick={reset} className="mt-2 text-xs font-bold text-indigo-700">Hapus semua filter</button></div>}
                    <div className="border-t border-slate-100 p-4"><Pagination links={purchases.links} /></div>
                </section>
            </div>
        </AdminLayout>
    );
}
