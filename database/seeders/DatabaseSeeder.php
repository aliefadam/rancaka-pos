<?php

namespace Database\Seeders;

use App\Enums\PaymentMethod;
use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\Shift;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Administrator',
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'role' => UserRole::Superadmin,
        ]);

        $demoTenant = Tenant::factory()->create([
            'name' => 'Kedai Josjis',
        ]);

        $owner = User::factory()->create([
            'name' => 'Owner Kedai Josjis',
            'username' => 'owner.josjis',
            'password' => Hash::make('123123'),
            'role' => UserRole::Owner,
            'tenant_id' => $demoTenant->id,
        ]);

        User::factory()->create([
            'name' => 'Karyawan Kedai Josjis',
            'username' => 'employee.josjis',
            'password' => Hash::make('123123'),
            'role' => UserRole::Employee,
            'tenant_id' => $demoTenant->id,
        ]);

        // Tenant::factory(23)->create();

        $categories = Category::factory()->createMany([
            ['tenant_id' => $demoTenant->id, 'name' => 'Makanan', 'icon' => 'fi-rr-bowl-rice'],
            ['tenant_id' => $demoTenant->id, 'name' => 'Minuman', 'icon' => 'fi-rr-coffee'],
            ['tenant_id' => $demoTenant->id, 'name' => 'Snack', 'icon' => 'fi-rr-cookie'],
        ])->keyBy('name');

        RawMaterial::factory()->createMany([
            ['tenant_id' => $demoTenant->id, 'name' => 'Cup 16 oz', 'unit' => 'pcs', 'stock' => 16],
            ['tenant_id' => $demoTenant->id, 'name' => 'Cup 22 oz', 'unit' => 'pcs', 'stock' => 12],
            ['tenant_id' => $demoTenant->id, 'name' => 'Cup Hot', 'unit' => 'pcs', 'stock' => 12],
            ['tenant_id' => $demoTenant->id, 'name' => 'Jagung', 'unit' => 'pcs', 'stock' => 33],
            ['tenant_id' => $demoTenant->id, 'name' => 'Sedotan', 'unit' => 'pcs', 'stock' => 39],
            ['tenant_id' => $demoTenant->id, 'name' => 'Sterofoam', 'unit' => 'pcs', 'stock' => 39],
            ['tenant_id' => $demoTenant->id, 'name' => 'Susu', 'unit' => 'liter', 'stock' => 2],
        ]);

        $this->call(ProductSeeder::class);

        $products = Product::query()
            ->where('tenant_id', $demoTenant->id)
            ->get()
            ->keyBy('name');

        $demoShift = Shift::create([
            'tenant_id' => $demoTenant->id,
            'user_id' => $owner->id,
            'opening_cash' => 100000,
            'closing_cash' => 250000,
            'opened_at' => now()->subDay()->setTime(8, 0),
            'closed_at' => now()->subDay()->setTime(17, 0),
        ]);

        $sale1 = Transaction::create([
            'tenant_id' => $demoTenant->id,
            'shift_id' => $demoShift->id,
            'user_id' => $owner->id,
            'invoice_number' => 'TRX'.now()->subDay()->format('Ymd').'-0001',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Cash,
            'subtotal' => 30000,
            'additional_fee' => 0,
            'total' => 30000,
            'amount_received' => 50000,
            'change_amount' => 20000,
        ]);
        $sale1->items()->create([
            'product_id' => $products['Matcha Latte']->id,
            'product_name' => $products['Matcha Latte']->name,
            'unit_price' => $products['Matcha Latte']->price,
            'quantity' => 2,
            'subtotal' => 30000,
        ]);

        $sale2 = Transaction::create([
            'tenant_id' => $demoTenant->id,
            'shift_id' => $demoShift->id,
            'user_id' => $owner->id,
            'invoice_number' => 'TRX'.now()->subDay()->format('Ymd').'-0002',
            'status' => TransactionStatus::Completed,
            'payment_method' => PaymentMethod::Qris,
            'subtotal' => 21000,
            'additional_fee' => 0,
            'total' => 21000,
        ]);
        $sale2->items()->createMany([
            [
                'product_id' => $products['Es Kopi Susu Gula Aren']->id,
                'product_name' => $products['Es Kopi Susu Gula Aren']->name,
                'unit_price' => $products['Es Kopi Susu Gula Aren']->price,
                'quantity' => 1,
                'subtotal' => 18000,
            ],
            [
                'product_id' => $products['Pop Ice Cokelat (Sachet)']->id,
                'product_name' => $products['Pop Ice Cokelat (Sachet)']->name,
                'unit_price' => $products['Pop Ice Cokelat (Sachet)']->price,
                'quantity' => 1,
                'subtotal' => 3000,
            ],
        ]);
    }
}
