import Breadcrumb from '@/Components/Breadcrumb';
import Modal from '@/Components/Modal';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const statusMeta = {
    in_transit: { label: 'Dalam perjalanan', tone: 'bg-amber-100 text-amber-800', icon: 'fi-rr-truck-side', step: 2 },
    received: { label: 'Diterima', tone: 'bg-emerald-100 text-emerald-700', icon: 'fi-rr-check-circle', step: 3 },
    cancelled: { label: 'Dibatalkan', tone: 'bg-slate-100 text-slate-600', icon: 'fi-rr-cross-circle', step: 0 },
    rejected: { label: 'Ditolak', tone: 'bg-rose-100 text-rose-700', icon: 'fi-rr-ban', step: 0 },
};
const qty = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 4 });
const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
const dateTime = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function Show({ transfer, tenantId }) {
    const can = usePermission();
    const meta = statusMeta[transfer.status] ?? statusMeta.in_transit;
    const outgoing = Number(transfer.source_tenant_id) === Number(tenantId);
    const [action, setAction] = useState(null);
    const reasonForm = useForm({ reason: '' });
    const executeResolution = (event) => {
        event.preventDefault();
        reasonForm.post(route(`tenant.stock-transfers.${action}`, transfer.id), { onSuccess: () => setAction(null), preserveScroll: true });
    };
    const receive = () => router.post(route('tenant.stock-transfers.receive', transfer.id), {}, { preserveScroll: true });

    return <AdminLayout header="Detail Transfer Stok">
        <Head title={transfer.number} />
        <Breadcrumb items={[{ label: 'Stok' }, { label: 'Transfer Stok', href: route('tenant.stock-transfers.index') }, { label: transfer.number }]} />

        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-300/30">
            <div className="relative px-6 py-7 sm:px-8"><div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border-[28px] border-orange-400/10" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${meta.tone}`}><i className={`fi ${meta.icon}`} />{meta.label}</span><span className="text-xs font-bold text-slate-400">{outgoing ? 'Kiriman keluar' : 'Kiriman masuk'}</span></div><h1 data-testid="transfer-number" className="mt-3 font-mono text-2xl font-black tracking-tight sm:text-3xl">{transfer.number}</h1><p className="mt-2 text-sm text-slate-300">Dibuat {transfer.creator?.name ?? 'Pengguna terhapus'} · {dateTime(transfer.dispatched_at)}</p></div><div className="flex flex-wrap gap-2">{transfer.status === 'in_transit' && !outgoing && can('stock-transfers.receive') && <><button data-testid="reject-transfer" onClick={() => { reasonForm.reset(); setAction('reject'); }} className="rounded-xl border border-rose-400/40 px-4 py-2.5 text-sm font-black text-rose-200 hover:bg-rose-500/10">Tolak</button><button data-testid="receive-transfer" onClick={receive} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-300">Terima kiriman</button></>}{transfer.status === 'in_transit' && outgoing && can('stock-transfers.cancel') && <button data-testid="cancel-transfer" onClick={() => { reasonForm.reset(); setAction('cancel'); }} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-black hover:bg-white/10">Batalkan transfer</button>}</div></div></div>
            <div className="grid border-t border-white/10 sm:grid-cols-[1fr_auto_1fr]"><div className="px-6 py-5 sm:px-8"><p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Dari</p><p className="mt-1 font-black">{transfer.source_tenant.name}</p></div><div className="hidden items-center px-6 text-orange-300 sm:flex"><i className="fi fi-rr-arrow-right text-2xl" /></div><div className="border-t border-white/10 px-6 py-5 sm:border-l sm:border-t-0 sm:px-8"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Menuju</p><p className="mt-1 font-black">{transfer.destination_tenant.name}</p></div></div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manifest</p><h2 className="mt-1 font-black text-slate-900">Isi kiriman</h2></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-5 py-3">Produk</th><th className="px-4 py-3 text-right">Jumlah</th><th className="px-4 py-3 text-right">HPP saat kirim</th><th className="px-5 py-3 text-right">Nilai</th></tr></thead><tbody className="divide-y divide-slate-100">{transfer.items.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.product_name}</p><p className="mt-1 text-xs text-slate-400">Tujuan: {item.destination_product?.name ?? 'Produk terhapus'}</p></td><td className="px-4 py-4 text-right font-black text-slate-900">{qty(item.quantity)}</td><td className="px-4 py-4 text-right text-slate-600">{money(item.unit_cost_snapshot)}</td><td className="px-5 py-4 text-right font-bold text-slate-800">{money(Number(item.quantity) * Number(item.unit_cost_snapshot))}</td></tr>)}</tbody></table></div></section>
            <aside className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alur transfer</p><div className="mt-4 space-y-4">{[['Dibuat & dikirim', transfer.dispatched_at, true], ['Dalam perjalanan', transfer.dispatched_at, transfer.status === 'in_transit'], ['Diterima tujuan', transfer.received_at, transfer.status === 'received']].map(([label, time, active], index) => <div key={label} className="flex gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${active || time ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{index + 1}</span><div><p className="text-sm font-bold text-slate-700">{label}</p><p className="mt-0.5 text-xs text-slate-400">{time ? dateTime(time) : 'Menunggu konfirmasi'}</p></div></div>)}</div></section>{transfer.note && <section className="rounded-2xl border border-orange-100 bg-orange-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Catatan pengirim</p><p className="mt-2 text-sm leading-6 text-orange-950">{transfer.note}</p></section>}{transfer.resolution_note && <section className="rounded-2xl border border-rose-100 bg-rose-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Alasan penyelesaian</p><p className="mt-2 text-sm leading-6 text-rose-950">{transfer.resolution_note}</p></section>}<Link href={route('tenant.stock-transfers.index')} className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-orange-600"><i className="fi fi-rr-arrow-left" /> Kembali ke daftar</Link></aside>
        </div>

        <Modal show={Boolean(action)} onClose={() => setAction(null)} maxWidth="md"><form onSubmit={executeResolution}><Modal.Header><h2 className="text-lg font-black text-slate-900">{action === 'reject' ? 'Tolak kiriman' : 'Batalkan transfer'}</h2></Modal.Header><Modal.Body><p className="mb-4 text-sm leading-6 text-slate-600">Stok akan otomatis dikembalikan ke toko pengirim. Tindakan ini tidak dapat dibatalkan.</p><label className="text-sm font-bold text-slate-700">Alasan *<textarea data-testid="resolution-reason" rows="3" value={reasonForm.data.reason} onChange={(e) => reasonForm.setData('reason', e.target.value)} className="mt-1.5 w-full rounded-xl border-slate-200 text-sm" />{reasonForm.errors.reason && <span className="mt-1 block text-xs text-rose-600">{reasonForm.errors.reason}</span>}</label></Modal.Body><Modal.Footer><button type="button" onClick={() => setAction(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Kembali</button><button data-testid="confirm-resolution" disabled={reasonForm.processing} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Konfirmasi</button></Modal.Footer></form></Modal>
    </AdminLayout>;
}
