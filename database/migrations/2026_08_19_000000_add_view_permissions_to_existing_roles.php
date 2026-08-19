<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Keep existing roles working by granting view access for every menu on
     * which the role already has at least one action.
     */
    public function up(): void
    {
        DB::table('roles')
            ->select(['id', 'permissions'])
            ->orderBy('id')
            ->chunkById(100, function ($roles): void {
                foreach ($roles as $role) {
                    $permissions = json_decode($role->permissions ?: '[]', true) ?: [];
                    $menuKeys = collect($permissions)
                        ->filter(fn ($permission) => is_string($permission) && str_contains($permission, '.'))
                        ->map(fn (string $permission) => explode('.', $permission, 2)[0])
                        ->unique();

                    foreach ($menuKeys as $menuKey) {
                        $permissions[] = "{$menuKey}.view";
                    }

                    DB::table('roles')
                        ->where('id', $role->id)
                        ->update(['permissions' => json_encode(array_values(array_unique($permissions)))]);
                }
            });
    }

    public function down(): void
    {
        DB::table('roles')
            ->select(['id', 'permissions'])
            ->orderBy('id')
            ->chunkById(100, function ($roles): void {
                foreach ($roles as $role) {
                    $permissions = json_decode($role->permissions ?: '[]', true) ?: [];
                    $permissions = array_values(array_filter(
                        $permissions,
                        fn ($permission) => ! is_string($permission) || ! str_ends_with($permission, '.view'),
                    ));

                    DB::table('roles')
                        ->where('id', $role->id)
                        ->update(['permissions' => json_encode($permissions)]);
                }
            });
    }
};
