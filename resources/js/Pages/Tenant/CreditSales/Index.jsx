import Select from '@/Components/Select';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusOptions = [{ value: '', label: 'Semua Status' }, { value: 'outstanding', label: 'Outstanding' }, { value: 'paid', label: 'Lunas' }];
const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const date = (value) => new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Index({ creditSales, filters, summary }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) { isFirstRun.current = false; return; }
        const timeout = setTimeout(() => router.get(route('tenant.credit-sales.index'), {
            ...(search ? { search } : {}), ...(status ? { status } : {}),
        }, { preserveState: true, preserveScroll: true, replace: true, only: ['creditSales', 'filters', 'summary'] }), 400);
        return () => clearTimeout(timeout);
    }, [search, status]);

    return <AdminLayout header="Penjualan Kredit"><Head title="Penjualan Kredit" /><div className="mx-auto max-w-7xl space-y-6">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-600">Piutang pelanggan</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Penjualan Kredit</h2><p className="mt-1 text-sm text-slate-500">Pantau saldo dan catat cicilan pelanggan.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40"><p className="text-xs text-slate-500">Total belum tertagih</p><p className="mt-2 text-2xl font-bold text-slate-900">{rupiah(summary.outstanding)}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40"><p className="text-xs text-slate-500">Pelanggan outstanding</p><p className="mt-2 text-2xl font-bold text-slate-900">{summary.customers} <span className="text-sm font-medium text-slate-400">pelanggan</span></p></div>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="relative w-full sm:max-w-sm"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400"><i className="fi fi-rr-search" /></span><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau invoice..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
                <Select value={status} onChange={setStatus} options={statusOptions} placeholder="Semua Status" className="w-full sm:w-48" />
            </div>
            <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400"><th className="px-6 py-3.5">Pelanggan</th><th className="px-6 py-3.5">Invoice</th><th className="px-6 py-3.5">Tanggal</th><th className="px-6 py-3.5 text-right">Total</th><th className="px-6 py-3.5 text-right">Sisa</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5 text-right">Aksi</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{creditSales.data.map((sale) => <tr key={sale.id} className="transition hover:bg-slate-50/60"><td className="px-6 py-4 font-medium text-slate-800">{sale.customer.name}</td><td className="px-6 py-4 text-slate-500">{sale.transaction.invoice_number}</td><td className="px-6 py-4 text-slate-500">{date(sale.transaction.created_at)}</td><td className="px-6 py-4 text-right text-slate-700">{rupiah(sale.total_amount)}</td><td className="px-6 py-4 text-right font-semibold text-slate-900">{rupiah(sale.total_amount - sale.paid_amount)}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sale.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${sale.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{sale.status === 'paid' ? 'Lunas' : 'Outstanding'}</span></td><td className="px-6 py-4 text-right"><Link href={route('tenant.credit-sales.show', sale.id)} className="font-semibold text-indigo-600 transition hover:text-indigo-800">Detail →</Link></td></tr>)}
                {creditSales.data.length === 0 && <tr><td colSpan="7" className="px-6 py-20 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400"><i className="fi fi-rr-receipt" /></span><p className="mt-4 text-sm font-medium text-slate-600">Data kredit tidak ditemukan</p><p className="mt-1 text-sm text-slate-400">Coba ubah kata pencarian atau filter status.</p></td></tr>}</tbody></table></div>
        </div>
    </div></AdminLayout>;
}
