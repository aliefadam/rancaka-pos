<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;
        $search = $request->string('search')->toString();
        $categoryId = $request->string('category_id')->toString();

        $products = Product::query()
            ->where('tenant_id', $tenantId)
            ->with(['category:id,name', 'rawMaterials', 'priceOptions'])
            ->when($search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($categoryId, fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->orderBy('name')
            ->get();

        return Inertia::render('Tenant/Products/Index', [
            'products' => $products,
            'categories' => $request->user()->tenant->categories()->orderBy('name')->get(['id', 'name']),
            'rawMaterials' => $request->user()->tenant->rawMaterials()->orderBy('name')->get(['id', 'name', 'unit']),
            'filters' => ['search' => $search, 'category_id' => $categoryId],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        ['product' => $validated, 'price_options' => $priceOptions] = $this->validated($request);
        $ingredients = $this->ingredientsMap($request);

        DB::transaction(function () use ($request, $validated, $ingredients, $priceOptions) {
            $product = $request->user()->tenant->products()->create($validated);
            $product->rawMaterials()->sync($ingredients);
            $this->syncPriceOptions($product, $priceOptions ?? [[
                'name' => 'Harga utama',
                'price' => $product->price,
                'is_default' => true,
                'is_active' => true,
            ]]);
        });

        return redirect()->route('tenant.products.index')->with('success', 'Produk berhasil ditambahkan.');
    }

    public function downloadImportTemplate(Request $request): BinaryFileResponse
    {
        $categories = $request->user()->tenant->categories()->orderBy('name')->pluck('name')->values();
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Produk');
        $sheet->fromArray(['nama_produk', 'kategori', 'hpp', 'margin_persen', 'harga_jual', 'gunakan_stok', 'stok', 'status_aktif'], null, 'A1');
        $sheet->fromArray(['Contoh Produk', $categories->first() ?? 'Makanan', 10000, 50, null, 'Ya', 10, 'Ya'], null, 'A2');
        $sheet->setCellValue('E2', '=ROUND(C2*(1+D2/100),0)');
        $sheet->getStyle('A1:H1')->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle('A1:H1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF4F46E5');
        $sheet->getStyle('C2:E1000')->getNumberFormat()->setFormatCode('#,##0.00');
        for ($row = 3; $row <= 1000; $row++) {
            $sheet->setCellValue("E{$row}", "=IF(OR(C{$row}=\"\",D{$row}=\"\"),\"\",ROUND(C{$row}*(1+D{$row}/100),0))");
        }
        $sheet->freezePane('A2');
        foreach (range('A', 'H') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        if ($categories->isNotEmpty()) {
            $categorySheet = $spreadsheet->createSheet();
            $categorySheet->setTitle('Referensi Kategori');
            $categorySheet->setCellValue('A1', 'kategori');
            foreach ($categories as $index => $category) {
                $categorySheet->setCellValue('A'.($index + 2), $category);
            }
            $categorySheet->setSheetState('hidden');
            $validation = new DataValidation;
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_STOP);
            $validation->setAllowBlank(false);
            $validation->setShowErrorMessage(true);
            $validation->setShowDropDown(true);
            $validation->setFormula1("'Referensi Kategori'!\$A\$2:\$A\$".($categories->count() + 1));
            $sheet->setDataValidation('B2:B1000', $validation);
        }

        foreach (['F', 'H'] as $column) {
            $validation = new DataValidation;
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setAllowBlank(false);
            $validation->setShowErrorMessage(true);
            $validation->setFormula1('"Ya,Tidak"');
            $sheet->setDataValidation("{$column}2:{$column}1000", $validation);
        }

        $path = tempnam(sys_get_temp_dir(), 'produk-template-').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return response()->download($path, 'template-import-produk.xlsx')->deleteFileAfterSend(true);
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'extensions:xlsx,xls,csv', 'mimes:xlsx,xls,csv', 'max:5120'],
        ], [
            'file.required' => 'Pilih file Excel yang akan diimport.',
            'file.mimes' => 'File harus berformat XLSX, XLS, atau CSV.',
            'file.max' => 'Ukuran file maksimal 5 MB.',
        ]);

        try {
            $rows = IOFactory::load($request->file('file')->getRealPath())
                ->getActiveSheet()->toArray(null, true, true, false);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['file' => 'File tidak dapat dibaca. Pastikan file Excel tidak rusak.']);
        }

        $expectedHeaders = ['nama_produk', 'kategori', 'hpp', 'margin_persen', 'harga_jual', 'gunakan_stok', 'stok', 'status_aktif'];
        $headers = array_map(fn ($value) => strtolower(trim((string) $value)), array_slice($rows[0] ?? [], 0, 8));
        if ($headers !== $expectedHeaders) {
            throw ValidationException::withMessages(['file' => 'Format kolom tidak sesuai. Gunakan file template yang tersedia tanpa mengubah judul kolom.']);
        }

        $tenant = $request->user()->tenant;
        $categories = $tenant->categories()->get()->keyBy(fn ($category) => mb_strtolower(trim($category->name)));
        $existingNames = $tenant->products()->pluck('name')->map(fn ($name) => mb_strtolower(trim($name)))->all();
        $seenNames = [];
        $validRows = [];
        $errors = [];

        foreach (array_slice($rows, 1, null, true) as $index => $row) {
            $excelRow = $index + 1;
            $values = array_map(fn ($value) => is_string($value) ? trim($value) : $value, array_pad(array_slice($row, 0, 8), 8, null));
            if (count(array_filter($values, fn ($value) => $value !== null && $value !== '')) === 0) {
                continue;
            }

            [$name, $categoryName, $cost, $margin, $price, $trackStockText, $stock, $activeText] = $values;
            $rowErrors = [];
            $normalizedName = mb_strtolower((string) $name);
            $category = $categories->get(mb_strtolower((string) $categoryName));
            $trackStock = $this->parseImportBoolean($trackStockText);
            $isActive = $this->parseImportBoolean($activeText);

            if ($name === '' || $name === null) {
                $rowErrors[] = 'nama produk wajib diisi';
            } elseif (mb_strlen((string) $name) > 255) {
                $rowErrors[] = 'nama produk maksimal 255 karakter';
            } elseif (in_array($normalizedName, $existingNames, true)) {
                $rowErrors[] = 'nama produk sudah ada';
            } elseif (in_array($normalizedName, $seenNames, true)) {
                $rowErrors[] = 'nama produk duplikat di file';
            }
            if (! $category) {
                $rowErrors[] = 'kategori tidak ditemukan';
            }
            $validCost = filter_var($cost, FILTER_VALIDATE_INT) !== false && (int) $cost >= 0 && (int) $cost <= 999999999999;
            $validMargin = is_numeric($margin) && (float) $margin >= 0 && (float) $margin <= 999999.99;
            $validPrice = filter_var($price, FILTER_VALIDATE_INT) !== false && (int) $price >= 0 && (int) $price <= 999999999999;
            if (! $validCost) {
                $rowErrors[] = 'HPP harus bilangan bulat antara 0 dan 999.999.999.999';
            }
            if (! $validMargin) {
                $rowErrors[] = 'margin harus berupa angka minimal 0';
            }
            if (! $validPrice) {
                $rowErrors[] = 'harga jual harus bilangan bulat antara 0 dan 999.999.999.999';
            }
            if ($validCost && $validPrice && (int) $cost > (int) $price) {
                $rowErrors[] = 'HPP tidak boleh melebihi harga jual';
            }
            if ($validCost && $validMargin && $validPrice) {
                $calculatedMargin = (int) $cost > 0
                    ? round((((int) $price - (int) $cost) / (int) $cost) * 100, 2)
                    : 0;
                if (abs($calculatedMargin - (float) $margin) > 0.01) {
                    $rowErrors[] = 'margin tidak sesuai dengan HPP dan harga jual';
                }
            }
            if ($trackStock === null) {
                $rowErrors[] = 'gunakan_stok harus Ya atau Tidak';
            }
            if ($trackStock === true && (filter_var($stock, FILTER_VALIDATE_INT) === false || (int) $stock < 0)) {
                $rowErrors[] = 'stok harus bilangan bulat minimal 0';
            }
            if ($isActive === null) {
                $rowErrors[] = 'status_aktif harus Ya atau Tidak';
            }

            if ($rowErrors) {
                $errors[] = "Baris {$excelRow}: ".implode(', ', $rowErrors).'.';

                continue;
            }

            $seenNames[] = $normalizedName;
            $validRows[] = [
                'tenant_id' => $tenant->id,
                'category_id' => $category->id,
                'name' => $name,
                'price' => (int) $price,
                'cost' => (int) $cost,
                'margin_percentage' => (float) $margin,
                'track_stock' => $trackStock,
                'stock' => $trackStock ? (int) $stock : 0,
                'is_active' => $isActive,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (! $validRows && ! $errors) {
            $errors[] = 'File tidak berisi data produk.';
        }
        if ($errors) {
            return back()->with('import_errors', $errors);
        }

        DB::transaction(function () use ($validRows) {
            foreach ($validRows as $row) {
                $timestamps = ['created_at' => $row['created_at'], 'updated_at' => $row['updated_at']];
                $product = Product::query()->create(array_diff_key($row, $timestamps));
                $product->priceOptions()->create([
                    'name' => 'Harga utama',
                    'price' => $product->price,
                    'is_default' => true,
                    'is_active' => true,
                    'sort_order' => 0,
                ]);
            }
        });

        return redirect()->route('tenant.products.index')->with('success', count($validRows).' produk berhasil diimport.');
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeTenant($request, $product);

        ['product' => $validated, 'price_options' => $priceOptions] = $this->validated($request, $product);
        $ingredients = $this->ingredientsMap($request);

        DB::transaction(function () use ($product, $validated, $ingredients, $priceOptions) {
            $product->update($validated);
            $product->rawMaterials()->sync($ingredients);
            if ($priceOptions !== null) {
                $this->syncPriceOptions($product, $priceOptions);
            } elseif (! $product->priceOptions()->exists()) {
                $this->syncPriceOptions($product, [[
                    'name' => 'Harga utama',
                    'price' => $product->price,
                    'is_default' => true,
                    'is_active' => true,
                ]]);
            }
        });

        return redirect()->route('tenant.products.index')->with('success', 'Produk berhasil diperbarui.');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeTenant($request, $product);

        $product->delete();

        return redirect()->route('tenant.products.index')->with('success', 'Produk berhasil dihapus.');
    }

    private function authorizeTenant(Request $request, Product $product): void
    {
        abort_unless($product->tenant_id === $request->user()->tenant_id, 403);
    }

    /**
     * @return array{product: array<string, mixed>, price_options: array<int, array<string, mixed>>|null}
     */
    private function validated(Request $request, ?Product $product = null): array
    {
        $tenantId = $request->user()->tenant_id;

        $submittedOptions = $request->input('price_options');
        if (is_array($submittedOptions) && $submittedOptions !== []) {
            $defaultOptions = collect($submittedOptions)->filter(fn ($option) => filter_var($option['is_default'] ?? false, FILTER_VALIDATE_BOOL));
            if ($defaultOptions->count() === 1) {
                $defaultPrice = $defaultOptions->first()['price'] ?? null;
                $request->merge(['price' => $defaultPrice]);
            }
        }

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('products', 'name')
                    ->where('tenant_id', $tenantId)
                    ->ignore($product?->id),
            ],
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('tenant_id', $tenantId),
            ],
            'price' => ['required', 'integer', 'min:0', 'max:999999999999'],
            'cost' => ['required', 'integer', 'min:0', 'max:999999999999', 'lte:price'],
            'margin_percentage' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'track_stock' => ['boolean'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'ingredients' => ['nullable', 'array'],
            'ingredients.*.raw_material_id' => [
                'required_with:ingredients',
                Rule::exists('raw_materials', 'id')->where('tenant_id', $tenantId),
            ],
            'ingredients.*.quantity' => ['required_with:ingredients', 'numeric', 'min:0.01'],
            'price_options' => ['nullable', 'array', 'min:1'],
            'price_options.*.id' => ['nullable', 'integer'],
            'price_options.*.name' => ['required_with:price_options', 'string', 'max:100'],
            'price_options.*.price' => ['required_with:price_options', 'integer', 'min:0', 'max:999999999999'],
            'price_options.*.is_default' => ['required_with:price_options', 'boolean'],
            'price_options.*.is_active' => ['required_with:price_options', 'boolean'],
        ]);

        $priceOptions = $validated['price_options'] ?? null;
        unset($validated['price_options']);

        $validated['track_stock'] = $request->boolean('track_stock');
        $validated['stock'] = $validated['track_stock']
            ? ($validated['stock'] ?? 0)
            : 0;

        if ($priceOptions !== null) {
            $defaultOptions = collect($priceOptions)->where('is_default', true);
            if ($defaultOptions->count() !== 1 || ! $defaultOptions->first()['is_active']) {
                throw ValidationException::withMessages([
                    'price_options' => 'Pilih tepat satu harga default yang aktif.',
                ]);
            }

            $normalizedNames = collect($priceOptions)->map(fn ($option) => mb_strtolower(trim($option['name'])));
            if ($normalizedNames->unique()->count() !== $normalizedNames->count()) {
                throw ValidationException::withMessages([
                    'price_options' => 'Nama pilihan harga dalam satu produk tidak boleh sama.',
                ]);
            }

            if (! collect($priceOptions)->contains(fn ($option) => $option['is_active'])) {
                throw ValidationException::withMessages([
                    'price_options' => 'Produk harus mempunyai minimal satu pilihan harga aktif.',
                ]);
            }

            if ($product) {
                $validIds = $product->priceOptions()->pluck('id')->all();
                $submittedIds = collect($priceOptions)->pluck('id')->filter()->map(fn ($id) => (int) $id);
                if ($submittedIds->unique()->count() !== $submittedIds->count()
                    || $submittedIds->contains(fn ($id) => ! in_array($id, $validIds, true))) {
                    throw ValidationException::withMessages([
                        'price_options' => 'Pilihan harga tidak valid untuk produk ini.',
                    ]);
                }
            } elseif (collect($priceOptions)->pluck('id')->filter()->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'price_options' => 'Pilihan harga baru tidak boleh memiliki ID.',
                ]);
            }
        }

        $validated['margin_percentage'] = (int) $validated['cost'] > 0
            ? round((((int) $validated['price'] - (int) $validated['cost']) / (int) $validated['cost']) * 100, 2)
            : 0;

        return ['product' => $validated, 'price_options' => $priceOptions];
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     */
    private function syncPriceOptions(Product $product, array $options): void
    {
        $keptIds = [];

        foreach (array_values($options) as $index => $option) {
            $values = [
                'name' => trim($option['name']),
                'price' => (int) $option['price'],
                'is_default' => (bool) $option['is_default'],
                'is_active' => (bool) $option['is_active'],
                'sort_order' => $index,
            ];

            if (! empty($option['id'])) {
                $priceOption = $product->priceOptions()->whereKey($option['id'])->firstOrFail();
                $priceOption->update($values);
            } else {
                $priceOption = $product->priceOptions()->create($values);
            }

            $keptIds[] = $priceOption->id;
        }

        $product->priceOptions()->whereNotIn('id', $keptIds)->update([
            'is_active' => false,
            'is_default' => false,
        ]);

        $default = $product->priceOptions()->where('is_default', true)->firstOrFail();
        $product->update([
            'price' => $default->price,
            'margin_percentage' => $product->cost > 0
                ? round((($default->price - $product->cost) / $product->cost) * 100, 2)
                : 0,
        ]);
    }

    /**
     * @return array<int, array{quantity: float}>
     */
    private function ingredientsMap(Request $request): array
    {
        $ingredients = $request->input('ingredients', []);

        $map = [];
        foreach ($ingredients as $ingredient) {
            if (empty($ingredient['raw_material_id'])) {
                continue;
            }

            $map[(int) $ingredient['raw_material_id']] = ['quantity' => $ingredient['quantity']];
        }

        return $map;
    }

    private function parseImportBoolean(mixed $value): ?bool
    {
        $value = mb_strtolower(trim((string) $value));

        return match ($value) {
            'ya', 'yes', '1', 'true' => true,
            'tidak', 'no', '0', 'false' => false,
            default => null,
        };
    }
}
