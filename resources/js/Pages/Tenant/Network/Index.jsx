import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const date = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const statusLabel = { pending_parent_approval: 'Menunggu pusat', pending_admin_approval: 'Menunggu admin', approved_pending_billing: 'Disetujui', active: 'Aktif', exit_requested: 'Minta keluar', detached_pending: 'Akan dilepas', detached: 'Dilepas', rejected: 'Ditolak' };
const statusTone = { pending_parent_approval: 'bg-amber-50 text-amber-700 ring-amber-200', pending_admin_approval: 'bg-sky-50 text-sky-700 ring-sky-200', approved_pending_billing: 'bg-indigo-50 text-indigo-700 ring-indigo-200', active: 'bg-emerald-50 text-emerald-700 ring-emerald-200', exit_requested: 'bg-orange-50 text-orange-700 ring-orange-200', detached_pending: 'bg-slate-100 text-slate-600 ring-slate-200' };
const Badge = ({ status }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${statusTone[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{statusLabel[status] ?? status}</span>;

function BranchActions({ row, decide, mobile = false }) {
    return (
        <div className={`flex items-center gap-2 ${mobile ? 'w-full' : 'justify-end'}`}>
            {row.status === 'pending_parent_approval' && (
                <>
                    <button
                        type="button"
                        onClick={() => decide(row.id, 'reject')}
                        className={`${mobile ? 'flex-1' : ''} rounded-lg px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50`}
                    >
                        Tolak
                    </button>
                    <button
                        type="button"
                        onClick={() => decide(row.id, 'approve')}
                        className={`${mobile ? 'flex-1' : ''} rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white`}
                    >
                        Terima
                    </button>
                </>
            )}
            {row.status === 'exit_requested' && (
                <>
                    <button
                        type="button"
                        onClick={() => decide(row.id, 'reject', 'exit.decision')}
                        className={`${mobile ? 'flex-1' : ''} rounded-lg px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50`}
                    >
                        Pertahankan
                    </button>
                    <button
                        type="button"
                        onClick={() => decide(row.id, 'approve', 'exit.decision')}
                        className={`${mobile ? 'flex-1' : ''} rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-white`}
                    >
                        Jadwalkan lepas
                    </button>
                </>
            )}
            {['approved_pending_billing', 'active', 'exit_requested', 'detached_pending'].includes(row.status) && (
                <button
                    type="button"
                    onClick={() => router.post(route('tenant.network.impersonate', row.branch_tenant.id))}
                    className={`${mobile ? 'ml-auto px-3' : 'h-9 w-9'} flex items-center justify-center gap-2 rounded-lg bg-indigo-50 py-2 text-xs font-black text-indigo-600`}
                    title="Masuk ke cabang"
                >
                    <i className="fi fi-rr-sign-in-alt" />
                    {mobile && <span>Masuk</span>}
                </button>
            )}
        </div>
    );
}

export default function Index({ tenant, relationship, branches = [], summary, nextInvoice, branchPrice, notifications = [] }) {
    const [query, setQuery] = useState('');
    const codeForm = useForm({ branch_network_code: tenant.branch_network_code || '' });
    const joinForm = useForm({ network_code: '', reason: '' });
    const exitForm = useForm({ reason: '' });
    const visibleBranches = useMemo(() => branches.filter((row) => `${row.branch_tenant.name} ${row.branch_tenant.owner?.name || ''}`.toLowerCase().includes(query.toLowerCase())), [branches, query]);
    const decide = (id, decision, kind = 'decision') => router.patch(route(`tenant.network.${kind}`, id), { decision }, { preserveScroll: true });

    return <AdminLayout header="Jaringan Cabang"><Head title="Jaringan Cabang" />
        <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Jaringan Cabang' }]} />
        <div className="max-w-7xl space-y-5">
        <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-600">Network desk</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{tenant.tenant_type === 'central' ? 'Kendali jaringan usaha' : tenant.tenant_type === 'branch' ? 'Status cabang Anda' : 'Tumbuh sebagai jaringan'}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Setiap toko tetap terisolasi. Persetujuan, billing, dan masa aktif terhubung melalui satu jalur yang dapat diaudit.</p></div>{tenant.tenant_type === 'central' && <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-5 py-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Kode jaringan</p><p className="mt-1 font-mono text-xl font-black tracking-widest text-indigo-600">{tenant.branch_network_code}</p></div>}</div>
        </section>

        {tenant.tenant_type === 'standalone' && !relationship && <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-emerald-300"><i className="fi fi-rr-chart-network" /></span><h2 className="mt-5 text-xl font-black text-slate-950">Jadikan toko sebagai pusat</h2><p className="mt-2 text-sm leading-6 text-slate-500">Dapatkan kode unik untuk menerima pengajuan cabang. Paket pusat tetap mengikuti subscription saat ini.</p><form onSubmit={(e) => { e.preventDefault(); codeForm.post(route('tenant.network.enable')); }} className="mt-5"><label className="text-xs font-black uppercase tracking-wide text-slate-500">Kode pilihan <span className="font-medium normal-case text-slate-400">(opsional)</span></label><input value={codeForm.data.branch_network_code} onChange={(e) => codeForm.setData('branch_network_code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''))} placeholder="Otomatis jika kosong" className="mt-2 w-full rounded-xl border-slate-200 font-mono font-bold uppercase" />{codeForm.errors.branch_network_code && <p className="mt-1 text-xs text-rose-600">{codeForm.errors.branch_network_code}</p>}<button disabled={codeForm.processing} className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Aktifkan jaringan pusat</button></form></article>
            <article className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><i className="fi fi-rr-enter" /></span><h2 className="mt-5 text-xl font-black text-slate-950">Bergabung sebagai cabang</h2><p className="mt-2 text-sm leading-6 text-slate-500">Periode mandiri yang sudah dibayar tetap aman. Billing berpindah pada periode berikutnya tanpa double charge.</p><form onSubmit={(e) => { e.preventDefault(); joinForm.post(route('tenant.network.join')); }} className="mt-5 space-y-3"><input value={joinForm.data.network_code} onChange={(e) => joinForm.setData('network_code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''))} placeholder="KODE JARINGAN PUSAT" className="w-full rounded-xl border-slate-200 font-mono font-bold uppercase" /><textarea value={joinForm.data.reason} onChange={(e) => joinForm.setData('reason',e.target.value)} placeholder="Catatan untuk owner pusat (opsional)" className="w-full rounded-xl border-slate-200 text-sm" />{Object.values(joinForm.errors).map((error) => <p key={error} className="text-xs text-rose-600">{error}</p>)}<button disabled={joinForm.processing} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white">Kirim pengajuan</button></form></article>
        </section>}

        {tenant.tenant_type === 'central' && <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[
                ['Total cabang',summary.total,'fi-rr-building','text-slate-950'],['Perlu keputusan',summary.pending,'fi-rr-hourglass-end','text-amber-600'],['Aktif',summary.active,'fi-rr-check-circle','text-emerald-600'],['Omzet bulan ini',money(summary.month_revenue),'fi-rr-chart-histogram','text-indigo-600'],['Biaya berikutnya',money(summary.next_branch_cost),'fi-rr-receipt','text-slate-950'],
            ].map(([label,value,icon,tone]) => <article key={label} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">{label}</p><i className={`fi ${icon} ${tone}`} /></div><p className={`mt-3 text-xl font-black tracking-tight ${tone}`}>{value}</p></article>)}</section>
            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="font-black text-slate-950">Cabang dalam jaringan</h2>
                        <p className="mt-1 text-xs text-slate-500">Ringkasan saja; detail operasional dibuka melalui impersonate.</p>
                    </div>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari cabang..." className="w-full rounded-xl border-slate-200 text-sm sm:w-64" />
                </div>

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-5 py-3">Cabang</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Billing efektif</th>
                                <th className="px-5 py-3 text-right">Bulan ini</th>
                                <th className="px-5 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleBranches.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/70">
                                    <td className="px-5 py-4">
                                        <p className="font-black text-slate-800">{row.branch_tenant.name}</p>
                                        <p className="mt-1 text-xs text-slate-400">{row.branch_tenant.owner?.name || 'Owner belum tersedia'}</p>
                                    </td>
                                    <td className="px-5 py-4"><Badge status={row.status} /></td>
                                    <td className="px-5 py-4 text-slate-500">{date(row.billing_effective_at)}</td>
                                    <td className="px-5 py-4 text-right">
                                        <p className="font-black text-slate-800">{money(row.month_revenue)}</p>
                                        <p className="text-xs text-slate-400">{row.month_transactions} transaksi</p>
                                    </td>
                                    <td className="px-5 py-4"><BranchActions row={row} decide={decide} /></td>
                                </tr>
                            ))}
                            {visibleBranches.length === 0 && (
                                <tr><td colSpan="5" className="px-5 py-16 text-center text-sm text-slate-400">Belum ada cabang untuk ditampilkan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {visibleBranches.map((row) => (
                        <article key={row.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-black text-slate-800">{row.branch_tenant.name}</p>
                                    <p className="mt-1 truncate text-xs text-slate-400">{row.branch_tenant.owner?.name || 'Owner belum tersedia'}</p>
                                </div>
                                <Badge status={row.status} />
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50/70 p-3">
                                <div>
                                    <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">Billing efektif</dt>
                                    <dd className="mt-1 text-sm font-bold text-slate-700">{date(row.billing_effective_at)}</dd>
                                </div>
                                <div className="text-right">
                                    <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">Bulan ini</dt>
                                    <dd className="mt-1 text-sm font-black text-slate-800">{money(row.month_revenue)}</dd>
                                    <dd className="text-xs text-slate-400">{row.month_transactions} transaksi</dd>
                                </div>
                            </dl>
                            {[
                                'pending_parent_approval',
                                'approved_pending_billing',
                                'active',
                                'exit_requested',
                                'detached_pending',
                            ].includes(row.status) && (
                                <div className="mt-3 border-t border-slate-100 pt-3">
                                    <BranchActions row={row} decide={decide} mobile />
                                </div>
                            )}
                        </article>
                    ))}
                    {visibleBranches.length === 0 && (
                        <div className="px-5 py-14 text-center">
                            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400"><i className="fi fi-rr-building" /></span>
                            <p className="mt-3 text-sm text-slate-400">Belum ada cabang untuk ditampilkan.</p>
                        </div>
                    )}
                </div>
            </section>
            <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Kode jaringan</p><form onSubmit={(e) => { e.preventDefault(); codeForm.patch(route('tenant.network.code.update')); }} className="mt-3 flex gap-2"><input value={codeForm.data.branch_network_code} onChange={(e) => codeForm.setData('branch_network_code',e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''))} className="min-w-0 flex-1 rounded-xl border-slate-200 font-mono font-black uppercase" /><button className="rounded-xl bg-slate-950 px-4 text-xs font-black text-white">Simpan</button></form></article><article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Invoice berikutnya</p>{nextInvoice ? <><p className="mt-2 font-black text-slate-900">{nextInvoice.number}</p><p className="mt-1 text-sm text-slate-500">{money(nextInvoice.amount)} · jatuh tempo {date(nextInvoice.due_at)}</p></> : <p className="mt-2 text-sm text-slate-400">Belum ada invoice terbuka.</p>}</article></section>
        </>}

        {relationship && tenant.tenant_type !== 'central' && <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><article className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Terhubung ke</p><h2 className="mt-2 text-2xl font-black text-slate-950">{relationship.parent_tenant.name}</h2><p className="mt-1 text-sm text-slate-500">{relationship.parent_tenant.email}</p></div><Badge status={relationship.status} /></div><dl className="mt-7 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3"><div><dt className="text-[10px] font-black uppercase text-slate-400">Diajukan</dt><dd className="mt-1 text-sm font-bold text-slate-700">{date(relationship.requested_at)}</dd></div><div><dt className="text-[10px] font-black uppercase text-slate-400">Trial berakhir</dt><dd className="mt-1 text-sm font-bold text-slate-700">{date(relationship.trial_ends_at)}</dd></div><div><dt className="text-[10px] font-black uppercase text-slate-400">Billing jaringan</dt><dd className="mt-1 text-sm font-bold text-slate-700">{date(relationship.billing_effective_at)}</dd></div></dl>{['approved_pending_billing','active'].includes(relationship.status) && <form onSubmit={(e) => { e.preventDefault(); exitForm.post(route('tenant.network.exit.request',relationship.id)); }} className="mt-6 border-t border-slate-100 pt-5"><textarea value={exitForm.data.reason} onChange={(e) => exitForm.setData('reason',e.target.value)} placeholder="Alasan keluar dari jaringan" className="w-full rounded-xl border-slate-200 text-sm" /><button className="mt-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-black text-rose-600">Ajukan keluar jaringan</button></form>}</article><article className="rounded-2xl border border-slate-200/70 bg-slate-50 p-6 shadow-sm shadow-slate-200/40"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Alur persetujuan</p><div className="mt-5 space-y-4">{[['Pengajuan diterima sistem',true],['Persetujuan owner pusat',Boolean(relationship.parent_approved_at)],['Persetujuan superadmin',Boolean(relationship.admin_approved_at)],['Billing pusat berlaku',['active','exit_requested','detached_pending'].includes(relationship.status)]].map(([label,done]) => <div key={label} className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 ring-1 ring-slate-200'}`}><i className={`fi ${done ? 'fi-rr-check' : 'fi-rr-time-past'} text-[10px]`} /></span><p className={`text-sm font-bold ${done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</p></div>)}</div></article></section>}

        {notifications.length > 0 && <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><h2 className="font-black text-slate-950">Aktivitas jaringan</h2><div className="mt-3 divide-y divide-slate-100">{notifications.map((note) => <div key={note.id} className="py-3"><p className="text-sm font-bold text-slate-700">{note.data.title}</p><p className="mt-1 text-xs text-slate-500">{note.data.message}</p></div>)}</div></section>}
    </div></AdminLayout>;
}
