<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

/**
 * [TAG: MODEL_CART_ITEM]
 * Merepresentasikan skema data item yang ada di keranjang belanja user.
 * Disimpan di MongoDB berdasarkan session_id untuk user tanpa login.
 */
class CartItem extends Model
{
    protected $collection = 'cart_items';

    /**
     * [TAG: CONFIG_FILLABLE_CART]
     */
    protected $fillable = [
        'product_id',
        'quantity',
        'session_id' // Penanda identitas guest user
    ];

    /**
     * [TAG: RELATION_CART_TO_PRODUCT]
     * Relasi ke model Product.
     * Mengaitkan `product_id` (di tabel cart_items) ke kolom `_id` (di tabel products).
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', '_id');
    }
}
