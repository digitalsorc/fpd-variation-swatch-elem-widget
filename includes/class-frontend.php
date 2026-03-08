<?php
namespace FPD_Size_Swatches;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Frontend {

	/**
	 * Initialize WooCommerce hooks.
	 */
	public static function init() {
		add_filter( 'woocommerce_add_cart_item_data', [ __CLASS__, 'add_cart_item_data' ], 10, 2 );
		add_filter( 'woocommerce_get_item_data', [ __CLASS__, 'get_item_data' ], 10, 2 );
		add_action( 'woocommerce_checkout_create_order_line_item', [ __CLASS__, 'add_order_item_meta' ], 10, 3 );
	}

	/**
	 * Save size to cart item data.
	 *
	 * @param array $cart_item_data Cart item data.
	 * @param int   $product_id     Product ID.
	 * @return array
	 */
	public static function add_cart_item_data( $cart_item_data, $product_id ) {
		if ( isset( $_POST['fpd_size'] ) && ! empty( $_POST['fpd_size'] ) ) {
			$cart_item_data['fpd_size'] = sanitize_text_field( wp_unslash( $_POST['fpd_size'] ) );
		}
		return $cart_item_data;
	}

	/**
	 * Display size in cart and checkout.
	 *
	 * @param array $item_data Cart item data array.
	 * @param array $cart_item Cart item data.
	 * @return array
	 */
	public static function get_item_data( $item_data, $cart_item ) {
		if ( isset( $cart_item['fpd_size'] ) ) {
			$item_data[] = [
				'name'  => __( 'Size', 'fpd-size-swatches' ),
				'value' => $cart_item['fpd_size'],
			];
		}
		return $item_data;
	}

	/**
	 * Save size to order line item meta.
	 *
	 * @param \WC_Order_Item_Product $item          Order item.
	 * @param string                 $cart_item_key Cart item key.
	 * @param array                  $values        Cart item values.
	 */
	public static function add_order_item_meta( $item, $cart_item_key, $values ) {
		if ( isset( $values['fpd_size'] ) ) {
			$item->add_meta_data( __( 'Size', 'fpd-size-swatches' ), $values['fpd_size'], true );
		}
	}
}
