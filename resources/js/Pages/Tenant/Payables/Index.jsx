import Breadcrumb from '@/Components/Breadcrumb';
import Pagination from '@/Components/Pagination';
import Select from '@/Components/Select';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
const date = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const clean = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
const dueOptions = [{ value: '', label: 'Semua jatuh tempo' }, { value: 'upcoming', label: 'Belum jatuh tempo' }, { value: 'today', label: 'Jatuh tempo hari ini' }, { value: 'overdue', label: 'Terlambat' }, { value: 'no_due', label: 'Tanpa tanggal' }];

export default function Index({ payables, summary, filters, suppliers }) {
    const [form, setForm] = useState(filters);
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const activeFilters = Object.values(filters).filter(Boolean).length;
    const reset = () => {
        const empty = { search: '', supplier_id: '', due_status: '', due_from: '', due_to: '' };
        setForm(empty);
        router.get(route('tenant.supplier-payables.index'), {}, { preserveState: true, replace: true });
    };
    const apply = (event) => {
        event.preventDefault();
        router.get(route('tenant.supplier-payables.index'), clean(form), { preserveState: true, replace: true });
    };
    const cards = [
        ['Total hutang', summary.aging.total, 'fi-rr-wallet', 'bg-slate-950 text-white'],
        ['Belum jatuh tempo', summary.aging.not_due, 'fi-rr-calendar-clock', 'bg-emerald-50 text-emerald-900'],
        ['Terlambat 1–7 hari', summary.aging.overdue_1_7, 'fi-rr-calendar-exclamation', 'bg-amber-50 text-amber-900'],
        ['Terlambat 8–30 hari', summary.aging.overdue_8_30, 'fi-rr-triangle-warning', 'bg-orange-50 text-orange-900'],
        ['Terlambat >30 hari', summary.aging.overdue_over_30, 'fi-rr-siren-on', 'bg-rose-50 text-rose-900'],
    ];

    return (
        <AdminLayout header="Hutang Supplier">
            <Head title="Hutang Supplier" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Hutang Supplier' }]} />
            <div className="space-y-5">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-600">Kewajiban usaha</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Hutang supplier</h1><p className="mt-1 text-sm text-slate-600">Pembayaran bulan ini <b className="text-slate-800">{money(summary.paid_this_month)}</b></p></div><Link href={route('tenant.reports.purchases.index')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"><i className="fi fi-rr-chart-histogram" /> Laporan lengkap</Link></header>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, bucket, icon, tone]) => <article key={label} className={`relative overflow-hidden rounded-2xl p-4 ring-1 ring-slate-200/70 ${tone}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold opacity-70">{label}</p><p className="mt-2 text-xl font-black tracking-tight">{money(bucket.amount)}</p><p className="mt-1 text-[10px] font-bold opacity-60">{bucket.count} dokumen</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><i className={`fi ${icon}`} /></span></div></article>)}</div>

                <form onSubmit={apply} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
                    <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Saring hutang</h2><p className="mt-0.5 text-xs text-slate-500">Ringkasan mengikuti supplier dan rentang tanggal yang dipilih.</p></div>{activeFilters > 0 && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-700">{activeFilters} aktif</span>}</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <label className="md:col-span-2"><span className="text-xs font-semibold text-slate-600">Cari hutang</span><div className="relative mt-1.5"><i className="fi fi-rr-search pointer-events-none absolute left-3.5 top-3 text-sm text-slate-400" /><input value={form.search} onChange={(event) => set('search', event.target.value)} placeholder="Nomor pembelian, faktur, atau supplier" className="w-full rounded-xl border-slate-200 py-2.5 pl-10 text-sm" /></div></label>
                        <label><span className="text-xs font-semibold text-slate-600">Supplier</span><Select value={form.supplier_id} onChange={(value) => set('supplier_id', value)} options={[{ value: '', label: 'Semua supplier' }, ...suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name }))]} className="mt-1.5" searchPlaceholder="Cari supplier..." /></label>
                        <label><span className="text-xs font-semibold text-slate-600">Kondisi tempo</span><Select value={form.due_status} onChange={(value) => set('due_status', value)} options={dueOptions} searchable={false} className="mt-1.5" /></label>
                        <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1"><label><span className="text-xs font-semibold text-slate-600">Dari</span><input type="date" value={form.due_from} onChange={(event) => set('due_from', event.target.value)} className="mt-1.5 w-full rounded-xl border-slate-200 py-2.5 text-sm" /></label><label><span className="text-xs font-semibold text-slate-600">Sampai</span><input type="date" value={form.due_to} onChange={(event) => set('due_to', event.target.value)} className="mt-1.5 w-full rounded-xl border-slate-200 py-2.5 text-sm" /></label></div>
                    </div>
                    <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Reset</button><button className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Terapkan filter</button></div>
                </form>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
                    <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Daftar kewajiban</h2><p className="mt-0.5 text-xs text-slate-500">{payables.total} pembelian masih memiliki saldo</p></div>
                    <div className="divide-y divide-slate-100">
                        {payables.data.map((payable) => {
                            const overdue = payable.is_overdue;
                            return <article key={payable.id} className="grid gap-3 p-4 transition hover:bg-slate-50/70 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:px-5"><div><Link href={route('tenant.suppliers.show', payable.supplier.id)} className="font-bold text-slate-900 hover:text-indigo-700">{payable.supplier.name}</Link><Link href={route('tenant.purchases.show', payable.id)} className="mt-1 block font-mono text-xs text-indigo-700 hover:underline">{payable.number}</Link></div><div><p className={`text-sm font-semibold ${overdue ? 'text-rose-700' : 'text-slate-700'}`}>{overdue ? 'Terlambat · ' : 'Jatuh tempo '}{date(payable.due_date)}</p><p className="mt-1 text-xs text-slate-500">Total pembelian {money(payable.total_amount)}</p></div><div className="rounded-xl bg-rose-50 px-3 py-2 text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Sisa hutang</p><p className="mt-0.5 font-black text-rose-800">{money(payable.balance_amount)}</p></div></article>;
                        })}
                    </div>
                    {!payables.data.length && <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><i className="fi fi-rr-check-circle" /></span><p className="mt-3 text-sm font-semibold text-slate-700">Tidak ada hutang sesuai filter</p><button type="button" onClick={reset} className="mt-2 text-xs font-bold text-indigo-700">Hapus semua filter</button></div>}
                    <div className="border-t border-slate-100 p-4"><Pagination links={payables.links} /></div>
                </section>
            </div>
        </AdminLayout>
    );
}
