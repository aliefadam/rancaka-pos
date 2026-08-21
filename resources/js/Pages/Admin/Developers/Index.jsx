import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const emptyDeveloper = { name: '', username: '', email: '', password: '' };

export default function Index({ developers }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const form = useForm(emptyDeveloper);

    const showForm = (developer = null) => {
        setEditing(developer);
        form.setData(developer ? { name: developer.name, username: developer.username, email: developer.email ?? '', password: '' } : emptyDeveloper);
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => { setOpen(false); form.reset(); } };
        if (editing) form.put(route('admin.developers.update', editing.id), options);
        else form.post(route('admin.developers.store'), options);
    };

    const remove = (developer) => {
        if (window.confirm(`Hapus akses developer ${developer.name}?`)) router.delete(route('admin.developers.destroy', developer.id), { preserveScroll: true });
    };

    return <AdminLayout header="Tim Developer">
        <Head title="Tim Developer" />
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-sky-100/60" /><div className="absolute right-24 top-4 h-20 w-20 rounded-3xl border-[12px] border-amber-200/60" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500">Restricted workspace</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Akses tim development.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Akun di sini hanya dapat membuka Development Tickets, mengubah status, dan menambahkan work log.</p></div><button onClick={() => showForm()} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-600"><i className="fi fi-rr-user-add mr-2" />Tambah developer</button></div></section>
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{developers.map((developer) => <article key={developer.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">{developer.name.slice(0, 1).toUpperCase()}</span><div className="flex gap-1"><button onClick={() => showForm(developer)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label="Edit developer"><i className="fi fi-rr-pencil" /></button><button onClick={() => remove(developer)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus developer"><i className="fi fi-rr-trash" /></button></div></div><h2 className="mt-4 font-black text-slate-900">{developer.name}</h2><p className="mt-1 text-xs text-slate-400">@{developer.username}{developer.email ? ` · ${developer.email}` : ''}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiket ditangani</span><span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">{developer.assigned_development_tickets_count}</span></div></article>)}{developers.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center"><i className="fi fi-rr-users-alt text-2xl text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Belum ada akun developer</p></div>}</section>

        <Modal show={open} onClose={() => setOpen(false)} maxWidth="md"><form onSubmit={submit}><Modal.Header><div><p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Akses terbatas</p><h2 className="mt-1 text-xl font-black text-slate-900">{editing ? 'Edit developer' : 'Developer baru'}</h2></div></Modal.Header><Modal.Body><div className="space-y-4"><Field label="Nama" error={form.errors.name}><input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" autoFocus /></Field><Field label="Username" error={form.errors.username}><input value={form.data.username} onChange={(e) => form.setData('username', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" /></Field><Field label="Email (opsional)" error={form.errors.email}><input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" /></Field><Field label={editing ? 'Password baru (kosongkan jika tetap)' : 'Password'} error={form.errors.password}><input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" /></Field></div></Modal.Body><Modal.Footer><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Batal</button><button disabled={form.processing} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{form.processing ? 'Menyimpan...' : 'Simpan akun'}</button></Modal.Footer></form></Modal>
    </AdminLayout>;
}

function Field({ label, error, children }) { return <div><label className="mb-1.5 block text-xs font-bold text-slate-600">{label}</label>{children}{error && <p className="mt-1 text-xs text-rose-600">{error}</p>}</div>; }
