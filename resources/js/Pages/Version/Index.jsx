import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, usePage } from '@inertiajs/react';

const versionLevels = [
    {
        key: 'MAJOR',
        example: '1.4.3 → 2.0.0',
        description: 'Perubahan besar atau perubahan yang tidak kompatibel.',
        color: 'border-rose-200 bg-rose-50 text-rose-700',
        marker: 'bg-rose-500',
    },
    {
        key: 'MINOR',
        example: '2.0.1 → 2.1.0',
        description: 'Fitur baru atau peningkatan fitur yang tetap kompatibel.',
        color: 'border-amber-200 bg-amber-50 text-amber-700',
        marker: 'bg-amber-500',
    },
    {
        key: 'PATCH',
        example: '2.0.0 → 2.0.1',
        description: 'Perbaikan bug tanpa menambahkan fitur baru.',
        color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        marker: 'bg-emerald-500',
    },
];

export default function Index() {
    const { app, auth } = usePage().props;
    const isAdmin = auth.user.role === 'superadmin';
    const canUseTenantDashboard =
        auth.user.role === 'owner' ||
        (auth.permissions ?? []).includes('dashboard.view');
    const [major, minor, patch] = app.version.split('.');
    const homeHref = isAdmin
        ? route('admin.dashboard')
        : canUseTenantDashboard
          ? route('tenant.dashboard')
          : route('tenant.pos.index');

    return (
        <AdminLayout header="Versi Aplikasi">
            <Head title="Versi Aplikasi" />

            <Breadcrumb
                items={[{ label: 'Sistem' }, { label: 'Versi Aplikasi' }]}
                homeHref={homeHref}
            />

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-300/30 sm:px-9 sm:py-10">
                <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-indigo-400/10" />
                <div className="absolute bottom-0 right-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

                <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <div className="mb-5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                                Versi aktif
                            </span>
                        </div>
                        <p className="text-sm font-medium text-slate-400">
                            {app.name} Point of Sale
                        </p>
                        <h1 className="mt-2 text-5xl font-extrabold tracking-[-0.06em] sm:text-7xl">
                            v{app.version}
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                            Nomor ini menunjukkan rilis sistem yang sedang Anda
                            gunakan. Semua pengguna dalam sistem memakai versi
                            aplikasi yang sama.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-sm">
                        {[
                            ['Major', major],
                            ['Minor', minor],
                            ['Patch', patch],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                className="min-w-20 rounded-xl bg-white/[0.06] px-4 py-3 text-center"
                            >
                                <p className="text-2xl font-bold tabular-nums">
                                    {value}
                                </p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-6">
                <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                        Semantic Versioning
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                        Cara membaca nomor versi
                    </h2>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {versionLevels.map((level, index) => (
                        <article
                            key={level.key}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50"
                        >
                            <span
                                className={`absolute inset-y-0 left-0 w-1 ${level.marker}`}
                            />
                            <div className="flex items-start justify-between gap-4">
                                <span
                                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-extrabold tracking-[0.15em] ${level.color}`}
                                >
                                    {level.key}
                                </span>
                                <span className="font-mono text-xs font-semibold text-slate-400">
                                    0{index + 1}
                                </span>
                            </div>
                            <p className="mt-5 font-mono text-sm font-bold text-slate-800">
                                {level.example}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {level.description}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <i className="fi fi-rr-info" />
                </span>
                <div>
                    <p className="font-semibold">Pembaruan dikelola terpusat</p>
                    <p className="mt-1 leading-6 text-indigo-700">
                        Nomor versi berubah setelah pembaruan sistem dirilis.
                        Tenant tidak perlu melakukan pembaruan secara manual.
                    </p>
                </div>
            </div>
        </AdminLayout>
    );
}
