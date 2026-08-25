import Modal from '@/Components/Modal';
import LocalizedDateInput from '@/Components/LocalizedDateInput';
import MoneyInput from '@/Components/MoneyInput';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { optimizeImageFile } from '@/utils/optimizeImageFile';
import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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
    const [optimizing, setOptimizing] = useState(false);
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

    const chooseReceipt = async (file) => {
        if (!file) return;

        setOptimizing(true);
        clearErrors('receipt');

        try {
            setData('receipt', await optimizeImageFile(file));
        } catch {
            setData('receipt', file);
            toast.error(
                'Kompresi di perangkat gagal. Foto tetap akan dikompresi saat disimpan.',
            );
        } finally {
            setOptimizing(false);
        }
    };

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
                            htmlFor="expense_date"
                            required
                            error={errors.expense_date}
                        >
                            <LocalizedDateInput
                                id="expense_date"
                                max={today}
                                value={data.expense_date}
                                onChange={(value) =>
                                    setData('expense_date', value)
                                }
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
                            <MoneyInput
                                min="1"
                                value={data.amount}
                                onValueChange={(value) => setData('amount', value)}
                                placeholder="Contoh: 50.000"
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
                            <label className="mb-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                                <i className="fi fi-rr-camera" />
                                {optimizing
                                    ? 'Mengompresi foto...'
                                    : 'Ambil Foto dari Kamera'}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    capture="environment"
                                    className="sr-only"
                                    disabled={optimizing}
                                    onChange={(event) => {
                                        chooseReceipt(event.target.files[0]);
                                        event.target.value = '';
                                    }}
                                />
                            </label>
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
                                        Foto otomatis dikompresi; PDF maks. 2 MB
                                    </span>
                                    <span className="hidden">
                                        JPG, PNG, WebP, atau PDF · Maks. 2 MB
                                    </span>
                                </span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    className="sr-only"
                                    disabled={optimizing}
                                    onChange={(event) => {
                                        chooseReceipt(event.target.files[0]);
                                        event.target.value = '';
                                    }}
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
                        disabled={processing || optimizing}
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

function Field({ label, htmlFor, required = false, error, children }) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-1.5 block text-sm font-medium text-slate-700"
            >
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
