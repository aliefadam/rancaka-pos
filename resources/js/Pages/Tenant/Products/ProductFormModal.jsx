import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

function initials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

const emptyForm = {
    name: '',
    category_id: '',
    price: '',
    stock: '',
    track_stock: true,
    is_active: true,
    ingredients: [],
};

export default function ProductFormModal({
    show,
    onClose,
    product,
    categories,
    rawMaterials,
}) {
    const isEdit = Boolean(product);
    const toast = useToast();

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyForm);

    const categoryOptions = categories.map((category) => ({
        value: String(category.id),
        label: category.name,
    }));

    const rawMaterialOptions = rawMaterials.map((rawMaterial) => ({
        value: String(rawMaterial.id),
        label: `${rawMaterial.name} (${rawMaterial.unit})`,
    }));

    useEffect(() => {
        if (!show) return;

        setData(
            product
                ? {
                      name: product.name,
                      category_id: String(product.category_id),
                      price: product.price,
                      stock: product.stock,
                      track_stock: product.track_stock,
                      is_active: product.is_active,
                      ingredients: (product.raw_materials ?? []).map(
                          (rawMaterial) => ({
                              raw_material_id: String(rawMaterial.id),
                              quantity: rawMaterial.pivot.quantity,
                          }),
                      ),
                  }
                : emptyForm,
        );
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, product]);

    const addIngredient = () => {
        setData('ingredients', [
            ...data.ingredients,
            { raw_material_id: '', quantity: 1 },
        ]);
    };

    const updateIngredient = (index, field, value) => {
        const next = data.ingredients.map((ingredient, i) =>
            i === index ? { ...ingredient, [field]: value } : ingredient,
        );
        setData('ingredients', next);
    };

    const removeIngredient = (index) => {
        setData(
            'ingredients',
            data.ingredients.filter((_, i) => i !== index),
        );
    };

    const submit = (e) => {
        e.preventDefault();

        if (isEdit) {
            put(route('tenant.products.update', product.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: () =>
                    toast.error(
                        'Gagal memperbarui produk. Periksa kembali data yang dimasukkan.',
                    ),
            });
        } else {
            post(route('tenant.products.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
                onError: () =>
                    toast.error(
                        'Gagal menambahkan produk. Periksa kembali data yang dimasukkan.',
                    ),
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="xl">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEdit ? 'Edit Produk' : 'Tambah Produk'}
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 rounded-xl bg-indigo-50/60 p-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-base font-bold text-indigo-600">
                                {initials(data.name) || 'PB'}
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Preview produk
                                </p>
                                <p className="text-xs text-slate-400">
                                    Inisial akan dibuat otomatis dari nama
                                    produk.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Nama Produk <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="Contoh: Nasi Kucing"
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Kategori <span className="text-rose-500">*</span>
                            </label>
                            <Select
                                value={data.category_id}
                                onChange={(value) =>
                                    setData('category_id', value)
                                }
                                options={categoryOptions}
                                placeholder="Pilih kategori"
                            />
                            {errors.category_id && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.category_id}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="price"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Harga (Rp) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    id="price"
                                    type="number"
                                    min="0"
                                    max="999999999999"
                                    value={data.price}
                                    onChange={(e) =>
                                        setData('price', e.target.value)
                                    }
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="3000"
                                />
                                {errors.price && (
                                    <p className="mt-1.5 text-sm text-red-600">
                                        {errors.price}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="stock"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Stok (pcs)
                                </label>
                                <input
                                    id="stock"
                                    type="number"
                                    min="0"
                                    disabled={!data.track_stock}
                                    value={data.stock}
                                    onChange={(e) =>
                                        setData('stock', e.target.value)
                                    }
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                    placeholder="0"
                                />
                                {errors.stock && (
                                    <p className="mt-1.5 text-sm text-red-600">
                                        {errors.stock}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={data.track_stock}
                                    onChange={(e) =>
                                        setData(
                                            'track_stock',
                                            e.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Produk ini menggunakan stok
                            </label>

                            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) =>
                                        setData('is_active', e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Produk aktif dijual
                            </label>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Resep Bahan Baku
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        Opsional — bahan baku yang otomatis
                                        berkurang saat produk ini terjual.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addIngredient}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    <i className="fi fi-sr-add" />
                                    Tambah Bahan
                                </button>
                            </div>

                            {data.ingredients.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {data.ingredients.map(
                                        (ingredient, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-2"
                                            >
                                                <div className="flex-1">
                                                    <Select
                                                        value={
                                                            ingredient.raw_material_id
                                                        }
                                                        onChange={(value) =>
                                                            updateIngredient(
                                                                index,
                                                                'raw_material_id',
                                                                value,
                                                            )
                                                        }
                                                        options={
                                                            rawMaterialOptions
                                                        }
                                                        placeholder="Pilih bahan baku"
                                                    />
                                                    {errors[
                                                        `ingredients.${index}.raw_material_id`
                                                    ] && (
                                                        <p className="mt-1.5 text-sm text-red-600">
                                                            {
                                                                errors[
                                                                    `ingredients.${index}.raw_material_id`
                                                                ]
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="w-24 shrink-0">
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={
                                                            ingredient.quantity
                                                        }
                                                        onChange={(e) =>
                                                            updateIngredient(
                                                                index,
                                                                'quantity',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                    />
                                                    {errors[
                                                        `ingredients.${index}.quantity`
                                                    ] && (
                                                        <p className="mt-1.5 text-sm text-red-600">
                                                            {
                                                                errors[
                                                                    `ingredients.${index}.quantity`
                                                                ]
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeIngredient(index)
                                                    }
                                                    className="flex h-[42px] w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                >
                                                    <i className="fi fi-sr-trash" />
                                                </button>
                                            </div>
                                        ),
                                    )}
                                </div>
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
                            <i className="fi fi-sr-spinner animate-spin" />
                        )}
                        {isEdit ? 'Simpan Perubahan' : 'Tambah'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
