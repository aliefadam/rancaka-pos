import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const unitOptions = [
    { value: 'pcs', label: 'pcs' },
    { value: 'kg', label: 'kg' },
    { value: 'gram', label: 'gram' },
    { value: 'liter', label: 'liter' },
    { value: 'ml', label: 'ml' },
    { value: 'pack', label: 'pack' },
    { value: 'box', label: 'box' },
    { value: 'lusin', label: 'lusin' },
];

const emptyForm = {
    name: '',
    unit: 'pcs',
    stock: '',
    is_active: true,
};

export default function RawMaterialFormModal({ show, onClose, rawMaterial }) {
    const isEdit = Boolean(rawMaterial);
    const toast = useToast();

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyForm);

    useEffect(() => {
        if (!show) return;

        setData(
            rawMaterial
                ? {
                      name: rawMaterial.name,
                      unit: rawMaterial.unit,
                      stock: rawMaterial.stock,
                      is_active: rawMaterial.is_active,
                  }
                : emptyForm,
        );
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, rawMaterial]);

    const submit = (e) => {
        e.preventDefault();

        if (isEdit) {
            put(route('tenant.raw-materials.update', rawMaterial.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: () =>
                    toast.error(
                        'Gagal memperbarui bahan baku. Periksa kembali data yang dimasukkan.',
                    ),
            });
        } else {
            post(route('tenant.raw-materials.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
                onError: () =>
                    toast.error(
                        'Gagal menambahkan bahan baku. Periksa kembali data yang dimasukkan.',
                    ),
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEdit ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Nama Bahan Baku <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="Contoh: Cup 16oz"
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Satuan <span className="text-rose-500">*</span>
                                </label>
                                <Select
                                    value={data.unit}
                                    onChange={(value) =>
                                        setData('unit', value)
                                    }
                                    options={unitOptions}
                                    placeholder="Pilih satuan"
                                />
                                {errors.unit && (
                                    <p className="mt-1.5 text-sm text-red-600">
                                        {errors.unit}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="stock"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Stok
                                </label>
                                <input
                                    id="stock"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.stock}
                                    onChange={(e) =>
                                        setData('stock', e.target.value)
                                    }
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="0"
                                />
                                {errors.stock && (
                                    <p className="mt-1.5 text-sm text-red-600">
                                        {errors.stock}
                                    </p>
                                )}
                            </div>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) =>
                                    setData('is_active', e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Bahan baku aktif digunakan
                        </label>
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
                            <i className="fi fi-sr-spinner animate-spin" />
                        )}
                        {isEdit ? 'Simpan Perubahan' : 'Tambah'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
