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

        // El checkout real lo gestiona Stripe (redireccion externa)

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
        const navTrigger   = document.getElementById('nav-cart-trigger');
        const closeBtn     = document.getElementById('close-cart-btn');
        const overlay      = document.getElementById('cart-overlay');
        const applyPromoBtn = document.getElementById('apply-promo-btn');
        const checkoutBtn  = document.getElementById('checkout-btn');

        if (floatTrigger)  floatTrigger.addEventListener('click', () => this.toggle());
        if (navTrigger)    navTrigger.addEventListener('click', () => this.toggle());
        if (closeBtn)      closeBtn.addEventListener('click', () => this.toggle());
        if (overlay)       overlay.addEventListener('click', () => this.toggle());
        if (applyPromoBtn) applyPromoBtn.addEventListener('click', () => this.applyPromo());
        if (checkoutBtn)   checkoutBtn.addEventListener('click', () => this.openCheckout());
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
        const cart = this.get();
        if (!cart.length) return;

        const checkoutBtn = document.getElementById('checkout-btn');
        const originalHTML = checkoutBtn.innerHTML;
        checkoutBtn.innerHTML = '<span class="spinner"></span> Redirigiendo a Stripe...';
        checkoutBtn.disabled = true;

        const items = cart.map(item => ({
            beatId: item.beatId,
            licenseType: item.licenseType
        }));

        fetch('/api/checkout/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        })
        .then(r => r.json())
        .then(data => {
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        })
        .catch(err => {
            checkoutBtn.innerHTML = originalHTML;
            checkoutBtn.disabled = false;
            this.showToast('Error al conectar con el sistema de pago. Intenta de nuevo.', true);
            console.error('Checkout error:', err);
        });
    },

    closeCheckout() {
        const modal = document.getElementById('checkout-modal');
        if (modal) modal.classList.remove('active');
    },

    submitPayment() {},

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

// Expose Cart globally so inline scripts in other pages can reference window.Cart
window.Cart = Cart;

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
