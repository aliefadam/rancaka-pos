import Dropdown from "@/Components/Dropdown";
import { useToast } from "@/Contexts/ToastContext";
import { Transition } from "@headlessui/react";
import { Link, usePage } from "@inertiajs/react";
import { Fragment, useEffect, useState } from "react";

const navigationByRole = {
    superadmin: [
        {
            group: "Menu",
            items: [
                {
                    name: "Dashboard",
                    href: "admin.dashboard",
                    icon: "fi-sr-apps",
                },
            ],
        },
        {
            group: "SaaS",
            items: [
                {
                    name: "Tenant",
                    href: "admin.tenants.index",
                    icon: "fi-sr-building",
                },
            ],
        },
    ],
    owner: [
        {
            group: "Menu",
            items: [
                {
                    name: "Dashboard",
                    href: "tenant.dashboard",
                    icon: "fi-sr-apps",
                },
            ],
        },
        {
            group: "Transaksi",
            items: [
                {
                    name: "Kasir",
                    href: "tenant.pos.index",
                    icon: "fi-sr-cash-register",
                },
                {
                    name: "Pengeluaran",
                    href: "tenant.expenses.index",
                    icon: "fi-sr-money-bill-wave",
                },
            ],
        },
        {
            group: "Master Data",
            items: [
                {
                    name: "Kategori",
                    href: "tenant.categories.index",
                    icon: "fi-sr-tags",
                },
                {
                    name: "Produk",
                    href: "tenant.products.index",
                    icon: "fi-sr-shopping-bag",
                },
                {
                    name: "Bahan Baku",
                    href: "tenant.raw-materials.index",
                    icon: "fi-sr-box-open",
                },
            ],
        },
        {
            group: "Stok",
            items: [
                {
                    name: "Stok Produk",
                    href: "tenant.stock.products.index",
                    icon: "fi-sr-box-open",
                },
                {
                    name: "Stok Bahan Baku",
                    href: "tenant.stock.raw-materials.index",
                    icon: "fi-sr-boxes",
                },
            ],
        },
        {
            group: "Laporan",
            items: [
                {
                    name: "Keuangan",
                    href: "tenant.reports.financial.index",
                    icon: "fi-sr-chart-pie-alt",
                },
                {
                    name: "Riwayat Transaksi",
                    href: "tenant.reports.transactions.index",
                    icon: "fi-sr-receipt",
                },
                {
                    name: "Riwayat Shift",
                    href: "tenant.reports.shifts.index",
                    icon: "fi-sr-time-past",
                },
            ],
        },
        {
            group: "Tim",
            items: [
                {
                    name: "Karyawan",
                    href: "tenant.employees.index",
                    icon: "fi-sr-users",
                },
            ],
        },
    ],
    employee: [
        {
            group: "Menu",
            items: [
                {
                    name: "Dashboard",
                    href: "tenant.dashboard",
                    icon: "fi-sr-apps",
                },
            ],
        },
        {
            group: "Transaksi",
            items: [
                {
                    name: "Kasir",
                    href: "tenant.pos.index",
                    icon: "fi-sr-cash-register",
                },
                {
                    name: "Pengeluaran",
                    href: "tenant.expenses.index",
                    icon: "fi-sr-money-bill-wave",
                },
            ],
        },
        {
            group: "Master Data",
            items: [
                {
                    name: "Kategori",
                    href: "tenant.categories.index",
                    icon: "fi-sr-tags",
                },
                {
                    name: "Produk",
                    href: "tenant.products.index",
                    icon: "fi-sr-shopping-bag",
                },
                {
                    name: "Bahan Baku",
                    href: "tenant.raw-materials.index",
                    icon: "fi-sr-box-open",
                },
            ],
        },
        {
            group: "Stok",
            items: [
                {
                    name: "Stok Produk",
                    href: "tenant.stock.products.index",
                    icon: "fi-sr-box-open",
                },
                {
                    name: "Stok Bahan Baku",
                    href: "tenant.stock.raw-materials.index",
                    icon: "fi-sr-boxes",
                },
            ],
        },
        {
            group: "Laporan",
            items: [
                {
                    name: "Keuangan",
                    href: "tenant.reports.financial.index",
                    icon: "fi-sr-chart-pie-alt",
                },
                {
                    name: "Riwayat Transaksi",
                    href: "tenant.reports.transactions.index",
                    icon: "fi-sr-receipt",
                },
                {
                    name: "Riwayat Shift",
                    href: "tenant.reports.shifts.index",
                    icon: "fi-sr-time-past",
                },
            ],
        },
    ],
};

export default function AdminLayout({ header, children }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const navigation = navigationByRole[user.role] ?? [];
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.success, flash?.error]);

    const SidebarContent = () => (
        <>
            <div className="flex h-16 shrink-0 items-center gap-3 px-6">
                <img
                    src="/logo.png"
                    alt="Logo Rancaka"
                    className="h-9 w-9 rounded-xl object-cover shadow-sm shadow-indigo-200"
                />
                <span className="text-lg font-bold text-slate-900">
                    Rancaka
                </span>
            </div>

            <nav className="scrollbar-thin mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
                {navigation.map((section) => (
                    <div key={section.group}>
                        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {section.group}
                        </p>
                        <div className="mt-2 space-y-1">
                            {section.items.map((item) => {
                                const active = route().current(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        href={route(item.href)}
                                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                                            active
                                                ? "bg-indigo-50 text-indigo-700"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                    >
                                        <i
                                            className={`fi ${item.icon} ${active ? "text-indigo-600" : "text-slate-400"}`}
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* <div className="px-3 pb-4">
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-400">
                    Rancaka Admin Panel
                </div>
            </div> */}
        </>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
                <SidebarContent />
            </aside>

            <Transition show={sidebarOpen} as={Fragment}>
                <div className="fixed inset-0 z-40 lg:hidden">
                    <Transition.Child
                        as={Fragment}
                        enter="transition-opacity ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div
                            className="fixed inset-0 bg-slate-900/30"
                            onClick={() => setSidebarOpen(false)}
                        />
                    </Transition.Child>

                    <Transition.Child
                        as={Fragment}
                        enter="transition-transform ease-out duration-300"
                        enterFrom="-translate-x-full"
                        enterTo="translate-x-0"
                        leave="transition-transform ease-in duration-200"
                        leaveFrom="translate-x-0"
                        leaveTo="-translate-x-full"
                    >
                        <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(false)}
                                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            >
                                <i className="fi fi-sr-cross-small" />
                            </button>
                            <SidebarContent />
                        </aside>
                    </Transition.Child>
                </div>
            </Transition>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="flex items-center text-slate-400 hover:text-slate-600 lg:hidden"
                        >
                            <i className="fi fi-sr-menu-burger text-lg" />
                        </button>
                        {header && (
                            <h1 className="text-lg font-semibold text-slate-900">
                                {header}
                            </h1>
                        )}
                    </div>

                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                    <i className="fi fi-sr-user" />
                                </span>
                                <span className="hidden sm:inline">
                                    {user.name}
                                </span>
                                <i className="fi fi-sr-angle-small-down text-xs text-slate-400" />
                            </button>
                        </Dropdown.Trigger>

                        <Dropdown.Content contentClasses="py-1 bg-white border border-slate-200">
                            <div className="border-b border-slate-100 px-4 py-2.5">
                                <p className="text-sm font-semibold text-slate-800">
                                    {user.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    @{user.username}
                                </p>
                            </div>
                            <Dropdown.Link
                                href={route("logout")}
                                method="post"
                                as="button"
                            >
                                <span className="flex items-center gap-2">
                                    <i className="fi fi-sr-sign-out-alt" />
                                    Keluar
                                </span>
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </header>

                <main className="p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
