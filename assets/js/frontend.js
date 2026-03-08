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
            this.isEditor = document.body.classList.contains('elementor-editor-active') || window.location.href.includes('elementor-preview');

            this.initHiddenInput();
            this.bindPreRenderedButtons();
            this.bindEvents();
            this.waitForFPD();
        }

        /**
         * Bind events to any buttons pre-rendered by PHP
         */
        bindPreRenderedButtons() {
            const btns = this.swatchesContainer.querySelectorAll('.fpd-swatch');
            if (btns.length > 0) {
                console.log('[FPD Size Swatches] Found pre-rendered buttons:', btns.length);
                btns.forEach(btn => {
                    btn.addEventListener('click', () => this.selectSize(btn.getAttribute('data-value'), btn));
                });
            }
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
            const maxAttempts = 100; // 50 seconds max

            const checkFPD = () => {
                let fpdInstance = null;
                let $fpdElement = null;

                // 1. Check global instance
                let globalFPD = window.fancyProductDesigner;
                if (Array.isArray(globalFPD) && globalFPD.length > 0) {
                    globalFPD = globalFPD[0];
                }
                if (globalFPD && typeof globalFPD.getProduct === 'function') {
                    fpdInstance = globalFPD;
                    $fpdElement = window.jQuery ? window.jQuery(this.config.selector || '.fpd-container') : null;
                }

                // 2. Check jQuery data
                if (!fpdInstance) {
                    const fpdData = this.findFPDInstance();
                    if (fpdData) {
                        fpdInstance = fpdData.instance;
                        $fpdElement = fpdData.element;
                    }
                }

                // 3. Aggressive Hunt (Run every 5 seconds if not found)
                if (!fpdInstance && attempts > 0 && attempts % 10 === 0) {
                    console.log('[FPD Size Swatches] Standard detection failed, aggressively hunting for FPD instance in DOM...');
                    const hunted = this.huntForFPD();
                    if (hunted) {
                        fpdInstance = hunted.instance;
                        $fpdElement = hunted.element;
                    }
                }

                if (fpdInstance || attempts > 10) {
                    // Even if we don't find the instance immediately, we bind the delegation events
                    // so that if it loads later, we catch it.
                    if (fpdInstance) {
                        console.log('[FPD Size Swatches] FPD Instance found!');
                    }
                    this.bindFPDEvents($fpdElement, fpdInstance);
                    // Trigger initial check
                    setTimeout(() => this.handleProductChange(fpdInstance, 'init'), 500);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkFPD, 500);
                } else {
                    console.warn('[FPD Size Swatches] Could not find FPD instance after 50 seconds.');
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
         * Aggressively hunt for the FPD instance across all likely elements.
         * Logs the exact selector the user should use.
         */
        huntForFPD() {
            if (!window.jQuery) return null;
            let found = null;
            
            // Look for common FPD classes or IDs first
            const possibleWrappers = window.jQuery('.fpd-container, .fancy-product-designer, [id^="fpd"], [class*="fpd"], .elementor-widget-container > div');
            
            possibleWrappers.each(function() {
                const $this = window.jQuery(this);
                const fpd = $this.data('fancyProductDesigner') || $this.data('fpd');
                if (fpd) {
                    let suggestedSelector = '';
                    if (this.id) {
                        suggestedSelector = '#' + this.id;
                    } else if (this.className) {
                        // Create a selector from the classes, ignoring generic ones
                        suggestedSelector = '.' + this.className.trim().split(/\s+/).join('.');
                    }
                    
                    console.log('%c=================================================', 'color: #4CAF50; font-weight: bold;');
                    console.log('%c🎯 SUCCESS! Found FPD Instance hidden in the DOM!', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
                    console.log('%c👉 PLEASE COPY AND PASTE THIS EXACT TEXT INTO THE "FPD Instance Selector" WIDGET SETTING:', 'color: #2196F3; font-weight: bold;');
                    console.log('%c' + suggestedSelector, 'background: #eee; color: #d32f2f; font-size: 16px; padding: 5px; font-weight: bold; border: 1px solid #ccc;');
                    console.log('%c=================================================', 'color: #4CAF50; font-weight: bold;');
                    
                    found = { element: $this, instance: fpd };
                    return false; // break loop
                }
            });

            // If still not found, check global window variables
            if (!found) {
                for (let key in window) {
                    if (key.toLowerCase().includes('fancyproductdesigner') || key.toLowerCase() === 'fpd') {
                        const val = window[key];
                        if (val && typeof val.getProduct === 'function') {
                             console.log('%c🎯 SUCCESS! Found FPD Instance in global variable: window.' + key, 'color: #4CAF50; font-weight: bold;');
                             found = { element: window.jQuery(document.body), instance: val };
                             break;
                        }
                    }
                }
            }
            
            return found;
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

            // 1. Event delegation on document.body (Survives DOM replacement when swapping products)
            if (window.jQuery) {
                console.log('[FPD Size Swatches] Binding events via jQuery delegation on document.body...');
                const selectors = '.fpd-container, .fancy-product-designer, #fpd, .fpd-main';
                window.jQuery(document.body).off('ready productSelect productAdd productCreate viewSelect', selectors);
                window.jQuery(document.body).on('ready productSelect productAdd productCreate viewSelect', selectors, function(e) {
                    handleEvent(e);
                });
                
                // Fallback: Listen for clicks on FPD items (like product thumbnails)
                window.jQuery(document.body).off('click', '.fpd-item');
                window.jQuery(document.body).on('click', '.fpd-item', function() {
                    console.log('[FPD Size Swatches] FPD Item clicked (Fallback)');
                    setTimeout(() => handleEvent({type: 'click_fallback'}), 600);
                });
            }

            // 2. Also bind to the instance directly if supported
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
                let productId = null;
                let productTitle = null;

                // 1. Try to get the active product from FPD UI (Product Swap Module)
                if (window.jQuery) {
                    const $activeItem = window.jQuery('.fpd-item.fpd-active');
                    if ($activeItem.length) {
                        productTitle = $activeItem.find('.fpd-item-title').text().trim() || $activeItem.attr('data-title');
                        productId = $activeItem.attr('data-id') || $activeItem.data('id');
                    }
                }

                // 2. Try FPD Instance properties
                if (fpdInstance) {
                    if (fpdInstance.currentProduct) {
                        productId = productId || fpdInstance.currentProduct.id || fpdInstance.currentProduct.product_id;
                        productTitle = productTitle || fpdInstance.currentProduct.title;
                    }
                    
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
                }

                // 3. FALLBACK: Try WooCommerce Product Title (Makes it much easier for users!)
                if (!productTitle) {
                    const wcTitle = document.querySelector('.product_title, .entry-title');
                    if (wcTitle) {
                        productTitle = wcTitle.textContent.trim();
                        console.log('[FPD Size Swatches] Using WooCommerce Product Title as fallback:', productTitle);
                    }
                }

                // 4. FALLBACK: Try WooCommerce Product ID
                if (!productId) {
                    const wcIdInput = document.querySelector('input[name="add-to-cart"], button[name="add-to-cart"]');
                    if (wcIdInput && wcIdInput.value) {
                        productId = wcIdInput.value;
                        console.log('[FPD Size Swatches] Using WooCommerce Product ID as fallback:', productId);
                    } else {
                        const match = document.body.className.match(/postid-(\d+)/);
                        if (match) {
                            productId = match[1];
                            console.log('[FPD Size Swatches] Using WooCommerce Post ID as fallback:', productId);
                        }
                    }
                }

                console.log(`[FPD Size Swatches] Active Product detected (Event: ${eventType}):`, { id: productId, title: productTitle });

                // If we are in the Elementor editor, ALWAYS match the first config so the user can see it
                if (this.isEditor && (!productId && !productTitle) && this.config.products && this.config.products.length > 0) {
                    console.log('[FPD Size Swatches] In Elementor Editor: Forcing display of first config for preview.');
                    this.renderSizes(this.config.products[0].sizes || []);
                    this.container.style.display = 'block';
                    return;
                }

                if (productId || productTitle) {
                    this.matchConfig(productId, productTitle);
                } else {
                    console.warn('[FPD Size Swatches] Could not determine active product ID or Title.');
                    if (this.config.default_visibility !== 'show') {
                        this.hideWidget();
                    } else {
                        console.log('[FPD Size Swatches] Default visibility is show, keeping widget visible.');
                    }
                }
            }, 500);
        }

        /**
         * Match current product against widget config.
         * @param {string|number} id 
         * @param {string} title 
         */
        matchConfig(id, title) {
            let bestMatch = null;
            let bestScore = -1;

            const safeId = id ? String(id).trim() : '';
            const safeTitle = title ? String(title).trim() : '';

            console.log('[FPD Size Swatches] Trying to match product ID:', safeId, 'Title:', safeTitle);
            console.log('[FPD Size Swatches] Available configs:', this.config.products);

            for (const prodConfig of this.config.products) {
                let score = -1;
                let configId = prodConfig.id ? String(prodConfig.id).trim() : '';
                let configPattern = prodConfig.pattern ? String(prodConfig.pattern).trim() : '';
                
                let hasId = configId !== '';
                let hasPattern = configPattern !== '';
                
                let idMatch = hasId && configId === safeId;
                let patternMatch = false;

                if (hasPattern && safeTitle) {
                    try {
                        const regex = new RegExp(configPattern, 'i');
                        if (regex.test(safeTitle)) {
                            patternMatch = true;
                        }
                    } catch (e) {
                        console.error('[FPD Size Swatches] Invalid regex pattern', e);
                    }
                }

                // Scoring system to find the most specific match
                if (hasId && hasPattern) {
                    if (idMatch && patternMatch) score = 3; // Most specific: matches both
                } else if (hasPattern) {
                    if (patternMatch) score = 2; // Matches pattern only
                } else if (hasId) {
                    if (idMatch) score = 1; // Matches ID only
                } else {
                    score = 0; // Fallback: no ID and no pattern set (matches everything)
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = prodConfig;
                }
            }

            if (bestMatch) {
                if (bestMatch.show_sizes) {
                    console.log(`[FPD Size Swatches] Showing sizes for matched config (Score: ${bestScore}).`);
                    this.renderSizes(bestMatch.sizes);
                    this.container.style.display = 'block';
                } else {
                    console.log(`[FPD Size Swatches] Matched config (Score: ${bestScore}) explicitly says "Show Sizes: No". Hiding widget.`);
                    this.hideWidget('Widget hidden (Show Sizes: No)');
                }
            } else {
                console.log('[FPD Size Swatches] No matching config found for this product. Hiding widget.');
                this.hideWidget('Widget hidden (No matching config)');
            }
        }

        /**
         * Hide the widget, but keep it visible in Elementor editor for debugging
         */
        hideWidget(editorMessage = 'Widget hidden') {
            if (this.isEditor) {
                this.container.style.display = 'block';
                this.swatchesContainer.innerHTML = `<p style="color: #888; font-style: italic; font-size: 12px; padding: 10px; border: 1px dashed #ccc;">${editorMessage}</p>`;
            } else {
                this.container.style.display = 'none';
            }
            this.clearSelection();
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
    
    // Also run on window load as a fallback
    window.addEventListener('load', initFPDSizeSwatches);

    // Hook into Elementor for editor/dynamic loading
    if (typeof jQuery !== 'undefined') {
        jQuery(window).on('elementor/frontend/init', function() {
            if (window.elementorFrontend && window.elementorFrontend.hooks) {
                window.elementorFrontend.hooks.addAction('frontend/element_ready/fpd_size_swatches.default', function($scope) {
                    // Remove initialized class if it was already initialized so it can re-init in editor
                    const widget = $scope[0].querySelector('.fpd-sizes-swatches');
                    if (widget) {
                        widget.classList.remove('fpd-initialized');
                    }
                    initFPDSizeSwatches();
                });
            }
        });
    }

})();
