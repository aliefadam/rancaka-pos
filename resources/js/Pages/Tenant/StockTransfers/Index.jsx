import Breadcrumb from '@/Components/Breadcrumb';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const statusMeta = {
    in_transit: ['Dalam perjalanan', 'bg-amber-100 text-amber-800', 'fi-rr-truck-side'],
    received: ['Diterima', 'bg-emerald-100 text-emerald-700', 'fi-rr-check-circle'],
    cancelled: ['Dibatalkan', 'bg-slate-100 text-slate-600', 'fi-rr-cross-circle'],
    rejected: ['Ditolak', 'bg-rose-100 text-rose-700', 'fi-rr-ban'],
};
const fmtQty = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 4 });
const fmtDate = (value) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function Badge({ status }) {
    const [label, tone, icon] = statusMeta[status] ?? statusMeta.in_transit;
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${tone}`}><i className={`fi ${icon}`} />{label}</span>;
}

export default function Index({ transfers, filters, tenantId, destinations }) {
    const can = usePermission();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const firstRun = useRef(true);
    const form = useForm({ destination_tenant_id: '', note: '', items: [{ product_id: '', quantity: '' }] });
    const destination = destinations.find((item) => String(item.id) === String(form.data.destination_tenant_id));
    const products = destination?.products ?? [];
    const availableProducts = useMemo(() => products.filter((product) => !form.data.items.some((row) => String(row.product_id) === String(product.id))), [form.data.items, products]);

    useEffect(() => {
        if (firstRun.current) { firstRun.current = false; return; }
        const timeout = setTimeout(() => router.get(route('tenant.stock-transfers.index'), { ...(search ? { search } : {}), ...(status ? { status } : {}) }, { preserveState: true, replace: true }), 350);
        return () => clearTimeout(timeout);
    }, [search, status]);

    const setDestination = (value) => form.setData({ ...form.data, destination_tenant_id: value, items: [{ product_id: '', quantity: '' }] });
    const setItem = (index, field, value) => form.setData('items', form.data.items.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    const addItem = () => form.setData('items', [...form.data.items, { product_id: '', quantity: '' }]);
    const removeItem = (index) => form.setData('items', form.data.items.filter((_, rowIndex) => rowIndex !== index));
    const submit = (event) => {
        event.preventDefault();
        form.post(route('tenant.stock-transfers.store'), { onSuccess: () => { setOpen(false); form.reset(); } });
    };

    return <AdminLayout header="Transfer Stok">
        <Head title="Transfer Stok" />
        <Breadcrumb items={[{ label: 'Stok' }, { label: 'Transfer Stok' }]} />

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-300/30 sm:px-8">
            <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full border-[30px] border-orange-400/10" />
            <div className="absolute bottom-0 left-1/4 h-px w-2/3 bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300">Inter-branch logistics</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Stok bergerak. Jejak tetap utuh.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Kirim produk ke cabang dalam jaringan dan pantau hingga penerima mengonfirmasi stok masuk.</p></div>
                {can('stock-transfers.create') && <button data-testid="create-transfer" type="button" disabled={!destinations.length} onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-orange-950/30 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"><i className="fi fi-rr-paper-plane" /> Kirim stok</button>}
            </div>
        </section>

        {!destinations.length && <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><i className="fi fi-rr-info mt-0.5" /><p>Transfer tersedia setelah toko tergabung dalam jaringan cabang aktif.</p></div>}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:p-5"><div className="relative flex-1 sm:max-w-sm"><i className="fi fi-rr-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor transfer..." className="w-full rounded-xl border-slate-200 py-2.5 pl-10 text-sm" /></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border-slate-200 text-sm"><option value="">Semua status</option><option value="in_transit">Dalam perjalanan</option><option value="received">Diterima</option><option value="cancelled">Dibatalkan</option><option value="rejected">Ditolak</option></select></div>
            <div className="divide-y divide-slate-100">{transfers.data.map((transfer) => {
                const outgoing = Number(transfer.source_tenant_id) === Number(tenantId);
                return <Link key={transfer.id} href={route('tenant.stock-transfers.show', transfer.id)} className="group block p-4 transition hover:bg-orange-50/30 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${outgoing ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'}`}><i className={`fi ${outgoing ? 'fi-rr-arrow-up-right' : 'fi-rr-arrow-down-left'}`} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm font-black text-slate-900">{transfer.number}</p><Badge status={transfer.status} /></div><p className="mt-1 truncate text-xs text-slate-500">{transfer.source_tenant.name} <i className="fi fi-rr-arrow-small-right mx-1" /> {transfer.destination_tenant.name}</p></div><div className="grid grid-cols-2 gap-6 lg:w-80"><div><p className="text-[10px] font-black uppercase text-slate-400">Isi kiriman</p><p className="mt-1 text-sm font-bold text-slate-800">{transfer.items_count} produk · {fmtQty(transfer.total_quantity)} unit</p></div><div><p className="text-[10px] font-black uppercase text-slate-400">Dikirim</p><p className="mt-1 text-xs font-bold text-slate-700">{fmtDate(transfer.dispatched_at)}</p></div></div><i className="fi fi-rr-angle-small-right hidden text-xl text-slate-300 group-hover:text-orange-600 lg:block" /></div></Link>;
            })}{!transfers.data.length && <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><i className="fi fi-rr-truck-loading" /></span><p className="mt-4 font-bold text-slate-700">Belum ada transfer stok</p><p className="mt-1 text-sm text-slate-400">Kiriman pertama akan muncul di sini.</p></div>}</div>
            <div className="border-t border-slate-100 p-4"><Pagination links={transfers.links} /></div>
        </section>

        <Modal show={open} onClose={() => setOpen(false)} maxWidth="2xl"><form onSubmit={submit} data-testid="transfer-form"><Modal.Header><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Kiriman baru</p><h2 className="mt-1 text-lg font-black text-slate-900">Susun transfer stok</h2></div></Modal.Header><Modal.Body><div className="space-y-5">
            {(form.errors.items || form.errors.destination_tenant_id) && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{form.errors.items || form.errors.destination_tenant_id}</p>}
            <label className="block text-sm font-bold text-slate-700">Cabang tujuan *<select data-testid="destination" value={form.data.destination_tenant_id} onChange={(e) => setDestination(e.target.value)} className="mt-1.5 w-full rounded-xl border-slate-200 text-sm"><option value="">Pilih tujuan</option>{destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-slate-700">Produk yang dikirim *</p><button type="button" disabled={!availableProducts.length} onClick={addItem} className="text-xs font-black text-orange-600 disabled:text-slate-300">+ Tambah produk</button></div><div className="space-y-2">{form.data.items.map((row, index) => { const selected = products.find((p) => String(p.id) === String(row.product_id)); return <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1fr_9rem_2rem]"><label className="text-xs font-bold text-slate-500">Produk<select data-testid={`product-${index}`} value={row.product_id} onChange={(e) => setItem(index, 'product_id', e.target.value)} className="mt-1 w-full rounded-lg border-slate-200 bg-white text-sm"><option value="">Pilih produk</option>{products.filter((product) => String(product.id) === String(row.product_id) || !form.data.items.some((item) => String(item.product_id) === String(product.id))).map((product) => <option key={product.id} value={product.id}>{product.name} — stok {fmtQty(product.stock)}</option>)}</select></label><label className="text-xs font-bold text-slate-500">Jumlah<input data-testid={`quantity-${index}`} type="number" min="1" max={selected?.stock} step="1" value={row.quantity} onChange={(e) => setItem(index, 'quantity', e.target.value)} className="mt-1 w-full rounded-lg border-slate-200 bg-white text-sm" /></label><button type="button" disabled={form.data.items.length === 1} onClick={() => removeItem(index)} className="mt-5 text-slate-400 hover:text-rose-600 disabled:opacity-20"><i className="fi fi-rr-trash" /></button></div>; })}</div></div>
            <label className="block text-sm font-bold text-slate-700">Catatan<textarea rows="3" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder="Contoh: Restock untuk akhir pekan" className="mt-1.5 w-full rounded-xl border-slate-200 text-sm" /></label>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-xs leading-5 text-orange-900"><b>Stok langsung dikurangi saat dikirim.</b> Stok tujuan baru bertambah setelah penerima mengonfirmasi kiriman.</div>
        </div></Modal.Body><Modal.Footer><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Batal</button><button data-testid="submit-transfer" disabled={form.processing} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{form.processing ? 'Mengirim...' : 'Kirim sekarang'}</button></Modal.Footer></form></Modal>
    </AdminLayout>;
}
