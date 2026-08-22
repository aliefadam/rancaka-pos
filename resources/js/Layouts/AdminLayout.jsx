import Dropdown from "@/Components/Dropdown";
import BrandLogo from "@/Components/BrandLogo";
import { useToast } from "@/Contexts/ToastContext";
import { Transition } from "@headlessui/react";
import { Link, router, usePage } from "@inertiajs/react";
import { Fragment, useEffect, useMemo, useState } from "react";

const navigationByRole = {
    superadmin: [
        {
            group: "Menu",
            items: [
                {
                    name: "Dashboard",
                    href: "admin.dashboard",
                    icon: "fi-rr-apps",
                },
            ],
        },
        {
            group: "SaaS",
            items: [
                {
                    name: "Tenant",
                    href: "admin.tenants.index",
                    activePattern: "admin.tenants.*",
                    icon: "fi-rr-building",
                },
                {
                    name: "Billing Tenant",
                    href: "admin.billing.index",
                    icon: "fi-rr-credit-card",
                },
                {
                    name: "Jaringan Cabang",
                    href: "admin.networks.index",
                    activePattern: "admin.networks.*",
                    icon: "fi-rr-chart-network",
                    networkOnly: true,
                },
                {
                    name: "Sales & Komisi",
                    href: "admin.sales.index",
                    icon: "fi-rr-handshake",
                },
            ],
        },
        {
            group: "Development",
            items: [
                {
                    name: "Development Tickets",
                    href: "admin.development-tickets.index",
                    activePattern: "admin.development-tickets.*",
                    icon: "fi-rr-ticket",
                },
                {
                    name: "Tim Developer",
                    href: "admin.developers.index",
                    icon: "fi-rr-users-alt",
                },
            ],
        },
    ],
    developer: [
        {
            group: "Development",
            items: [
                {
                    name: "Development Tickets",
                    href: "admin.development-tickets.index",
                    activePattern: "admin.development-tickets.*",
                    icon: "fi-rr-ticket",
                },
            ],
        },
    ],
    sales: [
        {
            group: "Sales",
            items: [
                {
                    name: "Dashboard Referral",
                    href: "sales.dashboard",
                    icon: "fi-rr-chart-network",
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
                    icon: "fi-rr-apps",
                    permission: "dashboard.view",
                },
            ],
        },
        {
            group: "Transaksi",
            items: [
                {
                    name: "Kasir",
                    href: "tenant.pos.index",
                    icon: "fi-rr-cash-register",
                },
                {
                    name: "Penjualan Kredit",
                    href: "tenant.credit-sales.index",
                    activePattern: "tenant.credit-sales.*",
                    icon: "fi-rr-hand-holding-usd",
                },
                {
                    name: "Pengeluaran",
                    href: "tenant.expenses.index",
                    icon: "fi-rr-money-bill-wave",
                    permission: "expenses.view",
                },
            ],
        },
        {
            group: "Master Data",
            items: [
                {
                    name: "Kategori",
                    href: "tenant.categories.index",
                    icon: "fi-rr-tags",
                    permission: "categories.view",
                },
                {
                    name: "Produk",
                    href: "tenant.products.index",
                    icon: "fi-rr-shopping-bag",
                    permission: "products.view",
                },
                {
                    name: "Bahan Baku",
                    href: "tenant.raw-materials.index",
                    icon: "fi-rr-box-open",
                    permission: "raw-materials.view",
                },
            ],
        },
        {
            group: "Stok",
            items: [
                {
                    name: "Stok Produk",
                    href: "tenant.stock.products.index",
                    icon: "fi-rr-box-open",
                    permission: "stock-products.view",
                },
                {
                    name: "Stok Bahan Baku",
                    href: "tenant.stock.raw-materials.index",
                    icon: "fi-rr-boxes",
                    permission: "stock-raw-materials.view",
                },
            ],
        },
        {
            group: "Laporan",
            items: [
                {
                    name: "Keuangan",
                    href: "tenant.reports.financial.index",
                    icon: "fi-rr-chart-pie-alt",
                    permission: "financial-reports.view",
                },
                {
                    name: "Riwayat Transaksi",
                    href: "tenant.reports.transactions.index",
                    icon: "fi-rr-receipt",
                    permission: "transactions.view",
                },
                {
                    name: "Riwayat Shift",
                    href: "tenant.reports.shifts.index",
                    icon: "fi-rr-time-past",
                    permission: "shift-reports.view",
                },
            ],
        },
        {
            group: "Tim",
            items: [
                {
                    name: "Karyawan",
                    href: "tenant.employees.index",
                    icon: "fi-rr-users",
                },
                {
                    name: "Role & Hak Akses",
                    href: "tenant.roles.index",
                    icon: "fi-rr-shield-check",
                },
            ],
        },
        {
            group: "Pengaturan",
            items: [
                {
                    name: "Jaringan Cabang",
                    href: "tenant.network.index",
                    activePattern: "tenant.network.*",
                    icon: "fi-rr-chart-network",
                    networkOnly: true,
                },
                {
                    name: "Pengaturan Toko",
                    href: "tenant.settings.edit",
                    icon: "fi-rr-settings",
                },
                {
                    name: "Billing",
                    href: "tenant.billing.index",
                    icon: "fi-rr-credit-card",
                },
                {
                    name: "Akun Saya",
                    href: "account.edit",
                    icon: "fi-rr-user",
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
                    icon: "fi-rr-apps",
                    permission: "dashboard.view",
                },
            ],
        },
        {
            group: "Transaksi",
            items: [
                {
                    name: "Kasir",
                    href: "tenant.pos.index",
                    icon: "fi-rr-cash-register",
                },
                {
                    name: "Penjualan Kredit",
                    href: "tenant.credit-sales.index",
                    activePattern: "tenant.credit-sales.*",
                    icon: "fi-rr-hand-holding-usd",
                },
                {
                    name: "Pengeluaran",
                    href: "tenant.expenses.index",
                    icon: "fi-rr-money-bill-wave",
                    permission: "expenses.view",
                },
            ],
        },
        {
            group: "Master Data",
            items: [
                {
                    name: "Kategori",
                    href: "tenant.categories.index",
                    icon: "fi-rr-tags",
                    permission: "categories.view",
                },
                {
                    name: "Produk",
                    href: "tenant.products.index",
                    icon: "fi-rr-shopping-bag",
                    permission: "products.view",
                },
                {
                    name: "Bahan Baku",
                    href: "tenant.raw-materials.index",
                    icon: "fi-rr-box-open",
                    permission: "raw-materials.view",
                },
            ],
        },
        {
            group: "Stok",
            items: [
                {
                    name: "Stok Produk",
                    href: "tenant.stock.products.index",
                    icon: "fi-rr-box-open",
                    permission: "stock-products.view",
                },
                {
                    name: "Stok Bahan Baku",
                    href: "tenant.stock.raw-materials.index",
                    icon: "fi-rr-boxes",
                    permission: "stock-raw-materials.view",
                },
            ],
        },
        {
            group: "Laporan",
            items: [
                {
                    name: "Keuangan",
                    href: "tenant.reports.financial.index",
                    icon: "fi-rr-chart-pie-alt",
                    permission: "financial-reports.view",
                },
                {
                    name: "Riwayat Transaksi",
                    href: "tenant.reports.transactions.index",
                    icon: "fi-rr-receipt",
                    permission: "transactions.view",
                },
                {
                    name: "Riwayat Shift",
                    href: "tenant.reports.shifts.index",
                    icon: "fi-rr-time-past",
                    permission: "shift-reports.view",
                },
            ],
        },
    ],
};

const SidebarContent = ({ navigation, onClose }) => (
    <>
        <div className="app-sidebar-brand flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5">
            <div className="flex min-w-0 items-center gap-3">
                <BrandLogo className="h-9 w-9" />
                <div className="min-w-0">
                    <p className="truncate text-[17px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
                        Rancaka
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Point of Sale
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup sidebar"
                title="Tutup sidebar"
            >
                <i className="fi fi-rr-cross-small" />
            </button>
        </div>

        <nav className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5">
            {navigation.map((section) => (
                <div key={section.group}>
                    <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {section.group}
                    </p>
                    <div className="mt-1.5 space-y-0.5">
                        {section.items.map((item) => {
                            const active = route().current(
                                item.activePattern ?? item.href,
                            );
                            return (
                                <Link
                                    key={item.name}
                                    href={route(item.href)}
                                    className={`app-nav-link group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                                        active
                                            ? "app-nav-link-active bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/40 ring-1 ring-inset ring-indigo-100/70"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                >
                                    {active && (
                                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-indigo-600" />
                                    )}
                                    <i
                                        className={`fi ${item.icon} w-5 shrink-0 text-center text-[15px] transition-colors ${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}
                                    />
                                    <span className="truncate">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    </>
);

export default function AdminLayout({ header, children }) {
    const page = usePage();
    const { auth, flash } = page.props;
    const user = auth.user;
    const impersonation = auth.impersonation;
    const navigation = useMemo(() => {
        const sections = navigationByRole[user.role] ?? [];
        const availableSections = sections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => route().has(item.href) && (!item.networkOnly || page.props.features?.branch_network)),
            }))
            .filter((section) => section.items.length > 0);

        if (user.role !== "employee") return availableSections;

        const permissions = auth.permissions ?? [];

        return availableSections
            .map((section) => ({
                ...section,
                items: section.items.filter(
                    (item) =>
                        !item.permission || permissions.includes(item.permission),
                ),
            }))
            .filter((section) => section.items.length > 0);
    }, [auth.permissions, page.props.features?.branch_network, user.role]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [stoppingImpersonation, setStoppingImpersonation] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window === "undefined") return false;

        return window.localStorage.getItem("rancaka-theme") === "dark";
    });
    const toast = useToast();

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
        window.localStorage.setItem(
            "rancaka-theme",
            darkMode ? "dark" : "light",
        );
    }, [darkMode]);

    const searchableItems = useMemo(
        () =>
            navigation.flatMap((section) =>
                section.items.map((item) => ({
                    ...item,
                    group: section.group,
                })),
            ),
        [navigation],
    );

    const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [];
        return searchableItems.filter((item) =>
            item.name.toLowerCase().includes(query),
        );
    }, [searchQuery, searchableItems]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (route().current("tenant.pos.index")) {
            setDesktopSidebarOpen(false);
            setSidebarOpen(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page.url]);

    const goToSearchResult = (item) => {
        setSearchQuery("");
        setSearchOpen(false);
        router.visit(route(item.href));
    };

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return (
        <div className="app-shell min-h-screen bg-slate-50 transition-colors duration-300">
            <aside
                className={`app-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white shadow-[4px_0_24px_rgba(15,23,42,0.025)] transition-transform duration-300 xl:flex ${
                    desktopSidebarOpen ? "xl:translate-x-0" : "xl:-translate-x-full"
                }`}
            >
                <SidebarContent
                    navigation={navigation}
                    onClose={() => setDesktopSidebarOpen(false)}
                />
            </aside>

            <Transition show={sidebarOpen} as={Fragment}>
                <div className="fixed inset-0 z-40 xl:hidden">
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
                            className="app-mobile-backdrop fixed inset-0 bg-slate-900/30 backdrop-blur-[2px]"
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
                        <aside className="app-sidebar fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
                            <SidebarContent
                                navigation={navigation}
                                onClose={() => setSidebarOpen(false)}
                            />
                        </aside>
                    </Transition.Child>
                </div>
            </Transition>

            <div
                className={`transition-all duration-300 ${desktopSidebarOpen ? "xl:pl-64" : "xl:pl-0"}`}
            >
                <div className="sticky top-0 z-20">
                    {impersonation && (
                        <div className="flex min-h-10 items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-900 sm:px-6">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-700 ring-1 ring-amber-200">
                                    <i className="fi fi-rr-eye" />
                                </span>
                                <p className="truncate text-xs sm:text-sm">
                                    <span className="font-semibold">Mode Impersonate</span>
                                    <span className="hidden text-amber-700 sm:inline">
                                        {' '}· Anda sedang mengakses{' '}
                                        <strong>{impersonation.tenant_name}</strong>
                                    </span>
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={stoppingImpersonation}
                                onClick={() => {
                                    setStoppingImpersonation(true);
                                    router.post(
                                        route('impersonation.stop'),
                                        {},
                                        {
                                            onFinish: () =>
                                                setStoppingImpersonation(false),
                                        },
                                    );
                                }}
                                className="flex shrink-0 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                            >
                                <i
                                    className={`fi ${stoppingImpersonation ? 'fi-rr-spinner animate-spin' : 'fi-rr-sign-out-alt'}`}
                                />
                                <span className="hidden sm:inline">Kembali ke Admin</span>
                                <span className="sm:hidden">Keluar</span>
                            </button>
                        </div>
                    )}

                <header className="app-topbar flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="flex items-center text-slate-400 hover:text-slate-600 xl:hidden"
                        >
                            <i className="fi fi-rr-menu-burger text-lg" />
                        </button>
                        {!desktopSidebarOpen && (
                            <button
                                type="button"
                                onClick={() => setDesktopSidebarOpen(true)}
                                className="hidden items-center text-slate-400 hover:text-slate-600 xl:flex"
                            >
                                <i className="fi fi-rr-menu-burger text-lg" />
                            </button>
                        )}
                        {header && (
                            <h1 className="hidden text-lg font-semibold text-slate-900 sm:block">
                                {header}
                            </h1>
                        )}

                        <div className="relative hidden w-64 sm:block">
                            <div className="relative">
                                <i className="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSearchOpen(true);
                                    }}
                                    onFocus={() => setSearchOpen(true)}
                                    onBlur={() =>
                                        setTimeout(
                                            () => setSearchOpen(false),
                                            150,
                                        )
                                    }
                                    placeholder="Cari menu..."
                                    className="app-topbar-search w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            {searchOpen && searchQuery.trim() !== "" && (
                                <div className="app-popover absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                    {searchResults.length === 0 ? (
                                        <p className="px-4 py-3 text-sm text-slate-400">
                                            Menu tidak ditemukan.
                                        </p>
                                    ) : (
                                        <div className="max-h-72 overflow-y-auto py-1">
                                            {searchResults.map((item) => (
                                                <button
                                                    key={item.href}
                                                    type="button"
                                                    onMouseDown={(e) =>
                                                        e.preventDefault()
                                                    }
                                                    onClick={() =>
                                                        goToSearchResult(item)
                                                    }
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
                                                >
                                                    <i
                                                        className={`fi ${item.icon} text-slate-400`}
                                                    />
                                                    <span>{item.name}</span>
                                                    <span className="ml-auto text-xs text-slate-300">
                                                        {item.group}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div
                            className="app-clock hidden h-10 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-2.5 shadow-sm shadow-slate-200/50 sm:flex"
                            aria-label={`Pukul ${hours}:${minutes}:${seconds}`}
                            title="Waktu lokal"
                        >
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[11px] text-indigo-600">
                                <i className="fi fi-rr-clock-three" />
                            </span>
                            <span className="font-mono text-[15px] font-semibold tabular-nums tracking-[0.04em] text-slate-700">
                                {hours}
                                <span className="mx-0.5 text-slate-300">:</span>
                                {minutes}
                            </span>
                            <span className="border-l border-slate-100 pl-2 font-mono text-xs font-medium tabular-nums text-slate-400">
                                {seconds}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setDarkMode((enabled) => !enabled)}
                            className={`app-theme-toggle flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600 ${darkMode ? 'app-theme-toggle-active' : ''}`}
                            aria-label={darkMode ? "Gunakan mode terang" : "Gunakan mode gelap"}
                            title={darkMode ? "Mode terang" : "Mode gelap"}
                        >
                            <i
                                className={`fi ${darkMode ? "fi-rr-brightness" : "fi-rr-moon"} text-lg`}
                            />
                        </button>

                        <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                    <i className="fi fi-rr-user" />
                                </span>
                                <span className="hidden sm:inline">
                                    {user.name}
                                </span>
                                <i className="fi fi-rr-angle-small-down text-xs text-slate-400" />
                            </button>
                        </Dropdown.Trigger>

                        <Dropdown.Content contentClasses="app-popover py-1 bg-white border border-slate-200">
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
                                    <i className="fi fi-rr-sign-out-alt" />
                                    Keluar
                                </span>
                            </Dropdown.Link>
                        </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>
                </div>

                <main className="app-main p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
