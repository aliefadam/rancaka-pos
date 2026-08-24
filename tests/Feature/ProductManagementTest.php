<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_store_product_without_stock_tracking_when_stock_is_empty(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Jasa Tanpa Stok',
                'category_id' => $category->id,
                'price' => 25_000,
                'cost' => 10_000,
                'margin_percentage' => 150,
                'track_stock' => false,
                'stock' => '',
                'is_active' => true,
                'ingredients' => [],
            ])
            ->assertRedirect(route('tenant.products.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Jasa Tanpa Stok',
            'track_stock' => false,
            'stock' => 0,
        ]);
    }

    public function test_tenant_can_store_a_price_above_unsigned_integer_range(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Produk Harga Tinggi',
                'category_id' => $category->id,
                'price' => 9_999_999_999,
                'cost' => 5_000_000_000,
                'margin_percentage' => 100,
                'track_stock' => false,
                'stock' => 0,
                'is_active' => true,
                'ingredients' => [],
            ])
            ->assertRedirect(route('tenant.products.index'));

        $this->assertDatabaseHas('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Produk Harga Tinggi',
            'price' => 9_999_999_999,
        ]);
    }

    public function test_price_above_supported_application_limit_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Produk Terlalu Mahal',
                'category_id' => $category->id,
                'price' => 1_000_000_000_000,
                'cost' => 500_000_000_000,
                'margin_percentage' => 100,
                'track_stock' => false,
                'stock' => 0,
                'is_active' => true,
                'ingredients' => [],
            ])
            ->assertSessionHasErrors('price');

        $this->assertDatabaseMissing('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Produk Terlalu Mahal',
        ]);
    }

    public function test_owner_can_download_product_import_template(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        Category::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Minuman']);

        $this->actingAs($owner)
            ->get(route('tenant.products.import.template'))
            ->assertOk()
            ->assertDownload('template-import-produk.xlsx');
    }

    public function test_product_cost_and_margin_are_stored(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Produk Margin',
                'category_id' => $category->id,
                'price' => 15000,
                'cost' => 10000,
                'margin_percentage' => 50,
                'track_stock' => false,
                'stock' => 0,
                'is_active' => true,
                'ingredients' => [],
            ])
            ->assertRedirect(route('tenant.products.index'));

        $this->assertDatabaseHas('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Produk Margin',
            'price' => 15000,
            'cost' => 10000,
            'margin_percentage' => 50,
        ]);
    }

    public function test_product_cost_cannot_exceed_selling_price(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post(route('tenant.products.store'), [
                'name' => 'Produk Rugi',
                'category_id' => $category->id,
                'price' => 9000,
                'cost' => 10000,
                'margin_percentage' => 0,
                'track_stock' => false,
                'stock' => 0,
                'is_active' => true,
                'ingredients' => [],
            ])
            ->assertSessionHasErrors('cost');

        $this->assertDatabaseMissing('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Produk Rugi',
        ]);
    }

    public function test_owner_can_import_products_from_excel(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        Category::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Minuman']);

        $file = $this->productImportFile([
            ['Kopi Susu', 'Minuman', 12000, 50, 18000, 'Ya', 12, 'Ya'],
            ['Air Mineral', 'Minuman', 4000, 25, 5000, 'Tidak', '', 'Ya'],
        ]);

        $this->actingAs($owner)
            ->post(route('tenant.products.import'), ['file' => $file])
            ->assertRedirect(route('tenant.products.index'))
            ->assertSessionHas('success', '2 produk berhasil diimport.');

        $this->assertDatabaseHas('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Kopi Susu',
            'price' => 18000,
            'cost' => 12000,
            'margin_percentage' => 50,
            'stock' => 12,
            'track_stock' => true,
        ]);
        $this->assertDatabaseHas('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Air Mineral',
            'stock' => 0,
            'track_stock' => false,
        ]);
    }

    public function test_import_reports_row_errors_and_saves_nothing(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        Category::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Makanan']);

        $file = $this->productImportFile([
            ['Produk Valid', 'Makanan', 8000, 25, 10000, 'Ya', 5, 'Ya'],
            ['Produk Salah', 'Kategori Tenant Lain', -1, -10, -1, 'Mungkin', -2, 'Aktif'],
        ]);

        $this->actingAs($owner)
            ->from(route('tenant.products.index'))
            ->post(route('tenant.products.import'), ['file' => $file])
            ->assertRedirect(route('tenant.products.index'))
            ->assertSessionHas('import_errors', function (array $errors) {
                return count($errors) === 1
                    && str_contains($errors[0], 'Baris 3')
                    && str_contains($errors[0], 'kategori tidak ditemukan')
                    && str_contains($errors[0], 'HPP harus bilangan bulat')
                    && str_contains($errors[0], 'margin harus berupa angka')
                    && str_contains($errors[0], 'harga jual harus bilangan bulat');
            });

        $this->assertDatabaseMissing('products', ['tenant_id' => $tenant->id, 'name' => 'Produk Valid']);
        $this->assertDatabaseMissing('products', ['tenant_id' => $tenant->id, 'name' => 'Produk Salah']);
    }

    public function test_import_rejects_margin_that_does_not_match_cost_and_selling_price(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id, 'role' => UserRole::Owner]);
        Category::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Makanan']);
        $file = $this->productImportFile([
            ['Produk Tidak Konsisten', 'Makanan', 10000, 20, 15000, 'Tidak', '', 'Ya'],
        ]);

        $this->actingAs($owner)
            ->post(route('tenant.products.import'), ['file' => $file])
            ->assertSessionHas('import_errors', fn (array $errors) => str_contains(
                $errors[0],
                'margin tidak sesuai dengan HPP dan harga jual',
            ));

        $this->assertDatabaseMissing('products', [
            'tenant_id' => $tenant->id,
            'name' => 'Produk Tidak Konsisten',
        ]);
    }

    private function productImportFile(array $rows): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(['nama_produk', 'kategori', 'hpp', 'margin_persen', 'harga_jual', 'gunakan_stok', 'stok', 'status_aktif'], null, 'A1');
        $sheet->fromArray($rows, null, 'A2');
        $path = tempnam(sys_get_temp_dir(), 'product-import-test-').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'produk.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }
}
