<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Expense;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseBulkDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_soft_delete_multiple_expenses_with_password_and_audit_data(): void
    {
        Storage::fake('public');
        [$owner, $expenses] = $this->expenses(2);

        $this->actingAs($owner)->delete(route('tenant.expenses.bulk-destroy'), [
            'ids' => $expenses->pluck('id')->all(),
            'password' => 'password',
            'reason' => 'Data tercatat dua kali',
        ])->assertRedirect();

        foreach ($expenses as $expense) {
            $this->assertSoftDeleted('expenses', ['id' => $expense->id]);
            $deleted = Expense::withTrashed()->findOrFail($expense->id);
            $this->assertSame($owner->id, $deleted->deleted_by);
            $this->assertSame('Data tercatat dua kali', $deleted->delete_reason);
            Storage::disk('public')->assertExists($deleted->receipt_path);
        }
    }

    public function test_expense_deletion_rejects_wrong_password(): void
    {
        [$owner, $expenses] = $this->expenses(1);

        $this->actingAs($owner)->delete(route('tenant.expenses.destroy', $expenses->first()), [
            'password' => 'salah-password',
            'reason' => 'Salah input',
        ])->assertSessionHasErrors('password');

        $this->assertNotSoftDeleted('expenses', ['id' => $expenses->first()->id]);
    }

    public function test_bulk_expense_deletion_is_tenant_scoped_and_atomic(): void
    {
        [$owner, $ownExpenses] = $this->expenses(1);
        [, $otherExpenses] = $this->expenses(1);

        $this->actingAs($owner)->delete(route('tenant.expenses.bulk-destroy'), [
            'ids' => [$ownExpenses->first()->id, $otherExpenses->first()->id],
            'password' => 'password',
            'reason' => 'Salah input',
        ])->assertSessionHasErrors('expenses');

        $this->assertNotSoftDeleted('expenses', ['id' => $ownExpenses->first()->id]);
        $this->assertNotSoftDeleted('expenses', ['id' => $otherExpenses->first()->id]);
    }

    /**
     * @return array{User, Collection<int, Expense>}
     */
    private function expenses(int $count): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => UserRole::Owner,
        ]);
        $expenses = collect();

        for ($index = 1; $index <= $count; $index++) {
            $path = "expenses/{$tenant->id}/receipt-{$index}.png";
            Storage::disk('public')->put($path, 'receipt');
            $expenses->push(Expense::create([
                'tenant_id' => $tenant->id,
                'user_id' => $owner->id,
                'expense_date' => now()->toDateString(),
                'category' => 'Operasional',
                'amount' => 10000 * $index,
                'description' => "Biaya {$index}",
                'receipt_path' => $path,
            ]));
        }

        return [$owner, $expenses];
    }
}
