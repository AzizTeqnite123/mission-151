/* Mission 151 — Store
   - Two products (hat, tee), variants, qty, cart in localStorage, Anedot checkout.
   - SVG product art is reused from inline templates on the page.
*/

(function () {
  // -----------------------------------------------------------------
  //  Anedot configuration
  // -----------------------------------------------------------------
  // Set ANEDOT_FORM_URL to your Anedot form's hosted URL (or embed URL).
  // We pass line items as URL params so the developer can either:
  //   a) configure an Anedot form with matching custom-amount fields, or
  //   b) replace handoff() with the official Anedot embed/redirect flow.
  // Until then, the handoff opens the URL with cart contents in the query
  // string so wiring is obvious.
  const ANEDOT_FORM_URL = 'https://anedot.com/form/PLACEHOLDER-FORM-ID';

  // -----------------------------------------------------------------
  //  Catalog
  // -----------------------------------------------------------------
  const CATALOG = {
    hat: {
      id: 'hat',
      name: 'Field cap',
      sku: 'M151-CAP',
      price: 35,
      shippingFirst: 6,
      shippingExtra: 2,
      copy: 'Black six-panel structured cap. Embroidered M-151 patch on the front, woven Colorado-flag tab on the back strap. Built to be worn at the broadcast and after.',
      material: '100% cotton twill',
      fit: 'Structured · adjustable',
      colors: ['Black', 'Coyote', 'Olive'],
      sizes: ['One size'],
      svg: () => document.querySelector('#card-hat .product-svg').cloneNode(true),
    },
    tee: {
      id: 'tee',
      name: 'Mission tee',
      sku: 'M151-TEE',
      price: 28,
      shippingFirst: 6,
      shippingExtra: 2,
      copy: 'Heavyweight cotton tee. Front chest mark in cream, "Colorado comes home." on the back below the shoulder line. Worn-in feel from the first wash.',
      material: '6.5 oz combed cotton',
      fit: 'Standard · runs true',
      colors: ['Black', 'Cream', 'Field Green'],
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      svg: () => document.querySelector('#card-tee .product-svg').cloneNode(true),
    },
  };

  const colorHex = {
    'Black':       '#1a1d22',
    'Coyote':      '#7d6748',
    'Olive':       '#3d4a2d',
    'Cream':       '#d8cdb1',
    'Field Green': '#2f4332',
  };

  // -----------------------------------------------------------------
  //  State
  // -----------------------------------------------------------------
  let activeId = 'hat';
  let pickedColor = CATALOG.hat.colors[0];
  let pickedSize = CATALOG.hat.sizes[0];
  let qty = 1;

  const CART_KEY = 'm151.store.cart';
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveCart(c) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {}
  }
  let cart = loadCart();

  // -----------------------------------------------------------------
  //  Product detail rendering
  // -----------------------------------------------------------------
  function renderDetail() {
    const p = CATALOG[activeId];
    document.getElementById('detailName').textContent = p.name;
    document.getElementById('detailPrice').textContent = '$' + p.price;
    document.getElementById('detailCopy').textContent = p.copy;
    document.getElementById('specMaterial').textContent = p.material;
    document.getElementById('specFit').textContent = p.fit;

    // Art (clone the SVG from the grid card)
    const art = document.getElementById('detailArt');
    art.querySelectorAll('svg').forEach(s => s.remove());
    const svg = p.svg();
    svg.classList.add('product-svg');
    art.appendChild(svg);

    // Colors
    if (!p.colors.includes(pickedColor)) pickedColor = p.colors[0];
    const colorRow = document.getElementById('colorRow');
    colorRow.innerHTML = '';
    p.colors.forEach(c => {
      const b = document.createElement('button');
      b.className = 'swatch' + (c === pickedColor ? ' selected' : '');
      b.textContent = c;
      b.style.borderLeft = `4px solid ${colorHex[c] || 'var(--ink-faint)'}`;
      b.addEventListener('click', () => { pickedColor = c; renderDetail(); });
      colorRow.appendChild(b);
    });
    document.getElementById('colorPick').textContent = pickedColor;

    // Sizes (hide block if One size)
    if (!p.sizes.includes(pickedSize)) pickedSize = p.sizes[0];
    const sizeBlock = document.getElementById('sizeBlock');
    if (p.sizes.length === 1 && p.sizes[0] === 'One size') {
      sizeBlock.style.display = 'none';
    } else {
      sizeBlock.style.display = '';
    }
    const sizeRow = document.getElementById('sizeRow');
    sizeRow.innerHTML = '';
    p.sizes.forEach(s => {
      const b = document.createElement('button');
      b.className = 'swatch' + (s === pickedSize ? ' selected' : '');
      b.textContent = s;
      // Demo: 2XL on the tee in Cream is "sold out"
      if (p.id === 'tee' && s === '2XL' && pickedColor === 'Cream') {
        b.disabled = true;
        if (s === pickedSize) {
          // bump to the previous available
          pickedSize = 'XL';
        }
      }
      b.addEventListener('click', () => { if (b.disabled) return; pickedSize = s; renderDetail(); });
      sizeRow.appendChild(b);
    });
    document.getElementById('sizePick').textContent = pickedSize;

    // Card highlight
    document.querySelectorAll('.product-card').forEach(c => c.classList.toggle('active', c.dataset.product === activeId));
  }

  function setActive(id) {
    activeId = id;
    qty = 1;
    document.getElementById('qtyDisplay').textContent = qty;
    document.getElementById('qtyPick').textContent = qty;
    renderDetail();
    document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // -----------------------------------------------------------------
  //  Cart
  // -----------------------------------------------------------------
  function lineKey(item) { return [item.id, item.color, item.size].join('|'); }

  function addToCart() {
    const p = CATALOG[activeId];
    const item = {
      id: p.id,
      sku: p.sku,
      name: p.name,
      color: pickedColor,
      size: pickedSize,
      qty: qty,
      unitPrice: p.price,
    };
    const key = lineKey(item);
    const existing = cart.find(c => lineKey(c) === key);
    if (existing) existing.qty += qty;
    else cart.push(item);
    saveCart(cart);
    renderCart();
    openCart();
  }

  function changeQty(idx, delta) {
    const it = cart[idx];
    if (!it) return;
    it.qty = Math.max(0, it.qty + delta);
    if (it.qty === 0) cart.splice(idx, 1);
    saveCart(cart);
    renderCart();
  }
  function removeLine(idx) {
    cart.splice(idx, 1);
    saveCart(cart);
    renderCart();
  }

  function shippingCost() {
    if (!cart.length) return 0;
    const totalUnits = cart.reduce((s, c) => s + c.qty, 0);
    if (totalUnits >= 2) return 0; // free U.S. shipping on 2+
    return 6;
  }

  function renderCart() {
    const items = document.getElementById('cartItems');
    const countEl = document.getElementById('cartCount');
    const totalUnits = cart.reduce((s, c) => s + c.qty, 0);
    countEl.textContent = totalUnits;
    countEl.classList.toggle('empty', totalUnits === 0);

    if (!cart.length) {
      items.innerHTML = '<div class="cart-empty">Your kit is empty.<br>Pick something up.</div>';
    } else {
      items.innerHTML = '';
      cart.forEach((it, idx) => {
        const line = document.createElement('div');
        line.className = 'cart-line';
        const thumb = document.createElement('div');
        thumb.className = 'cart-thumb';
        const svg = CATALOG[it.id].svg();
        thumb.appendChild(svg);
        line.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'cart-info';
        info.innerHTML = `
          <div class="name">${it.name}</div>
          <div class="opts">${it.color}${it.size && it.size !== 'One size' ? ' · ' + it.size : ''} · ${it.sku}</div>
          <div class="row">
            <button class="qty-mini" data-act="dec" data-idx="${idx}" aria-label="Decrease">−</button>
            <span style="min-width: 1.4rem; text-align: center;">${it.qty}</span>
            <button class="qty-mini" data-act="inc" data-idx="${idx}" aria-label="Increase">+</button>
            <button class="remove" data-act="rm" data-idx="${idx}">REMOVE</button>
          </div>
        `;
        line.appendChild(info);

        const price = document.createElement('div');
        price.className = 'price';
        price.textContent = '$' + (it.unitPrice * it.qty);
        line.appendChild(price);

        items.appendChild(line);
      });
      items.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          if (btn.dataset.act === 'inc') changeQty(idx, 1);
          else if (btn.dataset.act === 'dec') changeQty(idx, -1);
          else if (btn.dataset.act === 'rm') removeLine(idx);
        });
      });
    }

    const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
    const ship = shippingCost();
    document.getElementById('subTotal').textContent = '$' + subtotal;
    document.getElementById('shipTotal').textContent = subtotal === 0 ? '—' : (ship === 0 ? 'FREE' : '$' + ship);
    document.getElementById('grandTotal').textContent = '$' + (subtotal + ship);
    document.getElementById('checkoutBtn').disabled = cart.length === 0;
  }

  function openCart() {
    document.getElementById('cartDrawer').classList.add('open');
    document.getElementById('cartDrawer').setAttribute('aria-hidden', 'false');
  }
  function closeCart() {
    document.getElementById('cartDrawer').classList.remove('open');
    document.getElementById('cartDrawer').setAttribute('aria-hidden', 'true');
  }

  // -----------------------------------------------------------------
  //  Checkout — Anedot handoff
  // -----------------------------------------------------------------
  function checkout() {
    if (!cart.length) return;
    const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
    const ship = shippingCost();
    const total = subtotal + ship;

    // Build a description Anedot can show on the receipt.
    const lines = cart.map(c => `${c.qty}× ${c.name} (${c.color}${c.size && c.size !== 'One size' ? '/' + c.size : ''})`).join(' + ');

    // Anedot accepts ?amount=... and ?description=... on hosted forms.
    // Once you have a real form ID, set ANEDOT_FORM_URL above; until then we
    // open the URL in a new tab for the developer to inspect what's passed.
    const params = new URLSearchParams({
      amount: total.toFixed(2),
      description: 'Mission 151 Store · ' + lines,
      sku: cart.map(c => `${c.sku}-${c.color}${c.size && c.size !== 'One size' ? '-' + c.size : ''}-x${c.qty}`).join(','),
    });
    const url = `${ANEDOT_FORM_URL}?${params.toString()}`;

    if (ANEDOT_FORM_URL.includes('PLACEHOLDER')) {
      alert(
        'Mockup checkout — Anedot form ID not yet configured.\n\n' +
        'Total: $' + total.toFixed(2) + '\n' +
        lines + '\n\n' +
        'In production, this redirects to:\n' + url
      );
      return;
    }
    window.location.href = url;
  }

  // -----------------------------------------------------------------
  //  Wire up
  // -----------------------------------------------------------------
  function init() {
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => setActive(card.dataset.product));
    });
    document.getElementById('qtyMinus').addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      document.getElementById('qtyDisplay').textContent = qty;
      document.getElementById('qtyPick').textContent = qty;
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
      qty = Math.min(10, qty + 1);
      document.getElementById('qtyDisplay').textContent = qty;
      document.getElementById('qtyPick').textContent = qty;
    });
    document.getElementById('addBtn').addEventListener('click', addToCart);
    document.getElementById('cartToggle').addEventListener('click', openCart);
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('cartDrawer').addEventListener('click', (e) => {
      if (e.target.id === 'cartDrawer') closeCart();
    });
    document.getElementById('checkoutBtn').addEventListener('click', checkout);

    renderDetail();
    renderCart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
