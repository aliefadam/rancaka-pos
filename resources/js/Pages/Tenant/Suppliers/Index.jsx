import Breadcrumb from '@/Components/Breadcrumb';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Hooks/usePermission';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const money = (value) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value || 0);

const empty = {
    name: '',
    phone: '',
    email: '',
    address: '',
    contact_name: '',
    note: '',
    is_active: true,
};

export default function Index({ suppliers, filters }) {
    const can = usePermission();
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const form = useForm(empty);

    const showForm = (supplier = null) => {
        setEditing(supplier);
        form.setData(supplier ? { ...empty, ...supplier } : empty);
        form.clearErrors();
        setOpen(true);
    };

    const closeForm = () => {
        setOpen(false);
        form.clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        };

        editing
            ? form.put(route('tenant.suppliers.update', editing.id), options)
            : form.post(route('tenant.suppliers.store'), options);
    };

    return (
        <AdminLayout header="Supplier">
            <Head title="Supplier" />
            <Breadcrumb items={[{ label: 'Master Data' }, { label: 'Supplier' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-600">
                        Mitra pasokan
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Supplier</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Kontak dan posisi hutang dalam satu tempat.
                    </p>
                </div>
                {can('suppliers.create') && (
                    <button
                        type="button"
                        onClick={() => showForm()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
                    >
                        <i className="fi fi-rr-add" />
                        Supplier baru
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="border-b border-slate-100 p-4">
                    <div className="relative w-full sm:max-w-sm">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <i className="fi fi-rr-search" />
                        </span>
                        <input
                            defaultValue={filters.search}
                            onChange={(event) =>
                                router.get(
                                    route('tenant.suppliers.index'),
                                    event.target.value
                                        ? { search: event.target.value }
                                        : {},
                                    { preserveState: true, replace: true },
                                )
                            }
                            placeholder="Cari supplier..."
                            className="w-full rounded-xl border-slate-200 py-2.5 pl-10 text-sm"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {suppliers.data.map((supplier) => (
                        <article
                            key={supplier.id}
                            className="p-4 transition hover:bg-slate-50/70 sm:flex sm:items-center sm:gap-5"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <Link href={route('tenant.suppliers.show', supplier.id)} className="truncate font-semibold text-slate-900 transition hover:text-indigo-700">
                                        {supplier.name}
                                    </Link>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:hidden ${supplier.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {supplier.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className="mt-1 break-words text-xs text-slate-500">
                                    {supplier.contact_name || 'Tanpa PIC'} · {supplier.phone || 'Tanpa nomor'}
                                </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50/70 px-3 py-2.5 sm:mt-0 sm:block sm:min-w-44 sm:bg-transparent sm:p-0 sm:text-right">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:hidden">
                                    Total hutang
                                </span>
                                <p className="break-all text-sm font-bold text-slate-900 sm:break-normal">
                                    {money(supplier.payable_total)}
                                </p>
                                <p className={`mt-1 hidden text-xs sm:block ${supplier.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {supplier.is_active ? 'Aktif' : 'Nonaktif'}
                                </p>
                            </div>
                            <div className="mt-3 flex gap-2 sm:mt-0">
                                <Link href={route('tenant.suppliers.show', supplier.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:flex-none">
                                    <i className="fi fi-rr-eye" /> Detail
                                </Link>
                                {can('suppliers.edit') && <button type="button" onClick={() => showForm(supplier)} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/70" aria-label={`Ubah ${supplier.name}`}><i className="fi fi-rr-pencil" /></button>}
                            </div>
                        </article>
                    ))}
                </div>

                {!suppliers.data.length && (
                    <div className="p-10 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                            <i className="fi fi-rr-truck-side" />
                        </span>
                        <p className="mt-3 text-sm text-slate-500">Belum ada supplier.</p>
                    </div>
                )}
                <div className="border-t border-slate-100 p-4">
                    <Pagination links={suppliers.links} />
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <form
                            onSubmit={submit}
                            className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        >
                            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                                <h3 className="text-lg font-bold text-slate-900">
                                    {editing ? 'Ubah supplier' : 'Supplier baru'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    aria-label="Tutup modal"
                                >
                                    <i className="fi fi-rr-cross-small" />
                                </button>
                            </div>

                            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {[
                                        ['name', 'Nama supplier *'],
                                        ['contact_name', 'Nama kontak'],
                                        ['phone', 'Telepon / WhatsApp'],
                                        ['email', 'Email'],
                                    ].map(([key, label]) => (
                                        <label key={key} className="text-sm text-slate-600">
                                            {label}
                                            <input
                                                value={form.data[key] || ''}
                                                onChange={(event) => form.setData(key, event.target.value)}
                                                className="mt-1 w-full rounded-xl border-slate-200"
                                            />
                                            {form.errors[key] && (
                                                <small className="mt-1 block text-rose-600">
                                                    {form.errors[key]}
                                                </small>
                                            )}
                                        </label>
                                    ))}
                                    <label className="text-sm text-slate-600 sm:col-span-2">
                                        Alamat
                                        <textarea
                                            value={form.data.address || ''}
                                            onChange={(event) => form.setData('address', event.target.value)}
                                            className="mt-1 w-full rounded-xl border-slate-200"
                                            rows="3"
                                        />
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                                        <input
                                            type="checkbox"
                                            checked={form.data.is_active}
                                            onChange={(event) => form.setData('is_active', event.target.checked)}
                                        />
                                        Supplier aktif
                                    </label>
                                </div>
                            </div>

                            <div className="flex shrink-0 gap-2 border-t border-slate-100 p-4 sm:justify-end sm:px-6">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 sm:flex-none"
                                >
                                    Batal
                                </button>
                                <button
                                    disabled={form.processing}
                                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                                >
                                    {form.processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
