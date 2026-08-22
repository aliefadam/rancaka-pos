import { Head, Link } from '@inertiajs/react';
import { useRef, useState } from 'react';

const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const paymentLabels = { cash: 'Tunai', qris: 'QRIS', online: 'Online', credit: 'Kredit' };

export default function Show({
    store,
    sale,
    bridge_receipt_url: bridgeReceiptUrl,
    back_url: backUrl,
}) {
    const is80mm = store.receipt_size === '80mm';
    const widthClass = is80mm ? 'max-w-[320px]' : 'max-w-[230px]';
    const receiptRef = useRef(null);
    const [downloadingFormat, setDownloadingFormat] = useState('');
    const [actionMessage, setActionMessage] = useState('');

    const openRancakaPrint = () => {
        if (!bridgeReceiptUrl) {
            setActionMessage(
                'Link cetak ulang belum tersedia. Muat ulang halaman lalu coba lagi.',
            );
            return;
        }

        const receiptUrl = encodeURIComponent(bridgeReceiptUrl);
        const fallbackUrl = encodeURIComponent(window.location.href);
        const isAndroid = /Android/i.test(window.navigator.userAgent);
        const printBridgeUrl = isAndroid
            ? `intent://print?receipt_url=${receiptUrl}#Intent;scheme=rancaka-print;package=id.rancaka.printbridge;S.browser_fallback_url=${fallbackUrl};end`
            : `rancaka-print://print?receipt_url=${receiptUrl}`;

        setActionMessage('Membuka aplikasi Rancaka Print...');
        window.location.assign(printBridgeUrl);
    };

    const captureReceipt = async () => {
        const { default: html2canvas } = await import('html2canvas');

        await document.fonts?.ready;
        await Promise.all(
            Array.from(receiptRef.current.querySelectorAll('img')).map(
                (image) =>
                    image.complete
                        ? Promise.resolve()
                        : image.decode?.().catch(() => undefined),
            ),
        );

        return html2canvas(receiptRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
        });
    };

    const downloadJpg = async () => {
        if (!receiptRef.current || downloadingFormat) return;

        setDownloadingFormat('jpg');
        setActionMessage('');

        try {
            const canvas = await captureReceipt();
            const link = document.createElement('a');
            const safeInvoice = sale.invoice_number.replace(
                /[^a-z0-9_-]+/gi,
                '-',
            );
            link.download = `struk-${safeInvoice}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
            setActionMessage('Struk JPG berhasil diunduh.');
        } catch (error) {
            console.error('Gagal membuat JPG struk.', error);
            setActionMessage(
                'Struk JPG gagal dibuat. Coba muat ulang halaman.',
            );
        } finally {
            setDownloadingFormat('');
        }
    };

    const downloadPdf = async () => {
        if (!receiptRef.current || downloadingFormat) return;

        setDownloadingFormat('pdf');
        setActionMessage('');

        try {
            const [{ jsPDF }, canvas] = await Promise.all([
                import('jspdf'),
                captureReceipt(),
            ]);
            const bounds = receiptRef.current.getBoundingClientRect();
            const paperWidth = is80mm ? 80 : 58;
            const margin = 2;
            const imageWidth = paperWidth - margin * 2;
            const imageHeight = Math.max(
                (bounds.height / bounds.width) * imageWidth,
                20,
            );
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [paperWidth, imageHeight + margin * 2],
                compress: true,
            });

            pdf.addImage(
                canvas.toDataURL('image/png'),
                'PNG',
                margin,
                margin,
                imageWidth,
                imageHeight,
                undefined,
                'FAST',
            );
            pdf.save(
                `struk-${sale.invoice_number.replace(/[^a-z0-9_-]+/gi, '-')}.pdf`,
            );
            setActionMessage('Struk PDF berhasil diunduh.');
        } catch (error) {
            console.error('Gagal membuat PDF struk.', error);
            setActionMessage(
                'Struk PDF gagal dibuat. Coba muat ulang halaman.',
            );
        } finally {
            setDownloadingFormat('');
        }
    };

    return (
        <>
            <Head title={`Struk ${sale.invoice_number}`} />

            <div className="receipt-page min-h-screen bg-white px-4 py-6 text-black">
                <div className="mx-auto mb-5 flex max-w-lg flex-wrap items-center justify-between gap-3 print:hidden">
                    <Link
                        href={
                            backUrl ||
                            route('tenant.reports.transactions.index')
                        }
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        <i className="fi fi-rr-arrow-left" />
                        {sale.receipt_type === 'credit_payment'
                            ? 'Detail Hutang'
                            : 'Riwayat'}
                    </Link>

                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                        <button
                            type="button"
                            onClick={downloadPdf}
                            disabled={Boolean(downloadingFormat)}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
                        >
                            <i
                                className={`fi ${downloadingFormat === 'pdf' ? 'fi-rr-spinner animate-spin' : 'fi-rr-file-pdf'}`}
                            />
                            {downloadingFormat === 'pdf' ? 'Membuat...' : 'PDF'}
                        </button>
                        <button
                            type="button"
                            onClick={downloadJpg}
                            disabled={Boolean(downloadingFormat)}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
                        >
                            <i
                                className={`fi ${downloadingFormat === 'jpg' ? 'fi-rr-spinner animate-spin' : 'fi-rr-download'}`}
                            />
                            {downloadingFormat === 'jpg' ? 'Membuat...' : 'JPG'}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
                        >
                            <i className="fi fi-rr-print" />
                            Browser
                        </button>
                        <button
                            type="button"
                            onClick={openRancakaPrint}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 sm:text-sm"
                        >
                            <i className="fi fi-rr-print" />
                            Rancaka Print
                        </button>
                    </div>
                </div>

                {actionMessage && (
                    <div className="mx-auto mb-3 max-w-lg rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 print:hidden">
                        {actionMessage}
                    </div>
                )}

                <div
                    ref={receiptRef}
                    className={`receipt-paper mx-auto ${widthClass} bg-white px-3 py-4 text-black print:p-0`}
                >
                    <div className="border-b border-dashed border-black pb-3 text-center">
                        {store.logo_url && (
                            <img
                                src={store.logo_url}
                                alt="Logo toko"
                                className="mx-auto mb-2 max-h-16 max-w-[120px] object-contain"
                            />
                        )}
                        <div className="text-base font-bold">{store.name}</div>
                        {store.phone && <div>{store.phone}</div>}
                        {store.address && <div>{store.address}</div>}
                    </div>

                    <div className="border-b border-dashed border-black py-3">
                        <div>No: {sale.invoice_number}</div>
                        <div>Tanggal: {sale.sold_at}</div>
                        <div>Kasir: {sale.cashier || '-'}</div>
                    </div>

                    {sale.receipt_type === 'credit_payment' ? (
                        <>
                            <div className="border-b border-dashed border-black py-3 text-center">
                                <div className="text-sm font-bold uppercase">
                                    Bukti Pembayaran Hutang
                                </div>
                                <div>{sale.payment_number}</div>
                            </div>

                            <div className="space-y-1 border-b border-dashed border-black py-3">
                                <div className="flex justify-between gap-2">
                                    <span>No. Transaksi</span>
                                    <span className="text-right">
                                        {sale.invoice_number}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span>Pelanggan</span>
                                    <span className="text-right">
                                        {sale.customer || '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span>Total Hutang</span>
                                    <span>{money(sale.total_credit)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span>Sisa Sebelumnya</span>
                                    <span>{money(sale.remaining_before)}</span>
                                </div>
                                <div className="flex justify-between gap-2 font-bold">
                                    <span>Pembayaran</span>
                                    <span>-{money(sale.payment_amount)}</span>
                                </div>
                                <div className="flex justify-between gap-2 border-t border-dashed border-black pt-1 font-bold">
                                    <span>Sisa Hutang</span>
                                    <span>{money(sale.remaining_after)}</span>
                                </div>
                                <div className="flex justify-between gap-2 uppercase">
                                    <span>Status</span>
                                    <span>
                                        {sale.is_paid ? 'Lunas' : 'Belum Lunas'}
                                    </span>
                                </div>
                                {sale.note && (
                                    <div className="pt-1 text-[11px]">
                                        Catatan: {sale.note}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                    {sale.is_void && (
                        <div className="border-b border-dashed border-black py-3 text-center">
                            <div className="text-sm font-bold uppercase">
                                TRANSAKSI VOID
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 border-b border-dashed border-black py-3">
                        {sale.items.map((item, index) => (
                            <div key={`${item.product_name}-${index}`}>
                                <div className="font-semibold">
                                    {item.product_name}
                                </div>
                                {item.price_option_name && (
                                    <div className="text-[11px]">{item.price_option_name}</div>
                                )}
                                <div className="flex justify-between gap-2">
                                    <span>
                                        {item.quantity} x{' '}
                                        {money(item.unit_price)}
                                    </span>
                                    <span>{money(item.line_total)}</span>
                                </div>
                                {item.discount_amount > 0 && (
                                    <div className="flex justify-between gap-2 text-[11px]">
                                        <span>
                                            Diskon item
                                            {item.discount_type === 'percentage'
                                                ? ` (${item.discount_value}%)`
                                                : ''}
                                        </span>
                                        <span>-{money(item.discount_amount)}</span>
                                    </div>
                                )}
                                {item.note && (
                                    <div className="text-[11px]">
                                        Catatan: {item.note}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1 border-b border-dashed border-black py-3">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{money(sale.subtotal)}</span>
                        </div>
                        {sale.discount_total > 0 && (
                            <div className="flex justify-between">
                                <span>
                                    Diskon
                                    {sale.discount_type === 'percentage'
                                        ? ` (${sale.discount_value}%)`
                                        : ''}
                                </span>
                                <span>-{money(sale.discount_total)}</span>
                            </div>
                        )}
                        {sale.tax_total > 0 && (
                            <div className="flex justify-between">
                                <span>Pajak</span>
                                <span>{money(sale.tax_total)}</span>
                            </div>
                        )}
                        {sale.service_charge_total > 0 && (
                            <div className="flex justify-between">
                                <span>Biaya layanan</span>
                                <span>{money(sale.service_charge_total)}</span>
                            </div>
                        )}
                        {sale.additional_fee > 0 && (
                            <div className="flex justify-between">
                                <span>Biaya tambahan</span>
                                <span>{money(sale.additional_fee)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>{money(sale.grand_total)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>
                                {sale.payment?.method === 'credit'
                                    ? 'Sudah dibayar'
                                    : 'Bayar'}
                            </span>
                            <span>{money(sale.payment?.paid_amount)}</span>
                        </div>
                        {sale.payment?.method === 'credit' ? (
                            <>
                                {sale.payment?.credit_customer && (
                                    <div className="flex justify-between gap-2">
                                        <span>Pelanggan</span>
                                        <span className="text-right">
                                            {sale.payment.credit_customer}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-dashed border-black pt-1 font-bold">
                                    <span>Sisa hutang</span>
                                    <span>
                                        {money(
                                            sale.payment?.remaining_amount,
                                        )}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between">
                                <span>Kembalian</span>
                                <span>{money(sale.payment?.change_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between uppercase">
                            <span>Metode</span>
                            <span>{paymentLabels[sale.payment?.method] ?? sale.payment?.method ?? '-'}</span>
                        </div>
                    </div>
                        </>
                    )}

                    <div className="pt-3 text-center">
                        <div>{store.receipt_footer || 'Terima kasih'}</div>
                        <div>Selamat datang kembali</div>
                    </div>
                </div>
            </div>
        </>
    );
}
