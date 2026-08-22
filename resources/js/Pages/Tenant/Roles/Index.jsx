import Breadcrumb from '@/Components/Breadcrumb';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import RoleFormModal from '@/Pages/Tenant/Roles/RoleFormModal';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ roles, menus }) {
    const toast = useToast();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const openCreateModal = () => {
        setEditingRole(null);
        setModalOpen(true);
    };

    const openEditModal = (role) => {
        setEditingRole(role);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const requestDelete = (role) => setDeleteTarget(role);

    const cancelDelete = () => {
        if (deleting) return;
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleting(true);
        router.delete(route('tenant.roles.destroy', deleteTarget.id), {
            preserveScroll: true,
            onError: () =>
                toast.error(
                    'Gagal menghapus role. Pastikan tidak ada karyawan yang masih memakainya.',
                ),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const permissionCount = (role) => role.permissions?.length ?? 0;

    return (
        <AdminLayout header="Role & Hak Akses">
            <Head title="Role & Hak Akses" />
            <Breadcrumb items={[{ label: 'Tim' }, { label: 'Karyawan', href: route('tenant.employees.index') }, { label: 'Role & Hak Akses' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                        Role &amp; Hak Akses
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Atur menu dan aksi apa saja yang boleh diakses tiap
                        role karyawan.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <i className="fi fi-rr-add" />
                        Tambah Role
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
                <div className="scrollbar-thin hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[600px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-3.5 font-semibold">
                                    Nama Role
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Hak Akses
                                </th>
                                <th className="px-6 py-3.5 font-semibold">
                                    Karyawan
                                </th>
                                <th className="px-6 py-3.5 text-right font-semibold">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roles.map((role) => (
                                <tr
                                    key={role.id}
                                    className="transition hover:bg-slate-50/60"
                                >
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {role.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {permissionCount(role)} izin aktif
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {role.employees_count} karyawan
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditModal(role)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                            >
                                                <i className="fi fi-rr-pencil" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    requestDelete(role)
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                            >
                                                <i className="fi fi-rr-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {roles.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-20 text-center"
                                    >
                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                            <i className="fi fi-rr-shield-check text-xl" />
                                        </span>
                                        <p className="mt-4 text-sm font-medium text-slate-600">
                                            Belum ada role
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Buat role untuk mengatur hak akses
                                            karyawan.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                    {roles.map((role) => (
                        <div key={role.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-800">
                                        {role.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {permissionCount(role)} izin aktif
                                        &middot; {role.employees_count}{' '}
                                        karyawan
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => openEditModal(role)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                >
                                    <i className="fi fi-rr-pencil" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDelete(role)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                >
                                    <i className="fi fi-rr-trash" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {roles.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <i className="fi fi-rr-shield-check text-xl" />
                            </span>
                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Belum ada role
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Buat role untuk mengatur hak akses karyawan.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <RoleFormModal
                show={modalOpen}
                onClose={closeModal}
                role={editingRole}
                menus={menus}
            />

            <ConfirmDialog
                show={Boolean(deleteTarget)}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                processing={deleting}
                title="Hapus Role"
                message={
                    deleteTarget &&
                    `Yakin ingin menghapus role "${deleteTarget.name}"? Karyawan yang memakai role ini akan kehilangan hak aksesnya.`
                }
                confirmText="Ya, Hapus"
            />
        </AdminLayout>
    );
}
