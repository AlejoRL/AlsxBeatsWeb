/* ==========================================================================
   SHOPPING CART SYSTEM - CORE LOGIC (cart.js)
   ========================================================================== */

const Cart = {
    discountPercent: 0,
    appliedCoupon: '',

    init() {
        this.injectUI();
        this.bindEvents();
        this.updateBadge();
        this.render();
    },

    // Inject cart elements into DOM dynamically to avoid duplicates in multiple html files
    injectUI() {
        // 1. Floating Cart Button (only if not already present)
        if (!document.getElementById('floating-cart-trigger')) {
            const floatBtn = document.createElement('div');
            floatBtn.className = 'floating-cart-btn';
            floatBtn.id = 'floating-cart-trigger';
            floatBtn.innerHTML = `
                <i class="fas fa-shopping-cart"></i>
                <span class="cart-count">0</span>
            `;
            document.body.appendChild(floatBtn);
        }

        // 2. Cart Drawer & Overlay
        if (!document.getElementById('cart-drawer')) {
            const drawerHTML = `
                <div class="cart-overlay" id="cart-overlay"></div>
                <div class="cart-drawer" id="cart-drawer">
                    <div class="cart-drawer-header">
                        <h2>Tu Carrito</h2>
                        <button class="close-cart-btn" id="close-cart-btn">&times;</button>
                    </div>
                    <div class="cart-drawer-content" id="cart-items-container">
                        <!-- Items rendered dynamically -->
                    </div>
                    <div class="cart-drawer-footer">
                        <div class="promo-code-container">
                            <input type="text" class="promo-code-input" id="promo-code" placeholder="Código de descuento (ALSX10)">
                            <button class="btn-promo-apply" id="apply-promo-btn">Aplicar</button>
                        </div>
                        
                        <div class="cart-summary-row">
                            <span>Subtotal</span>
                            <span id="cart-subtotal-price">€0</span>
                        </div>
                        <div class="cart-summary-row discount-row" id="discount-display-row" style="display: none;">
                            <span>Descuento (<span id="discount-code-label"></span>)</span>
                            <span id="cart-discount-price">-€0</span>
                        </div>
                        <div class="cart-summary-row total-row">
                            <span>Total</span>
                            <span id="cart-total-price">€0</span>
                        </div>
                        
                        <button class="btn-checkout" id="checkout-btn">
                            <i class="fas fa-credit-card"></i> Finalizar Compra
                        </button>
                    </div>
                </div>
            `;
            const div = document.createElement('div');
            div.innerHTML = drawerHTML;
            document.body.appendChild(div);
        }

        // 3. Checkout Modal
        if (!document.getElementById('checkout-modal')) {
            const modalHTML = `
                <div class="checkout-modal" id="checkout-modal">
                    <div class="checkout-modal-content">
                        <div class="checkout-modal-header">
                            <h3>Completar Compra</h3>
                            <button class="close-cart-btn" id="close-checkout-btn">&times;</button>
                        </div>
                        <div class="checkout-modal-body" id="checkout-modal-body">
                            <!-- Order Summary -->
                            <div class="checkout-order-summary">
                                <h4 class="checkout-order-title">Resumen del Pedido</h4>
                                <div class="checkout-order-items" id="checkout-items-list">
                                    <!-- Items listed here -->
                                </div>
                                <div style="display: flex; justify-content: space-between; font-weight: 700; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--cart-border);">
                                    <span>Total a Pagar:</span>
                                    <span id="checkout-total-price" style="color: var(--cart-accent);">€0</span>
                                </div>
                            </div>

                            <!-- Payment Form -->
                            <form id="payment-form">
                                <div class="checkout-form-group">
                                    <label for="checkout-name">Nombre Completo</label>
                                    <input type="text" id="checkout-name" class="checkout-input" required placeholder="Juan Pérez">
                                </div>
                                <div class="checkout-form-group">
                                    <label for="checkout-email">Correo Electrónico</label>
                                    <input type="email" id="checkout-email" class="checkout-input" required placeholder="juan@correo.com">
                                </div>
                                <div class="checkout-form-group">
                                    <label for="checkout-card">Número de Tarjeta</label>
                                    <input type="text" id="checkout-card" class="checkout-input" required placeholder="4000 1234 5678 9010" maxlength="19">
                                </div>
                                <div class="checkout-form-row">
                                    <div class="checkout-form-group">
                                        <label for="checkout-expiry">Fecha Vencimiento</label>
                                        <input type="text" id="checkout-expiry" class="checkout-input" required placeholder="MM/AA" maxlength="5">
                                    </div>
                                    <div class="checkout-form-group">
                                        <label for="checkout-cvv">CVV</label>
                                        <input type="text" id="checkout-cvv" class="checkout-input" required placeholder="123" maxlength="4">
                                    </div>
                                </div>
                                <div style="margin-top: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" id="checkout-agree" required style="accent-color: var(--cart-accent);">
                                    <label for="checkout-agree" style="font-size: 11px; color: var(--cart-muted); margin: 0; cursor: pointer;">
                                        Acepto los términos de licencia y políticas de AlsxBeats.
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div class="checkout-modal-footer" id="checkout-modal-footer">
                            <button type="button" class="btn-cancel-checkout" id="cancel-payment-btn">Cancelar</button>
                            <button type="submit" form="payment-form" class="btn-submit-payment" id="submit-payment-btn">
                                Pagar y Descargar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            const div = document.createElement('div');
            div.innerHTML = modalHTML;
            document.body.appendChild(div);
        }

        // 4. Toast Notifications
        if (!document.getElementById('cart-toast')) {
            const toast = document.createElement('div');
            toast.className = 'cart-toast';
            toast.id = 'cart-toast';
            document.body.appendChild(toast);
        }
    },

    bindEvents() {
        const floatTrigger = document.getElementById('floating-cart-trigger');
        const navTrigger = document.getElementById('nav-cart-trigger');
        const closeBtn = document.getElementById('close-cart-btn');
        const overlay = document.getElementById('cart-overlay');
        const applyPromoBtn = document.getElementById('apply-promo-btn');
        const checkoutBtn = document.getElementById('checkout-btn');
        
        const closeCheckoutBtn = document.getElementById('close-checkout-btn');
        const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
        const paymentForm = document.getElementById('payment-form');
        
        // Card formatting helper
        const cardInput = document.getElementById('checkout-card');
        if (cardInput) {
            cardInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = '';
                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formattedValue += ' ';
                    }
                    formattedValue += value[i];
                }
                e.target.value = formattedValue;
            });
        }

        // Expiry date formatting helper
        const expiryInput = document.getElementById('checkout-expiry');
        if (expiryInput) {
            expiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length > 2) {
                    e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
                } else {
                    e.target.value = value;
                }
            });
        }

        // CVV formatting
        const cvvInput = document.getElementById('checkout-cvv');
        if (cvvInput) {
            cvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }

        // Toggle Drawer
        if (floatTrigger) floatTrigger.addEventListener('click', () => this.toggle());
        if (navTrigger) navTrigger.addEventListener('click', () => this.toggle());
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggle());
        if (overlay) overlay.addEventListener('click', () => this.toggle());

        // Promo Code
        if (applyPromoBtn) applyPromoBtn.addEventListener('click', () => this.applyPromo());
        
        // Checkout trigger
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.openCheckout());
        
        // Close Checkout
        if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', () => this.closeCheckout());
        if (cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', () => this.closeCheckout());
        
        // Submit mock payment
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitPayment();
            });
        }
    },

    get() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    },

    save(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        this.updateBadge();
        this.render();
    },

    add(item) {
        const cart = this.get();
        
        // Normalize titles/licenses to check duplicates
        const exists = cart.some(i => i.title === item.title && i.license === item.license);
        
        if (exists) {
            this.showToast(`"${item.title}" (${item.license}) ya está en el carrito.`, true);
            this.open();
            return;
        }

        cart.push(item);
        this.save(cart);

        // Animate badge
        const badgeNav = document.getElementById('cart-badge-nav');
        const badgeFloat = document.querySelector('#floating-cart-trigger .cart-count');
        
        if (badgeNav) {
            badgeNav.classList.add('cart-pulse');
            setTimeout(() => badgeNav.classList.remove('cart-pulse'), 400);
        }
        if (badgeFloat) {
            badgeFloat.classList.add('cart-pulse');
            setTimeout(() => badgeFloat.classList.remove('cart-pulse'), 400);
        }

        this.showToast(`"${item.title}" añadido al carrito.`);
        
        // Open the drawer to show the item
        setTimeout(() => this.open(), 300);
    },

    remove(index) {
        const cart = this.get();
        const removedTitle = cart[index].title;
        cart.splice(index, 1);
        this.save(cart);
        this.showToast(`"${removedTitle}" eliminado del carrito.`, true);
    },

    toggle() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-overlay');
        if (drawer && overlay) {
            drawer.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    },

    open() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-overlay');
        if (drawer && overlay) {
            drawer.classList.add('active');
            overlay.classList.add('active');
        }
    },

    close() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-overlay');
        if (drawer && overlay) {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
        }
    },

    updateBadge() {
        const cart = this.get();
        const count = cart.length;
        
        // Update nav badge (if present)
        const badgeNav = document.getElementById('cart-badge-nav');
        if (badgeNav) {
            badgeNav.textContent = count;
            badgeNav.style.display = count > 0 ? 'inline-block' : 'none';
        }

        // Update floating badge — always visible, badge count hidden when empty
        const badgeFloat = document.querySelector('#floating-cart-trigger .cart-count');
        const floatTrigger = document.getElementById('floating-cart-trigger');
        if (badgeFloat) {
            badgeFloat.textContent = count;
            badgeFloat.style.display = count > 0 ? 'flex' : 'none';
        }
        // Always show the floating button so users on licencias.html (no nav) can access it
        if (floatTrigger) {
            floatTrigger.style.display = 'flex';
        }
    },

    render() {
        const container = document.getElementById('cart-items-container');
        if (!container) return;

        const cart = this.get();
        
        if (cart.length === 0) {
            container.innerHTML = `
                <div class="cart-empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Tu carrito está vacío. ¡Explora el catálogo y añade tus beats favoritos!</p>
                    <button class="btn-explore" onclick="Cart.close(); window.location.href='index.html#catalogue';">Ver Catálogo</button>
                </div>
            `;
            
            // Hide discount & update totals to zero
            document.getElementById('discount-display-row').style.display = 'none';
            document.getElementById('cart-subtotal-price').textContent = '€0';
            document.getElementById('cart-total-price').textContent = '€0';
            document.getElementById('checkout-btn').disabled = true;
            document.getElementById('checkout-btn').style.opacity = '0.5';
            return;
        }

        document.getElementById('checkout-btn').disabled = false;
        document.getElementById('checkout-btn').style.opacity = '1';

        // Render Cart Items
        container.innerHTML = cart.map((item, index) => {
            // Fix images that could be missing prefix path
            let imgSrc = item.image;
            if (imgSrc && !imgSrc.startsWith('assets/images/') && !imgSrc.startsWith('parentaladvisory.png') && !imgSrc.startsWith('alsxbeatsportada.png') && !imgSrc.startsWith('typelofiryb1.png')) {
                imgSrc = 'assets/images/' + imgSrc;
            }
            
            return `
                <div class="cart-item">
                    <img src="${imgSrc}" alt="${item.title}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${item.title}</h4>
                        <span class="cart-item-license">${item.license}</span>
                        <span class="cart-item-price">€${item.price}</span>
                    </div>
                    <button class="cart-item-remove" onclick="Cart.remove(${index})">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>
            `;
        }).join('');

        // Calculate Pricing
        const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        let discount = 0;

        if (this.discountPercent > 0) {
            discount = subtotal * (this.discountPercent / 100);
            document.getElementById('discount-display-row').style.display = 'flex';
            document.getElementById('discount-code-label').textContent = `${this.appliedCoupon} -${this.discountPercent}%`;
            document.getElementById('cart-discount-price').textContent = `-€${discount.toFixed(0)}`;
        } else {
            document.getElementById('discount-display-row').style.display = 'none';
        }

        const total = subtotal - discount;

        document.getElementById('cart-subtotal-price').textContent = `€${subtotal.toFixed(0)}`;
        document.getElementById('cart-total-price').textContent = `€${total.toFixed(0)}`;
    },

    applyPromo() {
        const input = document.getElementById('promo-code');
        const code = input.value.trim().toUpperCase();

        if (code === 'ALSX10') {
            this.discountPercent = 10;
            this.appliedCoupon = 'ALSX10';
            this.showToast('¡Cupón ALSX10 aplicado! 10% de descuento.');
            this.render();
        } else if (code === 'BEATS20') {
            this.discountPercent = 20;
            this.appliedCoupon = 'BEATS20';
            this.showToast('¡Cupón BEATS20 aplicado! 20% de descuento.');
            this.render();
        } else {
            this.showToast('Código promocional no válido.', true);
        }
        input.value = '';
    },

    openCheckout() {
        this.close(); // Close drawer
        const modal = document.getElementById('checkout-modal');
        if (!modal) return;

        modal.classList.add('active');

        // Render Checkout Summary
        const cart = this.get();
        const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const discount = subtotal * (this.discountPercent / 100);
        const total = subtotal - discount;

        const itemsList = document.getElementById('checkout-items-list');
        itemsList.innerHTML = cart.map(item => `
            <div class="checkout-order-item">
                <span class="checkout-order-item-name">${item.title} (${item.license})</span>
                <span class="checkout-order-item-price">€${item.price}</span>
            </div>
        `).join('');

        if (this.discountPercent > 0) {
            itemsList.innerHTML += `
                <div class="checkout-order-item" style="color: #2ec4b6; font-weight: 600; padding-top: 4px; border-top: 1px dashed var(--cart-border);">
                    <span>Descuento (${this.appliedCoupon} -${this.discountPercent}%):</span>
                    <span>-€${discount.toFixed(0)}</span>
                </div>
            `;
        }

        document.getElementById('checkout-total-price').textContent = `€${total.toFixed(0)}`;

        // Reset payment form visual state if needed
        const body = document.getElementById('checkout-modal-body');
        const footer = document.getElementById('checkout-modal-footer');
        // Restore standard view (in case it was previously showing success)
        if (body.querySelector('.checkout-success-view')) {
            // Re-render original checkout form if success state was still showing
            location.reload(); 
        }
    },

    closeCheckout() {
        const modal = document.getElementById('checkout-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    submitPayment() {
        const submitBtn = document.getElementById('submit-payment-btn');
        const footer = document.getElementById('checkout-modal-footer');
        const body = document.getElementById('checkout-modal-body');
        
        // Show loading spinner in place of text
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner"></span> Procesando Pago...`;
        
        setTimeout(() => {
            // Create Mock Download Links based on items purchased
            const cart = this.get();
            const downloadItemsHTML = cart.map(item => {
                // Ensure audio link works (simulate or direct link)
                let audioUrl = item.audio;
                let fileName = item.title.replace(/[^\w\s-]/gi, '') + (item.license.includes('Exclusive') ? '_Exclusive.wav' : '_Lease.mp3');
                
                return `
                    <div class="download-item">
                        <span class="download-item-name">${item.title}</span>
                        <a href="${audioUrl}" download="${fileName}" class="btn-download-mock">
                            <i class="fas fa-download"></i> Descargar ${item.license.split(' ')[0]}
                        </a>
                    </div>
                `;
            }).join('');

            // Change body content to Success!
            body.innerHTML = `
                <div class="checkout-success-view">
                    <div class="success-icon-wrap">
                        <i class="fas fa-check"></i>
                    </div>
                    <h4>¡Pago Completado!</h4>
                    <p>Muchas gracias por tu compra. Hemos enviado las licencias oficiales y el recibo a tu correo electrónico.</p>
                    
                    <div class="download-links-container">
                        <div class="download-links-title">Tus Archivos de Audio:</div>
                        ${downloadItemsHTML}
                    </div>
                </div>
            `;

            // Adjust footer to just close and reload
            footer.innerHTML = `
                <button type="button" class="btn-checkout" id="close-success-btn" style="width: 100%;">
                    Volver a la Tienda
                </button>
            `;

            document.getElementById('close-success-btn').addEventListener('click', () => {
                this.closeCheckout();
                // Clear cart completely after successful purchase
                this.save([]);
                this.discountPercent = 0;
                this.appliedCoupon = '';
                // Reload page to restore original modal structure
                location.reload();
            });

        }, 1800);
    },

    showToast(message, isWarning = false) {
        const toast = document.getElementById('cart-toast');
        if (!toast) return;

        toast.innerHTML = isWarning 
            ? `<i class="fas fa-circle-exclamation"></i> ${message}`
            : `<i class="fas fa-circle-check"></i> ${message}`;
        
        toast.className = 'cart-toast';
        if (isWarning) {
            toast.classList.add('warning');
        }
        
        toast.classList.add('active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
};

// Initialize Cart once DOM is fully ready
document.addEventListener('DOMContentLoaded', () => {
    Cart.init();

    // Dynamically reposition floating cart button when music player is active on licencias.html
    const musicPlayer = document.querySelector('.music-player');
    const floatBtn = document.getElementById('floating-cart-trigger');

    if (musicPlayer && floatBtn) {
        const adjustFloatBtnPosition = () => {
            if (musicPlayer.classList.contains('active')) {
                floatBtn.style.bottom = '150px'; // above 125px player bar
            } else {
                floatBtn.style.bottom = '30px';
            }
        };

        const observer = new MutationObserver(adjustFloatBtnPosition);
        observer.observe(musicPlayer, { attributes: true, attributeFilter: ['class'] });
        adjustFloatBtnPosition(); // Run once on init
    }
});
