import Modal from '@/Components/Modal';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

const reasonOptions = [
    { value: 'Barang rusak', label: 'Barang rusak' },
    { value: 'Kadaluarsa', label: 'Kadaluarsa' },
    { value: 'Hilang', label: 'Hilang' },
    { value: 'Selisih stok opname', label: 'Selisih stok opname' },
    { value: 'Lainnya', label: 'Lainnya' },
];

export default function StockAdjustmentModal({
    show,
    onClose,
    items,
    fieldName,
    routeName,
    entityLabel,
}) {
    const toast = useToast();

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({ [fieldName]: '', quantity: '', reason: 'Barang rusak' });

    useEffect(() => {
        if (!show) return;
        setData({ [fieldName]: '', quantity: '', reason: 'Barang rusak' });
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const itemOptions = items.map((item) => ({
        value: String(item.id),
        label: `${item.name} (stok: ${item.stock}${item.unit ? ` ${item.unit}` : ' pcs'})`,
    }));

    const selectedItem = items.find(
        (item) => String(item.id) === data[fieldName],
    );
    const unit = selectedItem?.unit ?? 'pcs';

    const submit = (e) => {
        e.preventDefault();

        post(route(routeName), {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                reset();
            },
            onError: () =>
                toast.error(
                    'Gagal menyimpan penyesuaian stok. Periksa kembali data.',
                ),
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Penyesuaian Stok
                    </h2>
                </Modal.Header>

                <Modal.Body>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                {entityLabel} <span className="text-rose-500">*</span>
                            </label>
                            <Select
                                value={data[fieldName]}
                                onChange={(value) =>
                                    setData(fieldName, value)
                                }
                                options={itemOptions}
                                placeholder={`Pilih ${entityLabel.toLowerCase()}`}
                                searchable
                            />
                            {errors[fieldName] && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors[fieldName]}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="quantity"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Jumlah ({unit}) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="quantity"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.quantity}
                                onChange={(e) =>
                                    setData('quantity', e.target.value)
                                }
                                placeholder="10"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            <p className="mt-1.5 text-xs text-slate-400">
                                Jumlah ini akan dikurangkan dari stok saat ini.
                            </p>
                            {errors.quantity && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.quantity}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Alasan
                            </label>
                            <Select
                                value={data.reason}
                                onChange={(value) =>
                                    setData('reason', value)
                                }
                                options={reasonOptions}
                                placeholder="Pilih alasan"
                            />
                            {errors.reason && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.reason}
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
                        Simpan
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
