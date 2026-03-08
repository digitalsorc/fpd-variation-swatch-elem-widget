<?php
namespace FPD_Size_Swatches;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Repeater;
use Elementor\Group_Control_Typography;

class Widget extends Widget_Base {

	/**
	 * Get widget name.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'fpd_size_swatches';
	}

	/**
	 * Get widget title.
	 *
	 * @return string
	 */
	public function get_title() {
		return __( 'FPD Size Swatches', 'fpd-size-swatches' );
	}

	/**
	 * Get widget icon.
	 *
	 * @return string
	 */
	public function get_icon() {
		return 'eicon-product-variants';
	}

	/**
	 * Get widget categories.
	 *
	 * @return array
	 */
	public function get_categories() {
		return [ 'general', 'woocommerce-elements' ];
	}

	/**
	 * Get widget dependencies.
	 *
	 * @return array
	 */
	public function get_script_depends() {
		return [ 'fpd-size-swatches' ];
	}

	/**
	 * Get widget dependencies.
	 *
	 * @return array
	 */
	public function get_style_depends() {
		return [ 'fpd-size-swatches' ];
	}

	/**
	 * Register widget controls.
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => __( 'Content', 'fpd-size-swatches' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'widget_title',
			[
				'label'   => __( 'Widget Title', 'fpd-size-swatches' ),
				'type'    => Controls_Manager::TEXT,
				'default' => __( 'Select Size', 'fpd-size-swatches' ),
			]
		);

		$this->add_control(
			'fpd_instance_selector',
			[
				'label'   => __( 'FPD Instance Selector', 'fpd-size-swatches' ),
				'type'    => Controls_Manager::TEXT,
				'default' => '.fpd-main',
				'description' => __( 'CSS selector for the Fancy Product Designer container.', 'fpd-size-swatches' ),
			]
		);

		$this->add_control(
			'size_required',
			[
				'label'        => __( 'Size Required?', 'fpd-size-swatches' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => __( 'Yes', 'fpd-size-swatches' ),
				'label_off'    => __( 'No', 'fpd-size-swatches' ),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'default_visibility',
			[
				'label'   => __( 'Default Visibility', 'fpd-size-swatches' ),
				'type'    => Controls_Manager::SELECT,
				'options' => [
					'show' => __( 'Show', 'fpd-size-swatches' ),
					'hide' => __( 'Hide', 'fpd-size-swatches' ),
				],
				'default' => 'hide',
			]
		);

		$repeater = new Repeater();

		$repeater->add_control(
			'fpd_product_id',
			[
				'label'       => __( 'FPD Product ID', 'fpd-size-swatches' ),
				'type'        => Controls_Manager::NUMBER,
				'description' => __( 'Optional. Match by exact FPD Product ID.', 'fpd-size-swatches' ),
			]
		);

		$repeater->add_control(
			'title_match_pattern',
			[
				'label'       => __( 'Title Match Pattern', 'fpd-size-swatches' ),
				'type'        => Controls_Manager::TEXT,
				'description' => __( 'Optional. Regex pattern to match FPD Product Title (used if ID not set).', 'fpd-size-swatches' ),
			]
		);

		$repeater->add_control(
			'show_sizes',
			[
				'label'        => __( 'Show Sizes?', 'fpd-size-swatches' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => __( 'Yes', 'fpd-size-swatches' ),
				'label_off'    => __( 'No', 'fpd-size-swatches' ),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$repeater->add_control(
			'sizes_text',
			[
				'label'       => __( 'Sizes Config', 'fpd-size-swatches' ),
				'type'        => Controls_Manager::TEXTAREA,
				'description' => __( 'Format: Label|Value|PriceAdjustment (one per line). Example: XL|XL|2.50', 'fpd-size-swatches' ),
				'condition'   => [
					'show_sizes' => 'yes',
				],
			]
		);

		$this->add_control(
			'fpd_products_config',
			[
				'label'       => __( 'FPD Products Config', 'fpd-size-swatches' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $repeater->get_controls(),
				'title_field' => '{{{ fpd_product_id || title_match_pattern || "Product Config" }}}',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => __( 'Style', 'fpd-size-swatches' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'swatch_layout',
			[
				'label'   => __( 'Swatch Layout', 'fpd-size-swatches' ),
				'type'    => Controls_Manager::SELECT,
				'options' => [
					'pills' => __( 'Pills', 'fpd-size-swatches' ),
					'grid'  => __( 'Grid', 'fpd-size-swatches' ),
				],
				'default' => 'pills',
			]
		);

		$this->add_control(
			'swatch_bg_color',
			[
				'label'     => __( 'Swatch Background Color', 'fpd-size-swatches' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .fpd-swatch' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'swatch_active_bg_color',
			[
				'label'     => __( 'Active Swatch Background', 'fpd-size-swatches' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .fpd-swatch--active' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'swatch_text_color',
			[
				'label'     => __( 'Swatch Text Color', 'fpd-size-swatches' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .fpd-swatch' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'swatch_active_text_color',
			[
				'label'     => __( 'Active Swatch Text Color', 'fpd-size-swatches' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .fpd-swatch--active' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'swatch_border_radius',
			[
				'label'      => __( 'Border Radius', 'fpd-size-swatches' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em' ],
				'selectors'  => [
					'{{WRAPPER}} .fpd-swatch' => 'border-radius: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'swatch_typography',
				'selector' => '{{WRAPPER}} .fpd-swatch',
			]
		);

		$this->add_control(
			'swatch_spacing',
			[
				'label'      => __( 'Spacing Between Swatches', 'fpd-size-swatches' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'selectors'  => [
					'{{WRAPPER}} .fpd-swatches-container' => 'gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Render widget output on the frontend.
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		// Parse sizes textarea into structured array for JS
		$config = [];
		if ( ! empty( $settings['fpd_products_config'] ) ) {
			foreach ( $settings['fpd_products_config'] as $item ) {
				$sizes = [];
				if ( $item['show_sizes'] === 'yes' && ! empty( $item['sizes_text'] ) ) {
					$lines = explode( "\n", $item['sizes_text'] );
					foreach ( $lines as $line ) {
						$parts = array_map( 'trim', explode( '|', $line ) );
						if ( count( $parts ) >= 2 ) {
							$sizes[] = [
								'label' => $parts[0],
								'value' => $parts[1],
								'price' => isset( $parts[2] ) ? floatval( $parts[2] ) : 0,
							];
						}
					}
				}

				$config[] = [
					'id'         => $item['fpd_product_id'],
					'pattern'    => $item['title_match_pattern'],
					'show_sizes' => $item['show_sizes'] === 'yes',
					'sizes'      => $sizes,
				];
			}
		}

		$widget_config = [
			'selector'      => $settings['fpd_instance_selector'],
			'required'      => $settings['size_required'] === 'yes',
			'products'      => $config,
		];

		$display_style = $settings['default_visibility'] === 'show' ? 'block' : 'none';
		
		// Smart Fallback: Pre-render the first available size config if visibility is Show
		$initial_sizes = [];
		if ( $settings['default_visibility'] === 'show' && ! empty( $config ) ) {
			foreach ( $config as $c ) {
				if ( $c['show_sizes'] && ! empty( $c['sizes'] ) ) {
					$initial_sizes = $c['sizes'];
					break;
				}
			}
		}
		?>
		<div class="fpd-sizes-swatches" 
			data-widget-config="<?php echo esc_attr( wp_json_encode( $widget_config ) ); ?>" 
			data-layout="<?php echo esc_attr( $settings['swatch_layout'] ); ?>" 
			style="display: <?php echo esc_attr( $display_style ); ?>;">
			
			<?php if ( ! empty( $settings['widget_title'] ) ) : ?>
				<p class="fpd-sizes-label"><?php echo esc_html( $settings['widget_title'] ); ?></p>
			<?php endif; ?>
			
			<div class="fpd-swatches-container" role="group" aria-label="<?php esc_attr_e( 'Select size', 'fpd-size-swatches' ); ?>">
				<?php foreach ( $initial_sizes as $size ) : ?>
					<button type="button" class="fpd-swatch" data-value="<?php echo esc_attr( $size['value'] ); ?>" aria-label="<?php echo esc_attr( $size['label'] ); ?>">
						<?php echo esc_html( $size['label'] ); ?>
						<?php if ( ! empty( $size['price'] ) ) : ?>
							<span class="fpd-swatch-price"> (+<?php echo esc_html( $size['price'] ); ?>)</span>
						<?php endif; ?>
					</button>
				<?php endforeach; ?>
			</div>
			
			<p class="fpd-size-validation-error" style="display:none;">
				<?php esc_html_e( 'Please select a size.', 'fpd-size-swatches' ); ?>
			</p>
		</div>
		<?php
	}
}
