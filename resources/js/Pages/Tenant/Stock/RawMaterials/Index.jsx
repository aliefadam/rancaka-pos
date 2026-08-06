import StockPage from '@/Pages/Tenant/Stock/StockPage';

export default function Index({ items, filters, history }) {
    return (
        <StockPage
            items={items}
            filters={filters}
            history={history}
            title="Stok Bahan Baku"
            subtitle="Pantau jumlah stok bahan baku saat ini."
            entityLabel="Bahan Baku"
            fieldName="raw_material_id"
            permissionKey="stock-raw-materials"
            routes={{
                index: 'tenant.stock.raw-materials.index',
                in: 'tenant.stock.raw-materials.in',
                adjustment: 'tenant.stock.raw-materials.adjustment',
            }}
        />
    );
}
