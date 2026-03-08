=== FPD Size Swatches ===
Contributors: Digital Sorc
Tags: elementor, woocommerce, fancy product designer, swatches
Requires at least: 5.8
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Elementor widget for managing product size options alongside Fancy Product Designer.

== Description ==

FPD Size Swatches is a custom Elementor widget designed to work seamlessly with Fancy Product Designer (FPD) and WooCommerce. It allows you to display size swatches (like S, M, L, XL) dynamically based on the currently selected FPD base product, without relying on WooCommerce's built-in product variations.

This is perfect for stores offering a single WooCommerce "Simple Product" that acts as a container for multiple FPD bases (e.g., T-shirt, hoodie, mug), where each base requires its own specific size options.

### Features
* Elementor Widget with full styling controls (colors, typography, spacing, border radius).
* Dynamic visibility based on FPD product selection.
* Configure sizes per FPD product ID or via Regex Title matching.
* Saves selected size to WooCommerce cart item data and order meta.
* Built-in validation to ensure a size is selected before adding to cart.

== Installation ==

1. Upload the `fpd-size-swatches` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Edit your Single Product template in Elementor.
4. Drag and drop the "FPD Size Swatches" widget onto the page (usually near the Add to Cart button).
5. Configure the FPD Products in the widget's Content tab.

== Usage ==

1. In the widget settings, define your FPD products using the Repeater.
2. For each product, specify the **FPD Product ID** or a **Title Match Pattern** (regex).
3. If the product requires sizes, toggle "Show Sizes?" to Yes.
4. In the "Sizes Config" textarea, enter your sizes one per line in the format: `Label|Value|PriceAdjustment` (e.g., `XL|XL|2.50`).
5. The widget will automatically listen to FPD events and update the swatches when the user changes the base product.

### Note on Elementor Limitations
Elementor does not natively support nested repeaters within `Widget_Base`. As a fallback, the "Sizes" field within the FPD Products repeater uses a textarea where each line represents a size.

== Troubleshooting ==

* **Sizes not switching:** Ensure the "FPD Instance Selector" in the widget settings matches your FPD container (default is `.fpd-main`).
* **FPD not detected:** The plugin waits up to 10 seconds for FPD to initialize. If your site is heavily cached or deferred, ensure FPD scripts are loading correctly.
* **Size not saving to cart:** Ensure the widget is placed on the same page as the WooCommerce Add to Cart form (`form.cart`), as it injects a hidden input field into it.
