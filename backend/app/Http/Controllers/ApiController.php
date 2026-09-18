<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\CartItem;

/**
 * [TAG: API_CONTROLLER]
 * Controller utama yang menangani seluruh alur logika REST API (Products & Cart).
 * Didesain tanpa banyak pemisahan file untuk menjaga keringkasan kode (Clean Code).
 */
class ApiController extends Controller
{
    /**
     * [TAG: GET_PRODUCTS]
     * Mengambil seluruh daftar produk dari database MongoDB.
     * Fungsi ini digunakan untuk menampilkan carousel di halaman Home dan daftar produk di halaman Explore.
     */
    public function getProducts()
    {
        return response()->json(Product::all());
    }

    /**
     * [TAG: GET_PRODUCT_BY_ID]
     * Mengambil detail spesifik dari satu produk berdasarkan ID integer-nya.
     * Fungsi ini merender informasi produk pada halaman Product Detail.
     */
    public function getProductById($id)
    {
        $product = Product::where('_id', (int) $id)->first();

        if (!$product) {
            return response()->json(['message' => 'Produk tidak ditemukan'], 404);
        }

        return response()->json($product);
    }

    /**
     * [TAG: GET_CART]
     * Mengambil seluruh isi keranjang belanja milik user (berdasarkan session_id).
     * Fungsi yang me-return data CartItem beserta relasinya ke tabel Product (Join).
     */
    public function getCart(Request $request)
    {
        $sessionId = $request->query('session_id', 'default');

        $cartItems = CartItem::with('product')
            ->where('session_id', $sessionId)
            ->get();

        return response()->json($cartItems);
    }

    /**
     * [TAG: ADD_TO_CART]
     * Menerima request untuk memasukkan produk ke keranjang.
     * Jika produk sudah ada di keranjang, maka hanya akan menambahkan jumlah (quantity) nya aja.
     * Jika belum ada, maka akan membuat baris data baru.
     */
    public function addToCart(Request $request)
    {
        $request->validate([
            'product_id' => 'required',
            'quantity' => 'required|integer|min:1',
            'session_id' => 'string'
        ]);

        $sessionId = $request->input('session_id', 'default');
        $productId = (int) $request->product_id;

        $cartItem = CartItem::where('session_id', $sessionId)
            ->where('product_id', $productId)
            ->first();

        if ($cartItem) {
            $cartItem->quantity += $request->quantity;
            $cartItem->save();
        } else {
            $cartItem = CartItem::create([
                'product_id' => $productId,
                'quantity' => $request->quantity,
                'session_id' => $sessionId
            ]);
        }

        return response()->json($cartItem, 201);
    }

    /**
     * [TAG: UPDATE_CART_ITEM]
     * Mengubah jumlah (quantity) satu item keranjang dan menyimpannya ke database.
     * Dipanggil setiap user menekan tombol +/- di halaman Cart.
     */
    public function updateCartItem(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cartItem = CartItem::find($id);

        if (!$cartItem) {
            return response()->json(['message' => 'Item tidak ditemukan'], 404);
        }

        $cartItem->quantity = (int) $request->quantity;
        $cartItem->save();

        return response()->json($cartItem->load('product'));
    }

    /**
     * [TAG: REMOVE_FROM_CART]
     * Menghapus satu item spesifik dari keranjang belanja user.
     * Fungsi ini dipanggil saat user menekan ikon tempat sampah di halaman Cart.
     */
    public function removeFromCart($id)
    {
        $cartItem = CartItem::find($id);

        if ($cartItem) {
            $cartItem->delete();
            return response()->json(['message' => 'Item berhasil dihapus dari keranjang']);
        }

        return response()->json(['message' => 'Item tidak ditemukan'], 404);
    }

    /**
     * [TAG: CLEAR_CART]
     * Menghapus seluruh isi keranjang belanja user secara permanen dari database.
     * Fungsi ini tereksekusi otomatis setelah user berhasil melakukan checkout.
     */
    public function clearCart(Request $request)
    {
        $sessionId = $request->query('session_id', 'default');
        CartItem::where('session_id', $sessionId)->delete();

        return response()->json(['message' => 'Keranjang berhasil dikosongkan']);
    }
}
