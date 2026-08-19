<?php

namespace App\Support;

class PermissionCatalog
{
    /**
     * Menu -> available actions for employee role permission checklist.
     *
     * @return array<int, array{key: string, label: string, actions: array<int, array{key: string, label: string}>}>
     */
    public static function menus(): array
    {
        return [
            [
                'key' => 'dashboard',
                'label' => 'Dashboard & Omzet',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                ],
            ],
            [
                'key' => 'categories',
                'label' => 'Kategori',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                    ['key' => 'create', 'label' => 'Tambah'],
                    ['key' => 'edit', 'label' => 'Ubah'],
                    ['key' => 'delete', 'label' => 'Hapus'],
                ],
            ],
            [
                'key' => 'products',
                'label' => 'Produk',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                    ['key' => 'create', 'label' => 'Tambah'],
                    ['key' => 'edit', 'label' => 'Ubah'],
                    ['key' => 'delete', 'label' => 'Hapus'],
                ],
            ],
            [
                'key' => 'raw-materials',
                'label' => 'Bahan Baku',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                    ['key' => 'create', 'label' => 'Tambah'],
                    ['key' => 'edit', 'label' => 'Ubah'],
                    ['key' => 'delete', 'label' => 'Hapus'],
                ],
            ],
            [
                'key' => 'expenses',
                'label' => 'Pengeluaran',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                    ['key' => 'create', 'label' => 'Tambah'],
                    ['key' => 'edit', 'label' => 'Ubah'],
                    ['key' => 'delete', 'label' => 'Hapus'],
                ],
            ],
            [
                'key' => 'stock-products',
                'label' => 'Stok Produk',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                    ['key' => 'create', 'label' => 'Stok Masuk'],
                    ['key' => 'edit', 'label' => 'Penyesuaian'],
                ],
            ],
            [
                'key' => 'stock-raw-materials',
                'label' => 'Stok Bahan Baku',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                    ['key' => 'create', 'label' => 'Stok Masuk'],
                    ['key' => 'edit', 'label' => 'Penyesuaian'],
                ],
            ],
            [
                'key' => 'transactions',
                'label' => 'Riwayat Transaksi',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                    ['key' => 'delete', 'label' => 'Batalkan (Void)'],
                ],
            ],
            [
                'key' => 'financial-reports',
                'label' => 'Laporan Keuangan',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                ],
            ],
            [
                'key' => 'shift-reports',
                'label' => 'Riwayat Shift',
                'actions' => [
                    ['key' => 'view', 'label' => 'Lihat'],
                ],
            ],
        ];
    }

    /**
     * Flat list of every valid "menu.action" permission key.
     *
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return collect(self::menus())
            ->flatMap(fn (array $menu) => collect($menu['actions'])
                ->map(fn (array $action) => "{$menu['key']}.{$action['key']}"))
            ->all();
    }
}
