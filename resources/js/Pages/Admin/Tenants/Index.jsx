import ConfirmDialog from '@/Components/ConfirmDialog';
import Pagination from '@/Components/Pagination';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import TenantFormModal from '@/Pages/Admin/Tenants/TenantFormModal';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const formatDate = (value) =>
    new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

const statusFilterOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
];

function StatusBadge({ status }) {
    const active = status === 'active';

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
            }`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            {active ? 'Aktif' : 'Nonaktif'}
        </span>
    );
}

export default function Index({ tenants, filters }) {
    const toast = useToast();

    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                route('admin.tenants.index'),
                {
                    ...(search ? { search } : {}),
                    ...(status ? { status } : {}),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['tenants', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status]);

    const openCreateModal = () => {
        setEditingTenant(null);
        setModalOpen(true);
    };

    const openEditModal = (tenant) => {
        setEditingTenant(tenant);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['tenants'],
            onFinish: () => setRefreshing(false),
        });
    };

    const requestDelete = (tenant) => setDeleteTarget(tenant);

    const cancelDelete = () => {
        if (deleting) return;
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleting(true);
        router.delete(route('admin.tenants.destroy', deleteTarget.id), {
            preserveScroll: true,
            onError: () => toast.error('Gagal menghapus tenant. Silakan coba lagi.'),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AdminLayout header="Tenant">
            <Head title="Tenant" />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Manajemen Tenant
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Kelola semua tenant yang terdaftar pada platform SaaS
                        Anda.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                    <button
                        type="button"
                        onClick={refresh}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <i
                            className={`fi fi-sr-refresh ${refreshing ? 'animate-spin' : ''}`}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <i className="fi fi-sr-add" />
                        Tambah Tenant
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
                    <div className="relative w-full sm:max-w-xs">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <i className="fi fi-rr-search" />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama, email, atau telepon..."
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <Select
                        value={status}
                        onChange={setStatus}
                        options={statusFilterOptions}
                        placeholder="Semua Status"
                        className="w-full sm:w-48"
                    />
                </div>

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-3.5 font-semibold">
                                    Tenant
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Kontak
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Alamat
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Status
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Bergabung
                                </th>
                                <th className="px-6 py-3.5 text-right font-semibold">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tenants.data.map((tenant) => (
                                <tr
                                    key={tenant.id}
                                    className="transition hover:bg-slate-50/60"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                                                {tenant.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </span>
                                            <span className="font-medium text-slate-800">
                                                {tenant.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div>{tenant.email}</div>
                                        {tenant.phone && (
                                            <div className="mt-0.5 text-xs text-slate-400">
                                                {tenant.phone}
                                            </div>
                                        )}
                                    </td>
                                    <td className="max-w-[220px] truncate px-6 py-4 text-slate-500">
                                        {tenant.address || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={tenant.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                                        {formatDate(tenant.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditModal(tenant)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                            >
                                                <i className="fi fi-sr-pencil" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    requestDelete(tenant)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                            >
                                                <i className="fi fi-sr-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {tenants.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-20 text-center"
                                    >
                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                            <i className="fi fi-sr-building text-xl" />
                                        </span>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            Tidak ada tenant ditemukan
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Coba kata kunci lain atau tambah
                                            tenant baru.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {tenants.data.map((tenant) => (
                        <div key={tenant.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                                        {tenant.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-800">
                                            {tenant.name}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {tenant.email}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge status={tenant.status} />
                            </div>

                            <dl className="mt-3 space-y-1.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Telepon
                                    </dt>
                                    <dd className="truncate text-right text-slate-600">
                                        {tenant.phone || '-'}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Alamat</dt>
                                    <dd className="max-w-[65%] truncate text-right text-slate-600">
                                        {tenant.address || '-'}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">
                                        Bergabung
                                    </dt>
                                    <dd className="text-right text-slate-600">
                                        {formatDate(tenant.created_at)}
                                    </dd>
                                </div>
                            </dl>

                            <div className="mt-3 flex items-center justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => openEditModal(tenant)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <i className="fi fi-sr-pencil" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDelete(tenant)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                >
                                    <i className="fi fi-sr-trash" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {tenants.data.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <i className="fi fi-sr-building text-xl" />
                            </span>
                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Tidak ada tenant ditemukan
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Coba kata kunci lain atau tambah tenant baru.
                            </p>
                        </div>
                    )}
                </div>

                {tenants.data.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
                        <p className="text-sm text-slate-500">
                            Menampilkan {tenants.from}-{tenants.to} dari{' '}
                            {tenants.total} tenant
                        </p>
                        <Pagination links={tenants.links} />
                    </div>
                )}
            </div>

            <TenantFormModal
                show={modalOpen}
                onClose={closeModal}
                tenant={editingTenant}
            />

            <ConfirmDialog
                show={Boolean(deleteTarget)}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                processing={deleting}
                title="Hapus Tenant"
                message={
                    deleteTarget &&
                    `Yakin ingin menghapus tenant "${deleteTarget.name}"? Tindakan ini tidak dapat dibatalkan.`
                }
                confirmText="Ya, Hapus"
            />
        </AdminLayout>
    );
}
