import AdminLayout from '@/Layouts/AdminLayout';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { useToast } from '@/Contexts/ToastContext';
import CartPanel from '@/Pages/Tenant/Pos/CartPanel';
import CloseShiftModal from '@/Pages/Tenant/Pos/CloseShiftModal';
import HeldPanel from '@/Pages/Tenant/Pos/HeldPanel';
import { Dialog, Transition } from '@headlessui/react';
import { Head, router, useForm } from '@inertiajs/react';
import { Fragment, useEffect, useMemo, useState } from 'react';

const cartStorageKey = (shiftId) => `pos-cart-draft:${shiftId}`;

function restoreCartDraft(activeShift, products) {
    if (!activeShift || typeof window === 'undefined') return null;

    try {
        const saved = JSON.parse(
            window.localStorage.getItem(cartStorageKey(activeShift.id)),
        );

        if (!saved || !Array.isArray(saved.items)) return null;

        const items = saved.items.flatMap((item) => {
            const product = products.find(
                (candidate) => candidate.id === item.product_id,
            );

            if (!product) return [];

            const maxQty = product.track_stock ? product.stock : Infinity;
            const quantity = Math.min(
                Math.max(Number(item.quantity) || 1, 1),
                maxQty,
            );

            if (quantity <= 0) return [];

            return [
                {
                    product_id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity,
                    note: typeof item.note === 'string' ? item.note : '',
                    track_stock: product.track_stock,
                    stock: product.stock,
                },
            ];
        });

        return {
            items,
            paymentMethod:
                saved.paymentMethod === 'qris' ? 'qris' : 'cash',
            additionalFee: String(saved.additionalFee ?? ''),
            amountReceived: String(saved.amountReceived ?? ''),
        };
    } catch {
        return null;
    }
}

function initials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDateTime(value) {
    return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ProductCard({ product, quantityInCart, onAdd }) {
    const outOfStock = product.track_stock && product.stock <= 0;

    return (
        <button
            type="button"
            onClick={() => !outOfStock && onAdd(product)}
            disabled={outOfStock}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                outOfStock
                    ? 'cursor-not-allowed border-slate-200 bg-gradient-to-br from-slate-200 to-slate-300 grayscale'
                    : 'border-indigo-100 bg-gradient-to-br from-indigo-100 via-indigo-50 to-blue-100 hover:shadow-md hover:shadow-indigo-100'
            }`}
        >
            <span
                className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    !product.track_stock
                        ? 'bg-white/70 text-slate-500'
                        : outOfStock
                          ? 'bg-white/70 text-slate-600'
                          : 'bg-emerald-100 text-emerald-700'
                }`}
            >
                {!product.track_stock
                    ? 'Tanpa stok'
                    : outOfStock
                      ? 'Habis'
                      : `${product.stock} pcs`}
            </span>

            {quantityInCart > 0 && (
                <span className="absolute right-3 top-3 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {quantityInCart}
                </span>
            )}

            <div className="flex h-24 items-center justify-center pt-4">
                <span className="text-4xl font-extrabold text-indigo-600">
                    {initials(product.name)}
                </span>
            </div>

            <p className="mt-3 truncate text-sm font-semibold text-slate-800">
                {product.name}
            </p>
            <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-700">
                    {formatRupiah(product.price)}
                </span>
                {outOfStock ? (
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                        Habis
                    </span>
                ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white transition group-hover:scale-110">
                        <i className="fi fi-rr-plus text-[10px]" />
                    </span>
                )}
            </div>
        </button>
    );
}

export default function Index({
    activeShift,
    products,
    categories,
    heldTransactions,
    shiftSummary,
}) {
    const toast = useToast();
    const restoredDraft = useMemo(
        () => restoreCartDraft(activeShift, products),
        [activeShift, products],
    );

    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [cart, setCart] = useState(() => restoredDraft?.items ?? []);
    const [paymentMethod, setPaymentMethod] = useState(
        () => restoredDraft?.paymentMethod ?? 'cash',
    );
    const [additionalFee, setAdditionalFee] = useState(
        () => restoredDraft?.additionalFee ?? '',
    );
    const [amountReceived, setAmountReceived] = useState(
        () => restoredDraft?.amountReceived ?? '',
    );
    const [processing, setProcessing] = useState(false);
    const [closeShiftOpen, setCloseShiftOpen] = useState(false);
    const [heldPanelOpen, setHeldPanelOpen] = useState(false);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [clearCartConfirmOpen, setClearCartConfirmOpen] = useState(false);

    const openShiftForm = useForm({ opening_cash: '' });

    useEffect(() => {
        if (!activeShift || typeof window === 'undefined') return;

        try {
            window.localStorage.setItem(
                cartStorageKey(activeShift.id),
                JSON.stringify({
                    items: cart,
                    paymentMethod,
                    additionalFee,
                    amountReceived,
                }),
            );
        } catch {
            // Transaksi tetap dapat berjalan jika penyimpanan browser dibatasi.
        }
    }, [
        activeShift,
        additionalFee,
        amountReceived,
        cart,
        paymentMethod,
    ]);

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch = !q || product.name.toLowerCase().includes(q);
            const matchesCategory =
                !selectedCategory ||
                String(product.category_id) === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [products, search, selectedCategory]);

    const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );
    const total = subtotal + Number(additionalFee || 0);

    const clearCart = () => {
        if (activeShift && typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem(
                    cartStorageKey(activeShift.id),
                );
            } catch {
                // Abaikan jika penyimpanan browser tidak tersedia.
            }
        }

        setCart([]);
        setAdditionalFee('');
        setAmountReceived('');
    };

    const confirmClearCart = () => {
        clearCart();
        setClearCartConfirmOpen(false);
        setMobileCartOpen(false);
        toast.success('Keranjang berhasil dikosongkan.');
    };

    const addToCart = (product) => {
        setCart((current) => {
            const existing = current.find((i) => i.product_id === product.id);
            const maxQty = product.track_stock ? product.stock : Infinity;

            if (existing) {
                if (existing.quantity >= maxQty) return current;
                return current.map((i) =>
                    i.product_id === product.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i,
                );
            }

            return [
                ...current,
                {
                    product_id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    note: '',
                    track_stock: product.track_stock,
                    stock: product.stock,
                },
            ];
        });
    };

    const incrementQty = (productId) => {
        setCart((current) =>
            current.map((i) => {
                if (i.product_id !== productId) return i;
                const maxQty = i.track_stock ? i.stock : Infinity;
                if (i.quantity >= maxQty) return i;
                return { ...i, quantity: i.quantity + 1 };
            }),
        );
    };

    const decrementQty = (productId) => {
        setCart((current) =>
            current
                .map((i) =>
                    i.product_id === productId
                        ? { ...i, quantity: i.quantity - 1 }
                        : i,
                )
                .filter((i) => i.quantity > 0),
        );
    };

    const removeItem = (productId) => {
        setCart((current) =>
            current.filter((i) => i.product_id !== productId),
        );
    };

    const updateNote = (productId, note) => {
        setCart((current) =>
            current.map((i) =>
                i.product_id === productId ? { ...i, note } : i,
            ),
        );
    };

    const buildPayload = () => ({
        items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            note: i.note || null,
        })),
        payment_method: paymentMethod,
        additional_fee: Number(additionalFee || 0),
        amount_received:
            paymentMethod === 'cash' && amountReceived !== ''
                ? Number(amountReceived)
                : null,
    });

    const handleHold = () => {
        setProcessing(true);
        router.post(route('tenant.pos.hold'), buildPayload(), {
            preserveScroll: true,
            onSuccess: () => {
                clearCart();
                setMobileCartOpen(false);
                toast.success('Transaksi ditahan.');
            },
            onError: (errors) =>
                toast.error(errors.items ?? 'Gagal menahan transaksi.'),
            onFinish: () => setProcessing(false),
        });
    };

    const handlePay = () => {
        setProcessing(true);
        router.post(route('tenant.pos.checkout'), buildPayload(), {
            preserveScroll: true,
            onSuccess: () => {
                clearCart();
                setMobileCartOpen(false);
                toast.success('Pembayaran berhasil.');
            },
            onError: (errors) =>
                toast.error(errors.items ?? 'Gagal memproses pembayaran.'),
            onFinish: () => setProcessing(false),
        });
    };

    const resumeHeld = (held) => {
        const items = held.items.map((item) => {
            const product = products.find((p) => p.id === item.product_id);
            return {
                product_id: item.product_id,
                name: item.product_name,
                price: product ? product.price : item.unit_price,
                quantity: item.quantity,
                note: item.note || '',
                track_stock: product ? product.track_stock : false,
                stock: product ? product.stock : 0,
            };
        });

        setCart(items);
        setHeldPanelOpen(false);
        router.delete(route('tenant.pos.held.destroy', held.id), {
            preserveScroll: true,
            preserveState: true,
            only: ['heldTransactions'],
        });
    };

    const discardHeld = (held) => {
        router.delete(route('tenant.pos.held.destroy', held.id), {
            preserveScroll: true,
            preserveState: true,
            only: ['heldTransactions'],
            onSuccess: () => toast.success('Transaksi ditahan dihapus.'),
        });
    };

    const submitOpenShift = (e) => {
        e.preventDefault();
        openShiftForm.post(route('tenant.shift.open'), {
            preserveScroll: true,
        });
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (!activeShift) {
        return (
            <AdminLayout header="Transaksi Baru">
                <Head title="Transaksi Baru" />

                <h2 className="text-2xl font-bold text-slate-900">
                    Transaksi Baru
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Pilih produk lalu proses pembayaran.
                </p>

                <div className="flex items-center justify-center py-10">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm shadow-slate-200/40">
                        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
                            <i className="fi fi-rr-cash-register" />
                        </span>
                        <h3 className="mt-5 text-lg font-bold text-slate-900">
                            Buka Shift Dulu
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Masukkan modal awal kas di laci sebelum mulai
                            bertransaksi.
                        </p>

                        <form
                            onSubmit={submitOpenShift}
                            className="mt-6 text-left"
                        >
                            <label
                                htmlFor="opening_cash"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Modal Awal Kas (Rp)
                            </label>
                            <input
                                id="opening_cash"
                                type="number"
                                min="0"
                                value={openShiftForm.data.opening_cash}
                                onChange={(e) =>
                                    openShiftForm.setData(
                                        'opening_cash',
                                        e.target.value,
                                    )
                                }
                                placeholder="0"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {openShiftForm.errors.opening_cash && (
                                <p className="mt-1.5 text-sm text-red-600">
                                    {openShiftForm.errors.opening_cash}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={openShiftForm.processing}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {openShiftForm.processing ? (
                                    <i className="fi fi-sr-spinner animate-spin" />
                                ) : (
                                    <i className="fi fi-rr-unlock" />
                                )}
                                Buka Shift
                            </button>
                        </form>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const cartPanelProps = {
        items: cart,
        onIncrement: incrementQty,
        onDecrement: decrementQty,
        onRemove: removeItem,
        onNoteChange: updateNote,
        paymentMethod,
        onPaymentMethodChange: setPaymentMethod,
        additionalFee,
        onAdditionalFeeChange: setAdditionalFee,
        amountReceived,
        onAmountReceivedChange: setAmountReceived,
        subtotal,
        total,
        processing,
        onClear: () => setClearCartConfirmOpen(true),
        onHold: handleHold,
        onPay: handlePay,
    };

    return (
        <AdminLayout header="Transaksi Baru">
            <Head title="Transaksi Baru" />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                Transaksi Baru
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Pilih produk lalu proses pembayaran.
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            <i className="fi fi-sr-shop" />
                            Shift aktif sejak{' '}
                            {formatDateTime(activeShift.opened_at)}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCloseShiftOpen(true)}
                            className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95"
                        >
                            <i className="fi fi-rr-power" />
                            Tutup Shift
                        </button>
                        <button
                            type="button"
                            onClick={() => setHeldPanelOpen(true)}
                            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
                        >
                            <i className="fi fi-rr-clock" />
                            Ditahan
                            {heldTransactions.length > 0 && (
                                <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                                    {heldTransactions.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="relative mt-6">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <i className="fi fi-rr-search" />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari produk..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm shadow-slate-200/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="scrollbar-thin mt-4 flex gap-2 overflow-x-auto pb-1">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('')}
                            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                                selectedCategory === ''
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Semua
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() =>
                                    setSelectedCategory(String(category.id))
                                }
                                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                                    selectedCategory === String(category.id)
                                        ? 'bg-indigo-600 text-white'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <i className={`fi ${category.icon}`} />
                                {category.name}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 xl:grid-cols-4 lg:pb-0">
                        {filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                quantityInCart={
                                    cart.find(
                                        (i) => i.product_id === product.id,
                                    )?.quantity ?? 0
                                }
                                onAdd={addToCart}
                            />
                        ))}

                        {filteredProducts.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                    <i className="fi fi-sr-shopping-bag text-xl" />
                                </span>
                                <p className="mt-4 text-sm font-medium text-slate-600">
                                    Produk tidak ditemukan
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-6rem)] lg:w-96 lg:shrink-0 lg:self-start">
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40">
                        <CartPanel {...cartPanelProps} />
                    </div>
                </aside>
            </div>

            {cart.length > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileCartOpen(true)}
                        className="flex w-full items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition active:scale-[0.98]"
                    >
                        <span className="flex items-center gap-2">
                            <i className="fi fi-rr-shopping-cart" />
                            {cartCount} item
                        </span>
                        <span>{formatRupiah(total)}</span>
                    </button>
                </div>
            )}

            <Transition show={mobileCartOpen} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50 lg:hidden"
                    onClose={() => setMobileCartOpen(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/40" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex items-end">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="translate-y-full"
                            enterTo="translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="translate-y-0"
                            leaveTo="translate-y-full"
                        >
                            <Dialog.Panel className="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white p-5 pt-3 shadow-xl">
                                <div className="mx-auto mb-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200" />
                                <button
                                    type="button"
                                    onClick={() => setMobileCartOpen(false)}
                                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <i className="fi fi-sr-cross-small" />
                                </button>
                                <CartPanel {...cartPanelProps} />
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition>

            <CloseShiftModal
                show={closeShiftOpen}
                onClose={() => setCloseShiftOpen(false)}
                summary={shiftSummary}
            />

            <HeldPanel
                show={heldPanelOpen}
                onClose={() => setHeldPanelOpen(false)}
                heldTransactions={heldTransactions}
                onResume={resumeHeld}
                onDiscard={discardHeld}
            />

            <ConfirmDialog
                show={clearCartConfirmOpen}
                onClose={() => setClearCartConfirmOpen(false)}
                onConfirm={confirmClearCart}
                title="Kosongkan keranjang?"
                message={`Semua ${cartCount} item akan dihapus dari keranjang dan tidak dapat dikembalikan.`}
                confirmText="Ya, Kosongkan"
            />
        </AdminLayout>
    );
}
