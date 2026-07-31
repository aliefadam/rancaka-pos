import Breadcrumb from '@/Components/Breadcrumb';
import AdminLayout from '@/Layouts/AdminLayout';
import StockAdjustmentModal from '@/Pages/Tenant/Stock/StockAdjustmentModal';
import StockHistoryModal from '@/Pages/Tenant/Stock/StockHistoryModal';
import StockInModal from '@/Pages/Tenant/Stock/StockInModal';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const LOW_STOCK_THRESHOLD = 5;

function initials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? num : num.toFixed(2);
}

function StockBadge({ item }) {
    if (item.track_stock === false) {
        return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                Tanpa stok
            </span>
        );
    }

    const stock = Number(item.stock);
    const unit = item.unit ?? 'pcs';
    const tone =
        stock <= 0
            ? 'bg-rose-50 text-rose-700'
            : stock <= LOW_STOCK_THRESHOLD
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700';

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
        >
            {formatQuantity(stock)} {unit}
        </span>
    );
}

export default function StockPage({
    items,
    filters,
    history,
    title,
    subtitle,
    entityLabel,
    fieldName,
    routes,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const [inOpen, setInOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const isFirstRun = useRef(true);
    const isHistoryFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                route(routes.index),
                search ? { search } : {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['items', 'filters'],
                },
            );
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const loadHistory = (historySearchValue, page) => {
        setHistoryLoading(true);
        router.reload({
            only: ['history'],
            data: {
                ...(search ? { search } : {}),
                history_search: historySearchValue,
                history_page: page,
            },
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setHistoryLoading(false),
        });
    };

    useEffect(() => {
        if (!historyOpen) return;
        if (isHistoryFirstRun.current) {
            isHistoryFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => loadHistory(historySearch, 1), 400);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historySearch]);

    const openHistory = () => {
        setHistoryOpen(true);
        loadHistory(historySearch, 1);
    };

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['items'],
            onFinish: () => setRefreshing(false),
        });
    };

    return (
        <AdminLayout header={title}>
            <Head title={title} />

            <Breadcrumb
                items={[
                    { label: 'Master Data' },
                    { label: 'Stok' },
                    { label: title },
                ]}
            />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={refresh}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <i
                            className={`fi fi-rr-refresh ${refreshing ? 'animate-spin' : ''}`}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setInOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <i className="fi fi-rr-box-open" />
                        Stok Masuk
                    </button>
                    <button
                        type="button"
                        onClick={() => setAdjustOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <i className="fi fi-rr-settings-sliders" />
                        Penyesuaian
                    </button>
                    <button
                        type="button"
                        onClick={openHistory}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        <i className="fi fi-rr-time-past" />
                        Riwayat
                    </button>
                </div>
            </div>

            <div className="relative mb-6 max-w-md">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <i className="fi fi-rr-search" />
                </span>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Cari ${entityLabel.toLowerCase()}...`}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/40"
                    >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">
                            {initials(item.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-800">
                                {item.name}
                            </p>
                            <div className="mt-1.5">
                                <StockBadge item={item} />
                            </div>
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                            <i className="fi fi-rr-box-open text-xl" />
                        </span>
                        <p className="mt-4 text-sm font-medium text-slate-600">
                            {entityLabel} tidak ditemukan
                        </p>
                    </div>
                )}
            </div>

            <StockInModal
                show={inOpen}
                onClose={() => setInOpen(false)}
                items={items}
                fieldName={fieldName}
                routeName={routes.in}
                entityLabel={entityLabel}
            />

            <StockAdjustmentModal
                show={adjustOpen}
                onClose={() => setAdjustOpen(false)}
                items={items}
                fieldName={fieldName}
                routeName={routes.adjustment}
                entityLabel={entityLabel}
            />

            <StockHistoryModal
                show={historyOpen}
                onClose={() => setHistoryOpen(false)}
                entityLabel={entityLabel}
                history={history}
                loading={historyLoading}
                search={historySearch}
                onSearchChange={setHistorySearch}
                onPageChange={(page) => loadHistory(historySearch, page)}
            />
        </AdminLayout>
    );
}
