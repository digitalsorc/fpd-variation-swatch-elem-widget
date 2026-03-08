/**
 * FPD Size Swatches Frontend Script
 */
(function() {
    'use strict';

    class FPDSizeSwatches {
        /**
         * Initialize the widget handler.
         * @param {HTMLElement} element The widget container element.
         */
        constructor(element) {
            this.container = element;
            this.config = JSON.parse(this.container.getAttribute('data-widget-config') || '{}');
            this.swatchesContainer = this.container.querySelector('.fpd-swatches-container');
            this.errorMsg = this.container.querySelector('.fpd-size-validation-error');
            this.cartForm = document.querySelector('form.cart');
            this.hiddenInput = null;
            this.currentSizes = [];
            this.selectedSize = '';

            this.initHiddenInput();
            this.bindEvents();
            this.waitForFPD();
        }

        /**
         * Create or find the hidden input in the cart form.
         */
        initHiddenInput() {
            if (!this.cartForm) return;
            
            this.hiddenInput = this.cartForm.querySelector('input[name="fpd_size"]');
            if (!this.hiddenInput) {
                this.hiddenInput = document.createElement('input');
                this.hiddenInput.type = 'hidden';
                this.hiddenInput.name = 'fpd_size';
                this.hiddenInput.value = '';
                this.cartForm.appendChild(this.hiddenInput);
            }
        }

        /**
         * Wait for FPD to be ready.
         */
        waitForFPD() {
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds max

            const checkFPD = () => {
                const fpdElement = document.querySelector(this.config.selector || '.fpd-main');
                
                // Check if FPD instance is available on window or jQuery data
                let fpdInstance = window.fancyProductDesigner || (window.jQuery && window.jQuery(fpdElement).data('fancyProductDesigner'));

                if (fpdElement && fpdInstance) {
                    this.bindFPDEvents(fpdElement, fpdInstance);
                    // Trigger initial check if a product is already loaded
                    setTimeout(() => this.handleProductChange(fpdInstance), 500);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkFPD, 500);
                }
            };
            checkFPD();
        }

        /**
         * Bind FPD specific events.
         * @param {HTMLElement} fpdElement 
         * @param {Object} fpdInstance
         */
        bindFPDEvents(fpdElement, fpdInstance) {
            // FPD triggers events on the container using jQuery
            if (window.jQuery) {
                window.jQuery(fpdElement).on('productSelect productAdd ready', () => {
                    this.handleProductChange(fpdInstance);
                });
            } else {
                fpdElement.addEventListener('productSelect', () => this.handleProductChange(fpdInstance));
                fpdElement.addEventListener('productAdd', () => this.handleProductChange(fpdInstance));
                fpdElement.addEventListener('ready', () => this.handleProductChange(fpdInstance));
            }
        }

        /**
         * Handle FPD product change.
         * @param {Object} fpdInstance
         */
        handleProductChange(fpdInstance) {
            if (!fpdInstance || typeof fpdInstance.getProducts !== 'function') return;

            // FPD API: get current products
            const products = fpdInstance.getProducts();
            if (!products || products.length === 0) return;

            // Use the first product (standard for single-base setups)
            const currentProduct = products[0]; 
            const productId = currentProduct.id || currentProduct.product_id;
            const productTitle = currentProduct.title;

            this.matchConfig(productId, productTitle);
        }

        /**
         * Match current product against widget config.
         * @param {string|number} id 
         * @param {string} title 
         */
        matchConfig(id, title) {
            let matchedConfig = null;

            for (const prodConfig of this.config.products) {
                if (prodConfig.id && prodConfig.id == id) {
                    matchedConfig = prodConfig;
                    break;
                }
                if (prodConfig.pattern && title) {
                    try {
                        const regex = new RegExp(prodConfig.pattern, 'i');
                        if (regex.test(title)) {
                            matchedConfig = prodConfig;
                            break;
                        }
                    } catch (e) {
                        console.error('Invalid regex pattern in FPD Size Swatches config', e);
                    }
                }
            }

            if (matchedConfig && matchedConfig.show_sizes) {
                this.renderSizes(matchedConfig.sizes);
                this.container.style.display = 'block';
            } else {
                this.container.style.display = 'none';
                this.clearSelection();
            }
        }

        /**
         * Render size buttons.
         * @param {Array} sizes 
         */
        renderSizes(sizes) {
            this.currentSizes = sizes;
            this.swatchesContainer.innerHTML = '';
            
            // If the previously selected size is not in the new list, clear it
            const sizeExists = sizes.some(s => s.value === this.selectedSize);
            if (!sizeExists) {
                this.clearSelection();
            }

            sizes.forEach(size => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fpd-swatch';
                if (this.selectedSize === size.value) {
                    btn.classList.add('fpd-swatch--active');
                }
                btn.setAttribute('data-value', size.value);
                btn.setAttribute('aria-label', size.label);
                btn.textContent = size.label;

                if (size.price) {
                    const priceSpan = document.createElement('span');
                    priceSpan.className = 'fpd-swatch-price';
                    priceSpan.textContent = ` (+$${size.price})`;
                    btn.appendChild(priceSpan);
                }

                btn.addEventListener('click', () => this.selectSize(size.value, btn));
                this.swatchesContainer.appendChild(btn);
            });
        }

        /**
         * Handle size selection.
         * @param {string} value 
         * @param {HTMLElement} btnElement 
         */
        selectSize(value, btnElement) {
            this.selectedSize = value;
            if (this.hiddenInput) {
                this.hiddenInput.value = value;
            }
            this.errorMsg.style.display = 'none';

            const allBtns = this.swatchesContainer.querySelectorAll('.fpd-swatch');
            allBtns.forEach(btn => btn.classList.remove('fpd-swatch--active'));
            btnElement.classList.add('fpd-swatch--active');
        }

        /**
         * Clear current selection.
         */
        clearSelection() {
            this.selectedSize = '';
            if (this.hiddenInput) {
                this.hiddenInput.value = '';
            }
            const allBtns = this.swatchesContainer.querySelectorAll('.fpd-swatch');
            allBtns.forEach(btn => btn.classList.remove('fpd-swatch--active'));
        }

        /**
         * Bind form submission and other events.
         */
        bindEvents() {
            if (this.cartForm) {
                this.cartForm.addEventListener('submit', (e) => {
                    // Only validate if widget is visible and required
                    if (this.container.style.display !== 'none' && this.config.required) {
                        if (!this.selectedSize) {
                            e.preventDefault();
                            this.errorMsg.style.display = 'block';
                            
                            // Scroll to widget
                            this.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                });
            }
        }
    }

    // Initialize widgets on Elementor frontend load
    window.addEventListener('elementor/frontend/init', () => {
        elementorFrontend.hooks.addAction('frontend/element_ready/fpd_size_swatches.default', function($scope) {
            const widgetContainer = $scope[0].querySelector('.fpd-sizes-swatches');
            if (widgetContainer) {
                new FPDSizeSwatches(widgetContainer);
            }
        });
    });

})();
