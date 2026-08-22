<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Expense;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExpenseManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_create_and_view_its_expenses(): void
    {
        Storage::fake('public');
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $response = $this->actingAs($owner)->post(route('tenant.expenses.store'), [
            'expense_date' => today()->toDateString(),
            'category' => 'Belanja Bahan',
            'amount' => 75000,
            'description' => 'Belanja susu dan gula',
            'receipt' => UploadedFile::fake()->create('nota.pdf', 100, 'application/pdf'),
        ]);

        $response->assertRedirect(route('tenant.expenses.index'));
        $expense = Expense::query()->sole();
        $this->assertSame($tenant->id, $expense->tenant_id);
        Storage::disk('public')->assertExists($expense->receipt_path);

        $this->actingAs($owner)
            ->get(route('tenant.expenses.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tenant/Expenses/Index')
                ->where('monthlyTotal', 'Rp 75.000')
                ->where('expenses.data.0.description', 'Belanja susu dan gula')
                ->where('expenses.data.0.formatted_amount', 'Rp 75.000')
            );
    }

    public function test_large_camera_photo_is_compressed_before_it_is_stored(): void
    {
        Storage::fake('public');
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $photo = UploadedFile::fake()->image('camera.jpg', 3000, 2400)->size(6000);

        $this->actingAs($owner)
            ->post(route('tenant.expenses.store'), [
                'expense_date' => today()->toDateString(),
                'category' => 'Operasional',
                'amount' => 50000,
                'description' => 'Bukti langsung dari kamera',
                'receipt' => $photo,
            ])
            ->assertRedirect(route('tenant.expenses.index'));

        $path = Expense::query()->sole()->receipt_path;
        Storage::disk('public')->assertExists($path);
        $this->assertStringEndsWith('.webp', $path);

        [$width, $height, $type] = getimagesize(Storage::disk('public')->path($path));
        $this->assertLessThanOrEqual(1920, $width);
        $this->assertLessThanOrEqual(1920, $height);
        $this->assertSame(IMAGETYPE_WEBP, $type);
    }

    public function test_expense_receipt_rejects_disguised_or_unsupported_files(): void
    {
        Storage::fake('public');
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $fields = [
            'expense_date' => today()->toDateString(),
            'category' => 'Operasional',
            'amount' => 50000,
            'description' => 'File tidak valid',
        ];

        $this->actingAs($owner)
            ->post(route('tenant.expenses.store'), $fields + [
                'receipt' => UploadedFile::fake()->createWithContent('malware.jpg', '<?php echo "unsafe";'),
            ])
            ->assertSessionHasErrors('receipt');

        $this->actingAs($owner)
            ->post(route('tenant.expenses.store'), $fields + [
                'receipt' => UploadedFile::fake()->create('nota.svg', 50, 'image/svg+xml'),
            ])
            ->assertSessionHasErrors('receipt');

        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_expense_pdf_remains_limited_to_two_megabytes(): void
    {
        Storage::fake('public');
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);

        $this->actingAs($owner)
            ->post(route('tenant.expenses.store'), [
                'expense_date' => today()->toDateString(),
                'category' => 'Operasional',
                'amount' => 50000,
                'description' => 'PDF terlalu besar',
                'receipt' => UploadedFile::fake()->create('nota.pdf', 2100, 'application/pdf'),
            ])
            ->assertSessionHasErrors('receipt');

        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_tenant_cannot_change_another_tenants_expense(): void
    {
        $tenant = Tenant::factory()->create();
        $otherTenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $otherOwner = User::factory()->create([
            'tenant_id' => $otherTenant->id,
            'role' => UserRole::Owner,
        ]);
        $expense = Expense::create([
            'tenant_id' => $otherTenant->id,
            'user_id' => $otherOwner->id,
            'expense_date' => today(),
            'category' => 'Lain-lain',
            'amount' => 10000,
            'description' => 'Pengeluaran tenant lain',
            'receipt_path' => 'expenses/other/nota.pdf',
        ]);

        $this->actingAs($owner)
            ->delete(route('tenant.expenses.destroy', $expense))
            ->assertForbidden();

        $this->assertDatabaseHas('expenses', ['id' => $expense->id]);
    }

    public function test_future_expense_date_is_rejected_when_creating_and_updating(): void
    {
        Storage::fake('public');
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $futureDate = today()->addDay()->toDateString();

        $this->actingAs($owner)
            ->post(route('tenant.expenses.store'), [
                'expense_date' => $futureDate,
                'category' => 'Belanja Bahan',
                'amount' => 50000,
                'description' => 'Pengeluaran masa depan',
                'receipt' => UploadedFile::fake()->create('nota.pdf', 100, 'application/pdf'),
            ])
            ->assertSessionHasErrors([
                'expense_date' => 'Tanggal pengeluaran tidak boleh melewati hari ini.',
            ]);

        $this->assertDatabaseCount('expenses', 0);

        $expense = Expense::create([
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'expense_date' => today(),
            'category' => 'Belanja Bahan',
            'amount' => 50000,
            'description' => 'Pengeluaran hari ini',
            'receipt_path' => 'expenses/test/nota.pdf',
        ]);

        $this->actingAs($owner)
            ->put(route('tenant.expenses.update', $expense), [
                'expense_date' => $futureDate,
                'category' => 'Belanja Bahan',
                'amount' => 50000,
                'description' => 'Diubah ke masa depan',
            ])
            ->assertSessionHasErrors([
                'expense_date' => 'Tanggal pengeluaran tidak boleh melewati hari ini.',
            ]);

        $this->assertSame(today()->toDateString(), $expense->fresh()->expense_date->toDateString());
    }
}
