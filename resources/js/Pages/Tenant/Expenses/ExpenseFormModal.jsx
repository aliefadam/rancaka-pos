import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const today = new Date().toLocaleDateString('en-CA');

const emptyForm = {
    expense_date: today,
    category: 'Belanja Bahan',
    amount: '',
    description: '',
    receipt: null,
};

export default function ExpenseFormModal({
    show,
    onClose,
    expense,
    categories,
}) {
    const isEdit = Boolean(expense);
    const toast = useToast();
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        clearErrors,
        transform,
    } = useForm(emptyForm);

    useEffect(() => {
        if (!show) return;

        setData(
            expense
                ? {
                      expense_date: expense.expense_date,
                      category: expense.category,
                      amount: String(expense.amount),
                      description: expense.description,
                      receipt: null,
                  }
                : emptyForm,
        );
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, expense]);

    const submit = (event) => {
        event.preventDefault();

        transform((formData) =>
            isEdit ? { ...formData, _method: 'put' } : formData,
        );

        post(
            isEdit
                ? route('tenant.expenses.update', expense.id)
                : route('tenant.expenses.store'),
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
                onError: () =>
                    toast.error(
                        `Gagal ${isEdit ? 'memperbarui' : 'menambahkan'} pengeluaran. Periksa kembali data yang dimasukkan.`,
                    ),
            },
        );
    };

    const categoryOptions = categories.map((category) => ({
        value: category,
        label: category,
    }));

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isEdit ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-5">
                        <Field
                            label="Tanggal"
                            required
                            error={errors.expense_date}
                        >
                            <input
                                type="date"
                                value={data.expense_date}
                                onChange={(event) =>
                                    setData(
                                        'expense_date',
                                        event.target.value,
                                    )
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </Field>

                        <Field label="Kategori" required error={errors.category}>
                            <Select
                                value={data.category}
                                onChange={(value) =>
                                    setData('category', value)
                                }
                                options={categoryOptions}
                                className="w-full"
                            />
                        </Field>

                        <Field
                            label="Nominal (Rp)"
                            required
                            error={errors.amount}
                        >
                            <input
                                type="number"
                                min="1"
                                value={data.amount}
                                onChange={(event) =>
                                    setData('amount', event.target.value)
                                }
                                placeholder="Contoh: 50000"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </Field>

                        <Field
                            label="Keterangan"
                            required
                            error={errors.description}
                        >
                            <textarea
                                rows={4}
                                value={data.description}
                                onChange={(event) =>
                                    setData('description', event.target.value)
                                }
                                placeholder="Tuliskan detail pengeluaran..."
                                className="block w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </Field>

                        <Field
                            label="Gambar Struk / Nota"
                            required={!isEdit}
                            error={errors.receipt}
                        >
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/40">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    <i className="fi fi-rr-cloud-upload-alt" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-slate-700">
                                        {data.receipt?.name ??
                                            (isEdit
                                                ? 'Ganti bukti (opsional)'
                                                : 'Pilih file bukti')}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-400">
                                        JPG, PNG, WebP, atau PDF · Maks. 2 MB
                                    </span>
                                </span>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    className="sr-only"
                                    onChange={(event) =>
                                        setData(
                                            'receipt',
                                            event.target.files[0] ?? null,
                                        )
                                    }
                                />
                            </label>
                        </Field>
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

function Field({ label, required = false, error, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}{' '}
                {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
            {error && (
                <p className="mt-1.5 text-sm text-rose-600">{error}</p>
            )}
        </div>
    );
}
