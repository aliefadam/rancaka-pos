<?php

use App\Enums\UserRole;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\Admin\BillingController as AdminBillingController;
use App\Http\Controllers\Admin\BranchNetworkController as AdminBranchNetworkController;
use App\Http\Controllers\Admin\CommissionPayoutController;
use App\Http\Controllers\Admin\DeveloperController;
use App\Http\Controllers\Admin\DevelopmentTicketController;
use App\Http\Controllers\Admin\SalesController;
use App\Http\Controllers\Admin\TenantController;
use App\Http\Controllers\Auth\StoreOnboardingController;
use App\Http\Controllers\BridgeReceiptController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\Sales\DashboardController as SalesDashboardController;
use App\Http\Controllers\Tenant\BillingController as TenantBillingController;
use App\Http\Controllers\Tenant\BranchNetworkController as TenantBranchNetworkController;
use App\Http\Controllers\Tenant\CategoryController as TenantCategoryController;
use App\Http\Controllers\Tenant\CreditSaleController as TenantCreditSaleController;
use App\Http\Controllers\Tenant\DashboardController as TenantDashboardController;
use App\Http\Controllers\Tenant\EmployeeController as TenantEmployeeController;
use App\Http\Controllers\Tenant\ExpenseController as TenantExpenseController;
use App\Http\Controllers\Tenant\OpeningCostController as TenantOpeningCostController;
use App\Http\Controllers\Tenant\PosController as TenantPosController;
use App\Http\Controllers\Tenant\ProductController as TenantProductController;
use App\Http\Controllers\Tenant\PurchaseController as TenantPurchaseController;
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
use App\Http\Controllers\Tenant\SupplierController as TenantSupplierController;
use App\Http\Controllers\Tenant\SupplierPayableController as TenantSupplierPayableController;
use App\Http\Controllers\Tenant\SupplierPaymentController as TenantSupplierPaymentController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (! auth()->check()) {
        return Inertia::render('Landing');
    }

    $user = auth()->user();
    if ($user->isOwner() && ! $user->tenant_id) {
        return redirect()->route('onboarding.store.create');
    }
    $route = match (true) {
        $user->role === UserRole::Superadmin => 'admin.dashboard',
        $user->role === UserRole::Developer => 'admin.development-tickets.index',
        $user->role === UserRole::Sales => 'sales.dashboard',
        $user->hasPermission('dashboard.view') => 'tenant.dashboard',
        default => 'tenant.pos.index',
    };

    return redirect()->route($route);
})->name('home');

Route::middleware(['auth', 'role:owner'])->group(function () {
    Route::get('/onboarding/store', [StoreOnboardingController::class, 'create'])->name('onboarding.store.create');
    Route::post('/onboarding/store', [StoreOnboardingController::class, 'store'])->name('onboarding.store.store');
});

Route::post('/impersonation/stop', [ImpersonationController::class, 'stop'])
    ->middleware('auth')
    ->name('impersonation.stop');

Route::get('/network-code/validate', [TenantBranchNetworkController::class, 'validateCode'])
    ->middleware('throttle:20,1')->name('network-code.validate');

Route::middleware(['auth', 'tenant.onboarded', 'subscription.active'])->group(function () {
    Route::get('/account', [AccountController::class, 'edit'])->name('account.edit');
    Route::put('/account', [AccountController::class, 'update'])->name('account.update');
    Route::post('/account/avatar', [AccountController::class, 'updateAvatar'])->name('account.avatar.update');
    Route::put('/account/password', [AccountController::class, 'updatePassword'])->name('account.password.update');
});

Route::middleware(['auth', 'role:superadmin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('dashboard');

    Route::get('/version', function () {
        return Inertia::render('Version/Index');
    })->name('version.index');

    Route::resource('tenants', TenantController::class)
        ->only(['index', 'show', 'store', 'update', 'destroy'])
        ->names('tenants');
    Route::post('/tenants/{tenant}/impersonate', [ImpersonationController::class, 'start'])
        ->name('tenants.impersonate');
    Route::patch('/tenants/{tenant}/reset-password', [TenantController::class, 'resetPassword'])
        ->name('tenants.reset-password');

    Route::get('/billing', [AdminBillingController::class, 'index'])->name('billing.index');
    Route::get('/networks', [AdminBranchNetworkController::class, 'index'])->name('networks.index');
    Route::patch('/networks/{relationship}/decision', [AdminBranchNetworkController::class, 'decision'])->name('networks.decision');
    Route::patch('/networks/{relationship}/exit', [AdminBranchNetworkController::class, 'decideExit'])->name('networks.exit');
    Route::patch('/networks/central/{tenant}/code', [AdminBranchNetworkController::class, 'updateCode'])->name('networks.code.update');
    Route::post('/billing/settings', [AdminBillingController::class, 'updateSettings'])->name('billing.settings.update');
    Route::patch('/billing/bank-settings', [AdminBillingController::class, 'updateBankSettings'])->name('billing.bank-settings.update');
    Route::patch('/billing/{payment}/approve', [AdminBillingController::class, 'approve'])->name('billing.approve');
    Route::patch('/billing/{payment}/reject', [AdminBillingController::class, 'reject'])->name('billing.reject');

    Route::get('/sales', [SalesController::class, 'index'])->name('sales.index');
    Route::post('/sales', [SalesController::class, 'store'])->name('sales.store');
    Route::put('/sales/{salesProfile}', [SalesController::class, 'update'])->name('sales.update');
    Route::patch('/sales/tenant/{tenant}/referral', [SalesController::class, 'updateTenantReferral'])->name('sales.tenant-referral.update');
    Route::get('/sales/commissions', [SalesController::class, 'commissions'])->name('sales.commissions');
    Route::get('/sales/referral-correction', [SalesController::class, 'referralCorrection'])->name('sales.referral-correction');
    Route::post('/commission-payouts', [CommissionPayoutController::class, 'store'])->name('commission-payouts.store');
    Route::get('/commission-payouts/{payout}/proof', [CommissionPayoutController::class, 'proof'])->name('commission-payouts.proof');

    Route::resource('developers', DeveloperController::class)
        ->only(['index', 'store', 'update', 'destroy']);
});

Route::middleware(['auth', 'role:superadmin,developer'])->prefix('admin')->name('admin.')->group(function () {
    Route::post('/development-tickets/images', [DevelopmentTicketController::class, 'uploadImage'])
        ->name('development-tickets.images.store');
    Route::post('/development-tickets/{developmentTicket}/updates', [DevelopmentTicketController::class, 'addUpdate'])
        ->name('development-tickets.updates.store');
    Route::resource('development-tickets', DevelopmentTicketController::class)
        ->parameters(['development-tickets' => 'developmentTicket']);
});

Route::middleware(['auth', 'role:owner,employee', 'tenant.onboarded'])->prefix('tenant')->name('tenant.')->group(function () {
    Route::get('/version', function () {
        return Inertia::render('Version/Index');
    })->name('version.index');

    Route::get('/billing', [TenantBillingController::class, 'index'])->name('billing.index');
    Route::post('/billing/{invoice}/payment', [TenantBillingController::class, 'submit'])
        ->name('billing.submit')->middleware('role:owner');
});

Route::middleware(['auth', 'role:owner', 'tenant.onboarded'])->prefix('tenant/network')->name('tenant.network.')->group(function () {
    Route::get('/', [TenantBranchNetworkController::class, 'index'])->name('index');
    Route::post('/enable', [TenantBranchNetworkController::class, 'enable'])->name('enable');
    Route::patch('/code', [TenantBranchNetworkController::class, 'updateCode'])->name('code.update');
    Route::post('/join', [TenantBranchNetworkController::class, 'join'])->name('join');
    Route::patch('/{relationship}/decision', [TenantBranchNetworkController::class, 'parentDecision'])->name('decision');
    Route::post('/{relationship}/exit-request', [TenantBranchNetworkController::class, 'requestExit'])->name('exit.request');
    Route::patch('/{relationship}/exit-decision', [TenantBranchNetworkController::class, 'decideExit'])->name('exit.decision');
    Route::post('/{relationship}/detach', [TenantBranchNetworkController::class, 'detach'])->name('detach');
    Route::post('/{tenant}/impersonate', [ImpersonationController::class, 'start'])->name('impersonate');
});

Route::middleware(['auth', 'role:owner,employee', 'tenant.onboarded', 'subscription.active'])->prefix('tenant')->name('tenant.')->group(function () {
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

    Route::get('/products/import/template', [TenantProductController::class, 'downloadImportTemplate'])
        ->name('products.import.template')
        ->middleware('permission:products.create');
    Route::post('/products/import', [TenantProductController::class, 'import'])
        ->name('products.import')
        ->middleware('permission:products.create');

    Route::resource('products', TenantProductController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('products')
        ->middlewareFor('index', 'permission:products.view')
        ->middlewareFor('store', 'permission:products.create')
        ->middlewareFor('update', 'permission:products.edit')
        ->middlewareFor('destroy', 'permission:products.delete');

    Route::delete('/expenses/bulk', [TenantExpenseController::class, 'bulkDestroy'])
        ->name('expenses.bulk-destroy')
        ->middleware('permission:expenses.delete');
    Route::resource('expenses', TenantExpenseController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('expenses')
        ->middlewareFor('index', 'permission:expenses.view')
        ->middlewareFor('store', 'permission:expenses.create')
        ->middlewareFor('update', 'permission:expenses.edit')
        ->middlewareFor('destroy', 'permission:expenses.delete');

    Route::resource('suppliers', TenantSupplierController::class)->only(['index', 'store', 'update'])
        ->middlewareFor('index', 'permission:suppliers.view')
        ->middlewareFor('store', 'permission:suppliers.create')
        ->middlewareFor('update', 'permission:suppliers.edit');
    Route::get('/purchases/opening-costs', [TenantOpeningCostController::class, 'index'])->name('purchases.opening-costs.index')->middleware(['role:owner', 'permission:purchases.create']);
    Route::put('/purchases/opening-costs/{rawMaterial}', [TenantOpeningCostController::class, 'update'])->name('purchases.opening-costs.update')->middleware(['role:owner', 'permission:purchases.create']);
    Route::get('/purchases', [TenantPurchaseController::class, 'index'])->name('purchases.index')->middleware('permission:purchases.view');
    Route::get('/purchases/create', [TenantPurchaseController::class, 'create'])->name('purchases.create')->middleware('permission:purchases.create');
    Route::post('/purchases', [TenantPurchaseController::class, 'store'])->name('purchases.store')->middleware('permission:purchases.create');
    Route::get('/purchases/{purchase}', [TenantPurchaseController::class, 'show'])->name('purchases.show')->middleware('permission:purchases.view');
    Route::get('/purchases/{purchase}/invoice', [TenantPurchaseController::class, 'invoice'])->name('purchases.invoice')->middleware('permission:purchases.view');
    Route::patch('/purchases/{purchase}/void', [TenantPurchaseController::class, 'void'])->name('purchases.void')->middleware(['role:owner', 'permission:purchases.void']);
    Route::post('/purchases/{purchase}/payments', [TenantSupplierPaymentController::class, 'store'])->name('purchases.payments.store')->middleware('permission:purchases.pay');
    Route::patch('/supplier-payments/{payment}/void', [TenantSupplierPaymentController::class, 'void'])->name('supplier-payments.void')->middleware(['role:owner', 'permission:purchases.void']);
    Route::get('/supplier-payments/{payment}/proof', [TenantSupplierPaymentController::class, 'proof'])->name('supplier-payments.proof')->middleware('permission:purchases.view');
    Route::get('/supplier-payables', [TenantSupplierPayableController::class, 'index'])->name('supplier-payables.index')->middleware('permission:supplier-payables.view');

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

    Route::get('/credit-sales', [TenantCreditSaleController::class, 'index'])->name('credit-sales.index');
    Route::get('/credit-sales/{creditSale}', [TenantCreditSaleController::class, 'show'])->name('credit-sales.show');
    Route::post('/credit-sales/{creditSale}/payments', [TenantCreditSaleController::class, 'pay'])->name('credit-sales.pay');
    Route::get('/credit-payments/{creditPayment}/receipt', [TenantCreditSaleController::class, 'paymentReceipt'])
        ->name('credit-payments.receipt');

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
        Route::patch('/transactions/bulk-void', [TenantTransactionHistoryController::class, 'bulkVoid'])
            ->name('transactions.bulk-void')
            ->middleware('permission:transactions.delete');
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
Route::get('/bridge/credit-payments/{creditPayment}', [BridgeReceiptController::class, 'creditPayment'])
    ->middleware('signed')
    ->name('bridge.credit-payments.show');

require __DIR__.'/auth.php';

Route::middleware(['auth', 'role:sales'])->prefix('sales')->name('sales.')->group(function () {
    Route::get('/dashboard', [SalesDashboardController::class, 'index'])->name('dashboard');
    Route::get('/payouts/{payout}/proof', [SalesDashboardController::class, 'proof'])->name('payouts.proof');
});
