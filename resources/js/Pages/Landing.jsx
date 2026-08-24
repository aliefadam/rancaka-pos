import { Head, Link } from '@inertiajs/react';
import BrandLogo from '@/Components/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const TRUST_BADGES = [
    { icon: 'fi fi-rr-bolt', label: 'Real-time' },
    { icon: 'fi fi-rr-shield-check', label: 'Data Aman' },
    { icon: 'fi fi-rr-laptop-mobile', label: 'Akses Kapan Saja' },
];

const WIMPI_WHATSAPP_URL =
    'https://wa.me/6281336471505?text=Halo%20Wimpi%2C%20saya%20ingin%20mengetahui%20lebih%20lanjut%20tentang%20Rancaka%20POS.';

const BUSINESS_TYPES = [
    { icon: 'fi fi-rr-shop', label: 'Retail & Toko' },
    { icon: 'fi fi-rr-restaurant', label: 'Restoran & Kafe' },
    { icon: 'fi fi-rr-shopping-basket', label: 'Toko Kelontong' },
    { icon: 'fi fi-rr-boxes', label: 'Grosir & Distributor' },
];

const FEATURES = [
    {
        icon: 'fi fi-rr-shop',
        title: 'Kasir (POS) Cepat',
        description:
            'Proses transaksi penjualan dengan antarmuka kasir yang ringan, mendukung tahan transaksi (hold) dan checkout dalam hitungan detik.',
    },
    {
        icon: 'fi fi-rr-box-open-full',
        title: 'Produk & Kategori',
        description:
            'Atur produk, kategori, dan bahan baku dalam satu tempat agar katalog toko Anda selalu rapi dan mudah dicari.',
    },
    {
        icon: 'fi fi-rr-warehouse-alt',
        title: 'Manajemen Stok',
        description:
            'Pantau stok produk dan bahan baku secara real-time, lengkap dengan riwayat stok masuk dan penyesuaian stok.',
    },
    {
        icon: 'fi fi-rr-chart-histogram',
        title: 'Laporan Keuangan',
        description:
            'Lihat laporan keuangan, riwayat transaksi, dan riwayat shift kasir untuk membantu Anda mengambil keputusan bisnis.',
    },
    {
        icon: 'fi fi-rr-clock',
        title: 'Manajemen Shift',
        description:
            'Buka dan tutup shift kasir dengan pencatatan yang jelas, sehingga rekonsiliasi kas di akhir hari jadi lebih mudah.',
    },
    {
        icon: 'fi fi-rr-building',
        title: 'Multi Tenant',
        description:
            'Kelola beberapa toko atau cabang sekaligus dari satu sistem, masing-masing dengan data yang terpisah dan aman.',
    },
];

const STEPS = [
    {
        title: 'Atur Toko Anda',
        description:
            'Buat kategori, produk, dan bahan baku sesuai kebutuhan toko dalam beberapa menit.',
    },
    {
        title: 'Mulai Bertransaksi',
        description:
            'Layani pelanggan lewat kasir (POS) yang cepat, termasuk tahan transaksi saat dibutuhkan.',
    },
    {
        title: 'Pantau & Analisis',
        description:
            'Cek laporan keuangan, stok, dan riwayat shift kapan saja untuk mengambil keputusan lebih baik.',
    },
];

const BENEFITS = [
    'Data real-time, tanpa perlu sinkronisasi manual',
    'Setiap toko/cabang punya data yang terpisah dan aman',
    'Antarmuka simpel, tim baru cepat terbiasa',
    'Kontrol ketat riwayat shift kasir & transaksi',
    'Laporan keuangan otomatis tanpa hitung manual',
];

const FAQS = [
    {
        question: 'Apakah Rancaka bisa digunakan untuk banyak toko/cabang?',
        answer: 'Bisa. Rancaka mendukung multi-tenant sehingga setiap toko atau cabang memiliki data produk, stok, dan transaksi yang terpisah dalam satu sistem.',
    },
    {
        question: 'Apakah data transaksi tersimpan dengan aman?',
        answer: 'Ya. Data setiap tenant terisolasi dan hanya dapat diakses oleh akun yang memiliki hak akses pada toko tersebut.',
    },
    {
        question: 'Apakah saya bisa mencoba dulu sebelum menggunakan?',
        answer: 'Tentu. Gunakan akun demo yang tersedia di halaman masuk untuk mencoba alur kasir, produk, stok, hingga laporan tanpa memengaruhi data asli.',
    },
    {
        question: 'Apakah cocok untuk usaha kecil seperti warung?',
        answer: 'Cocok. Rancaka dirancang agar tetap ringan digunakan untuk usaha kecil, sekaligus dapat berkembang mengikuti kebutuhan bisnis yang lebih besar.',
    },
];

const CHART_DATA = [
    { value: 32 },
    { value: 45 },
    { value: 38 },
    { value: 58 },
    { value: 50 },
    { value: 68 },
    { value: 76 },
];

function Reveal({ children, className = '', delay = 0 }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={`transition-all duration-700 ease-out ${
                visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
            } ${className}`}
        >
            {children}
        </div>
    );
}

function DashboardPreview() {
    return (
        <div className="relative">
            <div className="rounded-2xl border border-white/20 bg-white p-5 shadow-2xl shadow-indigo-950/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Live
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <p className="text-xs text-slate-500">
                            Penjualan Hari Ini
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                            Rp 4.850.000
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <i className="fi fi-rr-arrow-trend-up" />
                            12% dari kemarin
                        </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <p className="text-xs text-slate-500">Transaksi</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                            128
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                            <i className="fi fi-rr-receipt" />
                            Shift berjalan
                        </p>
                    </div>
                </div>

                <div className="mt-4 h-24 rounded-xl bg-slate-50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={CHART_DATA}>
                            <defs>
                                <linearGradient
                                    id="landingChart"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#4f46e5"
                                        stopOpacity={0.35}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="#4f46e5"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#4f46e5"
                                strokeWidth={2}
                                fill="url(#landingChart)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <p className="mt-2 text-center text-[11px] text-slate-400">
                    *Tampilan ilustrasi dashboard
                </p>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-xl sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <i className="fi fi-rr-clock" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-900">
                        Shift Aktif
                    </p>
                    <p className="text-[11px] text-slate-400">
                        Dibuka 08:00
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Landing() {
    return (
        <>
            <Head title="Rancaka - Sistem Kasir & Manajemen Bisnis" />

            <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <BrandLogo className="h-10 w-10" />
                            <span className="text-lg font-bold tracking-tight">
                                Rancaka
                            </span>
                        </div>

                        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
                            <a
                                href="#fitur"
                                className="transition hover:text-indigo-600"
                            >
                                Fitur
                            </a>
                            <a
                                href="#cara-kerja"
                                className="transition hover:text-indigo-600"
                            >
                                Cara Kerja
                            </a>
                            <a
                                href="#kenapa"
                                className="transition hover:text-indigo-600"
                            >
                                Kenapa Rancaka
                            </a>
                            <a
                                href="#faq"
                                className="transition hover:text-indigo-600"
                            >
                                FAQ
                            </a>
                        </nav>

                        <Link
                            href={route('login')}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            Masuk
                        </Link>
                    </div>
                </header>

                <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-white/5" />

                    <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2 lg:py-28">
                        <div className="text-center lg:text-left">
                            <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                                Sistem Kasir &amp; Manajemen Bisnis
                            </span>

                            <h1 className="mx-auto mt-6 max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl lg:mx-0">
                                Kelola bisnis ritel Anda
                                <br />
                                lebih mudah &amp; cepat.
                            </h1>

                            <p className="mx-auto mt-5 max-w-lg text-indigo-100 lg:mx-0">
                                Satu platform untuk kasir, produk, stok, dan
                                laporan keuangan toko Anda &mdash; dapat
                                diakses kapan saja, secara real-time, untuk
                                satu toko maupun banyak cabang sekaligus.
                            </p>

                            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                                <Link
                                    href={route('register')}
                                    className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                                >
                                    Coba Gratis 7 Hari
                                </Link>
                                <a
                                    href="#fitur"
                                    className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                    Lihat Fitur
                                </a>
                                <a
                                    href={WIMPI_WHATSAPP_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Tanya Wimpi melalui WhatsApp di +62 813-3647-1505"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-emerald-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-950/20 focus:outline-none focus:ring-2 focus:ring-white/70"
                                >
                                    <i className="fi fi-rr-phone-call" />
                                    Tanya via WhatsApp
                                </a>
                            </div>

                            <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start">
                                {TRUST_BADGES.map((badge) => (
                                    <div
                                        key={badge.label}
                                        className="flex items-center gap-2 text-sm text-indigo-100"
                                    >
                                        <i className={badge.icon} />
                                        {badge.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Reveal delay={150} className="hidden lg:block">
                            <DashboardPreview />
                        </Reveal>
                    </div>
                </section>

                <section className="border-b border-slate-200 bg-white py-8">
                    <div className="mx-auto max-w-6xl px-6">
                        <p className="text-center text-sm font-medium text-slate-400">
                            Cocok untuk berbagai jenis usaha
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                            {BUSINESS_TYPES.map((type) => (
                                <div
                                    key={type.label}
                                    className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                                >
                                    <i
                                        className={`${type.icon} text-indigo-500`}
                                    />
                                    {type.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="fitur" className="mx-auto max-w-6xl px-6 py-20">
                    <Reveal className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold text-slate-900">
                            Semua yang Anda butuhkan
                            <br className="hidden sm:block" />
                            untuk mengelola toko
                        </h2>
                        <p className="mt-3 text-slate-500">
                            Dari transaksi di kasir hingga laporan keuangan,
                            semua tersedia dalam satu sistem yang terintegrasi.
                        </p>
                    </Reveal>

                    <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((feature, index) => (
                            <Reveal
                                key={feature.title}
                                delay={index * 80}
                            >
                                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-lg text-indigo-600">
                                        <i className={feature.icon} />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-slate-900">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-slate-500">
                                        {feature.description}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <section
                    id="cara-kerja"
                    className="border-y border-slate-200 bg-white py-20"
                >
                    <div className="mx-auto max-w-6xl px-6">
                        <Reveal className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold text-slate-900">
                                Mulai dalam 3 langkah mudah
                            </h2>
                            <p className="mt-3 text-slate-500">
                                Tidak perlu proses rumit untuk mulai
                                menggunakan Rancaka di toko Anda.
                            </p>
                        </Reveal>

                        <div className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
                            <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-slate-200 sm:block" />

                            {STEPS.map((step, index) => (
                                <Reveal
                                    key={step.title}
                                    delay={index * 120}
                                    className="relative text-center"
                                >
                                    <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white shadow-sm">
                                        {index + 1}
                                    </div>
                                    <h3 className="mt-5 text-base font-semibold text-slate-900">
                                        {step.title}
                                    </h3>
                                    <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">
                                        {step.description}
                                    </p>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="kenapa" className="mx-auto max-w-6xl px-6 py-20">
                    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                        <Reveal>
                            <span className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                                Kenapa Rancaka
                            </span>
                            <h2 className="mt-3 text-3xl font-bold text-slate-900">
                                Fokus jualan, urusan pencatatan
                                <br className="hidden sm:block" />
                                biar Rancaka yang bantu.
                            </h2>
                            <ul className="mt-6 space-y-4">
                                {BENEFITS.map((benefit) => (
                                    <li
                                        key={benefit}
                                        className="flex items-start gap-3 text-slate-600"
                                    >
                                        <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                            <i className="fi fi-rr-check text-[10px]" />
                                        </span>
                                        {benefit}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>

                        <Reveal delay={150}>
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-sm font-semibold text-slate-900">
                                    Ringkasan Tutup Shift
                                </p>
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                        <span className="text-sm text-slate-500">
                                            Kas Awal
                                        </span>
                                        <span className="text-sm font-semibold text-slate-900">
                                            Rp 500.000
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                        <span className="text-sm text-slate-500">
                                            Total Penjualan
                                        </span>
                                        <span className="text-sm font-semibold text-slate-900">
                                            Rp 3.240.000
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                                        <span className="text-sm text-emerald-700">
                                            Kas Akhir Sesuai
                                        </span>
                                        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                                            <i className="fi fi-rr-badge-check" />
                                            Rp 3.740.000
                                        </span>
                                    </div>
                                </div>
                                <p className="mt-4 text-center text-[11px] text-slate-400">
                                    *Tampilan ilustrasi ringkasan shift
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </section>

                <section
                    id="faq"
                    className="border-t border-slate-200 bg-white py-20"
                >
                    <div className="mx-auto max-w-3xl px-6">
                        <Reveal className="text-center">
                            <h2 className="text-3xl font-bold text-slate-900">
                                Pertanyaan yang sering diajukan
                            </h2>
                            <p className="mt-3 text-slate-500">
                                Masih ada yang ingin ditanyakan? Berikut
                                beberapa hal yang paling sering ditanyakan.
                            </p>
                        </Reveal>

                        <div className="mt-10 space-y-3">
                            {FAQS.map((faq, index) => (
                                <Reveal key={faq.question} delay={index * 60}>
                                    <details className="group rounded-xl border border-slate-200 bg-white p-5 open:shadow-sm">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900">
                                            {faq.question}
                                            <i className="fi fi-rr-angle-small-down flex-none text-slate-400 transition group-open:rotate-180" />
                                        </summary>
                                        <p className="mt-3 text-sm text-slate-500">
                                            {faq.answer}
                                        </p>
                                    </details>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-6 py-20">
                    <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-16 text-center text-white shadow-xl">
                        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />

                        <div className="relative z-10 mx-auto max-w-xl">
                            <h2 className="text-2xl font-bold sm:text-3xl">
                                Siap mengelola bisnis Anda dengan lebih baik?
                            </h2>
                            <p className="mt-3 text-indigo-100">
                                Masuk ke akun Anda dan mulai pantau
                                penjualan, stok, dan keuangan toko dari satu
                                dashboard. Ingin coba dulu? Gunakan akun demo
                                di halaman masuk.
                            </p>
                            <Link
                                href={route('register')}
                                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                            >
                                Daftar Sekarang
                                <i className="fi fi-rr-arrow-right" />
                            </Link>
                        </div>
                    </Reveal>
                </section>

                <footer className="border-t border-slate-200">
                    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
                        <div className="flex items-center gap-2.5">
                            <BrandLogo className="h-8 w-8" />
                            <span className="text-sm font-semibold text-slate-700">
                                Rancaka
                            </span>
                        </div>

                        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
                            <a
                                href="#fitur"
                                className="transition hover:text-indigo-600"
                            >
                                Fitur
                            </a>
                            <a
                                href="#cara-kerja"
                                className="transition hover:text-indigo-600"
                            >
                                Cara Kerja
                            </a>
                            <a
                                href="#faq"
                                className="transition hover:text-indigo-600"
                            >
                                FAQ
                            </a>
                        </nav>

                        <p className="text-sm text-slate-400">
                            &copy; {new Date().getFullYear()} Rancaka. All
                            rights reserved.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
