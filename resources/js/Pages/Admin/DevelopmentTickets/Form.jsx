import Breadcrumb from '@/Components/Breadcrumb';
import RichTextEditor, { EMPTY_DOCUMENT } from '@/Components/RichTextEditor';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ ticket, developers, tenants, options }) {
    const editing = Boolean(ticket);
    const form = useForm({
        title: ticket?.title ?? '',
        type: ticket?.type ?? 'feature',
        priority: ticket?.priority ?? 'normal',
        tenant_id: ticket?.tenant_id ?? '',
        assigned_to: ticket?.assigned_to ?? '',
        target_date: ticket?.target_date?.slice(0, 10) ?? '',
        description: ticket?.description ?? EMPTY_DOCUMENT,
    });

    const submit = (event) => {
        event.preventDefault();
        if (editing) form.put(route('admin.development-tickets.update', ticket.id));
        else form.post(route('admin.development-tickets.store'));
    };

    return (
        <AdminLayout header={editing ? `Edit ${ticket.number}` : 'Buat Development Ticket'}>
            <Head title={editing ? `Edit ${ticket.number}` : 'Buat Development Ticket'} />
            <Breadcrumb items={[{ label: 'Development', href: route('admin.development-tickets.index') }, { label: 'Development Tickets', href: route('admin.development-tickets.index') }, { label: editing ? `Edit ${ticket.number}` : 'Tiket baru' }]} homeHref={route('admin.dashboard')} />
            <form onSubmit={submit} className="max-w-6xl">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3"><Link href={editing ? route('admin.development-tickets.show', ticket.id) : route('admin.development-tickets.index')} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-indigo-600"><i className="fi fi-rr-arrow-small-left" /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">{editing ? ticket.number : 'Tiket baru'}</p><h1 className="text-2xl font-black tracking-tight text-slate-900">{editing ? 'Rapikan kebutuhan tiket' : 'Ubah kebutuhan menjadi pekerjaan jelas'}</h1></div></div>
                    <div className="flex gap-2"><Link href={editing ? route('admin.development-tickets.show', ticket.id) : route('admin.development-tickets.index')} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600">Batal</Link><button disabled={form.processing} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-600 disabled:opacity-50">{form.processing ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Terbitkan tiket'}</button></div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
                    <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-7">
                        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Judul pekerjaan</label>
                        <input autoFocus value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} placeholder="Contoh: Tambahkan laporan laba per produk" className="mt-2 w-full border-0 border-b border-slate-200 px-0 pb-4 text-xl font-black tracking-tight text-slate-900 placeholder:text-slate-300 focus:border-indigo-400 focus:ring-0" />
                        {form.errors.title && <p className="mt-1 text-xs text-rose-600">{form.errors.title}</p>}
                        <div className="mt-7 flex items-end justify-between gap-4"><div><label className="text-sm font-bold text-slate-800">Detail dan bukti pendukung</label><p className="mt-1 text-xs text-slate-400">Tuliskan konteks, hasil yang diharapkan, dan screenshot.</p></div><span className="hidden rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:block"><i className="fi fi-rr-shield-check mr-1" />Auto upload aktif</span></div>
                        <div className="mt-3"><RichTextEditor value={form.data.description} onChange={(value) => form.setData('description', value)} error={form.errors.description} placeholder="Jelaskan kebutuhan, kondisi saat ini, dan hasil yang diharapkan…" minHeight="390px" /></div>
                    </section>

                    <aside className="space-y-4">
                        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><i className="fi fi-rr-settings-sliders" /></span><h2 className="font-black text-slate-900">Klasifikasi</h2></div><div className="mt-5 space-y-4">
                            <Field label="Tipe" error={form.errors.type}><select value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm">{options.types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                            <Field label="Prioritas" error={form.errors.priority}><select value={form.data.priority} onChange={(e) => form.setData('priority', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm">{options.priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                            <Field label="PIC developer" error={form.errors.assigned_to}><select value={form.data.assigned_to} onChange={(e) => form.setData('assigned_to', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm"><option value="">Belum ditentukan</option>{developers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                            <Field label="Tenant terkait" error={form.errors.tenant_id}><select value={form.data.tenant_id} onChange={(e) => form.setData('tenant_id', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm"><option value="">Produk umum</option>{tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                            <Field label="Target selesai" error={form.errors.target_date}><input type="date" value={form.data.target_date} onChange={(e) => form.setData('target_date', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" /></Field>
                        </div></section>
                        <div className="rounded-2xl bg-slate-950 p-5 text-slate-300"><p className="text-xs font-bold text-white"><i className="fi fi-rr-bulb mr-2 text-amber-300" />Tiket yang enak dikerjakan</p><p className="mt-2 text-xs leading-5">Sertakan masalah, ekspektasi hasil, contoh data, dan kondisi kapan tiket dianggap selesai.</p></div>
                    </aside>
                </div>
            </form>
        </AdminLayout>
    );
}

function Field({ label, error, children }) {
    return <div><label className="mb-1.5 block text-xs font-bold text-slate-600">{label}</label>{children}{error && <p className="mt-1 text-xs text-rose-600">{error}</p>}</div>;
}
