import Breadcrumb from '@/Components/Breadcrumb';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import Select from '@/Components/Select';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const today = new Date().toISOString().slice(0, 10);
const statusOptions = [
    { value: '', label: 'Semua status' },
    { value: 'draft', label: 'Draft' },
    { value: 'counting', label: 'Sedang dihitung' },
    { value: 'submitted', label: 'Menunggu persetujuan' },
    { value: 'posted', label: 'Diposting' },
    { value: 'cancelled', label: 'Dibatalkan' },
];
const statusMeta = {
    draft: ['Draft', 'bg-slate-100 text-slate-700', 'fi-rr-file'],
    counting: ['Sedang dihitung', 'bg-sky-100 text-sky-700', 'fi-rr-calculator'],
    submitted: ['Menunggu persetujuan', 'bg-amber-100 text-amber-800', 'fi-rr-hourglass-end'],
    posted: ['Diposting', 'bg-emerald-100 text-emerald-700', 'fi-rr-check-circle'],
    cancelled: ['Dibatalkan', 'bg-rose-100 text-rose-700', 'fi-rr-cross-circle'],
};
const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
const date = (value) => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

function StatusBadge({ status }) {
    const [label, tone, icon] = statusMeta[status] ?? statusMeta.draft;
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}><i className={`fi ${icon}`} />{label}</span>;
}

export default function Index({ opnames, filters, hasActiveSession }) {
    const can = usePermission();
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const firstRun = useRef(true);
    const form = useForm({ opname_date: today, note: '' });

    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        const timeout = setTimeout(() => router.get(route('tenant.stock-opnames.index'), {
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
        }, { preserveState: true, replace: true }), 350);
        return () => clearTimeout(timeout);
    }, [search, status]);

    const create = (event) => {
        event.preventDefault();
        form.post(route('tenant.stock-opnames.store'), {
            onSuccess: () => setCreateOpen(false),
        });
    };

    return (
        <AdminLayout header="Stock Opname">
            <Head title="Stock Opname" />
            <Breadcrumb items={[{ label: 'Stok' }, { label: 'Stock Opname' }]} />

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-300/30 sm:px-8">
                <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[28px] border-sky-400/10" />
                <div className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[.24em] text-sky-300">Inventory control room</p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Hitung fisik. Rekonsiliasi otomatis.</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Satu sesi untuk produk dan bahan baku. Transaksi yang tetap berjalan selama penghitungan akan diperhitungkan oleh sistem.</p>
                    </div>
                    {can('stock-opnames.create') && (
                        <button type="button" disabled={hasActiveSession} onClick={() => setCreateOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-sky-950/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                            <i className="fi fi-rr-add" /> Sesi baru
                        </button>
                    )}
                </div>
            </section>

            {hasActiveSession && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    <i className="fi fi-rr-info mt-0.5 text-amber-600" />
                    <p><b>Satu sesi masih aktif.</b> Selesaikan atau batalkan sesi tersebut sebelum membuat snapshot baru.</p>
                </div>
            )}

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="relative flex-1 sm:max-w-sm">
                        <i className="fi fi-rr-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor opname..." className="w-full rounded-xl border-slate-200 py-2.5 pl-10 text-sm" />
                    </div>
                    <Select value={status} onChange={setStatus} options={statusOptions} className="w-full sm:w-56" />
                </div>

                <div className="divide-y divide-slate-100">
                    {opnames.data.map((opname) => {
                        const progress = opname.items_count ? Math.round((opname.counted_items_count / opname.items_count) * 100) : 0;
                        return (
                            <Link key={opname.id} href={route('tenant.stock-opnames.show', opname.id)} className="group block p-4 transition hover:bg-slate-50/70 sm:p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sky-300 shadow-sm"><i className="fi fi-rr-list-check" /></span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-mono text-sm font-black text-slate-900">{opname.number}</p>
                                                <StatusBadge status={opname.status} />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">{date(opname.opname_date)} · dibuat {opname.creator?.name ?? 'Pengguna terhapus'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[32rem]">
                                        <div><p className="text-[10px] font-bold uppercase text-slate-400">Progres</p><p className="mt-1 text-sm font-black text-slate-800">{opname.counted_items_count}/{opname.items_count}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${progress}%` }} /></div></div>
                                        <div><p className="text-[10px] font-bold uppercase text-slate-400">Item selisih</p><p className="mt-1 text-sm font-black text-slate-800">{opname.variance_items_count}</p></div>
                                        <div className="col-span-2"><p className="text-[10px] font-bold uppercase text-slate-400">Nilai bersih</p><p className={`mt-1 text-sm font-black ${Number(opname.variance_value_total) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{money(opname.variance_value_total)}</p></div>
                                    </div>
                                    <i className="fi fi-rr-angle-small-right hidden text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-600 lg:block" />
                                </div>
                            </Link>
                        );
                    })}
                    {!opnames.data.length && <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><i className="fi fi-rr-list-check" /></span><p className="mt-4 font-bold text-slate-700">Belum ada sesi stock opname</p><p className="mt-1 text-sm text-slate-400">Buat sesi pertama untuk mengambil snapshot persediaan.</p></div>}
                </div>
                <div className="border-t border-slate-100 p-4"><Pagination links={opnames.links} /></div>
            </section>

            <Modal show={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md">
                <form onSubmit={create}>
                    <Modal.Header><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Snapshot persediaan</p><h2 className="mt-1 text-lg font-black text-slate-900">Buat sesi opname</h2></div></Modal.Header>
                    <Modal.Body><div className="space-y-4">
                        {form.errors.opname && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{form.errors.opname}</p>}
                        <label className="block text-sm font-semibold text-slate-700">Tanggal opname *<input type="date" max={today} value={form.data.opname_date} onChange={(event) => form.setData('opname_date', event.target.value)} className="mt-1.5 w-full rounded-xl border-slate-200" />{form.errors.opname_date && <span className="mt-1 block text-xs text-rose-600">{form.errors.opname_date}</span>}</label>
                        <label className="block text-sm font-semibold text-slate-700">Catatan<textarea rows="3" value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} placeholder="Contoh: Opname akhir bulan" className="mt-1.5 w-full rounded-xl border-slate-200 text-sm" />{form.errors.note && <span className="mt-1 block text-xs text-rose-600">{form.errors.note}</span>}</label>
                        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-800">Sistem langsung menyimpan snapshot seluruh produk tracked dan bahan baku aktif. Item baru setelah sesi dibuat akan masuk ke opname berikutnya.</div>
                    </div></Modal.Body>
                    <Modal.Footer><button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Batal</button><button disabled={form.processing} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{form.processing ? 'Membuat...' : 'Buat snapshot'}</button></Modal.Footer>
                </form>
            </Modal>
        </AdminLayout>
    );
}
