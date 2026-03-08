<?php
/**
 * Plugin Name: FPD Size Swatches
 * Description: Elementor widget for managing product size options alongside Fancy Product Designer.
 * Version: 1.0.0
 * Author: Digital Sorc
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: fpd-size-swatches
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

define( 'FPD_SIZE_SWATCHES_VERSION', '1.0.0' );
define( 'FPD_SIZE_SWATCHES_DIR', plugin_dir_path( __FILE__ ) );
define( 'FPD_SIZE_SWATCHES_URL', plugin_dir_url( __FILE__ ) );

// Initialize the plugin
add_action( 'plugins_loaded', 'fpd_size_swatches_init' );

/**
 * Initialize plugin components.
 */
function fpd_size_swatches_init() {
	// Check if Elementor and WooCommerce are active
	if ( ! did_action( 'elementor/loaded' ) || ! class_exists( 'WooCommerce' ) ) {
		return;
	}

	require_once FPD_SIZE_SWATCHES_DIR . 'includes/class-frontend.php';
	\FPD_Size_Swatches\Frontend::init();

	add_action( 'elementor/widgets/register', 'fpd_size_swatches_register_widgets' );
	add_action( 'elementor/frontend/after_enqueue_styles', 'fpd_size_swatches_enqueue_styles' );
	add_action( 'elementor/frontend/after_enqueue_scripts', 'fpd_size_swatches_enqueue_scripts' );
}

/**
 * Register Elementor widget.
 *
 * @param \Elementor\Widgets_Manager $widgets_manager Elementor widgets manager.
 */
function fpd_size_swatches_register_widgets( $widgets_manager ) {
	require_once FPD_SIZE_SWATCHES_DIR . 'includes/class-widget.php';
	$widgets_manager->register( new \FPD_Size_Swatches\Widget() );
}

/**
 * Enqueue frontend styles.
 */
function fpd_size_swatches_enqueue_styles() {
	wp_register_style( 'fpd-size-swatches', FPD_SIZE_SWATCHES_URL . 'assets/css/frontend.css', [], FPD_SIZE_SWATCHES_VERSION );
}

/**
 * Enqueue frontend scripts.
 */
function fpd_size_swatches_enqueue_scripts() {
	wp_register_script( 'fpd-size-swatches', FPD_SIZE_SWATCHES_URL . 'assets/js/frontend.js', [ 'jquery' ], FPD_SIZE_SWATCHES_VERSION, true );
}
