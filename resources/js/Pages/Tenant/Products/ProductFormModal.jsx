import Modal from '@/Components/Modal';
import MoneyInput from '@/Components/MoneyInput';
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

function nonNegativeValue(value) {
    if (value === '') return '';

    return Math.max(0, Number(value));
}

function preventNegativeInput(event) {
    if (event.key === '-' || event.key === '+') event.preventDefault();
}

const emptyForm = {
    name: '',
    category_id: '',
    price: '',
    cost: '',
    margin_percentage: '',
    stock: '',
    track_stock: true,
    is_active: true,
    ingredients: [],
    price_options: [
        {
            id: null,
            name: 'Harga utama',
            price: '',
            is_default: true,
            is_active: true,
        },
    ],
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
                      cost: product.cost ?? 0,
                      margin_percentage: product.margin_percentage ?? 0,
                      stock: product.stock,
                      track_stock: product.track_stock,
                      is_active: product.is_active,
                      ingredients: (product.raw_materials ?? []).map(
                          (rawMaterial) => ({
                              raw_material_id: String(rawMaterial.id),
                              quantity: rawMaterial.pivot.quantity,
                          }),
                      ),
                      price_options: (product.price_options?.length
                          ? product.price_options
                          : [
                                {
                                    id: null,
                                    name: 'Harga utama',
                                    price: product.price,
                                    is_default: true,
                                    is_active: true,
                                },
                            ]
                      ).map((option) => ({
                          id: option.id ?? null,
                          name: option.name,
                          price: option.price,
                          is_default: option.is_default,
                          is_active: option.is_active,
                      })),
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

    const calculateMargin = (price, cost) => {
        const numericPrice = Number(price);
        const numericCost = Number(cost);

        if (!numericCost || numericPrice < numericCost) return '0.00';

        return (((numericPrice - numericCost) / numericCost) * 100).toFixed(2);
    };

    const updateCost = (value) => {
        const safeValue = nonNegativeValue(value);

        setData((current) => ({
            ...current,
            cost: safeValue,
            margin_percentage: calculateMargin(current.price, safeValue),
        }));
    };

    const updatePrice = (value) => {
        const safeValue = nonNegativeValue(value);

        setData((current) => ({
            ...current,
            price: safeValue,
            margin_percentage: calculateMargin(safeValue, current.cost),
            price_options: current.price_options.map((option) =>
                option.is_default ? { ...option, price: safeValue } : option,
            ),
        }));
    };

    const updateMargin = (value) => {
        const safeValue = nonNegativeValue(value);
        const numericCost = Number(data.cost);
        const numericMargin = Number(safeValue);
        const price =
            numericCost > 0 && Number.isFinite(numericMargin)
                ? Math.round(numericCost * (1 + numericMargin / 100))
                : data.price;

        setData((current) => ({
            ...current,
            margin_percentage: safeValue,
            price,
            price_options: current.price_options.map((option) =>
                option.is_default ? { ...option, price } : option,
            ),
        }));
    };

    const addPriceOption = () => {
        setData('price_options', [
            ...data.price_options,
            {
                id: null,
                name: '',
                price: data.price,
                is_default: false,
                is_active: true,
            },
        ]);
    };

    const updatePriceOption = (index, field, value) => {
        setData((current) => {
            const options = current.price_options.map((option, optionIndex) => {
                if (field === 'is_default') {
                    return {
                        ...option,
                        is_default: optionIndex === index,
                        is_active: optionIndex === index ? true : option.is_active,
                    };
                }

                return optionIndex === index
                    ? { ...option, [field]: value }
                    : option;
            });
            const selectedDefault = options.find((option) => option.is_default);

            return {
                ...current,
                price_options: options,
                price: selectedDefault?.price ?? current.price,
                margin_percentage: calculateMargin(
                    selectedDefault?.price ?? current.price,
                    current.cost,
                ),
            };
        });
    };

    const removePriceOption = (index) => {
        const target = data.price_options[index];
        if (target.id) {
            updatePriceOption(index, 'is_active', false);
            return;
        }

        const options = data.price_options.filter((_, optionIndex) => optionIndex !== index);
        if (target.is_default && options.length > 0) {
            options[0] = { ...options[0], is_default: true, is_active: true };
        }
        setData('price_options', options);
    };

    const movePriceOption = (index, direction) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= data.price_options.length) return;

        const options = [...data.price_options];
        [options[index], options[nextIndex]] = [options[nextIndex], options[index]];
        setData('price_options', options);
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

                        <section className="overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/40">
                            <div className="flex items-start justify-between gap-4 border-b border-indigo-100 bg-white/70 p-4">
                                <div className="flex gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                                        <i className="fi fi-rr-tags" />
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">
                                            Pilihan Harga
                                        </h3>
                                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                            Semua pilihan memakai stok produk yang sama. Harga default menjadi harga utama produk.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={addPriceOption}
                                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                                >
                                    <i className="fi fi-rr-add" />
                                    Tambah
                                </button>
                            </div>

                            <div className="space-y-3 p-4">
                                {data.price_options.map((option, index) => (
                                    <div
                                        key={option.id ?? `new-${index}`}
                                        className={`rounded-xl border p-3 ${option.is_active ? 'border-white bg-white shadow-sm' : 'border-slate-200 bg-slate-100/70'}`}
                                    >
                                        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-start">
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                    Nama pilihan
                                                </label>
                                                <input
                                                    type="text"
                                                    value={option.name}
                                                    onChange={(event) => updatePriceOption(index, 'name', event.target.value)}
                                                    placeholder="Contoh: Diantar"
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                />
                                                {errors[`price_options.${index}.name`] && (
                                                    <p className="mt-1 text-xs text-rose-600">{errors[`price_options.${index}.name`]}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                                    Harga (Rp)
                                                </label>
                                                <MoneyInput
                                                    min="0"
                                                    max="999999999999"
                                                    value={option.price}
                                                    onValueChange={(value) => updatePriceOption(index, 'price', nonNegativeValue(value))}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                />
                                                {errors[`price_options.${index}.price`] && (
                                                    <p className="mt-1 text-xs text-rose-600">{errors[`price_options.${index}.price`]}</p>
                                                )}
                                            </div>
                                            <div className="flex items-end gap-1 self-end pb-0.5">
                                                <button type="button" aria-label="Naikkan urutan" disabled={index === 0} onClick={() => movePriceOption(index, -1)} className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30">
                                                    <i className="fi fi-rr-angle-small-up" />
                                                </button>
                                                <button type="button" aria-label="Turunkan urutan" disabled={index === data.price_options.length - 1} onClick={() => movePriceOption(index, 1)} className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30">
                                                    <i className="fi fi-rr-angle-small-down" />
                                                </button>
                                                <button type="button" aria-label="Nonaktifkan pilihan" disabled={option.is_default || data.price_options.length === 1} onClick={() => removePriceOption(index)} className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30">
                                                    <i className="fi fi-rr-trash" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
                                            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                                                <input
                                                    type="radio"
                                                    name="default-price-option"
                                                    checked={option.is_default}
                                                    onChange={() => updatePriceOption(index, 'is_default', true)}
                                                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Harga default
                                            </label>
                                            <label className={`flex items-center gap-2 text-xs font-medium ${option.is_default ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-600'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={option.is_active}
                                                    disabled={option.is_default}
                                                    onChange={(event) => updatePriceOption(index, 'is_active', event.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Aktif di kasir
                                            </label>
                                            {option.id && !option.is_active && (
                                                <button type="button" onClick={() => updatePriceOption(index, 'is_active', true)} className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                                                    Aktifkan kembali
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {errors.price_options && (
                                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                                        {errors.price_options}
                                    </p>
                                )}
                            </div>
                        </section>

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

                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                            <div className="mb-4 flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                                    <i className="fi fi-rr-calculator" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Perhitungan Harga
                                    </p>
                                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                        Margin dihitung dari HPP. Ubah margin untuk menghitung harga jual otomatis.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label
                                        htmlFor="cost"
                                        className="mb-1.5 block text-sm font-medium text-slate-700"
                                    >
                                        HPP (Rp) <span className="text-rose-500">*</span>
                                    </label>
                                    <MoneyInput
                                        id="cost"
                                        min="0"
                                        max="999999999999"
                                        value={data.cost}
                                        onValueChange={updateCost}
                                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        placeholder="10.000"
                                    />
                                    {errors.cost && (
                                        <p className="mt-1.5 text-sm text-red-600">{errors.cost}</p>
                                    )}
                                </div>

                            <div>
                                <label
                                    htmlFor="price"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                                </label>
                                <MoneyInput
                                    id="price"
                                    min="0"
                                    max="999999999999"
                                    value={data.price}
                                    onValueChange={updatePrice}
                                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="15.000"
                                />
                                {errors.price && (
                                    <p className="mt-1.5 text-sm text-red-600">
                                        {errors.price}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="margin_percentage"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Margin (%) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="margin_percentage"
                                        type="number"
                                        min="0"
                                        max="999999.99"
                                        step="0.01"
                                        value={data.margin_percentage}
                                        onKeyDown={preventNegativeInput}
                                        onChange={(e) => updateMargin(e.target.value)}
                                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        placeholder="50"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-400">%</span>
                                </div>
                                {errors.margin_percentage && (
                                    <p className="mt-1.5 text-sm text-red-600">{errors.margin_percentage}</p>
                                )}
                            </div>
                            </div>

                            {Number(data.price) >= Number(data.cost) && Number(data.cost) > 0 && (
                                <p className="mt-3 text-xs text-slate-500">
                                    Estimasi laba kotor:{' '}
                                    <span className="font-semibold text-emerald-600">
                                        Rp {(Number(data.price) - Number(data.cost)).toLocaleString('id-ID')}
                                    </span>{' '}
                                    per produk
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
                                onChange={(e) => setData('stock', e.target.value)}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                placeholder="0"
                            />
                            {errors.stock && (
                                <p className="mt-1.5 text-sm text-red-600">{errors.stock}</p>
                            )}
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
                                    <i className="fi fi-rr-add" />
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
                                                    <i className="fi fi-rr-trash" />
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
                            <i className="fi fi-rr-spinner animate-spin" />
                        )}
                        {isEdit ? 'Simpan Perubahan' : 'Tambah'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
