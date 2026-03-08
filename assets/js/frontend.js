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
            this.handleProductChangeTimeout = null;

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
            const maxAttempts = 40; // 20 seconds max

            const checkFPD = () => {
                // Check if FPD instance is available globally (standard for FPD)
                if (window.fancyProductDesigner && typeof window.fancyProductDesigner.getProducts === 'function') {
                    console.log('[FPD Size Swatches] Global FPD Instance found!');
                    this.bindFPDEvents(window.fancyProductDesigner);
                    // Trigger initial check
                    setTimeout(() => this.handleProductChange(window.fancyProductDesigner, 'init'), 500);
                    return;
                }

                // Fallback: Check via jQuery data on common selectors
                const fpdData = this.findFPDInstance();
                if (fpdData && fpdData.instance) {
                    console.log('[FPD Size Swatches] FPD Instance found via jQuery!', fpdData.element);
                    this.bindFPDEvents(fpdData.instance);
                    // Trigger initial check
                    setTimeout(() => this.handleProductChange(fpdData.instance, 'init'), 500);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkFPD, 500);
                } else {
                    console.warn('[FPD Size Swatches] Could not find FPD instance after 20 seconds.');
                }
            };
            checkFPD();
        }

        /**
         * Smartly find the FPD instance in the DOM.
         */
        findFPDInstance() {
            const selectors = [this.config.selector, '.fpd-container', '.fancy-product-designer', '#fpd', '.fpd-main'];
            
            for (let sel of selectors) {
                if (!sel) continue;
                const el = document.querySelector(sel);
                if (el && window.jQuery) {
                    let instance = window.jQuery(el).data('fancyProductDesigner');
                    if (instance) return { element: el, instance: instance };
                }
            }
            return null;
        }

        /**
         * Bind FPD specific events.
         * @param {Object} fpdInstance
         */
        bindFPDEvents(fpdInstance) {
            const self = this;
            
            const handleEvent = (e) => {
                const type = e && e.type ? e.type : (typeof e === 'string' ? e : 'unknown');
                console.log('[FPD Size Swatches] FPD Event triggered:', type);
                self.handleProductChange(fpdInstance, type);
            };

            // 1. Bind directly to the FPD instance (Official API)
            if (fpdInstance && typeof fpdInstance.addEventListener === 'function') {
                console.log('[FPD Size Swatches] Binding events directly to FPD instance...');
                // 'ready' fires when FPD is fully loaded
                fpdInstance.addEventListener('ready', () => handleEvent('ready'));
                // 'productSelect' fires when a user selects a different product from the module
                fpdInstance.addEventListener('productSelect', () => handleEvent('productSelect'));
                // 'productAdd' fires when a new product is added to the stage
                fpdInstance.addEventListener('productAdd', () => handleEvent('productAdd'));
            }

            // 2. Bind to document body via jQuery delegation (Catches DOM events even if container is recreated)
            if (window.jQuery) {
                console.log('[FPD Size Swatches] Binding events to document body via jQuery...');
                window.jQuery(document.body).on('productSelect productAdd ready', '.fpd-container, .fancy-product-designer, #fpd, .fpd-main', function(e) {
                    handleEvent(e);
                });
            }
        }

        /**
         * Handle FPD product change (Debounced to wait for FPD state to settle).
         * @param {Object} fpdInstance
         * @param {String} eventType
         */
        handleProductChange(fpdInstance, eventType) {
            if (this.handleProductChangeTimeout) {
                clearTimeout(this.handleProductChangeTimeout);
            }

            this.handleProductChangeTimeout = setTimeout(() => {
                if (!fpdInstance) return;

                let productId = null;
                let productTitle = null;

                // Official API: getProduct() returns the current showing product with all views
                if (typeof fpdInstance.getProduct === 'function') {
                    try {
                        const currentProd = fpdInstance.getProduct();
                        // FPD getProduct() usually returns an array of views, but the product info might be attached to it
                        if (currentProd) {
                            // Sometimes it's an array, sometimes an object depending on FPD version
                            const prodData = Array.isArray(currentProd) && currentProd.length > 0 ? currentProd[0] : currentProd;
                            
                            // Try to extract ID and Title from the product data
                            if (prodData) {
                                productId = prodData.id || prodData.product_id || prodData.productId;
                                productTitle = prodData.title || prodData.productTitle;
                            }
                        }
                    } catch (e) {
                        console.error('[FPD Size Swatches] Error calling getProduct()', e);
                    }
                }

                // Official API Fallback: getProducts() returns an array with all products
                // If we couldn't get the ID from getProduct(), try getProducts()
                if (!productId && typeof fpdInstance.getProducts === 'function') {
                    try {
                        const products = fpdInstance.getProducts();
                        if (products && products.length > 0) {
                            // The active product is usually the first one in single-base setups
                            const currentProduct = products[0]; 
                            productId = currentProduct.id || currentProduct.product_id;
                            productTitle = currentProduct.title;
                        }
                    } catch (e) {
                        console.error('[FPD Size Swatches] Error calling getProducts()', e);
                    }
                }

                console.log(`[FPD Size Swatches] Active FPD Product detected (Event: ${eventType}):`, { id: productId, title: productTitle });

                if (productId || productTitle) {
                    this.matchConfig(productId, productTitle);
                } else {
                    console.warn('[FPD Size Swatches] Could not determine active product ID or Title. Hiding widget.');
                    this.container.style.display = 'none';
                    this.clearSelection();
                }
            }, 500); // 500ms delay ensures FPD has finished loading the new product before we check the ID
        }

        /**
         * Match current product against widget config.
         * @param {string|number} id 
         * @param {string} title 
         */
        matchConfig(id, title) {
            let matchedConfig = null;

            console.log('[FPD Size Swatches] Trying to match product ID:', id, 'Title:', title);
            console.log('[FPD Size Swatches] Available configs:', this.config.products);

            for (const prodConfig of this.config.products) {
                // Use loose string comparison to avoid type mismatch (e.g., 22 vs "22")
                if (prodConfig.id && String(prodConfig.id) === String(id)) {
                    console.log('[FPD Size Swatches] Matched by ID:', prodConfig.id);
                    matchedConfig = prodConfig;
                    break;
                }
                if (prodConfig.pattern && title) {
                    try {
                        const regex = new RegExp(prodConfig.pattern, 'i');
                        if (regex.test(title)) {
                            console.log('[FPD Size Swatches] Matched by Title Regex:', prodConfig.pattern);
                            matchedConfig = prodConfig;
                            break;
                        }
                    } catch (e) {
                        console.error('[FPD Size Swatches] Invalid regex pattern', e);
                    }
                }
            }

            if (matchedConfig) {
                if (matchedConfig.show_sizes) {
                    console.log('[FPD Size Swatches] Showing sizes for matched config.');
                    this.renderSizes(matchedConfig.sizes);
                    this.container.style.display = 'block';
                } else {
                    console.log('[FPD Size Swatches] Matched config explicitly says "Show Sizes: No". Hiding widget.');
                    this.container.style.display = 'none';
                    this.clearSelection();
                }
            } else {
                console.log('[FPD Size Swatches] No matching config found for this product. Hiding widget.');
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
