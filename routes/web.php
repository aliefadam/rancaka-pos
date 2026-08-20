<?php

use App\Enums\UserRole;
use App\Http\Controllers\Admin\TenantController;
use App\Http\Controllers\Admin\BillingController as AdminBillingController;
use App\Http\Controllers\BridgeReceiptController;
use App\Http\Controllers\Tenant\CategoryController as TenantCategoryController;
use App\Http\Controllers\Tenant\BillingController as TenantBillingController;
use App\Http\Controllers\Tenant\DashboardController as TenantDashboardController;
use App\Http\Controllers\Tenant\EmployeeController as TenantEmployeeController;
use App\Http\Controllers\Tenant\ExpenseController as TenantExpenseController;
use App\Http\Controllers\Tenant\PosController as TenantPosController;
use App\Http\Controllers\Tenant\ProductController as TenantProductController;
use App\Http\Controllers\Tenant\RawMaterialController as TenantRawMaterialController;
use App\Http\Controllers\Tenant\ReceiptController as TenantReceiptController;
use App\Http\Controllers\Tenant\Reports\FinancialReportController as TenantFinancialReportController;
use App\Http\Controllers\Tenant\Reports\ShiftHistoryController as TenantShiftHistoryController;
use App\Http\Controllers\Tenant\Reports\TransactionHistoryController as TenantTransactionHistoryController;
use App\Http\Controllers\Tenant\RoleController as TenantRoleController;
use App\Http\Controllers\Tenant\SettingsController as TenantSettingsController;
use App\Http\Controllers\Tenant\ShiftController as TenantShiftController;
use App\Http\Controllers\Tenant\Stock\ProductStockController as TenantProductStockController;
use App\Http\Controllers\Tenant\Stock\RawMaterialStockController as TenantRawMaterialStockController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (! auth()->check()) {
        return Inertia::render('Landing');
    }

    $user = auth()->user();
    $route = match (true) {
        $user->role === UserRole::Superadmin => 'admin.dashboard',
        $user->hasPermission('dashboard.view') => 'tenant.dashboard',
        default => 'tenant.pos.index',
    };

    return redirect()->route($route);
})->name('home');

Route::middleware(['auth', 'role:superadmin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('dashboard');

    Route::resource('tenants', TenantController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('tenants');

    Route::get('/billing', [AdminBillingController::class, 'index'])->name('billing.index');
    Route::post('/billing/settings', [AdminBillingController::class, 'updateSettings'])->name('billing.settings.update');
    Route::patch('/billing/{payment}/approve', [AdminBillingController::class, 'approve'])->name('billing.approve');
    Route::patch('/billing/{payment}/reject', [AdminBillingController::class, 'reject'])->name('billing.reject');
});

Route::middleware(['auth', 'role:owner,employee'])->prefix('tenant')->name('tenant.')->group(function () {
    Route::get('/billing', [TenantBillingController::class, 'index'])->name('billing.index');
    Route::post('/billing/{invoice}/payment', [TenantBillingController::class, 'submit'])
        ->name('billing.submit')->middleware('role:owner');
});

Route::middleware(['auth', 'role:owner,employee', 'subscription.active'])->prefix('tenant')->name('tenant.')->group(function () {
    Route::get('/dashboard', [TenantDashboardController::class, 'index'])
        ->name('dashboard')
        ->middleware('permission:dashboard.view');

    Route::resource('categories', TenantCategoryController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('categories')
        ->middlewareFor('index', 'permission:categories.view')
        ->middlewareFor('store', 'permission:categories.create')
        ->middlewareFor('update', 'permission:categories.edit')
        ->middlewareFor('destroy', 'permission:categories.delete');

    Route::resource('raw-materials', TenantRawMaterialController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('raw-materials')
        ->parameters(['raw-materials' => 'rawMaterial'])
        ->middlewareFor('index', 'permission:raw-materials.view')
        ->middlewareFor('store', 'permission:raw-materials.create')
        ->middlewareFor('update', 'permission:raw-materials.edit')
        ->middlewareFor('destroy', 'permission:raw-materials.delete');

    Route::resource('products', TenantProductController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('products')
        ->middlewareFor('index', 'permission:products.view')
        ->middlewareFor('store', 'permission:products.create')
        ->middlewareFor('update', 'permission:products.edit')
        ->middlewareFor('destroy', 'permission:products.delete');

    Route::resource('expenses', TenantExpenseController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('expenses')
        ->middlewareFor('index', 'permission:expenses.view')
        ->middlewareFor('store', 'permission:expenses.create')
        ->middlewareFor('update', 'permission:expenses.edit')
        ->middlewareFor('destroy', 'permission:expenses.delete');

    Route::middleware('role:owner')->group(function () {
        Route::resource('employees', TenantEmployeeController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('employees');

        Route::resource('roles', TenantRoleController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('roles');

        Route::get('/settings', [TenantSettingsController::class, 'edit'])->name('settings.edit');
        Route::put('/settings', [TenantSettingsController::class, 'update'])->name('settings.update');
    });

    Route::post('/shift/open', [TenantShiftController::class, 'open'])->name('shift.open');
    Route::post('/shift/close', [TenantShiftController::class, 'close'])->name('shift.close');

    Route::prefix('pos')->name('pos.')->group(function () {
        Route::get('/', [TenantPosController::class, 'index'])->name('index');
        Route::post('/checkout', [TenantPosController::class, 'checkout'])->name('checkout');
        Route::post('/hold', [TenantPosController::class, 'hold'])->name('hold');
        Route::delete('/held/{transaction}', [TenantPosController::class, 'destroyHeld'])->name('held.destroy');
    });

    Route::get('/transactions/{transaction}/receipt', [TenantReceiptController::class, 'show'])
        ->name('transactions.receipt');

    Route::get('/printer/download', function () {
        $path = base_path('print-bridge-android/printer-rancaka.apk');

        abort_unless(file_exists($path), 404, 'APK Rancaka Print belum dibangun.');

        return response()->download($path, 'printer-rancaka.apk', [
            'Content-Type' => 'application/vnd.android.package-archive',
        ]);
    })->name('printer.download');

    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/financial', [TenantFinancialReportController::class, 'index'])
            ->name('financial.index')
            ->middleware('permission:financial-reports.view');

        Route::get('/shifts', [TenantShiftHistoryController::class, 'index'])
            ->name('shifts.index')
            ->middleware('permission:shift-reports.view');

        Route::get('/transactions', [TenantTransactionHistoryController::class, 'index'])
            ->name('transactions.index')
            ->middleware('permission:transactions.view');
        Route::patch('/transactions/{transaction}/void', [TenantTransactionHistoryController::class, 'void'])
            ->name('transactions.void')
            ->middleware('permission:transactions.delete');
    });

    Route::prefix('stock')->name('stock.')->group(function () {
        Route::get('/products', [TenantProductStockController::class, 'index'])
            ->name('products.index')
            ->middleware('permission:stock-products.view');
        Route::post('/products/in', [TenantProductStockController::class, 'storeIn'])
            ->name('products.in')
            ->middleware('permission:stock-products.create');
        Route::post('/products/adjustment', [TenantProductStockController::class, 'storeAdjustment'])
            ->name('products.adjustment')
            ->middleware('permission:stock-products.edit');

        Route::get('/raw-materials', [TenantRawMaterialStockController::class, 'index'])
            ->name('raw-materials.index')
            ->middleware('permission:stock-raw-materials.view');
        Route::post('/raw-materials/in', [TenantRawMaterialStockController::class, 'storeIn'])
            ->name('raw-materials.in')
            ->middleware('permission:stock-raw-materials.create');
        Route::post('/raw-materials/adjustment', [TenantRawMaterialStockController::class, 'storeAdjustment'])
            ->name('raw-materials.adjustment')
            ->middleware('permission:stock-raw-materials.edit');
    });
});

Route::get('/bridge/receipts/{transaction}', [BridgeReceiptController::class, 'show'])
    ->middleware('signed')
    ->name('bridge.receipts.show');

require __DIR__.'/auth.php';
