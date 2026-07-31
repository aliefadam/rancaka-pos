import Breadcrumb from '@/Components/Breadcrumb';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import CategoryFormModal from '@/Pages/Tenant/Categories/CategoryFormModal';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusFilterOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
];

function StatusBadge({ active }) {
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

export default function Index({ categories, filters }) {
    const toast = useToast();

    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
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
                route('tenant.categories.index'),
                {
                    ...(search ? { search } : {}),
                    ...(status ? { status } : {}),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['categories', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status]);

    const openCreateModal = () => {
        setEditingCategory(null);
        setModalOpen(true);
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['categories'],
            onFinish: () => setRefreshing(false),
        });
    };

    const requestDelete = (category) => setDeleteTarget(category);

    const cancelDelete = () => {
        if (deleting) return;
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleting(true);
        router.delete(route('tenant.categories.destroy', deleteTarget.id), {
            preserveScroll: true,
            onError: () =>
                toast.error('Gagal menghapus kategori. Silakan coba lagi.'),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AdminLayout header="Kategori">
            <Head title="Kategori Produk" />

            <Breadcrumb items={[{ label: 'Master Data' }, { label: 'Kategori' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Kategori Produk
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Kelola pengelompokan produk toko Anda.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                    <button
                        type="button"
                        onClick={refresh}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <i
                            className={`fi fi-rr-refresh ${refreshing ? 'animate-spin' : ''}`}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <i className="fi fi-rr-add" />
                        Tambah Kategori
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
                            placeholder="Cari kategori..."
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
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-3.5 font-semibold">
                                    Icon
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Nama Kategori
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Status
                                </th>
                                <th className="px-6 py-3.5 text-right font-semibold">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.map((category) => (
                                <tr
                                    key={category.id}
                                    className="transition hover:bg-slate-50/60"
                                >
                                    <td className="px-6 py-4">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                            <i className={`fi ${category.icon}`} />
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {category.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge active={category.is_active} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditModal(category)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                            >
                                                <i className="fi fi-rr-pencil" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    requestDelete(category)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                            >
                                                <i className="fi fi-rr-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {categories.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-20 text-center"
                                    >
                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                            <i className="fi fi-rr-square text-xl" />
                                        </span>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            Belum ada kategori
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Tambahkan kategori pertama untuk
                                            mengelompokkan produk Anda.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            className="flex items-center gap-3 p-4"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <i className={`fi ${category.icon}`} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-slate-800">
                                    {category.name}
                                </p>
                                <div className="mt-1">
                                    <StatusBadge active={category.is_active} />
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => openEditModal(category)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <i className="fi fi-rr-pencil" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDelete(category)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                >
                                    <i className="fi fi-rr-trash" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {categories.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <i className="fi fi-rr-square text-xl" />
                            </span>
                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Belum ada kategori
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Tambahkan kategori pertama untuk
                                mengelompokkan produk Anda.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <CategoryFormModal
                show={modalOpen}
                onClose={closeModal}
                category={editingCategory}
            />

            <ConfirmDialog
                show={Boolean(deleteTarget)}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                processing={deleting}
                title="Hapus Kategori"
                message={
                    deleteTarget &&
                    `Yakin ingin menghapus kategori "${deleteTarget.name}"? Tindakan ini tidak dapat dibatalkan.`
                }
                confirmText="Ya, Hapus"
            />
        </AdminLayout>
    );
}
