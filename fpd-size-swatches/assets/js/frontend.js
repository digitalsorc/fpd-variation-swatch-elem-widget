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
            const maxAttempts = 20; // 10 seconds max

            const checkFPD = () => {
                const fpdData = this.findFPDInstance();

                if (fpdData && fpdData.instance) {
                    console.log('[FPD Size Swatches] FPD Instance found!', fpdData.element);
                    this.bindFPDEvents(fpdData.instance);
                    // Trigger initial check if a product is already loaded
                    setTimeout(() => this.handleProductChange(fpdData.instance), 500);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkFPD, 500);
                } else {
                    console.warn('[FPD Size Swatches] Could not find FPD instance after 10 seconds.');
                }
            };
            checkFPD();
        }

        /**
         * Smartly find the FPD instance in the DOM.
         */
        findFPDInstance() {
            // 1. Try the user-defined selector first, then common fallbacks
            const selectors = [this.config.selector, '.fpd-container', '.fancy-product-designer', '#fpd', '.fpd-main'];
            
            for (let sel of selectors) {
                if (!sel) continue;
                const el = document.querySelector(sel);
                if (el) {
                    let instance = window.fancyProductDesigner || (window.jQuery && window.jQuery(el).data('fancyProductDesigner'));
                    if (instance) return { element: el, instance: instance };
                }
            }

            // 2. Desperate fallback: scan all divs for jQuery data
            if (window.jQuery) {
                let found = null;
                window.jQuery('div').each(function() {
                    let inst = window.jQuery(this).data('fancyProductDesigner');
                    if (inst) {
                        found = { element: this, instance: inst };
                        return false; // break loop
                    }
                });
                if (found) return found;
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
                const type = e && e.type ? e.type : e;
                console.log('[FPD Size Swatches] FPD Event triggered:', type);
                self.handleProductChange(fpdInstance, type);
            };

            // 1. Bind directly to the FPD instance (Recommended by FPD docs)
            if (fpdInstance && typeof fpdInstance.addEventListener === 'function') {
                console.log('[FPD Size Swatches] Binding events directly to FPD instance...');
                fpdInstance.addEventListener('ready', handleEvent);
                fpdInstance.addEventListener('productAdd', handleEvent);
                fpdInstance.addEventListener('productSelect', handleEvent);
                fpdInstance.addEventListener('viewSelect', handleEvent);
            }

            // 2. Bind to document body via jQuery delegation (Catches DOM events even if container is recreated)
            if (window.jQuery) {
                console.log('[FPD Size Swatches] Binding events to document body via jQuery...');
                window.jQuery(document.body).on('productSelect productAdd ready viewSelect productCreate', '.fpd-container, .fancy-product-designer, #fpd, .fpd-main', function(e) {
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

                // Try getProduct() first (returns current showing product)
                if (typeof fpdInstance.getProduct === 'function') {
                    try {
                        const currentProd = fpdInstance.getProduct();
                        if (currentProd && !Array.isArray(currentProd)) {
                            productId = currentProd.id || currentProd.product_id;
                            productTitle = currentProd.title;
                        } else if (Array.isArray(currentProd) && currentProd.length > 0) {
                            productId = currentProd[0].id || currentProd[0].product_id;
                            productTitle = currentProd[0].title || currentProd[0].product_title;
                        }
                    } catch (e) {}
                }

                // Try getProducts() fallback
                if (!productId && typeof fpdInstance.getProducts === 'function') {
                    try {
                        const products = fpdInstance.getProducts();
                        if (products && products.length > 0) {
                            // The active product is usually the first one in single-base setups
                            const currentProduct = products[0]; 
                            productId = currentProduct.id || currentProduct.product_id;
                            productTitle = currentProduct.title;
                        }
                    } catch (e) {}
                }

                // Try internal properties fallback
                if (!productId && fpdInstance.currentViewInstance && fpdInstance.currentViewInstance.product) {
                    productId = fpdInstance.currentViewInstance.product.id || fpdInstance.currentViewInstance.product.product_id;
                    productTitle = fpdInstance.currentViewInstance.product.title;
                }

                console.log(`[FPD Size Swatches] Active FPD Product detected (Event: ${eventType}):`, { id: productId, title: productTitle });

                if (productId || productTitle) {
                    this.matchConfig(productId, productTitle);
                } else {
                    console.warn('[FPD Size Swatches] Could not determine active product ID or Title.');
                }
            }, 300); // 300ms delay ensures FPD has finished loading the new product before we check the ID
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
