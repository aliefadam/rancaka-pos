import Breadcrumb from '@/Components/Breadcrumb';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function Edit({ tenant }) {
    const toast = useToast();
    const fileInputRef = useRef(null);
    const [logoPreview, setLogoPreview] = useState(tenant.logo_url);

    const { data, setData, post, processing, errors, transform } = useForm({
        name: tenant.name ?? '',
        phone: tenant.phone ?? '',
        address: tenant.address ?? '',
        logo: null,
        receipt_footer: tenant.receipt_footer ?? '',
        receipt_size: tenant.receipt_size ?? '58mm',
        auto_print_receipt: Boolean(tenant.auto_print_receipt),
        tax_percentage: tenant.tax_percentage ?? 0,
        service_charge_percentage: tenant.service_charge_percentage ?? 0,
    });

    transform((data) => ({ ...data, _method: 'put' }));

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setData('logo', file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const submit = (e) => {
        e.preventDefault();

        post(route('tenant.settings.update'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => toast.success('Pengaturan toko berhasil disimpan.'),
            onError: () =>
                toast.error(
                    'Gagal menyimpan pengaturan. Periksa kembali data yang dimasukkan.',
                ),
        });
    };

    return (
        <AdminLayout header="Pengaturan Toko">
            <Head title="Pengaturan Toko" />

            <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Toko' }]} />

            <form onSubmit={submit} className="max-w-3xl space-y-6">
                <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                    <h2 className="text-base font-semibold text-slate-900">
                        Informasi Toko
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Ditampilkan pada struk dan halaman kasir.
                    </p>

                    <div className="mt-5 flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500"
                        >
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Logo toko"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <i className="fi fi-rr-picture text-xl" />
                            )}
                        </button>
                        <div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                Ganti Logo
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                            {errors.logo && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.logo}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Nama Toko <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Nomor HP
                            </label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                placeholder="cth. 0812xxxxxxx"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {errors.phone && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.phone}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Alamat
                            </label>
                            <textarea
                                rows={2}
                                value={data.address}
                                onChange={(e) =>
                                    setData('address', e.target.value)
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {errors.address && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.address}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                    <h2 className="text-base font-semibold text-slate-900">
                        Pajak &amp; Biaya Layanan
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Dihitung otomatis dari subtotal setiap transaksi di
                        Kasir.
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Pajak (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={data.tax_percentage}
                                onChange={(e) =>
                                    setData(
                                        'tax_percentage',
                                        e.target.value,
                                    )
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {errors.tax_percentage && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.tax_percentage}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Biaya Layanan (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={data.service_charge_percentage}
                                onChange={(e) =>
                                    setData(
                                        'service_charge_percentage',
                                        e.target.value,
                                    )
                                }
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {errors.service_charge_percentage && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {errors.service_charge_percentage}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                    <h2 className="text-base font-semibold text-slate-900">
                        Struk
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Catatan kaki yang tercetak di bagian bawah struk.
                    </p>

                    <div className="mt-5">
                        <div className="mb-4">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Ukuran Struk <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={data.receipt_size}
                                onChange={(e) => setData('receipt_size', e.target.value)}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:max-w-xs"
                            >
                                <option value="58mm">58mm</option>
                                <option value="80mm">80mm</option>
                            </select>
                            {errors.receipt_size && (
                                <p className="mt-1.5 text-sm text-red-600">{errors.receipt_size}</p>
                            )}
                        </div>

                        <textarea
                            rows={2}
                            value={data.receipt_footer}
                            onChange={(e) =>
                                setData('receipt_footer', e.target.value)
                            }
                            placeholder="cth. Terima kasih atas kunjungan Anda!"
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        {errors.receipt_footer && (
                            <p className="mt-1.5 text-sm text-red-600">
                                {errors.receipt_footer}
                            </p>
                        )}

                        <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <input
                                type="checkbox"
                                checked={data.auto_print_receipt}
                                onChange={(e) => setData('auto_print_receipt', e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>
                                <span className="block text-sm font-semibold text-slate-800">
                                    Auto cetak setelah transaksi berhasil
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-500">
                                    POS otomatis membuka Rancaka Print setelah pembayaran sukses.
                                </span>
                            </span>
                        </label>
                    </div>
                </section>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing && (
                            <i className="fi fi-rr-spinner animate-spin" />
                        )}
                        Simpan Pengaturan
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
