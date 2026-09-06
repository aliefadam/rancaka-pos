import Breadcrumb from '@/Components/Breadcrumb';
import Select from '@/Components/Select';
import AdminLayout from '@/Layouts/AdminLayout';
import SalesFormModal from '@/Pages/Admin/Sales/SalesFormModal';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value ?? 0));
const commissionLabel = (item) => (item.commission_type ?? 'percentage') === 'fixed'
    ? money(item.commission_value)
    : `${Number(item.commission_rate)}%`;

export default function Index({ sales, filters, metrics }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSales, setEditingSales] = useState(null);

    const applyFilters = (values) => router.get(route('admin.sales.index'), {
        ...(values.search ? { search: values.search } : {}),
        ...(values.sales_status ? { sales_status: values.sales_status } : {}),
    }, { preserveState: true, replace: true });

    return (
        <AdminLayout header="Sales">
            <Head title="Sales" />
            <Breadcrumb items={[{ label: 'SaaS' }, { label: 'Sales' }]} homeHref={route('admin.dashboard')} />
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-300/30 sm:px-8">
                <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[38px] border-indigo-500/20" />
                <div className="absolute bottom-0 right-36 h-px w-48 bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">Partner referral</p><h1 className="mt-2 text-3xl font-black tracking-tight">Profil sales dan kode referral.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Kelola akun sales, skema komisi, dan kode referral yang mereka bagikan ke calon tenant.</p></div>
                    <button onClick={() => { setEditingSales(null); setModalOpen(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"><i className="fi fi-rr-plus" /> Tambah sales</button>
                </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[['Referral tenant', metrics.referrals, 'fi-rr-users-alt', 'text-indigo-600 bg-indigo-50']].map(([label, value, icon, tone]) => <article key={label} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><i className={`fi ${icon}`} /></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xl font-black tracking-tight text-slate-900">{value}</p></article>)}
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="border-b border-slate-100 p-5">
                    <div><h2 className="font-bold text-slate-900">Profil sales</h2><p className="mt-1 text-xs text-slate-500">Kode unik dan nilai komisi saat pembayaran pertama.</p></div>
                    <form
                        onSubmit={(e) => { e.preventDefault(); applyFilters({ ...filters, search: e.currentTarget.search.value, sales_status: e.currentTarget.sales_status.value }); }}
                        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                    >
                        <div className="flex-1">
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Cari sales</label>
                            <div className="relative"><i className="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" /><input name="search" defaultValue={filters.search} placeholder="Cari sales atau kode" className="w-full rounded-xl border-slate-200 py-2 pl-9 pr-3 text-sm" /></div>
                        </div>
                        <div className="sm:w-48">
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Status</label>
                            <Select name="sales_status" defaultValue={filters.sales_status} options={[{ value: '', label: 'Semua status' }, { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]} searchPlaceholder="Cari status..." />
                        </div>
                        <button className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Cari</button>
                    </form>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {sales.map((item) => <button key={item.id} onClick={() => { setEditingSales(item); setModalOpen(true); }} className="group rounded-2xl border border-slate-200 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30"><div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-black text-white">{item.name.slice(0, 1).toUpperCase()}</div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></div><h3 className="mt-3 font-bold text-slate-900">{item.name}</h3><p className="mt-0.5 text-xs text-slate-400">@{item.user?.username ?? 'belum ada akun'}</p><p className="mt-2 font-mono text-xs font-bold tracking-wider text-indigo-600">{item.referral_code}</p><div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs"><div><p className="text-slate-400">Komisi</p><p className="mt-1 truncate font-bold text-slate-700">{commissionLabel(item)}</p></div><div><p className="text-slate-400">Referral</p><p className="mt-1 font-bold text-slate-700">{item.tenants_count}</p></div><div><p className="text-slate-400">Terutang</p><p className="mt-1 truncate font-bold text-rose-600">{money(item.accrued_commission)}</p></div></div></button>)}
                    {sales.length === 0 && <p className="col-span-full py-10 text-center text-sm text-slate-400">Belum ada profil sales.</p>}
                </div>
            </section>

            <SalesFormModal show={modalOpen} onClose={() => setModalOpen(false)} sales={editingSales} />
        </AdminLayout>
    );
}
