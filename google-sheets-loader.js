/* SaudiHimmah - Google Sheets offers loader
 * ضع رابط Apps Script المنتهي بـ /exec في المتغير أدناه.
 */
window.SAUDI_HIMMAH_SHEETS_URL = window.SAUDI_HIMMAH_SHEETS_URL || '';

(function () {
  'use strict';
  const CONFIG = {
    url: window.SAUDI_HIMMAH_SHEETS_URL,
    keepFallbackOnError: true
  };

  const keyMap = {
    'المدينة': 'city', 'city': 'city',
    'الحي': 'neighborhood', 'الحي ': 'neighborhood', 'neighborhood': 'neighborhood',
    'النوع': 'property_type', 'نوع العقار': 'property_type', 'type': 'property_type',
    'السعر': 'price', 'price': 'price',
    'المساحة': 'area', 'المساحة م²': 'area', 'area': 'area',
    'حالة الإعلان': 'status', 'الحالة': 'status', 'status': 'status',
    'العمر': 'age', 'age': 'age',
    'الغرف': 'rooms', 'عدد الغرف': 'rooms', 'rooms': 'rooms',
    'الواجهة': 'facade', 'facade': 'facade',
    'عرض الشارع': 'street_width', 'street_width': 'street_width',
    'رابط الخريطة': 'map_url', 'map_url': 'map_url',
    'الوصف': 'description', 'description': 'description',
    'رقم الإعلان': 'listing_number', 'رقم الوحدة': 'listing_number', 'listing_number': 'listing_number',
    'رقم الرخصة': 'license_number', 'license_number': 'license_number',
    'الترخيص الإعلاني': 'advertising_license', 'advertising_license': 'advertising_license',
    'عدد دورات المياه': 'bathrooms', 'bathrooms': 'bathrooms',
    'المميزات': 'features', 'features': 'features',
    'رابط الصورة': 'image_url', 'image_url': 'image_url',
    'تاريخ التحديث': 'updated_at', 'updated_at': 'updated_at'
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const numberValue = value => {
    const normalized = String(value ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,\s]/g, '').replace(/٫/g, '.');
    const n = Number(normalized.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  function normalizeRows(rows) {
    return rows.map((row, index) => {
      const item = { id: row.id || `sheet_${Date.now()}_${index}` };
      Object.entries(row).forEach(([header, value]) => {
        const normalizedHeader = String(header).trim();
        const key = keyMap[normalizedHeader] || normalizedHeader.toLowerCase().replace(/\s+/g, '_');
        item[key] = String(value ?? '').trim();
      });
      item.price = numberValue(item.price);
      item.area = numberValue(item.area);
      item.rooms = item.rooms ? numberValue(item.rooms) : '';
      item.age = item.age ? numberValue(item.age) : '';
      item.status = item.status || 'متاحة للبيع';
      return item;
    }).filter(item => item.city && item.neighborhood && item.property_type && item.area > 0);
  }

  function fetchJsonp(url) {
    return new Promise((resolve, reject) => {
      const callback = `himmmahSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 15000);
      function cleanup() { clearTimeout(timer); delete window[callback]; script.remove(); }
      window[callback] = data => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('network')); };
      script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${encodeURIComponent(callback)}`;
      document.head.appendChild(script);
    });
  }

  function renderSheetOffers(rows) {
    const grid = document.getElementById('offersGrid');
    if (!grid || !rows.length) return;
    window.SAUDI_HIMMAH_SHEET_OFFERS = rows;
    grid.innerHTML = rows.map((offer, index) => {
      const price = offer.price ? `${offer.price.toLocaleString('ar-SA')} ر.س` : 'السعر عند التواصل';
      const statusClass = /تم البيع|sold/i.test(offer.status) ? 'sold' : 'available';
      return `<article class="offer-card sheet-offer-card">
        ${offer.status ? `<div class="offer-status ${statusClass}">${escapeHtml(offer.status)}</div>` : ''}
        <div class="offer-icon"><i class="fa-solid fa-house-chimney"></i></div>
        <div class="offer-body">
          <div class="offer-title">${escapeHtml(offer.property_type)} · ${escapeHtml(offer.neighborhood)}</div>
          <div class="offer-loc"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(offer.city)} - ${escapeHtml(offer.neighborhood)}</div>
          <div class="offer-meta">${escapeHtml(offer.area)} م²${offer.rooms !== '' ? ` · ${escapeHtml(offer.rooms)} غرف` : ''}</div>
          <div class="offer-price"><span class="new-price">${escapeHtml(price)}</span></div>
          <button class="btn btn-gold btn-sm" style="width:100%;" type="button" onclick="showGoogleSheetOfferDetails(${index})"><i class="fa-solid fa-arrow-up-left-from-square"></i> <span>عرض التفاصيل</span></button>
        </div>
      </article>`;
    }).join('');
  }

  window.showGoogleSheetOfferDetails = function (index) {
    const offer = (window.SAUDI_HIMMAH_SHEET_OFFERS || [])[index];
    const content = document.getElementById('offerDetailsContent');
    const modal = document.getElementById('offerDetailsModal');
    if (!offer || !content || !modal) return;
    const list = (label, value) => value ? `<li><strong>${label}:</strong> ${escapeHtml(value)}</li>` : '';
    content.innerHTML = `<section class="offer-detail-section full"><h3>${escapeHtml(offer.property_type)} في ${escapeHtml(offer.neighborhood)} - ${escapeHtml(offer.city)}</h3><p><strong>حالة الإعلان:</strong> ${escapeHtml(offer.status)}</p></section>
      <section class="offer-detail-section"><h3>المعلومات الأساسية</h3><ul>${list('السعر', offer.price ? `${offer.price.toLocaleString('ar-SA')} ر.س` : 'عند التواصل')}${list('المساحة', offer.area ? `${offer.area} م²` : '')}${list('العمر', offer.age ? `${offer.age} سنة` : '')}${list('الغرف', offer.rooms)}${list('الواجهة', offer.facade)}${list('عرض الشارع', offer.street_width ? `${offer.street_width} م` : '')}</ul></section>
      <section class="offer-detail-section"><h3>معلومات الإعلان</h3><ul>${list('رقم الإعلان', offer.listing_number)}${list('رقم الرخصة', offer.license_number)}${list('الترخيص الإعلاني', offer.advertising_license)}${list('دورات المياه', offer.bathrooms)}</ul></section>
      ${offer.description ? `<section class="offer-detail-section full"><h3>الوصف</h3><p>${escapeHtml(offer.description)}</p></section>` : ''}
      ${offer.features ? `<section class="offer-detail-section full"><h3>المميزات</h3><p>${escapeHtml(offer.features)}</p></section>` : ''}
      ${offer.map_url ? `<section class="offer-detail-section full"><h3>الموقع على الخريطة</h3><p><a href="${escapeHtml(offer.map_url)}" target="_blank" rel="noopener">فتح الموقع في خرائط Google</a></p></section>` : ''}`;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  };

  async function load() {
    if (!CONFIG.url || !document.getElementById('offersGrid')) return;
    try {
      const payload = await fetchJsonp(CONFIG.url);
      const rows = normalizeRows(payload?.data || []);
      if (rows.length) renderSheetOffers(rows);
      else if (typeof window.showToast === 'function') window.showToast('لم توجد عروض صالحة في Google Sheets');
    } catch (error) {
      console.warn('Google Sheets offers load failed:', error);
      if (!CONFIG.keepFallbackOnError && typeof window.showToast === 'function') window.showToast('تعذر تحميل العروض من Google Sheets');
    }
  }

  window.loadOffersFromGoogleSheets = load;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
