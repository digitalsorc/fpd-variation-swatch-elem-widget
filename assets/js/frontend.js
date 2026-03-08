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
                const fpdData = this.findFPDInstance();
                
                if (fpdData && fpdData.instance) {
                    console.log('[FPD Size Swatches] FPD Instance found!', fpdData.element);
                    this.bindFPDEvents(fpdData.element, fpdData.instance);
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
            
            if (!window.jQuery) return null;

            for (let sel of selectors) {
                if (!sel) continue;
                const $el = window.jQuery(sel);
                if ($el.length) {
                    let instance = $el.data('fancyProductDesigner') || $el.data('fpd');
                    if (instance) {
                        return { element: $el, instance: instance };
                    }
                }
            }
            return null;
        }

        /**
         * Bind FPD specific events.
         * @param {jQuery} $fpdElement
         * @param {Object} fpdInstance
         */
        bindFPDEvents($fpdElement, fpdInstance) {
            const self = this;
            
            const handleEvent = (e) => {
                const type = e && e.type ? e.type : 'unknown';
                console.log('[FPD Size Swatches] FPD Event triggered:', type);
                self.handleProductChange(fpdInstance, type);
            };

            // Bind using jQuery on the FPD container element (Standard FPD behavior)
            if ($fpdElement && $fpdElement.length) {
                console.log('[FPD Size Swatches] Binding events to FPD container via jQuery...');
                $fpdElement.on('ready productSelect productAdd', function(e) {
                    handleEvent(e);
                });
            }

            // Also bind to the instance directly if supported
            if (fpdInstance && typeof fpdInstance.addEventListener === 'function') {
                console.log('[FPD Size Swatches] Binding events directly to FPD instance...');
                fpdInstance.addEventListener('ready', () => handleEvent({type: 'ready'}));
                fpdInstance.addEventListener('productSelect', () => handleEvent({type: 'productSelect'}));
                fpdInstance.addEventListener('productAdd', () => handleEvent({type: 'productAdd'}));
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

                // Try to get the active product title from the UI first (most reliable for product swaps)
                if (window.jQuery) {
                    const $activeItem = window.jQuery('.fpd-item.fpd-active');
                    if ($activeItem.length) {
                        productTitle = $activeItem.find('.fpd-item-title').text().trim() || $activeItem.attr('data-title');
                        // Some setups store ID in data attribute
                        productId = $activeItem.attr('data-id') || $activeItem.data('id');
                    }
                }

                // Fallback to API methods
                if (!productTitle && typeof fpdInstance.getProduct === 'function') {
                    try {
                        const currentProd = fpdInstance.getProduct();
                        if (currentProd) {
                            const prodData = Array.isArray(currentProd) && currentProd.length > 0 ? currentProd[0] : currentProd;
                            if (prodData) {
                                productId = productId || prodData.id || prodData.product_id || prodData.productId;
                                productTitle = productTitle || prodData.title || prodData.productTitle;
                            }
                        }
                    } catch (e) {
                        console.error('[FPD Size Swatches] Error calling getProduct()', e);
                    }
                }

                if (!productTitle && typeof fpdInstance.getProducts === 'function') {
                    try {
                        const products = fpdInstance.getProducts();
                        if (products && products.length > 0) {
                            const currentProduct = products[0]; 
                            productId = productId || currentProduct.id || currentProduct.product_id;
                            productTitle = productTitle || currentProduct.title;
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
            }, 500);
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
                    if (this.container.style.display !== 'none' && this.config.required) {
                        if (!this.selectedSize) {
                            e.preventDefault();
                            this.errorMsg.style.display = 'block';
                            this.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                });
            }
        }
    }

    function initFPDSizeSwatches() {
        const widgets = document.querySelectorAll('.fpd-sizes-swatches:not(.fpd-initialized)');
        widgets.forEach(widget => {
            widget.classList.add('fpd-initialized');
            new FPDSizeSwatches(widget);
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFPDSizeSwatches);
    } else {
        initFPDSizeSwatches();
    }

    // Also hook into Elementor for editor/dynamic loading
    if (typeof jQuery !== 'undefined') {
        jQuery(window).on('elementor/frontend/init', function() {
            if (window.elementorFrontend && window.elementorFrontend.hooks) {
                window.elementorFrontend.hooks.addAction('frontend/element_ready/fpd_size_swatches.default', function($scope) {
                    initFPDSizeSwatches();
                });
            }
        });
    }

})();
