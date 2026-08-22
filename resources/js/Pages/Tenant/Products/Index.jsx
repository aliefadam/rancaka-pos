import Breadcrumb from '@/Components/Breadcrumb';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import usePermission from '@/Hooks/usePermission';
import ProductFormModal from '@/Pages/Tenant/Products/ProductFormModal';
import ProductImportModal from '@/Pages/Tenant/Products/ProductImportModal';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function initials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function formatRupiah(value) {
    return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

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

function StockBadge({ trackStock, stock }) {
    if (!trackStock) {
        return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                Tanpa stok
            </span>
        );
    }

    const isEmpty = Number(stock) <= 0;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                isEmpty
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
            }`}
        >
            {stock} pcs
        </span>
    );
}

export default function Index({ products, categories, rawMaterials, filters }) {
    const toast = useToast();
    const can = usePermission();
    const { flash } = usePage().props;

    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryId, setCategoryId] = useState(filters.category_id ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (flash?.import_errors?.length) setImportModalOpen(true);
    }, [flash?.import_errors]);

    const categoryFilterOptions = [
        { value: '', label: 'Semua Kategori' },
        ...categories.map((category) => ({
            value: String(category.id),
            label: category.name,
        })),
    ];

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                route('tenant.products.index'),
                {
                    ...(search ? { search } : {}),
                    ...(categoryId ? { category_id: categoryId } : {}),
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['products', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, categoryId]);

    const openCreateModal = () => {
        setEditingProduct(null);
        setModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['products'],
            onFinish: () => setRefreshing(false),
        });
    };

    const requestDelete = (product) => setDeleteTarget(product);

    const cancelDelete = () => {
        if (deleting) return;
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleting(true);
        router.delete(route('tenant.products.destroy', deleteTarget.id), {
            preserveScroll: true,
            onError: () =>
                toast.error('Gagal menghapus produk. Silakan coba lagi.'),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AdminLayout header="Produk">
            <Head title="Produk" />

            <Breadcrumb items={[{ label: 'Master Data' }, { label: 'Produk' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Produk
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Kelola daftar produk yang dijual.
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
                    {can('products.create') && (
                        <button
                            type="button"
                            onClick={() => setImportModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                            <i className="fi fi-rr-file-upload" />
                            <span className="hidden sm:inline">Import</span>
                        </button>
                    )}
                    {can('products.create') && (
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <i className="fi fi-rr-add" />
                            Tambah Produk
                        </button>
                    )}
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
                            placeholder="Cari produk..."
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <Select
                        value={categoryId}
                        onChange={setCategoryId}
                        options={categoryFilterOptions}
                        placeholder="Semua Kategori"
                        className="w-full sm:w-48"
                    />
                </div>

                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[820px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-3.5 font-semibold">
                                    Produk
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Kategori
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Harga
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Stok
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
                            {products.map((product) => (
                                <tr
                                    key={product.id}
                                    className="transition hover:bg-slate-50/60"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">
                                                {initials(product.name)}
                                            </span>
                                            <span className="font-medium text-slate-800">
                                                {product.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {product.category?.name ?? '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        <p className="font-semibold">{formatRupiah(product.price)}</p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            {product.price_options?.filter((option) => option.is_active).length ?? 1} pilihan aktif
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StockBadge
                                            trackStock={product.track_stock}
                                            stock={product.stock}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge active={product.is_active} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {can('products.edit') && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditModal(product)
                                                    }
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                                >
                                                    <i className="fi fi-rr-pencil" />
                                                </button>
                                            )}
                                            {can('products.delete') && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        requestDelete(product)
                                                    }
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                >
                                                    <i className="fi fi-rr-trash" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {products.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-20 text-center"
                                    >
                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                            <i className="fi fi-rr-shopping-bag text-xl" />
                                        </span>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            Belum ada produk
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Coba kata kunci lain atau tambah
                                            produk baru.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {products.map((product) => (
                        <div key={product.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">
                                        {initials(product.name)}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-800">
                                            {product.name}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {product.category?.name ?? '-'}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge active={product.is_active} />
                            </div>

                            <dl className="mt-3 space-y-1.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Harga</dt>
                                    <dd className="text-right text-slate-600">
                                        <span className="block">{formatRupiah(product.price)}</span>
                                        <span className="text-xs text-slate-400">
                                            {product.price_options?.filter((option) => option.is_active).length ?? 1} pilihan aktif
                                        </span>
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-400">Stok</dt>
                                    <dd className="text-right">
                                        <StockBadge
                                            trackStock={product.track_stock}
                                            stock={product.stock}
                                        />
                                    </dd>
                                </div>
                            </dl>

                            <div className="mt-3 flex items-center justify-end gap-1.5">
                                {can('products.edit') && (
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(product)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                    >
                                        <i className="fi fi-rr-pencil" />
                                    </button>
                                )}
                                {can('products.delete') && (
                                    <button
                                        type="button"
                                        onClick={() => requestDelete(product)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <i className="fi fi-rr-trash" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {products.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <i className="fi fi-rr-shopping-bag text-xl" />
                            </span>
                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Belum ada produk
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Coba kata kunci lain atau tambah produk baru.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ProductFormModal
                show={modalOpen}
                onClose={closeModal}
                product={editingProduct}
                categories={categories}
                rawMaterials={rawMaterials}
            />

            <ProductImportModal
                show={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                importErrors={flash?.import_errors ?? []}
            />

            <ConfirmDialog
                show={Boolean(deleteTarget)}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                processing={deleting}
                title="Hapus Produk"
                message={
                    deleteTarget &&
                    `Yakin ingin menghapus produk "${deleteTarget.name}"? Tindakan ini tidak dapat dibatalkan.`
                }
                confirmText="Ya, Hapus"
            />
        </AdminLayout>
    );
}
