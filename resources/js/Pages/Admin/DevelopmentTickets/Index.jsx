import Pagination from '@/Components/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { priorityUi, shortDate, statusUi, typeLabels } from './ticketUi';

const MetricCard = ({ status, value }) => {
    const ui = statusUi[status];
    return (
        <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`absolute inset-y-0 left-0 w-1 ${ui.dot}`} />
            <div className="flex items-center justify-between gap-4 pl-1">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{ui.label}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p></div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ui.className}`}><i className={`fi ${ui.icon}`} /></span>
            </div>
        </article>
    );
};

export default function Index({ tickets, filters, metrics, developers, options, canManage }) {
    const applyFilters = (values) => router.get(route('admin.development-tickets.index'), values, { preserveState: true, replace: true });

    return (
        <AdminLayout header="Development Tickets">
            <Head title="Development Tickets" />

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-300/25 sm:px-8">
                <div className="absolute -right-16 -top-20 h-56 w-56 rotate-12 rounded-[3rem] border-[28px] border-sky-400/10" />
                <div className="absolute bottom-0 left-1/3 h-px w-64 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">Product work desk</p>
                        <h1 className="mt-2 max-w-2xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">Catatan produk yang benar-benar bergerak.</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Kebutuhan, screenshot, PIC, dan jejak revisi tersimpan dalam satu alur kerja yang bisa diaudit.</p>
                    </div>
                    {canManage && <Link href={route('admin.development-tickets.create')} className="flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-200"><i className="fi fi-rr-plus" /> Buat tiket</Link>}
                </div>
            </section>

            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.keys(statusUi).map((status) => <MetricCard key={status} status={status} value={metrics[status] ?? 0} />)}
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <form onSubmit={(event) => { event.preventDefault(); applyFilters(Object.fromEntries(new FormData(event.currentTarget))); }} className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(135px,auto))_auto]">
                    <div className="relative"><i className="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" /><input name="search" defaultValue={filters.search} placeholder="Cari nomor atau judul tiket" className="w-full rounded-xl border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></div>
                    <select name="status" defaultValue={filters.status} className="rounded-xl border-slate-200 py-2.5 text-xs"><option value="">Semua status</option>{options.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                    <select name="type" defaultValue={filters.type} className="rounded-xl border-slate-200 py-2.5 text-xs"><option value="">Semua tipe</option>{options.types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                    <select name="priority" defaultValue={filters.priority} className="rounded-xl border-slate-200 py-2.5 text-xs"><option value="">Semua prioritas</option>{options.priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                    <select name="assigned_to" defaultValue={filters.assigned_to} className="rounded-xl border-slate-200 py-2.5 text-xs"><option value="">Semua PIC</option>{developers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                    <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-600">Terapkan</button>
                </form>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead><tr className="text-left text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400"><th className="px-5 py-3.5">Tiket</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Prioritas</th><th className="px-4 py-3.5">PIC</th><th className="px-4 py-3.5">Target</th><th className="w-14 px-4 py-3.5" /></tr></thead>
                        <tbody>
                            {tickets.data.map((ticket) => {
                                const status = statusUi[ticket.status];
                                const priority = priorityUi[ticket.priority];
                                return <tr key={ticket.id} className="group border-t border-slate-100 transition hover:bg-slate-50/60">
                                    <td className="px-5 py-4"><Link href={route('admin.development-tickets.show', ticket.id)} className="block"><div className="flex items-center gap-2"><span className="font-mono text-[11px] font-bold tracking-wider text-indigo-600">{ticket.number}</span><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">{typeLabels[ticket.type]}</span></div><p className="mt-1 max-w-xl font-bold text-slate-800 transition group-hover:text-indigo-700">{ticket.title}</p>{ticket.tenant && <p className="mt-1 text-[11px] text-slate-400"><i className="fi fi-rr-building mr-1" />{ticket.tenant.name}</p>}</Link></td>
                                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${status.className}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span></td>
                                    <td className={`px-4 py-4 text-xs font-bold ${priority.className}`}><i className="fi fi-rr-flag mr-1.5" />{priority.label}</td>
                                    <td className="px-4 py-4 text-xs text-slate-600">{ticket.assignee ? <span className="inline-flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-white">{ticket.assignee.name.slice(0, 1).toUpperCase()}</span>{ticket.assignee.name}</span> : <span className="text-slate-400">Belum ditentukan</span>}</td>
                                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{shortDate(ticket.target_date)}</td>
                                    <td className="px-4 py-4"><Link href={route('admin.development-tickets.show', ticket.id)} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600" aria-label={`Buka ${ticket.number}`}><i className="fi fi-rr-arrow-small-right" /></Link></td>
                                </tr>;
                            })}
                            {tickets.data.length === 0 && <tr><td colSpan="6" className="px-5 py-16 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400"><i className="fi fi-rr-ticket" /></span><p className="mt-3 text-sm font-semibold text-slate-600">Tiket tidak ditemukan</p><p className="mt-1 text-xs text-slate-400">Ubah filter atau buat tiket development baru.</p></td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100 p-4"><Pagination links={tickets.links} /></div>
            </section>
        </AdminLayout>
    );
}
