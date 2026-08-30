import Breadcrumb from '@/Components/Breadcrumb';
import { useToast } from '@/Contexts/ToastContext';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

const acceptedImages = 'image/jpeg,image/png,image/webp';

export default function Edit({ brandingSettings }) {
    const toast = useToast();
    const lightInput = useRef(null);
    const whiteInput = useRef(null);
    const appInput = useRef(null);
    const [lightPreview, setLightPreview] = useState(
        brandingSettings?.light_logo_url ?? '/logo.png',
    );
    const [whitePreview, setWhitePreview] = useState(
        brandingSettings?.white_logo_url ?? '/logo.png',
    );
    const [appPreview, setAppPreview] = useState(
        brandingSettings?.app_logo_url ?? '/pwa/icon-512.png',
    );
    const form = useForm({
        light_logo: null,
        white_logo: null,
        app_logo: null,
    });

    const selectFile = (field, file) => {
        if (!file) return;

        form.setData(field, file);
        const preview = URL.createObjectURL(file);

        if (field === 'light_logo') setLightPreview(preview);
        else if (field === 'white_logo') setWhitePreview(preview);
        else setAppPreview(preview);
    };

    const submit = (event) => {
        event.preventDefault();

        form.transform((data) => ({ ...data, _method: 'put' })).post(
            route('admin.branding.update'),
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    toast.success('Logo aplikasi Rancaka berhasil diperbarui.');
                },
                onError: () =>
                    toast.error('Logo belum tersimpan. Periksa file yang dipilih.'),
            },
        );
    };

    return (
        <AdminLayout header="Branding Aplikasi">
            <Head title="Branding Aplikasi" />

            <Breadcrumb
                homeHref={route('admin.dashboard')}
                items={[{ label: 'Sistem' }, { label: 'Branding Aplikasi' }]}
            />

            <form onSubmit={submit} className="max-w-6xl space-y-5">
                <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-8 sm:py-9">
                    <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />
                    <div className="absolute bottom-0 right-24 h-24 w-24 rounded-full bg-cyan-400/10 blur-xl" />
                    <div className="relative max-w-2xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                            <i className="fi fi-rr-picture" /> Khusus superadmin
                        </span>
                        <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                            Identitas aplikasi Rancaka.
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            Kelola logo light, logo dark, dan ikon aplikasi secara
                            terpisah dari satu tempat.
                        </p>
                    </div>
                </section>

                {form.errors.branding && (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        <i className="fi fi-rr-info mt-0.5" />
                        <p>{form.errors.branding}</p>
                    </div>
                )}

                <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <UploadCard
                        title="Logo Light"
                        description="Logo utama saat aplikasi menggunakan light mode."
                        hint="Disarankan PNG/WebP transparan"
                        preview={lightPreview}
                        file={form.data.light_logo}
                        error={form.errors.light_logo}
                        inputRef={lightInput}
                        icon="fi-rr-brightness"
                        onChange={(file) => selectFile('light_logo', file)}
                    />
                    <UploadCard
                        title="Logo Dark / White"
                        description="Muncul otomatis saat pengguna mengaktifkan dark mode."
                        hint="Disarankan PNG/WebP transparan"
                        preview={whitePreview}
                        file={form.data.white_logo}
                        error={form.errors.white_logo}
                        inputRef={whiteInput}
                        dark
                        icon="fi-rr-moon"
                        onChange={(file) => selectFile('white_logo', file)}
                    />
                    <UploadCard
                        title="Logo Aplikasi"
                        description="Dipakai sebagai favicon dan ikon aplikasi PWA."
                        hint="Disarankan gambar persegi 512 × 512 px"
                        preview={appPreview}
                        file={form.data.app_logo}
                        error={form.errors.app_logo}
                        inputRef={appInput}
                        icon="fi-rr-apps"
                        onChange={(file) => selectFile('app_logo', file)}
                    />
                </section>

                <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <i className="fi fi-rr-magic-wand" />
                        </span>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Berlaku untuk aplikasi pusat
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                Pengaturan logo toko tenant dan logo struk tidak berubah.
                            </p>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={
                            form.processing ||
                            (!form.data.light_logo &&
                                !form.data.white_logo &&
                                !form.data.app_logo)
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <i
                            className={`fi ${form.processing ? 'fi-rr-spinner animate-spin' : 'fi-rr-disk'}`}
                        />
                        {form.processing ? 'Menyimpan...' : 'Simpan Branding'}
                    </button>
                </section>
            </form>
        </AdminLayout>
    );
}

function UploadCard({
    title,
    description,
    hint,
    preview,
    file,
    error,
    inputRef,
    dark = false,
    icon,
    onChange,
}) {
    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40">
            <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-black text-slate-900">{title}</h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            {description}
                        </p>
                    </div>
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            dark
                                ? 'bg-slate-900 text-slate-100'
                                : 'bg-indigo-50 text-indigo-600'
                        }`}
                    >
                        <i className={`fi ${icon}`} />
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={`group relative mt-5 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed p-8 transition sm:h-56 ${
                        dark
                            ? 'border-slate-700 bg-slate-950 hover:border-indigo-400'
                            : 'border-slate-300 bg-slate-50 hover:border-indigo-400'
                    }`}
                >
                    <div
                        className="absolute inset-0 opacity-[0.035]"
                        style={{
                            backgroundImage:
                                'linear-gradient(45deg,currentColor 25%,transparent 25%),linear-gradient(-45deg,currentColor 25%,transparent 25%),linear-gradient(45deg,transparent 75%,currentColor 75%),linear-gradient(-45deg,transparent 75%,currentColor 75%)',
                            backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                            backgroundSize: '16px 16px',
                        }}
                    />
                    <img
                        src={preview}
                        alt={`Pratinjau ${title}`}
                        className="relative max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                    />
                    <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
                        <i className="fi fi-rr-camera" />
                    </span>
                </button>

                <input
                    ref={inputRef}
                    type="file"
                    accept={acceptedImages}
                    className="hidden"
                    onChange={(event) => onChange(event.target.files?.[0])}
                />

                <div className="mt-4 flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-700">
                            {file?.name ?? 'Logo saat ini'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="shrink-0 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        Pilih Logo
                    </button>
                </div>
                {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
            </div>
        </article>
    );
}
