// ====================== STATE ======================
const state = {
  page: 'home',
  cart: {},
  productTab: 'All',
  productSearch: '',
  priceTab: 'All',
  farmerSearch: '',
  cropGuideTab: 'All',
  cropSearch: '',
  selectedCrop: null,
  selectedFarmer: null,
  sellForm: { name:'', phone:'', location:'', district:'Dhule', crop:'Onion (Kanda)', qty:'', price:'', desc:'' },
};

const CROP_CATS = ['All','Vegetables','Fruits','Grains','Pulses','Spices','Flowers','Cash Crops'];
const CAT_ICONS = {All:'🌿',Vegetables:'🥦',Fruits:'🍎',Grains:'🌾',Pulses:'🫘',Spices:'🌶️',Flowers:'🌸','Cash Crops':'💰'};

// ====================== UTILS ======================
function cartCount() {
  return Object.values(state.cart).reduce((a,b)=>a+b, 0);
}
function cartTotal() {
  return Object.keys(state.cart).reduce((a,id)=>{
    const p = products.find(x=>x.id==id);
    return a + (p ? p.price*(state.cart[id]||0) : 0);
  }, 0);
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2500);
}

function navTo(p) {
  state.page = p;
  renderPage();
  window.scrollTo(0, 0);
}

// ====================== CART ======================
function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  const p = products.find(x=>x.id===id);
  showToast(`${p.icon} ${p.name} added to cart!`);
  updateCartBtn();
  renderCartModal();
}
function changeQty(id, delta) {
  const nv = Math.max(0, (state.cart[id]||0) + delta);
  if (nv === 0) delete state.cart[id]; else state.cart[id] = nv;
  updateCartBtn();
  renderCartModal();
  // re-render product in shop if visible
  if (state.page === 'products') renderProducts();
}
function updateCartBtn() {
  document.getElementById('cart-count').textContent = cartCount();
}

// ====================== NAV ======================
function setupNav() {
  document.getElementById('nav-logo').addEventListener('click', ()=>navTo('home'));
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', ()=>navTo(btn.dataset.page));
  });
  document.getElementById('cart-btn').addEventListener('click', openCart);
}

function updateNavActive() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === state.page);
  });
}

// ====================== PAGES ======================
function renderPage() {
  updateNavActive();
  // Hide all pages
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('crop-detail').classList.remove('active');

  if (state.page === 'guide' && state.selectedCrop) {
    renderCropDetail(state.selectedCrop);
    return;
  }

  const pageEl = document.getElementById('page-' + state.page);
  if (pageEl) pageEl.classList.add('active');

  if (state.page === 'prices')    renderPrices();
  if (state.page === 'products')  renderProducts();
  if (state.page === 'farmers')   renderFarmers();
  if (state.page === 'sell')      renderSell();
  if (state.page === 'guide')     renderCropGuide();
}

// ---- HOME ----
function setupHome() {
  const searchInput = document.getElementById('home-search');
  const searchBtn   = document.getElementById('home-search-btn');
  const doSearch = () => {
    const q = searchInput.value.trim();
    if (q) { state.productSearch = q; navTo('products'); }
  };
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); });

  // Category cards
  document.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.cat;
      if (cat === 'Crop Guide') { navTo('guide'); }
      else { state.productTab = cat; navTo('products'); }
    });
  });
}

// ---- PRICES ----
function renderPrices() {
  const time = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('live-time').textContent = 'Live Today · ' + time;

  // Tabs
  const tabRow = document.getElementById('price-tabs');
  tabRow.innerHTML = ['All','Vegetables','Fruits','Grains','Pulses','Spices'].map(t=>`
    <button class="tab-btn${state.priceTab===t?' active':''}" data-tab="${t}">${t}</button>
  `).join('');
  tabRow.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
    state.priceTab=btn.dataset.tab; renderPrices();
  }));

  const filtered = priceData.filter(p=>state.priceTab==='All'||p.cat===state.priceTab);
  const tbody = document.getElementById('price-tbody');
  tbody.innerHTML = filtered.map(p=>{
    const change = p.change>0
      ? `<span class="change-up">▲ +${p.change}</span>`
      : p.change<0
        ? `<span class="change-down">▼ ${p.change}</span>`
        : `<span class="change-same">— Stable</span>`;
    return `<tr>
      <td>${p.icon} ${p.name} <span class="unit-badge">per ${p.unit}</span></td>
      <td><span class="cat-badge">${p.cat}</span></td>
      <td>₹${p.min.toLocaleString()}</td>
      <td>₹${p.max.toLocaleString()}</td>
      <td class="modal-price">₹${p.modal.toLocaleString()}</td>
      <td>${change}</td>
    </tr>`;
  }).join('');
}

// ---- SHOP ----
function renderProducts() {
  const tabs = document.getElementById('product-tabs');
  tabs.innerHTML = ['All','Vegetables','Fruits','Grains','Pulses','Spices'].map(t=>`
    <button class="tab-btn${state.productTab===t?' active':''}" data-tab="${t}">${t}</button>
  `).join('');
  tabs.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
    state.productTab=btn.dataset.tab; renderProducts();
  }));

  const q = state.productSearch.toLowerCase();
  const filtered = products.filter(p => {
    const mc = state.productTab==='All'||p.cat===state.productTab;
    return mc && (!q||p.name.toLowerCase().includes(q)||p.marathi.includes(q)||p.farmer.toLowerCase().includes(q));
  });

  const grid = document.getElementById('product-grid');
  if (!filtered.length) { grid.innerHTML='<div class="empty-msg">🌿 No products found.</div>'; return; }

  grid.innerHTML = filtered.map(p => {
    const qty = state.cart[p.id]||0;
    const badge = p.badge ? `<div class="product-badge">${p.badge}</div>` : '';
    const organic = p.organic ? `<div class="organic-tag">🌿 Organic</div>` : '';
    const ctrl = qty===0
      ? `<button class="add-btn" onclick="addToCart(${p.id})">+</button>`
      : `<div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
          <span class="qty-num">${qty}</span>
          <button class="qty-btn" onclick="changeQty(${p.id},+1)">+</button>
        </div>`;
    return `
      <div class="product-card">
        <div class="product-thumb">
          ${badge}
          ${p.icon}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-marathi">${p.marathi}</div>
          <div class="product-farmer">🌱 ${p.farmer}, ${p.location}</div>
          ${organic}
          <div class="product-footer">
            <div class="product-price">₹${p.price}<span>/${p.unit}</span></div>
            ${ctrl}
          </div>
        </div>
      </div>`;
  }).join('');
}

function setupProducts() {
  const si = document.getElementById('product-search');
  si.value = state.productSearch;
  si.addEventListener('input', e=>{ state.productSearch=e.target.value; renderProducts(); });
}

// ---- FARMERS ----
function renderFarmers() {
  const q = state.farmerSearch.toLowerCase();
  const filtered = farmers.filter(f => !q||f.name.toLowerCase().includes(q)||f.location.toLowerCase().includes(q)||f.crops.some(c=>c.toLowerCase().includes(q)));
  const grid = document.getElementById('farmer-grid');
  grid.innerHTML = filtered.map(f=>`
    <div class="farmer-card" onclick="openFarmerModal(${f.id})">
      <div class="farmer-avatar">${f.icon}</div>
      <div class="farmer-name">${f.name}</div>
      <div class="farmer-loc">📍 ${f.location}</div>
      <div class="farmer-stars">${'★'.repeat(Math.floor(f.rating))} ${f.rating} <span style="color:#888;font-size:11px">(${f.reviews})</span></div>
      <div class="farmer-tags">${f.crops.map(c=>`<span class="farmer-tag">${c}</span>`).join('')}</div>
      <div class="farmer-meta">🌿 ${f.experience} · ${f.acres} acres</div>
      <div class="farmer-actions" onclick="event.stopPropagation()">
        <a href="tel:+91${f.phone}" class="btn-call">📞 Call</a>
        <a href="https://wa.me/91${f.phone}" target="_blank" class="btn-wa">💬 WhatsApp</a>
      </div>
    </div>`).join('');
}

function setupFarmers() {
  document.getElementById('farmer-search').addEventListener('input', e=>{
    state.farmerSearch=e.target.value; renderFarmers();
  });
}

// ---- SELL ----
function renderSell() {
  // bind form inputs
  ['name','phone','location','qty','price','desc'].forEach(key=>{
    const el = document.getElementById('sell-'+key);
    if (!el) return;
    el.value = state.sellForm[key];
    el.addEventListener('input', e=>{ state.sellForm[key]=e.target.value; });
  });
  const cropSel = document.getElementById('sell-crop');
  if (cropSel) {
    cropSel.value = state.sellForm.crop;
    cropSel.addEventListener('change', e=>{ state.sellForm.crop=e.target.value; });
  }
}

function submitSell() {
  if (!state.sellForm.name||!state.sellForm.phone||!state.sellForm.location||!state.sellForm.qty) {
    showToast('⚠️ Please fill all required fields'); return;
  }
  const f = state.sellForm;
  const msg = encodeURIComponent(`🌾 *New Crop Listing — Krushi Bazar*\n\n👨‍🌾 Farmer: ${f.name}\n📞 Phone: ${f.phone}\n📍 Location: ${f.location}, ${f.district}\n🌱 Crop: ${f.crop}\n📦 Quantity: ${f.qty}\n💰 Price: ${f.price}\n\nPlease list my crop!`);
  window.open('https://wa.me/919876543210?text='+msg,'_blank');
  showToast('✅ Listing submitted via WhatsApp!');
}

// ---- CROP GUIDE LIST ----
function renderCropGuide() {
  const tabRow = document.getElementById('crop-guide-tabs');
  tabRow.innerHTML = CROP_CATS.map(c=>`
    <button class="tab-btn${state.cropGuideTab===c?' active':''}" data-cat="${c}">${CAT_ICONS[c]} ${c}</button>
  `).join('');
  tabRow.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
    state.cropGuideTab=btn.dataset.cat; renderCropGuide();
  }));

  const q = state.cropSearch.toLowerCase();
  const filtered = crops.filter(c => {
    const mc = state.cropGuideTab==='All'||c.cat===state.cropGuideTab;
    return mc && (!q||c.name.toLowerCase().includes(q)||c.marathi.includes(q));
  });

  const grid = document.getElementById('crop-grid');
  if (!filtered.length) {
    grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888"><div style="font-size:52px;margin-bottom:12px">🌱</div><div style="font-size:17px;font-weight:700">No crops found</div></div>`;
    return;
  }
  grid.innerHTML = filtered.map(c=>`
    <div class="crop-card" onclick="openCropDetail(${c.id})">
      <div class="crop-thumb" style="background:${c.colorLight}">
        <span class="crop-cat-badge" style="color:${c.color}">${c.cat}</span>
        <span>${c.icon}</span>
      </div>
      <div class="crop-card-body">
        <div class="crop-name">${c.name}</div>
        <div class="crop-marathi">${c.marathi}</div>
        <div class="crop-metas">
          <span class="crop-meta-tag">🌡️ ${c.temp.split(',')[0]}</span>
          <span class="crop-meta-tag">⏱️ ${c.duration.split('–')[0]}d</span>
          <span class="crop-meta-tag">💧 ${c.waterNeed}%</span>
        </div>
      </div>
      <div class="crop-card-footer">
        <span class="season">📅 ${c.season}</span>
        <button class="btn-view">View Guide</button>
      </div>
    </div>`).join('');
}

function setupCropGuide() {
  document.getElementById('crop-search').addEventListener('input', e=>{
    state.cropSearch=e.target.value; renderCropGuide();
  });
}

// ---- CROP DETAIL ----
function openCropDetail(id) {
  state.selectedCrop = crops.find(c=>c.id===id);
  renderPage();
}

function renderCropDetail(crop) {
  document.getElementById('crop-detail').classList.add('active');
  const el = document.getElementById('crop-detail');

  el.innerHTML = `
    <div class="crop-detail-hero" style="background:linear-gradient(135deg,${crop.color}ee,${crop.color}99)">
      <button class="back-btn" onclick="closeCropDetail()">← Back</button>
      <div style="font-size:52px;margin-bottom:10px;margin-top:10px">${crop.icon}</div>
      <h2>${crop.name}</h2>
      <p>${crop.marathi} · ${crop.cat} · ${crop.season}</p>
    </div>
    <div class="crop-detail-body">
      <!-- Quick stats -->
      <div class="quick-stats">
        <div class="stat-box" style="background:${crop.colorLight}">
          <div class="stat-icon">⏱️</div>
          <div class="stat-val" style="color:${crop.color}">${crop.duration.split('–')[0]}</div>
          <div class="stat-lbl">Days (min)</div>
        </div>
        <div class="stat-box" style="background:#E3F2FD">
          <div class="stat-icon">💧</div>
          <div class="stat-val" style="color:#1565C0">${crop.waterNeed}%</div>
          <div class="stat-lbl">Water need</div>
        </div>
        <div class="stat-box" style="background:#E8F5E9">
          <div class="stat-icon">🌡️</div>
          <div class="stat-val" style="color:#2E7D32">${crop.temp.split(',')[0]}</div>
          <div class="stat-lbl">Temperature</div>
        </div>
        <div class="stat-box" style="background:#FFF8E1">
          <div class="stat-icon">🌱</div>
          <div class="stat-val" style="color:#F57F17">${crop.soil.split(',')[0]}</div>
          <div class="stat-lbl">Soil type</div>
        </div>
      </div>

      <!-- Profit -->
      <div class="profit-card">
        <div class="profit-label">💰 Profit Estimate (Per Acre)</div>
        <div class="profit-cols">
          <div class="profit-col"><div class="profit-val">${crop.cost}</div><div class="profit-lbl">Input Cost</div></div>
          <div class="profit-col"><div class="profit-val">${crop.income}</div><div class="profit-lbl">Expected Income</div></div>
          <div class="profit-col"><div class="profit-val">${crop.profit}</div><div class="profit-lbl">Net Profit</div></div>
        </div>
        <div class="profit-note">*Maharashtra estimates. Prices vary by season and market.</div>
      </div>

      <!-- Water -->
      <div class="s-title">💧 Water Requirements</div>
      <div class="water-desc">${crop.waterDesc}</div>
      <div class="water-bar-bg">
        <div class="water-bar-fill" id="water-bar" style="--bar-width:${crop.waterNeed}%"></div>
      </div>
      <div class="water-labels"><span>Low</span><span>High</span></div>

      <!-- Steps -->
      <div class="s-title">🌱 Growing Guide</div>
      <div class="steps-list">
        ${crop.steps.map((s,i)=>`
          <div class="step-row">
            <div class="step-num" style="background:${crop.color}">${i+1}</div>
            <div class="step-content">
              <div class="step-title">${s.title}</div>
              <div class="step-desc">${s.desc}</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Nutrients -->
      <div class="s-title">🧪 Fertilizer Guide</div>
      <div class="nutrients-wrap">
        ${crop.nutrients.map(n=>`
          <div class="nutrient-chip" style="background:${n.color};color:${n.tc}">
            ${n.name}<small>${n.dose}</small>
          </div>`).join('')}
      </div>

      <!-- Diseases -->
      <div class="s-title">🦠 Disease &amp; Pest Control</div>
      <div class="diseases-list">
        ${crop.diseases.map(d=>`
          <div class="disease-row">
            <div class="disease-name">🔴 ${d.name}</div>
            <div class="disease-sym">${d.sym}</div>
            <div class="disease-remedy">✅ ${d.remedy}</div>
          </div>`).join('')}
      </div>

      <!-- Climate -->
      <div class="s-title">🌤️ Climate &amp; Region</div>
      <div class="climate-box">${crop.climate}</div>

      <!-- Tips -->
      <div class="s-title">💡 Expert Tips</div>
      <div class="tips-list">
        ${crop.tips.map(t=>`
          <div class="tip-row" style="border-left:3px solid ${crop.color}">
            <span>💡</span><span>${t}</span>
          </div>`).join('')}
      </div>

      <!-- Actions -->
      <div class="action-row">
        <button class="btn-back-list" onclick="closeCropDetail()">← Back to List</button>
        <button class="btn-share-wa" onclick="shareCrop(${crop.id})">📤 Share on WhatsApp</button>
      </div>
    </div>`;

  // Animate water bar
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      const bar = document.getElementById('water-bar');
      if (bar) bar.style.width = crop.waterNeed + '%';
    }, 200);
  });
}

function closeCropDetail() {
  state.selectedCrop = null;
  state.page = 'guide';
  renderPage();
}

function shareCrop(id) {
  const c = crops.find(x=>x.id===id);
  const msg = encodeURIComponent(`🌾 Krushi Bazar Crop Guide\n\nCrop: *${c.name}* (${c.marathi})\nSeason: ${c.season}\nProfit: ${c.profit}/acre`);
  window.open('https://wa.me/?text='+msg,'_blank');
}

// ---- CART MODAL ----
function openCart() {
  renderCartModal();
  document.getElementById('cart-modal').classList.add('open');
}
function closeCart() {
  document.getElementById('cart-modal').classList.remove('open');
}

function renderCartModal() {
  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  const keys = Object.keys(state.cart);

  if (!keys.length) {
    body.innerHTML = `<div class="empty-msg"><div style="font-size:48px;margin-bottom:12px">🛒</div><div style="font-weight:600">Your cart is empty</div><div style="font-size:13px;margin-top:6px">Add some fresh produce!</div></div>`;
    footer.style.display = 'none';
    return;
  }

  body.innerHTML = keys.map(id=>{
    const p = products.find(x=>x.id==id);
    if (!p) return '';
    return `
      <div class="cart-row">
        <div class="cart-icon">${p.icon}</div>
        <div class="cart-info">
          <div class="cart-name">${p.name}</div>
          <div class="cart-price">₹${p.price}/${p.unit}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
          <span class="qty-num">${state.cart[id]}</span>
          <button class="qty-btn" onclick="changeQty(${p.id},+1)">+</button>
        </div>
        <div class="cart-subtotal">₹${p.price*state.cart[id]}</div>
      </div>`;
  }).join('');

  footer.style.display = 'block';
  document.getElementById('cart-total').textContent = '₹'+cartTotal().toLocaleString();
}

function checkout() {
  const items = Object.keys(state.cart).map(id=>{
    const p=products.find(x=>x.id==id);
    return `${p.icon}${p.name} x${state.cart[id]}`;
  }).join(', ');
  const msg = encodeURIComponent(`🌾 *Krushi Bazar Order*\n\nItems: ${items}\n\n💰 Total: ₹${cartTotal()}\n\nPlease confirm my order!`);
  window.open('https://wa.me/919876543210?text='+msg,'_blank');
  state.cart = {};
  closeCart();
  updateCartBtn();
  showToast('✅ Order sent on WhatsApp!');
}

// ---- FARMER MODAL ----
function openFarmerModal(id) {
  state.selectedFarmer = farmers.find(f=>f.id===id);
  const f = state.selectedFarmer;
  const modal = document.getElementById('farmer-modal');
  document.getElementById('farmer-modal-content').innerHTML = `
    <div class="farmer-modal-header">
      <button class="farmer-modal-close" onclick="closeFarmerModal()">✕</button>
      <div class="farmer-modal-avatar">${f.icon}</div>
      <div class="farmer-modal-name">${f.name}</div>
      <div class="farmer-modal-loc">📍 ${f.location}</div>
      <div class="farmer-modal-stars">${'★'.repeat(Math.floor(f.rating))} ${f.rating} <span style="font-size:12px;opacity:.7">(${f.reviews} reviews)</span></div>
    </div>
    <div class="farmer-modal-body">
      <div class="farmer-stats-row">
        <div class="farmer-stat-box"><div class="val">${f.acres}</div><div class="lbl">Acres</div></div>
        <div class="farmer-stat-box"><div class="val">${f.experience.split(' ')[0]}</div><div class="lbl">Years Exp.</div></div>
        <div class="farmer-stat-box"><div class="val">${f.crops.length}</div><div class="lbl">Crops</div></div>
      </div>
      <div class="crops-label">Crops Grown</div>
      <div class="crops-tags">${f.crops.map(c=>`<span class="crops-tag">${c}</span>`).join('')}</div>
      <div class="farmer-action-row">
        <a href="tel:+91${f.phone}" class="btn-call-lg">📞 Call Farmer</a>
        <a href="https://wa.me/91${f.phone}" target="_blank" class="btn-wa-lg">💬 WhatsApp</a>
      </div>
    </div>`;
  modal.classList.add('open');
}
function closeFarmerModal() {
  document.getElementById('farmer-modal').classList.remove('open');
  state.selectedFarmer = null;
}

// ====================== INIT ======================
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupHome();
  setupProducts();
  setupFarmers();
  setupCropGuide();

  // Cart modal close on backdrop click
  document.getElementById('cart-modal').addEventListener('click', e=>{
    if (e.target===e.currentTarget) closeCart();
  });
  document.getElementById('farmer-modal').addEventListener('click', e=>{
    if (e.target===e.currentTarget) closeFarmerModal();
  });

  // Sell form submit
  const submitBtn = document.getElementById('sell-submit');
  if (submitBtn) submitBtn.addEventListener('click', submitSell);

  // Live time in weather bar
  function updateWeatherTime() {
    const el = document.getElementById('weather-time');
    if (el) el.textContent = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  }
  updateWeatherTime();
  setInterval(updateWeatherTime, 60000);

  renderPage();
});