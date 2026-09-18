<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiController;

/**
 * [TAG: ROUTING_API]
 * Semua URL API backend didefinisikan di sini.
 * Prefix `/api/` sudah otomatis ditambahkan oleh Laravel.
 */

// Menampilkan produk (Home / Explore)
Route::get('/products', [ApiController::class, 'getProducts']);
// Menampilkan spesifik 1 produk (Product Detail)
Route::get('/products/{id}', [ApiController::class, 'getProductById']);

// Mengelola keranjang belanja (Cart)
Route::get('/cart', [ApiController::class, 'getCart']);
Route::post('/cart', [ApiController::class, 'addToCart']);
Route::put('/cart/{id}', [ApiController::class, 'updateCartItem']);
Route::delete('/cart', [ApiController::class, 'clearCart']);
Route::delete('/cart/{id}', [ApiController::class, 'removeFromCart']);
