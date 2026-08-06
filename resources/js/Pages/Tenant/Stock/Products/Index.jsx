import StockPage from '@/Pages/Tenant/Stock/StockPage';

export default function Index({ items, filters, history }) {
    return (
        <StockPage
            items={items}
            filters={filters}
            history={history}
            title="Stok Produk"
            subtitle="Pantau jumlah stok produk saat ini."
            entityLabel="Produk"
            fieldName="product_id"
            permissionKey="stock-products"
            routes={{
                index: 'tenant.stock.products.index',
                in: 'tenant.stock.products.in',
                adjustment: 'tenant.stock.products.adjustment',
            }}
        />
    );
}
