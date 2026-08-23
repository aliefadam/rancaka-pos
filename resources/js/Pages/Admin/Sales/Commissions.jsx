import Breadcrumb from '@/Components/Breadcrumb';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value ?? 0));
const date = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Commissions({ allSales, commissions, payouts, filters, metrics }) {
    const toast = useToast();
    const [selected, setSelected] = useState([]);
    const [payoutOpen, setPayoutOpen] = useState(false);
    const payoutForm = useForm({ commission_ids: [], proof: null, note: '' });

    const selectedRows = commissions.data.filter((item) => selected.includes(item.id));
    const selectedSalesId = selectedRows[0]?.sales_profile_id;
    const selectedTotal = selectedRows.reduce((sum, item) => sum + Number(item.commission_amount), 0);

    const applyFilters = (values) => router.get(route('admin.sales.commissions'), {
        ...(values.sales_id ? { sales_id: values.sales_id } : {}),
        ...(values.commission_status ? { commission_status: values.commission_status } : {}),
        ...(values.commission_search ? { commission_search: values.commission_search } : {}),
        ...(values.date_from ? { date_from: values.date_from } : {}),
        ...(values.date_to ? { date_to: values.date_to } : {}),
    }, { preserveState: true, replace: true });

    const toggleCommission = (commission) => {
        if (commission.status !== 'accrued') return;
        if (selected.includes(commission.id)) setSelected(selected.filter((id) => id !== commission.id));
        else if (!selectedSalesId || selectedSalesId === commission.sales_profile_id) setSelected([...selected, commission.id]);
        else toast.error('Satu payout hanya dapat berisi komisi dari sales yang sama.');
    };

    const openPayout = () => {
        payoutForm.setData('commission_ids', selected);
        payoutForm.clearErrors();
        setPayoutOpen(true);
    };

    const submitPayout = (event) => {
        event.preventDefault();
        payoutForm.post(route('admin.commission-payouts.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { setPayoutOpen(false); setSelected([]); payoutForm.reset(); },
            onError: () => toast.error('Payout gagal dicatat. Periksa pilihan komisi.'),
        });
    };

    return (
        <AdminLayout header="Komisi">
            <Head title="Komisi" />
            <Breadcrumb items={[{ label: 'SaaS' }, { label: 'Komisi' }]} homeHref={route('admin.dashboard')} />

            <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-600">Referral ledger</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Komisi</h2><p className="mt-1 text-sm text-slate-500">Komisi tercatat sekali pada pembayaran subscription pertama dan tetap dapat diaudit sampai payout.</p></div>

            <section className="mt-5 grid gap-4 sm:grid-cols-3">
                {[['Komisi diperoleh', money(metrics.earned), 'fi-rr-coins', 'text-amber-600 bg-amber-50'], ['Belum dibayar', money(metrics.accrued), 'fi-rr-hourglass-end', 'text-rose-600 bg-rose-50'], ['Sudah dibayar', money(metrics.paid), 'fi-rr-check-circle', 'text-emerald-600 bg-emerald-50']].map(([label, value, icon, tone]) => <article key={label} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><i className={`fi ${icon}`} /></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xl font-black tracking-tight text-slate-900">{value}</p></article>)}
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                    <div className="border-b border-slate-100 p-5">
                        <div><h2 className="font-bold text-slate-900">Ledger komisi</h2><p className="mt-1 text-xs text-slate-500">Pilih komisi terutang dari satu sales untuk payout.</p></div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const f = e.currentTarget;
                                applyFilters({ ...filters, sales_id: f.sales_id.value, commission_status: f.commission_status.value, commission_search: f.commission_search.value, date_from: f.date_from.value, date_to: f.date_to.value });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Cari tenant / invoice</label>
                                <div className="relative"><i className="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" /><input name="commission_search" defaultValue={filters.commission_search} placeholder="Cari tenant atau invoice" className="w-full rounded-xl border-slate-200 py-2 pl-9 text-xs" /></div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Sales</label>
                                    <select name="sales_id" defaultValue={filters.sales_id || ''} className="w-full rounded-xl border-slate-200 py-2 text-xs"><option value="">Semua sales</option>{allSales.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Status komisi</label>
                                    <select name="commission_status" defaultValue={filters.commission_status || ''} className="w-full rounded-xl border-slate-200 py-2 text-xs"><option value="">Semua status</option><option value="accrued">Belum dibayar</option><option value="paid">Sudah dibayar</option></select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Dari tanggal</label>
                                    <input name="date_from" type="date" defaultValue={filters.date_from} className="w-full rounded-xl border-slate-200 py-2 text-xs" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Sampai tanggal</label>
                                    <input name="date_to" type="date" defaultValue={filters.date_to} className="w-full rounded-xl border-slate-200 py-2 text-xs" />
                                </div>
                            </div>
                            <div className="flex justify-end"><button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Terapkan filter</button></div>
                        </form>
                    </div>
                    {selected.length > 0 && <div className="flex items-center justify-between gap-4 border-b border-indigo-100 bg-indigo-50 px-5 py-3"><p className="text-sm font-semibold text-indigo-800">{selected.length} komisi · {money(selectedTotal)}</p><button onClick={openPayout} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Catat payout</button></div>}
                    <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="w-10 px-4 py-3"/><th className="px-3 py-3">Sales / Tenant</th><th className="px-3 py-3">Invoice</th><th className="px-3 py-3">Dasar</th><th className="px-3 py-3">Komisi</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{commissions.data.map((item) => <tr key={item.id} className="border-t border-slate-100 text-sm"><td className="px-4 py-4"><input type="checkbox" checked={selected.includes(item.id)} disabled={item.status !== 'accrued'} onChange={() => toggleCommission(item)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></td><td className="px-3 py-4"><p className="font-semibold text-slate-800">{item.sales_profile.name}</p><p className="text-xs text-slate-400">{item.tenant.name}</p></td><td className="px-3 py-4"><p className="font-medium text-slate-700">{item.invoice.number}</p><p className="text-xs text-slate-400">{date(item.approved_at)}</p></td><td className="px-3 py-4 text-slate-600">{money(item.base_amount)} <span className="text-xs text-slate-400">× {Number(item.commission_rate_snapshot)}%</span></td><td className="px-3 py-4 font-bold text-slate-900">{money(item.commission_amount)}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status === 'paid' ? 'Dibayar' : 'Terutang'}</span></td></tr>)}{commissions.data.length === 0 && <tr><td colSpan="6" className="px-5 py-12 text-center text-sm text-slate-400">Belum ada komisi.</td></tr>}</tbody></table></div>
                    <div className="border-t border-slate-100 p-4"><Pagination links={commissions.links} /></div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><h2 className="font-bold text-slate-900">Payout terbaru</h2><div className="mt-4 space-y-3">{payouts.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">{item.sales_profile.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.number}</p></div><p className="text-sm font-bold text-emerald-600">{money(item.amount)}</p></div><div className="mt-2 flex items-center justify-between text-[11px] text-slate-400"><span>{date(item.paid_at)}</span>{item.proof_url && <a href={item.proof_url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600">Bukti</a>}</div></div>)}{payouts.length === 0 && <p className="py-5 text-center text-xs text-slate-400">Belum ada payout.</p>}</div></div>
            </section>

            <Modal show={payoutOpen} onClose={() => setPayoutOpen(false)} maxWidth="md"><form onSubmit={submitPayout}><Modal.Header><div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Payout manual</p><h2 className="mt-1 text-lg font-bold text-slate-900">Konfirmasi pembayaran komisi</h2></div></Modal.Header><Modal.Body><div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs text-slate-400">Total payout</p><p className="mt-1 text-2xl font-black">{money(selectedTotal)}</p><p className="mt-2 text-xs text-slate-400">{selected.length} komisi · {selectedRows[0]?.sales_profile.name}</p></div><div className="mt-4 space-y-4"><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Bukti transfer (opsional)</label><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => payoutForm.setData('proof', e.target.files[0] ?? null)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />{payoutForm.errors.proof && <p className="mt-1 text-xs text-rose-600">{payoutForm.errors.proof}</p>}</div><div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan (opsional)</label><textarea rows="3" value={payoutForm.data.note} onChange={(e) => payoutForm.setData('note', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" /></div></div></Modal.Body><Modal.Footer><button type="button" onClick={() => setPayoutOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Batal</button><button disabled={payoutForm.processing} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{payoutForm.processing ? 'Mencatat...' : 'Tandai sudah dibayar'}</button></Modal.Footer></form></Modal>
        </AdminLayout>
    );
}
