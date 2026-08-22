import Breadcrumb from '@/Components/Breadcrumb';
import RichTextContent from '@/Components/RichTextContent';
import RichTextEditor, { EMPTY_DOCUMENT } from '@/Components/RichTextEditor';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { longDate, priorityUi, shortDate, statusUi, typeLabels } from './ticketUi';

export default function Show({ ticket, options, canManage }) {
    const [editorKey, setEditorKey] = useState(0);
    const form = useForm({ status: ticket.status, note: EMPTY_DOCUMENT });
    const currentStatus = statusUi[ticket.status];
    const priority = priorityUi[ticket.priority];

    const submitUpdate = (event) => {
        event.preventDefault();
        form.post(route('admin.development-tickets.updates.store', ticket.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.setData({ status: form.data.status, note: EMPTY_DOCUMENT });
                setEditorKey((key) => key + 1);
            },
        });
    };

    const destroy = () => {
        if (window.confirm(`Hapus ${ticket.number}? Riwayat tiket juga akan dihapus.`)) router.delete(route('admin.development-tickets.destroy', ticket.id));
    };

    return (
        <AdminLayout header={ticket.number}>
            <Head title={`${ticket.number} · ${ticket.title}`} />
            <Breadcrumb items={[{ label: 'Development', href: route('admin.development-tickets.index') }, { label: 'Development Tickets', href: route('admin.development-tickets.index') }, { label: ticket.number }]} homeHref={route('admin.dashboard')} />
            <div className="mx-auto max-w-7xl">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3"><Link href={route('admin.development-tickets.index')} className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-indigo-600"><i className="fi fi-rr-arrow-small-left" /></Link><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black tracking-[0.12em] text-indigo-600">{ticket.number}</span><span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">{typeLabels[ticket.type]}</span></div><h1 className="mt-1 max-w-4xl text-2xl font-black tracking-[-0.025em] text-slate-900 sm:text-3xl">{ticket.title}</h1></div></div>
                    {canManage && <div className="flex gap-2 pl-13 sm:pl-0"><Link href={route('admin.development-tickets.edit', ticket.id)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"><i className="fi fi-rr-pencil mr-2" />Edit</Link><button onClick={destroy} className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50" aria-label="Hapus tiket"><i className="fi fi-rr-trash" /></button></div>}
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <main className="space-y-5">
                        <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">Requirement</p><h2 className="mt-0.5 font-black text-slate-900">Detail pekerjaan</h2></div><span className="text-[10px] text-slate-400">Dibuat {shortDate(ticket.created_at)}</span></div>
                            <RichTextContent content={ticket.description} className="px-6 py-6 sm:px-8 sm:py-7" />
                        </section>

                        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-indigo-500">Work log</p><h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Tambahkan update pengerjaan</h2><p className="mt-1 text-xs text-slate-400">Status dan catatan akan masuk ke timeline permanen.</p></div><select value={form.data.status} onChange={(e) => form.setData('status', e.target.value)} className="rounded-xl border-slate-200 text-sm font-bold">{options.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                            <form onSubmit={submitUpdate} className="mt-4"><RichTextEditor key={editorKey} value={form.data.note} onChange={(value) => form.setData('note', value)} error={form.errors.note} placeholder="Jelaskan apa yang dikerjakan, kendala, atau alasan revisi…" minHeight="180px" /><div className="mt-3 flex justify-end"><button disabled={form.processing} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50">{form.processing ? 'Mengirim...' : 'Kirim update'}</button></div></form>
                        </section>

                        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">Audit trail</p><h2 className="mt-1 text-xl font-black text-slate-900">Timeline tiket</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{ticket.updates.length} aktivitas</span></div>
                            <div className="relative mt-6 space-y-0 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-slate-200">
                                {ticket.updates.map((update, index) => {
                                    const to = statusUi[update.to_status];
                                    const from = update.from_status ? statusUi[update.from_status] : null;
                                    return <article key={update.id} className="relative flex gap-4 pb-7 last:pb-0"><span className={`relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-4 border-white text-xs text-white shadow-sm ${to.dot}`}><i className={`fi ${to.icon}`} /></span><div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-slate-800">{update.user?.name ?? 'Akun terhapus'}</span>{from ? <><span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${from.className}`}>{from.label}</span><i className="fi fi-rr-arrow-small-right text-slate-300" /><span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${to.className}`}>{to.label}</span></> : <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${to.className}`}>Tiket dibuat · {to.label}</span>}</div><time className="shrink-0 text-[10px] text-slate-400">{longDate(update.created_at)}</time></div>{update.note && <RichTextContent content={update.note} className="mt-3 border-t border-slate-200/70 pt-3" />}</div></article>;
                                })}
                            </div>
                        </section>
                    </main>

                    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                        <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40"><div className={`${currentStatus.className} p-5`}><p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">Status saat ini</p><div className="mt-2 flex items-center gap-3"><span className={`h-3 w-3 rounded-full ring-4 ring-white/60 ${currentStatus.dot}`} /><p className="text-lg font-black">{currentStatus.label}</p></div></div><dl className="divide-y divide-slate-100 px-5">
                            <Meta label="Prioritas"><span className={`font-bold ${priority.className}`}><i className="fi fi-rr-flag mr-1.5" />{priority.label}</span></Meta>
                            <Meta label="PIC developer">{ticket.assignee?.name ?? 'Belum ditentukan'}</Meta>
                            <Meta label="Target selesai">{shortDate(ticket.target_date)}</Meta>
                            <Meta label="Tenant">{ticket.tenant?.name ?? 'Produk umum'}</Meta>
                            <Meta label="Dibuat oleh">{ticket.creator?.name ?? 'Akun terhapus'}</Meta>
                            {ticket.completed_at && <Meta label="Selesai pada">{longDate(ticket.completed_at)}</Meta>}
                        </dl></section>
                        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5"><p className="text-xs font-black text-sky-900"><i className="fi fi-rr-info mr-2" />Catatan status</p><p className="mt-2 text-xs leading-5 text-sky-700">Jika hasil perlu diperbaiki, pilih <strong>Perlu Revisi</strong>. Setelah developer menindaklanjuti, status dapat kembali ke <strong>Diproses</strong>.</p></div>
                    </aside>
                </div>
            </div>
        </AdminLayout>
    );
}

function Meta({ label, children }) {
    return <div className="flex items-start justify-between gap-4 py-3.5 text-xs"><dt className="text-slate-400">{label}</dt><dd className="text-right font-semibold text-slate-700">{children}</dd></div>;
}
