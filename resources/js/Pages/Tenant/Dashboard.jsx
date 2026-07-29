import AdminLayout from "@/Layouts/AdminLayout";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const toneStyles = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
};

const avatarPalette = [
    "bg-indigo-50 text-indigo-600",
    "bg-blue-50 text-blue-600",
    "bg-emerald-50 text-emerald-600",
    "bg-amber-50 text-amber-600",
    "bg-rose-50 text-rose-600",
];

function initials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

function formatCompact(value) {
    return value >= 1000 ? `${value / 1000}k` : `${value}`;
}

export default function Dashboard() {
    const { greetingName, period, overview, weeklySales, topProducts } =
        usePage().props;

    const refresh = () => {
        router.reload({
            only: ["overview", "weeklySales", "topProducts", "period"],
        });
    };

    return (
        <AdminLayout header="Dashboard">
            <Head title="Dashboard" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        Halo, {greetingName}
                    </h2>
                    <p className="mt-1 max-w-xl text-sm text-slate-500">
                        Berikut ringkasan performa usaha Anda · {period}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={refresh}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                        <i className="fi fi-rr-refresh" />
                        Refresh
                    </button>
                    <Link
                        href={route('tenant.pos.index')}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
                    >
                        <i className="fi fi-sr-add" />
                        Transaksi Baru
                    </Link>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {overview.map((stat) => (
                    <div
                        key={stat.key}
                        className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40"
                    >
                        <span
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneStyles[stat.tone]}`}
                        >
                            <i className={`fi ${stat.icon} text-lg`} />
                        </span>
                        <p className="mt-4 text-2xl font-bold text-slate-900">
                            {stat.value}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Grafik Penjualan Mingguan
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Omset 7 hari terakhir
                            </p>
                        </div>
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                            <i className="fi fi-rs-signal-alt" />
                            Live
                        </span>
                    </div>

                    <div className="mt-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={weeklySales}
                                margin={{
                                    top: 8,
                                    right: 8,
                                    left: -16,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="salesFill"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#4f46e5"
                                            stopOpacity={0.25}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#4f46e5"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="4 6"
                                    stroke="#e2e8f0"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                                    tickFormatter={formatCompact}
                                />
                                <Tooltip
                                    labelFormatter={(_, payload) =>
                                        payload?.[0]?.payload?.date ?? ""
                                    }
                                    formatter={(value) => [
                                        `Rp ${value.toLocaleString("id-ID")}`,
                                        "Omset",
                                    ]}
                                    contentStyle={{
                                        borderRadius: 12,
                                        borderColor: "#e2e8f0",
                                        fontSize: 12,
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#4f46e5"
                                    strokeWidth={2.5}
                                    fill="url(#salesFill)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
                    <h3 className="text-sm font-semibold text-slate-900">
                        Produk Terlaris
                    </h3>
                    <div className="mt-4 space-y-1">
                        {topProducts.length === 0 && (
                            <div className="flex min-h-52 flex-col items-center justify-center px-4 text-center">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <i className="fi fi-sr-box-open" />
                                </span>
                                <p className="mt-3 text-sm font-medium text-slate-600">
                                    Belum ada produk terjual
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    Data 7 hari terakhir akan tampil di sini.
                                </p>
                            </div>
                        )}
                        {topProducts.map((product, index) => (
                            <div
                                key={product.name}
                                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50"
                            >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                                    {index + 1}
                                </span>
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarPalette[index % avatarPalette.length]}`}
                                >
                                    {initials(product.name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                        {product.name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {product.sold} terjual
                                    </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-slate-900">
                                    {product.revenue}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
