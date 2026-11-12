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
                    name: "Langganan Toko",
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
                    name: "Sales",
                    href: "admin.sales.index",
                    icon: "fi-rr-handshake",
                },
                {
                    name: "Komisi",
                    href: "admin.sales.commissions",
                    icon: "fi-rr-coins",
                },
                {
                    name: "Koreksi Referral",
                    href: "admin.sales.referral-correction",
                    icon: "fi-rr-arrows-repeat",
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
        {
            group: "Sistem",
            items: [
                {
                    name: "Branding Aplikasi",
                    href: "admin.branding.edit",
                    icon: "fi-rr-picture",
                },
                {
                    name: "Versi Aplikasi",
                    href: "admin.version.index",
                    icon: "fi-rr-code-branch",
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
    owner: [],
    employee: [],
};

const tenantNavigation = [
    {
        name: "Beranda",
        href: "tenant.dashboard",
        icon: "fi-rr-home",
        permission: "dashboard.view",
    },
    {
        name: "Kasir",
        icon: "fi-rr-cash-register",
        children: [
            { name: "Jualan", href: "tenant.pos.index" },
            { name: "Riwayat transaksi", href: "tenant.reports.transactions.index", permission: "transactions.view" },
            { name: "Penjualan bon (kredit)", href: "tenant.credit-sales.index", activePattern: "tenant.credit-sales.*", module: "credit" },
            { name: "Sesi kasir", href: "tenant.reports.shifts.index", permission: "shift-reports.view" },
        ],
    },
    {
        name: "Produk & Stok",
        icon: "fi-rr-boxes",
        children: [
            { name: "Produk", href: "tenant.products.index", permission: "products.view" },
            { name: "Kategori", href: "tenant.categories.index", permission: "categories.view" },
            { name: "Stok", href: "tenant.stock.products.index", activePatterns: ["tenant.stock.products.*", "tenant.stock.raw-materials.*"], permissions: ["stock-products.view", "stock-raw-materials.view"], alternateHref: "tenant.stock.raw-materials.index", alternatePermission: "stock-raw-materials.view" },
            { name: "Bahan baku", href: "tenant.raw-materials.index", permission: "raw-materials.view", module: "inventory" },
            { name: "Cek stok", href: "tenant.stock-opnames.index", activePattern: "tenant.stock-opnames.*", permission: "stock-opnames.view", module: "inventory" },
            { name: "Pindah stok", href: "tenant.stock-transfers.index", activePattern: "tenant.stock-transfers.*", permission: "stock-transfers.view", module: "inventory" },
        ],
    },
    {
        name: "Belanja & Biaya",
        icon: "fi-rr-shopping-cart",
        children: [
            { name: "Belanja stok", href: "tenant.purchases.index", activePattern: "tenant.purchases.*", permission: "purchases.view", module: "purchases" },
            { name: "Biaya operasional", href: "tenant.expenses.index", permission: "expenses.view", module: "expenses" },
            { name: "Hutang ke pemasok", href: "tenant.supplier-payables.index", permission: "supplier-payables.view", module: "purchases" },
            { name: "Pemasok", href: "tenant.suppliers.index", activePattern: "tenant.suppliers.*", permission: "suppliers.view", module: "purchases" },
        ],
    },
    {
        name: "Laporan",
        icon: "fi-rr-chart-histogram",
        children: [
            { name: "Untung-rugi", href: "tenant.reports.financial.index", inactiveHashes: ["#penjualan"] , permission: "financial-reports.view", module: "reports" },
            { name: "Laporan belanja", href: "tenant.reports.purchases.index", activePattern: "tenant.reports.purchases.*", permission: "purchases.view", module: "purchases" },
            { name: "Laporan penjualan", href: "tenant.reports.financial.index", hash: "#penjualan", permission: "financial-reports.view", module: "reports" },
        ],
    },
    {
        name: "Pengaturan",
        icon: "fi-rr-settings",
        ownerOnly: true,
        children: [
            { name: "Info toko", href: "tenant.settings.edit", inactiveHashes: ["#struk-pajak"] },
            { name: "Struk & pajak", href: "tenant.settings.edit", hash: "#struk-pajak" },
            { name: "Karyawan & akses", href: "tenant.employees.index", activePatterns: ["tenant.employees.*", "tenant.roles.*"], module: "team" },
            { name: "Cabang", href: "tenant.network.index", activePattern: "tenant.network.*", networkOnly: true },
            { name: "Langganan", href: "tenant.billing.index" },
        ],
    },
];

const itemIsActive = (item) => {
    const patterns = item.activePatterns ?? [item.activePattern ?? item.href];
    const routeMatches = patterns.some((pattern) => route().current(pattern));
    if (!routeMatches) return false;

    const hash = typeof window === "undefined" ? "" : window.location.hash;
    if (item.hash) return hash === item.hash;
    return !(item.inactiveHashes ?? []).includes(hash);
};

const itemUrl = (item) => `${route(item.href)}${item.hash ?? ""}`;

const SidebarContent = ({ navigation, onClose, version }) => (
    <>
        <div className="app-sidebar-brand flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5">
            <BrandLogo className="h-10 w-36 justify-start" />
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
                            const active = item.children?.some(itemIsActive) ?? itemIsActive(item);
                            return (
                                <Link
                                    key={item.name}
                                    href={itemUrl(item)}
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

        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
            <p
                className="text-[10px] font-medium tracking-wide text-slate-400"
                title="Versi aplikasi (MAJOR.MINOR.PATCH)"
            >
                Rancaka v{version}
            </p>
        </div>
    </>
);

export default function AdminLayout({ children }) {
    const page = usePage();
    const { app: appInfo, auth, flash } = page.props;
    const user = auth.user;
    const impersonation = auth.impersonation;
    const supplierPayableNotifications = Number(
        auth.supplier_payable_notifications ?? 0,
    );
    const navigation = useMemo(() => {
        if (user.role === "owner" || user.role === "employee") {
            const permissions = auth.permissions ?? [];
            const tenantUi = page.props.tenant_ui;
            const enabledModules = new Set(tenantUi?.enabled_modules ?? []);
            const moduleIsVisible = (item) => (
                tenantUi?.mode !== "simple" ||
                !item.module ||
                enabledModules.has(item.module)
            );
            const canOpen = (item) => {
                if (item.ownerOnly && user.role !== "owner") return false;
                if (item.networkOnly && !page.props.features?.branch_network) return false;
                if (!moduleIsVisible(item)) return false;
                if (!route().has(item.href)) return false;
                if (user.role !== "employee") return true;
                if (item.permission) return permissions.includes(item.permission);
                if (item.permissions) return item.permissions.some((permission) => permissions.includes(permission));
                return true;
            };
            const items = tenantNavigation
                .filter((item) => !item.ownerOnly || user.role === "owner")
                .map((item) => {
                    if (!item.children) return item;
                    const children = item.children
                        .map((child) => {
                            if (
                                user.role === "employee" &&
                                child.permission === undefined &&
                                child.permissions &&
                                !permissions.includes(child.permissions[0]) &&
                                child.alternateHref &&
                                permissions.includes(child.alternatePermission)
                            ) {
                                return { ...child, href: child.alternateHref };
                            }
                            return child;
                        })
                        .filter(canOpen);
                    return children.length
                        ? { ...item, href: children[0].href, children }
                        : null;
                })
                .filter((item) => item && canOpen(item));

            return [{ group: "Menu Utama", items }];
        }

        const sections = navigationByRole[user.role] ?? [];
        const availableSections = sections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => route().has(item.href) && (!item.networkOnly || page.props.features?.branch_network)),
            }))
            .filter((section) => section.items.length > 0);

        return availableSections;
    }, [auth.permissions, page.props.features?.branch_network, page.props.tenant_ui, user.role]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [currentHash, setCurrentHash] = useState(() =>
        typeof window === "undefined" ? "" : window.location.hash,
    );
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

    useEffect(() => {
        const updateHash = () => setCurrentHash(window.location.hash);
        window.addEventListener("hashchange", updateHash);
        updateHash();
        return () => window.removeEventListener("hashchange", updateHash);
    }, [page.url]);

    const searchableItems = useMemo(
        () =>
            navigation.flatMap((section) =>
                section.items.flatMap((item) =>
                    (item.children ?? [item]).map((child) => ({
                        ...child,
                        icon: child.icon ?? item.icon,
                        group: item.children ? item.name : section.group,
                    })),
                ),
            ),
        [navigation],
    );
    const contextNavigation = useMemo(
        () => navigation.flatMap((section) => section.items).find((item) => item.children?.some(itemIsActive)),
        [navigation, page.url, currentHash],
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
        router.visit(itemUrl(item));
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
                    version={appInfo.version}
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
                                version={appInfo.version}
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
                        <div className="relative hidden w-64 sm:block md:w-72 lg:w-80">
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
                                <div className="app-popover absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                    {searchResults.length === 0 ? (
                                        <p className="px-4 py-3 text-sm text-slate-400">
                                            Menu tidak ditemukan.
                                        </p>
                                    ) : (
                                        <div className="max-h-72 overflow-y-auto py-1">
                                            {searchResults.map((item) => (
                                                <button
                                                    key={`${item.href}${item.hash ?? ""}`}
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
                        {(user.role === "owner" || (auth.permissions ?? []).includes("supplier-payables.view")) && (
                            <Link
                                href={route("tenant.supplier-payables.index")}
                                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                                    supplierPayableNotifications > 0
                                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                                }`}
                                aria-label={`Hutang ke Pemasok${supplierPayableNotifications > 0 ? `, ${supplierPayableNotifications} tagihan perlu diperhatikan` : ""}`}
                                title="Hutang ke Pemasok"
                            >
                                <i className="fi fi-rr-file-invoice-dollar text-lg" />
                                {supplierPayableNotifications > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
                                        {supplierPayableNotifications > 99
                                            ? "99+"
                                            : supplierPayableNotifications}
                                    </span>
                                )}
                            </Link>
                        )}
                        <time
                            className="hidden min-w-[5.75rem] text-center text-xl font-light tabular-nums tracking-tight text-slate-700 sm:block"
                            dateTime={`${hours}:${minutes}:${seconds}`}
                            aria-label={`Pukul ${hours}:${minutes}:${seconds}`}
                            title="Waktu lokal"
                        >
                            {hours}:{minutes}:{seconds}
                        </time>

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
                            {(user.role === "owner" || user.role === "employee") && (
                                <>
                                    <Dropdown.Link href={route("account.edit")}>
                                        <span className="flex items-center gap-2">
                                            <i className="fi fi-rr-user" />
                                            Akun Saya
                                        </span>
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route("tenant.version.index")}>
                                        <span className="flex items-center gap-2">
                                            <i className="fi fi-rr-code-branch" />
                                            Versi Aplikasi
                                        </span>
                                    </Dropdown.Link>
                                </>
                            )}
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

                <main className="app-main p-4 sm:p-6">
                    {contextNavigation && (
                        <nav
                            className="mb-5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm"
                            aria-label={`Navigasi ${contextNavigation.name}`}
                        >
                            <div className="flex min-w-max gap-1">
                                {contextNavigation.children.map((item) => {
                                    const active = itemIsActive(item);
                                    return (
                                        <Link
                                            key={`${item.href}${item.hash ?? item.name}`}
                                            href={itemUrl(item)}
                                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                                                active
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </nav>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
