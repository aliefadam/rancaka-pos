<?php

use App\Enums\UserRole;
use App\Http\Controllers\Admin\TenantController;
use App\Http\Controllers\Tenant\CategoryController as TenantCategoryController;
use App\Http\Controllers\Tenant\DashboardController as TenantDashboardController;
use App\Http\Controllers\Tenant\ExpenseController as TenantExpenseController;
use App\Http\Controllers\Tenant\PosController as TenantPosController;
use App\Http\Controllers\Tenant\ProductController as TenantProductController;
use App\Http\Controllers\Tenant\RawMaterialController as TenantRawMaterialController;
use App\Http\Controllers\Tenant\Reports\FinancialReportController as TenantFinancialReportController;
use App\Http\Controllers\Tenant\Reports\ShiftHistoryController as TenantShiftHistoryController;
use App\Http\Controllers\Tenant\Reports\TransactionHistoryController as TenantTransactionHistoryController;
use App\Http\Controllers\Tenant\ShiftController as TenantShiftController;
use App\Http\Controllers\Tenant\Stock\ProductStockController as TenantProductStockController;
use App\Http\Controllers\Tenant\Stock\RawMaterialStockController as TenantRawMaterialStockController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (! auth()->check()) {
        return Inertia::render('Landing');
    }

    $route = auth()->user()->role === UserRole::Superadmin
        ? 'admin.dashboard'
        : 'tenant.dashboard';

    return redirect()->route($route);
})->name('home');

Route::middleware(['auth', 'role:superadmin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('dashboard');

    Route::resource('tenants', TenantController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('tenants');
});

Route::middleware(['auth', 'role:owner,employee'])->prefix('tenant')->name('tenant.')->group(function () {
    Route::get('/dashboard', [TenantDashboardController::class, 'index'])->name('dashboard');

    Route::resource('categories', TenantCategoryController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('categories');

    Route::resource('raw-materials', TenantRawMaterialController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('raw-materials')
        ->parameters(['raw-materials' => 'rawMaterial']);

    Route::resource('products', TenantProductController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('products');

    Route::resource('expenses', TenantExpenseController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('expenses');

    Route::post('/shift/open', [TenantShiftController::class, 'open'])->name('shift.open');
    Route::post('/shift/close', [TenantShiftController::class, 'close'])->name('shift.close');

    Route::prefix('pos')->name('pos.')->group(function () {
        Route::get('/', [TenantPosController::class, 'index'])->name('index');
        Route::post('/checkout', [TenantPosController::class, 'checkout'])->name('checkout');
        Route::post('/hold', [TenantPosController::class, 'hold'])->name('hold');
        Route::delete('/held/{transaction}', [TenantPosController::class, 'destroyHeld'])->name('held.destroy');
    });

    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/financial', [TenantFinancialReportController::class, 'index'])->name('financial.index');

        Route::get('/shifts', [TenantShiftHistoryController::class, 'index'])->name('shifts.index');

        Route::get('/transactions', [TenantTransactionHistoryController::class, 'index'])->name('transactions.index');
        Route::patch('/transactions/{transaction}/void', [TenantTransactionHistoryController::class, 'void'])->name('transactions.void');
    });

    Route::prefix('stock')->name('stock.')->group(function () {
        Route::get('/products', [TenantProductStockController::class, 'index'])->name('products.index');
        Route::post('/products/in', [TenantProductStockController::class, 'storeIn'])->name('products.in');
        Route::post('/products/adjustment', [TenantProductStockController::class, 'storeAdjustment'])->name('products.adjustment');

        Route::get('/raw-materials', [TenantRawMaterialStockController::class, 'index'])->name('raw-materials.index');
        Route::post('/raw-materials/in', [TenantRawMaterialStockController::class, 'storeIn'])->name('raw-materials.in');
        Route::post('/raw-materials/adjustment', [TenantRawMaterialStockController::class, 'storeAdjustment'])->name('raw-materials.adjustment');
    });
});

require __DIR__.'/auth.php';
