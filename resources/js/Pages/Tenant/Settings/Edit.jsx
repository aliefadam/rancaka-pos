import Breadcrumb from '@/Components/Breadcrumb';
import Select from '@/Components/Select';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    canInstallPwa,
    isPwaInstalled,
    promptPwaInstall,
} from '@/pwa';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const businessTypes = [
    { value: 'retail', label: 'Toko / retail' },
    { value: 'food_beverage', label: 'Makanan & minuman' },
    { value: 'service', label: 'Jasa' },
    { value: 'other', label: 'Usaha lainnya' },
];

const optionalModules = [
    { key: 'inventory', label: 'Stok lanjutan', description: 'Bahan baku, cek stok, dan pindah stok.' },
    { key: 'purchases', label: 'Belanja & pemasok', description: 'Belanja stok, hutang, pemasok, dan laporannya.' },
    { key: 'expenses', label: 'Biaya operasional', description: 'Pencatatan uang keluar untuk operasional.' },
    { key: 'credit', label: 'Penjualan bon', description: 'Piutang pelanggan dan pembayaran bon.' },
    { key: 'reports', label: 'Untung-rugi', description: 'Laporan keuangan dan analisis penjualan.' },
    { key: 'team', label: 'Karyawan & akses', description: 'Akun karyawan dan pengaturan akses.' },
];

const modulePresets = {
    retail: ['inventory', 'purchases', 'expenses', 'credit', 'reports'],
    food_beverage: ['inventory', 'purchases', 'expenses', 'reports'],
    service: ['expenses', 'credit', 'reports'],
    other: ['expenses', 'reports'],
};

export default function Edit({ tenant }) {
    const toast = useToast();
    const fileInputRef = useRef(null);
    const [logoPreview, setLogoPreview] = useState(tenant.logo_url);
    const [pwaInstallAvailable, setPwaInstallAvailable] = useState(() =>
        canInstallPwa(),
    );
    const [pwaInstalled, setPwaInstalled] = useState(() => isPwaInstalled());
    const [showPwaHelp, setShowPwaHelp] = useState(false);

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
        business_type: tenant.business_type ?? 'retail',
        interface_mode: tenant.interface_mode ?? 'complete',
        enabled_modules: tenant.enabled_modules ?? modulePresets[tenant.business_type ?? 'retail'],
    });

    transform((data) => ({ ...data, _method: 'put' }));

    useEffect(() => {
        const installAvailable = () => setPwaInstallAvailable(true);
        const installed = () => {
            setPwaInstalled(true);
            setPwaInstallAvailable(false);
            setShowPwaHelp(false);
        };

        window.addEventListener(
            'rancaka:pwa-install-available',
            installAvailable,
        );
        window.addEventListener('rancaka:pwa-installed', installed);

        return () => {
            window.removeEventListener(
                'rancaka:pwa-install-available',
                installAvailable,
            );
            window.removeEventListener('rancaka:pwa-installed', installed);
        };
    }, []);

    const installPwa = async () => {
        const outcome = await promptPwaInstall();

        if (outcome === 'accepted' || outcome === 'installed') {
            toast.success('Rancaka POS berhasil dipasang di perangkat.');
            setShowPwaHelp(false);
            return;
        }

        if (outcome === 'unavailable') {
            setShowPwaHelp(true);
            return;
        }

        toast.info('Instalasi PWA dibatalkan. Anda dapat mencobanya kembali.');
    };

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

    const changeBusinessType = (value) => {
        setData((current) => ({
            ...current,
            business_type: value,
            enabled_modules: current.interface_mode === 'simple'
                ? modulePresets[value]
                : current.enabled_modules,
        }));
    };

    const changeInterfaceMode = (value) => {
        setData((current) => ({
            ...current,
            interface_mode: value,
            enabled_modules: value === 'simple'
                ? modulePresets[current.business_type]
                : current.enabled_modules,
        }));
    };

    const toggleModule = (module) => {
        setData('enabled_modules', data.enabled_modules.includes(module)
            ? data.enabled_modules.filter((item) => item !== module)
            : [...data.enabled_modules, module]);
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
                                accept="image/jpeg,image/png,image/webp"
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
                    <h2 className="text-base font-semibold text-slate-900">Tampilan &amp; fitur usaha</h2>
                    <p className="mt-1 text-sm text-slate-500">Atur menu agar sesuai dengan pekerjaan yang paling sering dilakukan.</p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="mb-1.5 block text-sm font-medium text-slate-700">Jenis usaha</span>
                            <Select value={data.business_type} onChange={changeBusinessType} options={businessTypes} searchable={false} />
                            {errors.business_type && <p className="mt-1.5 text-sm text-rose-600">{errors.business_type}</p>}
                        </label>
                        <div>
                            <span className="mb-1.5 block text-sm font-medium text-slate-700">Mode tampilan</span>
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                                {[
                                    ['simple', 'Sederhana'],
                                    ['complete', 'Lengkap'],
                                ].map(([value, label]) => (
                                    <button key={value} type="button" aria-pressed={data.interface_mode === value} onClick={() => changeInterfaceMode(value)} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${data.interface_mode === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                                ))}
                            </div>
                            {errors.interface_mode && <p className="mt-1.5 text-sm text-rose-600">{errors.interface_mode}</p>}
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><i className="fi fi-rr-apps" /></span>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Modul tambahan</p>
                                <p className="mt-0.5 text-xs leading-5 text-slate-500">Mode Lengkap menampilkan semua modul. Pada Mode Sederhana, pilih hanya yang dibutuhkan.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {optionalModules.map((module) => {
                                const checked = data.interface_mode === 'complete' || data.enabled_modules.includes(module.key);
                                return (
                                    <label key={module.key} className={`flex items-start gap-3 rounded-xl border p-3 ${checked ? 'border-indigo-100 bg-indigo-50/50' : 'border-slate-200'}`}>
                                        <input type="checkbox" checked={checked} disabled={data.interface_mode === 'complete'} onChange={() => toggleModule(module.key)} className="mt-0.5 rounded border-slate-300 text-indigo-600" />
                                        <span><span className="block text-sm font-semibold text-slate-700">{module.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{module.description}</span></span>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.enabled_modules && <p className="mt-2 text-sm text-rose-600">{errors.enabled_modules}</p>}
                    </div>
                </section>

                <section id="struk-pajak" className="scroll-mt-28 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
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
                            <Select
                                value={data.receipt_size}
                                onChange={(value) => setData('receipt_size', value)}
                                options={[
                                    { value: '58mm', label: '58mm' },
                                    { value: '80mm', label: '80mm' },
                                ]}
                                className="w-full sm:max-w-xs"
                                searchPlaceholder="Cari ukuran struk..."
                            />
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

                <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40">
                    <h2 className="text-base font-semibold text-slate-900">
                        Aplikasi &amp; Printer
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Pasang Rancaka POS di layar utama dan hubungkan printer
                        thermal melalui aplikasi Android.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                                <i className="fi fi-rr-apps text-lg" />
                            </span>
                            <h3 className="mt-4 text-sm font-bold text-slate-900">
                                Rancaka POS PWA
                            </h3>
                            <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">
                                Akses POS seperti aplikasi tanpa mengunduh APK.
                            </p>
                            <button
                                type="button"
                                onClick={installPwa}
                                disabled={pwaInstalled}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-default disabled:bg-emerald-600"
                            >
                                <i
                                    className={`fi ${pwaInstalled ? 'fi-rr-check-circle' : pwaInstallAvailable ? 'fi-rr-download' : 'fi-rr-info'}`}
                                />
                                {pwaInstalled
                                    ? 'PWA Sudah Terpasang'
                                    : pwaInstallAvailable
                                      ? 'Instal Aplikasi PWA'
                                      : 'Cara Instal PWA'}
                            </button>
                        </div>

                        <div className="flex flex-col rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                                <i className="fi fi-rr-print text-lg" />
                            </span>
                            <h3 className="mt-4 text-sm font-bold text-slate-900">
                                Rancaka Print Android
                            </h3>
                            <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">
                                Jembatan Bluetooth untuk mencetak struk ke printer thermal.
                            </p>
                            <a
                                href={route('tenant.printer.download')}
                                download
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                <i className="fi fi-rr-download" />
                                Download Rancaka Print
                            </a>
                        </div>
                    </div>

                    {showPwaHelp && (
                        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-700">
                            <p className="font-bold text-sky-900">Instal secara manual</p>
                            <p className="mt-1">
                                Android/Chrome: buka menu browser lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>. iPhone/Safari: tekan <b>Bagikan</b>, lalu pilih <b>Tambahkan ke Layar Utama</b>.
                            </p>
                        </div>
                    )}
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
