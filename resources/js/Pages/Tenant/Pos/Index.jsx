import AdminLayout from '@/Layouts/AdminLayout';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { useToast } from '@/Contexts/ToastContext';
import CartPanel from '@/Pages/Tenant/Pos/CartPanel';
import CloseShiftModal from '@/Pages/Tenant/Pos/CloseShiftModal';
import HeldPanel from '@/Pages/Tenant/Pos/HeldPanel';
import { Dialog, Transition } from '@headlessui/react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

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

            const priceOption = product.price_options?.find(
                (option) => option.id === item.price_option_id,
            ) ?? product.price_options?.find((option) => option.is_default);

            if (!priceOption) return [];

            const maxQty = product.available_quantity ?? Infinity;
            const quantity = Math.min(
                Math.max(Number(item.quantity) || 1, 1),
                maxQty,
            );

            if (quantity <= 0) return [];

            return [
                {
                    product_id: product.id,
                    price_option_id: priceOption.id,
                    cart_key: `${product.id}:${priceOption.id}`,
                    name: product.name,
                    price_option_name: priceOption.name,
                    price: priceOption.price,
                    quantity,
                    note: typeof item.note === 'string' ? item.note : '',
                    discount_type:
                        item.discount_type === 'percentage' ? 'percentage' : 'fixed',
                    discount_value: String(item.discount_value ?? ''),
                    track_stock: product.track_stock,
                    stock: product.stock,
                    available_quantity: product.available_quantity,
                },
            ];
        });

        return {
            items,
            paymentMethod: ['cash', 'qris', 'online', 'credit'].includes(saved.paymentMethod)
                ? saved.paymentMethod
                : 'cash',
            discountType:
                saved.discountType === 'percentage' ? 'percentage' : 'fixed',
            discountValue: String(saved.discountValue ?? ''),
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

function itemDiscountAmount(item) {
    const gross = item.price * item.quantity;
    const value = Math.max(Math.trunc(Number(item.discount_value) || 0), 0);

    return Math.min(
        item.discount_type === 'percentage'
            ? Math.round(gross * (Math.min(value, 100) / 100))
            : value,
        gross,
    );
}

function ProductCard({ product, quantityInCart, onAdd }) {
    const tracksAvailability = product.available_quantity !== null;
    const outOfStock = tracksAvailability && product.available_quantity <= 0;

    return (
        <button
            type="button"
            onClick={() => !outOfStock && onAdd(product)}
            disabled={outOfStock}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                outOfStock
                    ? 'cursor-not-allowed border-slate-200 bg-gradient-to-br from-slate-200 to-slate-300 grayscale dark:border-slate-600 dark:from-slate-800 dark:to-slate-700'
                    : 'border-indigo-100 bg-gradient-to-br from-indigo-100 via-indigo-50 to-blue-100 hover:shadow-md hover:shadow-indigo-100 dark:border-indigo-400/30 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950 dark:hover:border-indigo-400/50 dark:hover:shadow-indigo-950/40'
            }`}
        >
            <span
                className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    !tracksAvailability
                        ? 'bg-white/70 text-slate-500'
                        : outOfStock
                          ? 'bg-white/70 text-slate-600'
                          : 'bg-emerald-100 text-emerald-700'
                }`}
            >
                {!tracksAvailability
                    ? 'Tanpa stok'
                    : outOfStock
                      ? 'Habis'
                      : `${product.available_quantity} tersedia`}
            </span>

            {quantityInCart > 0 && (
                <span className="absolute right-3 top-3 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
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
                <div className="min-w-0">
                    <span className="block truncate text-sm font-bold text-indigo-700">
                        {formatRupiah(product.price)}
                    </span>
                    {product.price_options.length > 1 && (
                        <span className="text-[10px] font-semibold text-indigo-500">
                            {product.price_options.length} pilihan harga
                        </span>
                    )}
                </div>
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
    heldTransactionCount,
    shiftSummary,
    storeSettings,
    creditCustomers,
}) {
    const toast = useToast();
    const { flash } = usePage().props;
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
    const [discountType, setDiscountType] = useState(
        () => restoredDraft?.discountType ?? 'fixed',
    );
    const [discountValue, setDiscountValue] = useState(
        () => restoredDraft?.discountValue ?? '',
    );
    const [additionalFee, setAdditionalFee] = useState(
        () => restoredDraft?.additionalFee ?? '',
    );
    const [amountReceived, setAmountReceived] = useState(
        () => restoredDraft?.amountReceived ?? '',
    );
    const [creditCustomerName, setCreditCustomerName] = useState('');
    const [creditInitialPayment, setCreditInitialPayment] = useState('0');
    const [processing, setProcessing] = useState(false);
    const [closeShiftOpen, setCloseShiftOpen] = useState(false);
    const [heldPanelOpen, setHeldPanelOpen] = useState(false);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [clearCartConfirmOpen, setClearCartConfirmOpen] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [pricePickerProduct, setPricePickerProduct] = useState(null);
    const [autoPrintMessage, setAutoPrintMessage] = useState('');
    const lastAutoPrintUrl = useRef('');

    const openShiftForm = useForm({ opening_cash: '' });

    const buildPrintBridgeUrl = () => {
        if (!flash?.bridge_receipt_url) return '';

        const receiptUrl = encodeURIComponent(flash.bridge_receipt_url);
        const fallbackUrl = encodeURIComponent(
            flash.receipt_url || window.location.href,
        );
        const isAndroid = /Android/i.test(window.navigator.userAgent);

        return isAndroid
            ? `intent://print?receipt_url=${receiptUrl}#Intent;scheme=rancaka-print;package=id.rancaka.printbridge;S.browser_fallback_url=${fallbackUrl};end`
            : `rancaka-print://print?receipt_url=${receiptUrl}`;
    };

    const openPrintBridge = ({ auto = false } = {}) => {
        const printBridgeUrl = buildPrintBridgeUrl();

        if (!printBridgeUrl) {
            toast.error('Link cetak Rancaka Print belum tersedia.');
            return;
        }

        if (auto) {
            setAutoPrintMessage('Mencoba membuka Rancaka Print otomatis...');
        }

        const link = document.createElement('a');
        link.href = printBridgeUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    useEffect(() => {
        if (!flash?.receipt_url) return;

        setShowSuccessModal(true);
        setAutoPrintMessage('');
    }, [flash?.receipt_url]);

    useEffect(() => {
        if (!flash?.bridge_receipt_url || !storeSettings.auto_print_receipt) {
            return;
        }

        if (lastAutoPrintUrl.current === flash.bridge_receipt_url) return;

        lastAutoPrintUrl.current = flash.bridge_receipt_url;
        openPrintBridge({ auto: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.bridge_receipt_url, storeSettings.auto_print_receipt]);

    useEffect(() => {
        if (!activeShift || typeof window === 'undefined') return;

        try {
            window.localStorage.setItem(
                cartStorageKey(activeShift.id),
                JSON.stringify({
                    items: cart,
                    paymentMethod,
                    discountType,
                    discountValue,
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
        discountType,
        discountValue,
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

    const subtotal = cart.reduce((sum, item) =>
        sum + item.price * item.quantity - itemDiscountAmount(item), 0);
    const numericDiscountValue = Math.max(
        Math.trunc(Number(discountValue) || 0),
        0,
    );
    const discountAmount = Math.min(
        discountType === 'percentage'
            ? Math.round(
                  subtotal * (Math.min(numericDiscountValue, 100) / 100),
              )
            : numericDiscountValue,
        subtotal,
    );
    const netSubtotal = subtotal - discountAmount;
    const taxAmount = Math.round(
        netSubtotal * (storeSettings.tax_percentage / 100),
    );
    const serviceChargeAmount = Math.round(
        netSubtotal * (storeSettings.service_charge_percentage / 100),
    );
    const total =
        netSubtotal +
        taxAmount +
        serviceChargeAmount +
        Number(additionalFee || 0);

    const changeDiscountType = (type) => {
        setDiscountType(type);
        setDiscountValue('');
    };

    const changeDiscountValue = (value) => {
        if (value === '') {
            setDiscountValue('');
            return;
        }

        const maximum = discountType === 'percentage' ? 100 : subtotal;
        const normalized = Math.min(
            Math.max(Math.trunc(Number(value) || 0), 0),
            maximum,
        );

        setDiscountValue(String(normalized));
    };

    useEffect(() => {
        if (discountValue === '') return;

        const maximum = discountType === 'percentage' ? 100 : subtotal;

        const normalized = Math.min(
            Math.max(Math.trunc(Number(discountValue) || 0), 0),
            maximum,
        );

        if (String(normalized) !== discountValue) {
            setDiscountValue(String(normalized));
        }
    }, [discountType, discountValue, subtotal]);

    const clearCart = () => {
        if (activeShift && typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem(cartStorageKey(activeShift.id));
            } catch {
                // Abaikan jika penyimpanan browser tidak tersedia.
            }
        }

        setCart([]);
        setDiscountType('fixed');
        setDiscountValue('');
        setAdditionalFee('');
        setAmountReceived('');
        setCreditCustomerName('');
        setCreditInitialPayment('0');
    };

    const confirmClearCart = () => {
        clearCart();
        setClearCartConfirmOpen(false);
        setMobileCartOpen(false);
        toast.success('Keranjang berhasil dikosongkan.');
    };

    const addSelectedPriceToCart = (product, priceOption) => {
        setCart((current) => {
            const cartKey = `${product.id}:${priceOption.id}`;
            const existing = current.find((i) => i.cart_key === cartKey);
            const maxQty = product.available_quantity ?? Infinity;
            const productQuantity = current
                .filter((item) => item.product_id === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

            if (maxQty <= 0 || productQuantity >= maxQty) return current;

            if (existing) {
                return current.map((i) =>
                    i.cart_key === cartKey
                        ? { ...i, quantity: i.quantity + 1 }
                        : i,
                );
            }

            return [
                ...current,
                {
                    product_id: product.id,
                    price_option_id: priceOption.id,
                    cart_key: cartKey,
                    name: product.name,
                    price_option_name: priceOption.name,
                    price: priceOption.price,
                    quantity: 1,
                    note: '',
                    discount_type: 'fixed',
                    discount_value: '',
                    track_stock: product.track_stock,
                    stock: product.stock,
                    available_quantity: product.available_quantity,
                },
            ];
        });
        setPricePickerProduct(null);
    };

    const addToCart = (product) => {
        if (product.price_options.length === 1) {
            addSelectedPriceToCart(product, product.price_options[0]);
            return;
        }

        setPricePickerProduct(product);
    };

    const incrementQty = (cartKey) => {
        setCart((current) =>
            current.map((i) => {
                if (i.cart_key !== cartKey) return i;
                const maxQty = i.available_quantity ?? Infinity;
                const productQuantity = current
                    .filter((item) => item.product_id === i.product_id)
                    .reduce((sum, item) => sum + item.quantity, 0);
                if (productQuantity >= maxQty) return i;
                return { ...i, quantity: i.quantity + 1 };
            }),
        );
    };

    const decrementQty = (cartKey) => {
        setCart((current) =>
            current
                .map((i) =>
                    i.cart_key === cartKey
                        ? {
                              ...i,
                              quantity: i.quantity - 1,
                              discount_value:
                                  i.discount_type === 'fixed' && i.discount_value !== ''
                                      ? String(Math.min(Number(i.discount_value), i.price * (i.quantity - 1)))
                                      : i.discount_value,
                          }
                        : i,
                )
                .filter((i) => i.quantity > 0),
        );
    };

    const updateQuantity = (cartKey, quantity) => {
        setCart((current) =>
            current.map((item) => {
                if (item.cart_key !== cartKey) return item;

                const maxQty = item.available_quantity ?? Infinity;
                const otherQuantity = current
                    .filter((candidate) => candidate.product_id === item.product_id && candidate.cart_key !== cartKey)
                    .reduce((sum, candidate) => sum + candidate.quantity, 0);
                const nextQuantity = Math.min(
                    Math.max(Number.parseInt(quantity, 10) || 1, 1),
                    Math.max(maxQty - otherQuantity, 1),
                );

                return {
                    ...item,
                    quantity: nextQuantity,
                    discount_value:
                        item.discount_type === 'fixed' && item.discount_value !== ''
                            ? String(Math.min(Number(item.discount_value), item.price * nextQuantity))
                            : item.discount_value,
                };
            }),
        );
    };

    const removeItem = (cartKey) => {
        setCart((current) => current.filter((i) => i.cart_key !== cartKey));
    };

    const updateNote = (cartKey, note) => {
        setCart((current) =>
            current.map((i) =>
                i.cart_key === cartKey ? { ...i, note } : i,
            ),
        );
    };

    const updateItemDiscount = (cartKey, type, value) => {
        setCart((current) => current.map((item) => {
            if (item.cart_key !== cartKey) return item;

            const gross = item.price * item.quantity;
            const maximum = type === 'percentage' ? 100 : gross;
            const normalized = value === ''
                ? ''
                : String(Math.min(Math.max(Math.trunc(Number(value) || 0), 0), maximum));

            return { ...item, discount_type: type, discount_value: normalized };
        }));
    };

    const buildPayload = () => ({
        items: cart.map((i) => ({
            product_id: i.product_id,
            price_option_id: i.price_option_id,
            quantity: i.quantity,
            note: i.note || null,
            discount_type: i.discount_value === '' ? null : i.discount_type,
            discount_value: Number(i.discount_value || 0),
        })),
        payment_method: paymentMethod,
        discount_type: discountValue === '' ? null : discountType,
        discount_value: Number(discountValue || 0),
        additional_fee: Number(additionalFee || 0),
        amount_received:
            paymentMethod === 'cash' && amountReceived !== ''
                ? Number(amountReceived)
                : null,
        credit_customer_id: paymentMethod === 'credit' ? (creditCustomers.find((c) => c.name.toLowerCase() === creditCustomerName.trim().toLowerCase())?.id ?? null) : null,
        credit_customer_name: paymentMethod === 'credit' ? creditCustomerName.trim() : null,
        credit_initial_payment: paymentMethod === 'credit' ? Math.min(Number(creditInitialPayment || 0), total) : null,
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
                toast.error(
                    errors.items ??
                        errors.discount_type ??
                        errors.discount_value ??
                        'Gagal menahan transaksi.',
                ),
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
                toast.error(
                    errors.items ??
                        errors.stock ??
                        errors.discount_type ??
                        errors.discount_value ??
                        errors.amount_received ??
                        errors.credit_customer_id ??
                        errors.credit_customer_name ??
                        'Gagal memproses pembayaran.',
                ),
            onFinish: () => setProcessing(false),
        });
    };

    const resumeHeld = (held) => {
        const items = held.items.map((item) => {
            const product = products.find((p) => p.id === item.product_id);
            const priceOption = product?.price_options.find(
                (option) => option.id === item.product_price_option_id,
            ) ?? product?.price_options.find((option) => option.is_default);
            return {
                product_id: item.product_id,
                price_option_id: priceOption?.id ?? item.product_price_option_id,
                cart_key: `${item.product_id}:${priceOption?.id ?? item.product_price_option_id ?? 'default'}`,
                name: item.product_name,
                price_option_name: priceOption?.name ?? item.price_option_name,
                price: priceOption?.price ?? item.unit_price,
                quantity: item.quantity,
                note: item.note || '',
                discount_type: item.discount_type ?? 'fixed',
                discount_value: Number(item.discount_value || 0) > 0
                    ? String(item.discount_value)
                    : '',
                track_stock: product ? product.track_stock : false,
                stock: product ? product.stock : 0,
                available_quantity: product?.available_quantity ?? null,
            };
        });

        setCart(items);
        setPaymentMethod(held.payment_method ?? 'cash');
        setDiscountType(held.discount_type ?? 'fixed');
        setDiscountValue(
            Number(held.discount_value || 0) > 0
                ? String(held.discount_value)
                : '',
        );
        setAdditionalFee(
            Number(held.additional_fee || 0) > 0
                ? String(held.additional_fee)
                : '',
        );
        setAmountReceived('');
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
                                    <i className="fi fi-rr-spinner animate-spin" />
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
        onQuantityChange: updateQuantity,
        onRemove: removeItem,
        onNoteChange: updateNote,
        onItemDiscountChange: updateItemDiscount,
        paymentMethod,
        onPaymentMethodChange: setPaymentMethod,
        discountType,
        onDiscountTypeChange: changeDiscountType,
        discountValue,
        onDiscountValueChange: changeDiscountValue,
        discountAmount,
        additionalFee,
        onAdditionalFeeChange: setAdditionalFee,
        amountReceived,
        onAmountReceivedChange: setAmountReceived,
        creditCustomers,
        creditCustomerName,
        onCreditCustomerNameChange: setCreditCustomerName,
        creditInitialPayment,
        onCreditInitialPaymentChange: setCreditInitialPayment,
        subtotal,
        taxAmount,
        taxPercentage: storeSettings.tax_percentage,
        serviceChargeAmount,
        serviceChargePercentage: storeSettings.service_charge_percentage,
        total,
        processing,
        onClear: () => setClearCartConfirmOpen(true),
        onHold: handleHold,
        onPay: handlePay,
    };

    return (
        <AdminLayout header="Transaksi Baru">
            <Head title="Transaksi Baru" />

            <Transition appear show={showSuccessModal} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setShowSuccessModal(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95 translate-y-2"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                                        <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
                                            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-30" />
                                            <i className="fi fi-rr-check text-xl" />
                                        </div>
                                    </div>
                                    <Dialog.Title className="mt-4 text-lg font-bold text-slate-900">
                                        Transaksi Selesai!
                                    </Dialog.Title>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {storeSettings.auto_print_receipt
                                            ? 'Struk sedang dikirim ke Rancaka Print secara otomatis.'
                                            : 'Buka struk atau cetak menggunakan Rancaka Print.'}
                                    </p>

                                    <div className="mt-5 space-y-2.5">
                                        {autoPrintMessage && (
                                            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-left text-xs font-medium text-sky-700">
                                                {autoPrintMessage}
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => openPrintBridge()}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                        >
                                            <i className="fi fi-rr-print" />
                                            {storeSettings.auto_print_receipt
                                                ? 'Cetak ulang via Rancaka Print'
                                                : 'Cetak via Rancaka Print'}
                                        </button>

                                        {flash?.receipt_url && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    window.open(
                                                        flash.receipt_url,
                                                        '_blank',
                                                    )
                                                }
                                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                                            >
                                                <i className="fi fi-rr-receipt" />
                                                Buka Struk
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowSuccessModal(false)
                                            }
                                            className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

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
                            <i className="fi fi-rr-shop" />
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
                                    <i className="fi fi-rr-shopping-bag text-xl" />
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

            <Transition show={Boolean(pricePickerProduct)} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setPricePickerProduct(null)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="translate-y-3 scale-95 opacity-0"
                            enterTo="translate-y-0 scale-100 opacity-100"
                            leave="ease-in duration-150"
                            leaveFrom="translate-y-0 scale-100 opacity-100"
                            leaveTo="translate-y-3 scale-95 opacity-0"
                        >
                            <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20">
                                {pricePickerProduct && (
                                    <>
                                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 px-6 pb-6 pt-5 text-white">
                                            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border-[20px] border-white/10" />
                                            <button
                                                type="button"
                                                onClick={() => setPricePickerProduct(null)}
                                                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                                            >
                                                <i className="fi fi-rr-cross-small" />
                                            </button>
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">
                                                Pilih cara penjualan
                                            </p>
                                            <Dialog.Title className="mt-2 pr-10 text-2xl font-bold">
                                                {pricePickerProduct.name}
                                            </Dialog.Title>
                                            <p className="mt-1 text-sm text-indigo-100">
                                                Stok tetap berasal dari produk yang sama.
                                            </p>
                                        </div>

                                        <div className="space-y-2 p-4">
                                            {pricePickerProduct.price_options.map((option, index) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    autoFocus={index === 0}
                                                    onClick={() => addSelectedPriceToCart(pricePickerProduct, option)}
                                                    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/60 hover:shadow-md hover:shadow-indigo-100"
                                                >
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                                                        <i className={option.is_default ? 'fi fi-rr-star' : 'fi fi-rr-tag'} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-semibold text-slate-800">
                                                            {option.name}
                                                        </span>
                                                        {option.is_default && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                                                                Harga default
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-base font-extrabold text-indigo-700">
                                                        {formatRupiah(option.price)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition>

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
                                    <i className="fi fi-rr-cross-small" />
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
                heldCount={heldTransactionCount}
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
