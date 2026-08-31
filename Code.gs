const SHEET_ID = 'ضع_معرف_الجدول_هنا';
const SHEET_NAME = 'العروض العقارية';

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return respond(e, { ok: false, error: 'لم يتم العثور على ورقة البيانات' });

    const values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) return respond(e, { ok: true, data: [] });

    const headers = values.shift().map(normalizeHeader);
    let data = values
      .filter(row => row.some(value => String(value).trim() !== ''))
      .map(row => {
        const item = {};
        headers.forEach((header, index) => item[header] = String(row[index] || '').trim());
        return item;
      });

    // فلترة اختيارية من الرابط: ?neighborhood=الندى&minPrice=500000&maxPrice=2000000&q=شقة
    const p = (e && e.parameter) || {};
    const neighborhood = String(p.neighborhood || '').trim().toLowerCase();
    const q = String(p.q || '').trim().toLowerCase();
    const minPrice = toNumber(p.minPrice);
    const maxPrice = toNumber(p.maxPrice);

    data = data.filter(item => {
      const haystack = [item.city, item.neighborhood, item.property_type, item.description]
        .join(' ').toLowerCase();
      const price = toNumber(item.price);
      return (!neighborhood || String(item.neighborhood).toLowerCase() === neighborhood)
        && (!q || haystack.includes(q))
        && (!minPrice || price >= minPrice)
        && (!maxPrice || price <= maxPrice);
    });

    return respond(e, {
      ok: true,
      updatedAt: new Date().toISOString(),
      count: data.length,
      data: data
    });
  } catch (error) {
    return respond(e, { ok: false, error: String(error.message || error) });
  }
}

function normalizeHeader(value) {
  const h = String(value || '').trim();
  const map = {
    'المدينة': 'city', 'الحي': 'neighborhood', 'النوع': 'property_type',
    'نوع العقار': 'property_type', 'السعر': 'price', 'المساحة': 'area',
    'حالة الإعلان': 'status', 'العمر': 'age', 'الغرف': 'rooms',
    'عدد الغرف': 'rooms', 'الواجهة': 'facade', 'عرض الشارع': 'street_width',
    'رابط الخريطة': 'map_url', 'الوصف': 'description', 'المميزات': 'features',
    'رقم الإعلان': 'listing_number', 'رقم الرخصة': 'license_number',
    'الترخيص الإعلاني': 'advertising_license', 'عدد دورات المياه': 'bathrooms',
    'رابط الصورة': 'image_url', 'تاريخ التحديث': 'updated_at'
  };
  return map[h] || h.toLowerCase().replace(/\s+/g, '_');
}

function toNumber(value) {
  const normalized = String(value || '')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٬,\s]/g, '').replace(/٫/g, '.');
  const number = Number(normalized.replace(/[^0-9.-]/g, ''));
  return isNaN(number) ? 0 : number;
}

function respond(e, payload) {
  const json = JSON.stringify(payload).replace(/<\//g, '<\\/');
  const callback = e && e.parameter && e.parameter.callback;
  if (callback && /^[A-Za-z_$][\w$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
