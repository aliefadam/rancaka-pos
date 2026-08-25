import Modal from '@/Components/Modal';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const emptyForm = {
    name: '',
    permissions: [],
};

export default function RoleFormModal({ show, onClose, role, menus }) {
    const isEdit = Boolean(role);
    const toast = useToast();

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyForm);

    useEffect(() => {
        if (!show) return;

        setData(
            role
                ? {
                      name: role.name,
                      permissions: role.permissions ?? [],
                  }
                : emptyForm,
        );
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, role]);

    const isChecked = (permission) => data.permissions.includes(permission);

    const togglePermission = (permission) => {
        setData(
            'permissions',
            isChecked(permission)
                ? data.permissions.filter((p) => p !== permission)
                : [...data.permissions, permission],
        );
    };

    const toggleMenuAll = (menu, checked) => {
        const menuPermissions = menu.actions.map(
            (action) => `${menu.key}.${action.key}`,
        );

        setData(
            'permissions',
            checked
                ? [...new Set([...data.permissions, ...menuPermissions])]
                : data.permissions.filter((p) => !menuPermissions.includes(p)),
        );
    };

    const isMenuFullyChecked = (menu) =>
        menu.actions.every((action) => isChecked(`${menu.key}.${action.key}`));

    const submit = (e) => {
        e.preventDefault();

        if (isEdit) {
            put(route('tenant.roles.update', role.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: () =>
                    toast.error(
                        'Gagal memperbarui role. Periksa kembali data yang dimasukkan.',
                    ),
            });
        } else {
            post(route('tenant.roles.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
                onError: () =>
                    toast.error(
                        'Gagal menambahkan role. Periksa kembali data yang dimasukkan.',
                    ),
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEdit ? 'Edit Role' : 'Tambah Role'}
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-5">
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Nama Role <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="Contoh: Kasir, Admin Gudang"
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Hak Akses
                            </label>
                            <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            <th className="px-4 py-2.5">
                                                Menu
                                            </th>
                                            <th className="px-4 py-2.5 text-center">
                                                Semua
                                            </th>
                                            <th className="px-4 py-2.5">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {menus.map((menu) => (
                                            <tr key={menu.key}>
                                                <td className="px-4 py-3 align-top font-medium text-slate-700">
                                                    {menu.label}
                                                </td>
                                                <td className="px-4 py-3 text-center align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={isMenuFullyChecked(
                                                            menu,
                                                        )}
                                                        onChange={(e) =>
                                                            toggleMenuAll(
                                                                menu,
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                        {menu.actions.map(
                                                            (action) => {
                                                                const permission = `${menu.key}.${action.key}`;
                                                                return (
                                                                    <label
                                                                        key={
                                                                            permission
                                                                        }
                                                                        className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked(
                                                                                permission,
                                                                            )}
                                                                            onChange={() =>
                                                                                togglePermission(
                                                                                    permission,
                                                                                )
                                                                            }
                                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                        />
                                                                        {
                                                                            action.label
                                                                        }
                                                                    </label>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-3 md:hidden">
                                {menus.map((menu) => (
                                    <section
                                        key={menu.key}
                                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                    >
                                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {menu.label}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">
                                                    {menu.actions.length} hak akses
                                                </p>
                                            </div>
                                            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-indigo-600">
                                                <input
                                                    type="checkbox"
                                                    checked={isMenuFullyChecked(menu)}
                                                    onChange={(e) =>
                                                        toggleMenuAll(
                                                            menu,
                                                            e.target.checked,
                                                        )
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Semua
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 p-3">
                                            {menu.actions.map((action) => {
                                                const permission = `${menu.key}.${action.key}`;
                                                const checked = isChecked(permission);

                                                return (
                                                    <label
                                                        key={permission}
                                                        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                                            checked
                                                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                                                : 'border-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                togglePermission(permission)
                                                            }
                                                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span>{action.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                            {errors.permissions && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.permissions}
                                </p>
                            )}
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing && (
                            <i className="fi fi-rr-spinner animate-spin" />
                        )}
                        {isEdit ? 'Simpan Perubahan' : 'Tambah Role'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
