import Breadcrumb from '@/Components/Breadcrumb';
import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const statusMeta = {
    draft: { label: 'Draft', tone: 'bg-slate-100 text-slate-700', step: 1 },
    counting: { label: 'Sedang dihitung', tone: 'bg-sky-100 text-sky-700', step: 2 },
    submitted: { label: 'Menunggu persetujuan', tone: 'bg-amber-100 text-amber-800', step: 3 },
    posted: { label: 'Diposting', tone: 'bg-emerald-100 text-emerald-700', step: 4 },
    cancelled: { label: 'Dibatalkan', tone: 'bg-rose-100 text-rose-700', step: 0 },
};
const typeOptions = [{ value: '', label: 'Semua jenis' }, { value: 'product', label: 'Produk' }, { value: 'raw_material', label: 'Bahan baku' }];
const countOptions = [{ value: '', label: 'Semua hasil' }, { value: 'uncounted', label: 'Belum dihitung' }, { value: 'matched', label: 'Sesuai' }, { value: 'variance', label: 'Ada selisih' }];
const money = (value) => `Rp ${Math.abs(Number(value || 0)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
const quantity = (value) => {
    const number = Number(value || 0);
    return Number.isInteger(number) ? number.toLocaleString('id-ID') : number.toLocaleString('id-ID', { maximumFractionDigits: 4 });
};
const dateTime = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

function SummaryCard({ label, value, note, tone = 'text-slate-950' }) {
    return <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 text-xl font-black ${tone}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></article>;
}

export default function Show({ opname, summary, canPost }) {
    const can = usePermission();
    const meta = statusMeta[opname.status] ?? statusMeta.draft;
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [countFilter, setCountFilter] = useState('');
    const [counts, setCounts] = useState(() => Object.fromEntries(opname.items.map((item) => [item.id, item.physical_stock ?? ''])));
    const [saving, setSaving] = useState(false);
    const [action, setAction] = useState(null);
    const reasonForm = useForm({ reason: '' });

    useEffect(() => {
        setCounts(Object.fromEntries(opname.items.map((item) => [item.id, item.physical_stock ?? ''])));
    }, [opname.updated_at, opname.items]);

    const dirtyRows = useMemo(() => opname.items.filter((item) => {
        const value = counts[item.id];
        return value !== '' && String(value) !== String(item.physical_stock ?? '');
    }).map((item) => ({ id: item.id, physical_stock: counts[item.id] })), [counts, opname.items]);

    const filteredItems = useMemo(() => opname.items.filter((item) => {
        const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase());
        const matchesType = !type || item.item_type === type;
        const counted = item.physical_stock !== null;
        const variance = Number(item.variance_quantity || 0);
        const matchesCount = !countFilter
            || (countFilter === 'uncounted' && !counted)
            || (countFilter === 'matched' && counted && variance === 0)
            || (countFilter === 'variance' && counted && variance !== 0);
        return matchesSearch && matchesType && matchesCount;
    }), [countFilter, opname.items, search, type]);

    const saveCounts = () => {
        if (!dirtyRows.length) return;
        setSaving(true);
        router.put(route('tenant.stock-opnames.counts.update', opname.id), { items: dirtyRows }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    const openAction = (nextAction) => {
        reasonForm.reset();
        reasonForm.clearErrors();
        setAction(nextAction);
    };

    const executeAction = (event) => {
        event.preventDefault();
        const config = {
            submit: ['tenant.stock-opnames.submit', {}],
            post: ['tenant.stock-opnames.post', {}],
            return: ['tenant.stock-opnames.return', reasonForm.data],
            cancel: ['tenant.stock-opnames.cancel', reasonForm.data],
        }[action];
        if (!config) return;
        reasonForm.post(route(config[0], opname.id), {
            data: config[1],
            preserveScroll: true,
            onSuccess: () => setAction(null),
        });
    };

    const actionCopy = {
        submit: ['Kirim untuk persetujuan?', 'Seluruh hasil hitung akan dikunci sementara dan diperiksa oleh owner.', 'Kirim opname', 'bg-sky-600 hover:bg-sky-700'],
        post: ['Posting selisih stok?', 'Selisih akan diterapkan ke stok terkini secara atomik dan tercatat pada riwayat. Tindakan ini tidak dapat dibatalkan.', 'Posting sekarang', 'bg-emerald-600 hover:bg-emerald-700'],
        return: ['Kembalikan ke petugas?', 'Jelaskan item atau bagian yang perlu dihitung ulang.', 'Kembalikan', 'bg-amber-600 hover:bg-amber-700'],
        cancel: ['Batalkan sesi opname?', 'Snapshot dan hasil hitung tetap tersimpan sebagai audit, tetapi stok tidak akan berubah.', 'Batalkan sesi', 'bg-rose-600 hover:bg-rose-700'],
    };
    const currentAction = actionCopy[action];
    const countingEnabled = opname.status === 'counting' && can('stock-opnames.count');

    return (
        <AdminLayout header="Detail Stock Opname">
            <Head title={`Stock Opname ${opname.number}`} />
            <Breadcrumb items={[{ label: 'Stok' }, { label: 'Stock Opname', href: route('tenant.stock-opnames.index') }, { label: opname.number }]} />

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-300/30 sm:px-8">
                <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[34px] border-sky-400/10" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${meta.tone}`}>{meta.label}</span>
                        <p className="mt-4 font-mono text-xs font-bold text-sky-300">{opname.number}</p>
                        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Stock opname {new Date(opname.opname_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</h1>
                        <p className="mt-2 text-sm text-slate-400">Snapshot {dateTime(opname.snapshot_at)} · {summary.items} item · dibuat oleh {opname.creator?.name ?? 'Pengguna terhapus'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {opname.status === 'draft' && can('stock-opnames.create') && <button onClick={() => router.patch(route('tenant.stock-opnames.start', opname.id))} className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-sky-300"><i className="fi fi-rr-play mr-2" />Mulai hitung</button>}
                        {opname.status === 'counting' && can('stock-opnames.count') && <button disabled={summary.uncounted > 0 || dirtyRows.length > 0} onClick={() => openAction('submit')} className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"><i className="fi fi-rr-paper-plane mr-2" />Kirim ke owner</button>}
                        {opname.status === 'submitted' && canPost && <><button onClick={() => openAction('return')} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10">Hitung ulang</button><button onClick={() => openAction('post')} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-emerald-950 hover:bg-emerald-300">Setujui & posting</button></>}
                        {['draft', 'counting', 'submitted'].includes(opname.status) && canPost && <button onClick={() => openAction('cancel')} className="rounded-xl border border-rose-400/30 px-4 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-400/10">Batalkan</button>}
                    </div>
                </div>

                {opname.status !== 'cancelled' && <div className="relative mt-7 grid grid-cols-4 gap-1.5 sm:max-w-2xl">{['Draft', 'Penghitungan', 'Persetujuan', 'Diposting'].map((label, index) => { const active = meta.step >= index + 1; return <div key={label}><div className={`h-1.5 rounded-full ${active ? 'bg-sky-400' : 'bg-white/10'}`} /><p className={`mt-2 text-[9px] font-bold uppercase tracking-wide ${active ? 'text-sky-200' : 'text-slate-600'}`}>{label}</p></div>; })}</div>}
            </section>

            {opname.review_note && opname.status === 'counting' && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Catatan pemeriksaan owner</p><p className="mt-1 leading-6">{opname.review_note}</p></div>}
            {opname.status === 'cancelled' && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="font-black">Sesi dibatalkan oleh {opname.canceller?.name ?? 'Owner'}</p><p className="mt-1">{opname.cancel_reason}</p></div>}

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <SummaryCard label="Progres hitung" value={`${summary.counted}/${summary.items}`} note={`${summary.uncounted} belum dihitung`} />
                <SummaryCard label="Item selisih" value={summary.variance_items} note={`${summary.matched} item sesuai`} tone={summary.variance_items ? 'text-amber-700' : 'text-emerald-700'} />
                <SummaryCard label="Nilai lebih" value={money(summary.positive_value)} note="Stok fisik lebih besar" tone="text-emerald-700" />
                <SummaryCard label="Nilai kurang" value={money(summary.negative_value)} note="Stok fisik lebih kecil" tone="text-rose-700" />
                <div className="col-span-2 lg:col-span-1"><SummaryCard label="Nilai bersih" value={`${Number(summary.net_value) < 0 ? '-' : '+'}${money(summary.net_value)}`} note="Lebih dikurangi kurang" tone={Number(summary.net_value) < 0 ? 'text-rose-700' : 'text-sky-700'} /></div>
            </div>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1"><i className="fi fi-rr-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk atau bahan baku..." className="w-full rounded-xl border-slate-200 py-2.5 pl-10 text-sm" /></div>
                        <Select value={type} onChange={setType} options={typeOptions} className="w-full lg:w-48" />
                        <Select value={countFilter} onChange={setCountFilter} options={countOptions} className="w-full lg:w-52" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Menampilkan {filteredItems.length} dari {summary.items} item</span>{countingEnabled && <span>Isi stok fisik, lalu simpan secara berkala.</span>}</div>
                </div>

                <div className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                        const counted = item.physical_stock !== null;
                        const variance = Number(item.variance_quantity || 0);
                        const dirty = counts[item.id] !== '' && String(counts[item.id]) !== String(item.physical_stock ?? '');
                        return (
                            <div key={item.id} className={`grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(180px,1.4fr)_repeat(4,minmax(110px,0.75fr))] lg:items-center ${dirty ? 'bg-sky-50/60' : ''}`}>
                                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold text-slate-900">{item.item_name}</p><span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${item.item_type === 'product' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-700'}`}>{item.item_type === 'product' ? 'Produk' : 'Bahan baku'}</span></div><p className="mt-1 text-xs text-slate-400">HPP {money(item.average_cost_at_count ?? item.average_cost_snapshot)} / {item.unit_name}</p></div>
                                <div><p className="text-[10px] font-bold uppercase text-slate-400">Snapshot awal</p><p className="mt-1 font-semibold text-slate-700">{quantity(item.system_stock_snapshot)} {item.unit_name}</p></div>
                                <div><p className="text-[10px] font-bold uppercase text-slate-400">Stok pembanding</p><p className="mt-1 font-semibold text-slate-700">{counted ? `${quantity(item.expected_stock_at_count)} ${item.unit_name}` : 'Dihitung saat disimpan'}</p></div>
                                <label><span className="text-[10px] font-bold uppercase text-slate-400">Stok fisik</span>{countingEnabled ? <div className="relative mt-1"><input type="number" inputMode="decimal" min="0" step={item.item_type === 'product' ? 1 : 0.01} value={counts[item.id]} onChange={(event) => setCounts((current) => ({ ...current, [item.id]: event.target.value }))} className={`w-full rounded-xl py-2 pr-14 text-base font-black ${dirty ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'}`} placeholder="0" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{item.unit_name}</span></div> : <p className="mt-1 font-black text-slate-900">{counted ? `${quantity(item.physical_stock)} ${item.unit_name}` : '—'}</p>}</label>
                                <div><p className="text-[10px] font-bold uppercase text-slate-400">Selisih</p>{counted ? <><p className={`mt-1 font-black ${variance < 0 ? 'text-rose-700' : variance > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{variance > 0 ? '+' : ''}{quantity(variance)} {item.unit_name}</p><p className={`mt-0.5 text-xs font-semibold ${Number(item.variance_value) < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{Number(item.variance_value) < 0 ? '-' : '+'}{money(item.variance_value)}</p></> : <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">Belum dihitung</span>}</div>
                            </div>
                        );
                    })}
                    {!filteredItems.length && <div className="p-12 text-center text-sm text-slate-400">Tidak ada item yang sesuai filter.</div>}
                </div>
            </section>

            {countingEnabled && dirtyRows.length > 0 && <div className="sticky bottom-3 z-20 mx-auto mt-4 flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-slate-950 p-3.5 text-white shadow-2xl shadow-slate-900/25"><div><p className="text-sm font-black">{dirtyRows.length} hitungan belum disimpan</p><p className="text-[11px] text-slate-400">Stok pembanding dihitung saat disimpan.</p></div><button onClick={saveCounts} disabled={saving} className="shrink-0 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan hitung'}</button></div>}

            <Modal show={Boolean(action)} onClose={() => !reasonForm.processing && setAction(null)} maxWidth="md" closeable={!reasonForm.processing}>
                <form onSubmit={executeAction}>
                    <Modal.Header><h2 className="pr-8 text-lg font-black text-slate-900">{currentAction?.[0]}</h2></Modal.Header>
                    <Modal.Body><p className="text-sm leading-6 text-slate-600">{currentAction?.[1]}</p>{['return', 'cancel'].includes(action) && <label className="mt-4 block text-sm font-bold text-slate-700">Alasan *<textarea autoFocus rows="3" value={reasonForm.data.reason} onChange={(event) => reasonForm.setData('reason', event.target.value)} className="mt-1.5 w-full rounded-xl border-slate-200 text-sm" placeholder={action === 'return' ? 'Sebutkan bagian yang perlu dihitung ulang' : 'Alasan pembatalan sesi'} />{reasonForm.errors.reason && <span className="mt-1 block text-xs text-rose-600">{reasonForm.errors.reason}</span>}</label>}{reasonForm.errors.items && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{reasonForm.errors.items}</p>}{reasonForm.errors.opname && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{reasonForm.errors.opname}</p>}</Modal.Body>
                    <Modal.Footer><button type="button" onClick={() => setAction(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Batal</button><button disabled={reasonForm.processing} className={`rounded-xl px-4 py-2 text-sm font-black text-white disabled:opacity-50 ${currentAction?.[3]}`}>{reasonForm.processing ? 'Memproses...' : currentAction?.[2]}</button></Modal.Footer>
                </form>
            </Modal>
        </AdminLayout>
    );
}
