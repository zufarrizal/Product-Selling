const STORAGE_KEY = "product_selling_calculator_v1";

const fields = {
  jumlahProduksi: document.getElementById("jumlahProduksi"),
  margin: document.getElementById("margin"),
  targetLabaNominal: document.getElementById("targetLabaNominal"),
  diskon: document.getElementById("diskon"),
  ppn: document.getElementById("ppn"),
  hookType: document.getElementById("hookType"),
};

const output = {
  totalBahanBaku: document.getElementById("totalBahanBaku"),
  totalBiayaLainnya: document.getElementById("totalBiayaLainnya"),
  categoryTotalsContainer: document.getElementById("categoryTotalsContainer"),
  categoryList: document.getElementById("categoryList"),
  totalBiaya: document.getElementById("totalBiaya"),
  biayaPerPcs: document.getElementById("biayaPerPcs"),
  hargaDasar: document.getElementById("hargaDasar"),
  hargaSetelahDiskon: document.getElementById("hargaSetelahDiskon"),
  hargaFinal: document.getElementById("hargaFinal"),
  hargaHook: document.getElementById("hargaHook"),
  laba: document.getElementById("laba"),
  labaPerPcs: document.getElementById("labaPerPcs"),
  catatan: document.getElementById("catatan"),
  warningList: document.getElementById("warningList"),
  autosaveStatus: document.getElementById("autosaveStatus"),
};

const bahanRows = document.getElementById("bahanRows");
const biayaRows = document.getElementById("biayaRows");
const levelRows = document.getElementById("levelRows");
const kategoriBaruInput = document.getElementById("kategoriBaruInput");
let categories = ["Tenaga Kerja", "Overhead", "Operasional"];
const locationLevels = [
  { level: 1, name: "Warung Rumahan", feePct: 0.00, commissionPct: 0.00, spoilagePct: 0.01, fixedPerPcs: 150 },
  { level: 2, name: "Kantin Sekolah/Kantor", feePct: 0.02, commissionPct: 0.05, spoilagePct: 0.02, fixedPerPcs: 250 },
  { level: 3, name: "Pasar Tradisional", feePct: 0.01, commissionPct: 0.07, spoilagePct: 0.02, fixedPerPcs: 300 },
  { level: 4, name: "Toko Kelontong", feePct: 0.01, commissionPct: 0.10, spoilagePct: 0.02, fixedPerPcs: 350 },
  { level: 5, name: "Titip Jual Minimarket Lokal", feePct: 0.02, commissionPct: 0.12, spoilagePct: 0.03, fixedPerPcs: 450 },
  { level: 6, name: "Booth Event / Car Free Day", feePct: 0.02, commissionPct: 0.15, spoilagePct: 0.03, fixedPerPcs: 650 },
  { level: 7, name: "Marketplace Dasar", feePct: 0.10, commissionPct: 0.00, spoilagePct: 0.02, fixedPerPcs: 500 },
  { level: 8, name: "Marketplace Premium", feePct: 0.14, commissionPct: 0.00, spoilagePct: 0.02, fixedPerPcs: 700 },
  { level: 9, name: "Toko di Pusat Perbelanjaan", feePct: 0.03, commissionPct: 0.25, spoilagePct: 0.03, fixedPerPcs: 900 },
  { level: 10, name: "Kafe/Hotel/Area Wisata Premium", feePct: 0.03, commissionPct: 0.30, spoilagePct: 0.04, fixedPerPcs: 1200 },
];

document.getElementById("tambahBahanBtn").addEventListener("click", () => {
  addBahanRow();
  recalculate();
});

document.getElementById("tambahBiayaBtn").addEventListener("click", () => {
  addBiayaRow();
  recalculate();
});
document.getElementById("tambahKategoriBtn").addEventListener("click", addCategoryFromInput);
kategoriBaruInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addCategoryFromInput();
  }
});

document.getElementById("exportPdfBtn").addEventListener("click", exportPDF);
document.getElementById("clearSavedBtn").addEventListener("click", clearSavedData);

Object.values(fields).forEach((el) => {
  el.addEventListener("input", recalculate);
  el.addEventListener("change", recalculate);
});
initAutoWidthSelect(fields.hookType);
[fields.jumlahProduksi, fields.margin, fields.targetLabaNominal, fields.diskon, fields.ppn].forEach(initAutoWidthInput);

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function applyHookPrice(price, type) {
  const rounded = Math.ceil(price / 1000) * 1000;
  if (type === "none") return Math.round(price);
  if (type === "900") return rounded - 100;
  if (type === "950") return rounded - 50;
  if (type === "990") return rounded - 10;
  if (type === "999") return rounded - 1;
  return Math.round(price);
}

function bindAutoRecalc(container) {
  container.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", recalculate);
    input.addEventListener("change", recalculate);
  });
}

function adjustSelectWidth(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  const text = select.options[select.selectedIndex]?.text || "";
  const textWidth = measureTextWidth(select, text);
  const widthInPx = Math.max(140, Math.ceil(textWidth + 48));
  select.classList.add("auto-width");
  select.style.width = `${widthInPx}px`;
}

function initAutoWidthSelect(select) {
  if (!(select instanceof HTMLSelectElement)) return;
  adjustSelectWidth(select);
  select.addEventListener("change", () => adjustSelectWidth(select));
}

function adjustInputWidth(input) {
  if (!(input instanceof HTMLInputElement)) return;
  const source = input.value || input.placeholder || "";
  const textWidth = measureTextWidth(input, source);
  const widthInPx = Math.max(120, Math.ceil(textWidth + 28));
  input.classList.add("auto-width");
  input.style.width = `${widthInPx}px`;
}

function initAutoWidthInput(input) {
  if (!(input instanceof HTMLInputElement)) return;
  adjustInputWidth(input);
  input.addEventListener("input", () => adjustInputWidth(input));
  input.addEventListener("change", () => adjustInputWidth(input));
}

function initAutoWidthFields(container) {
  if (!container) return;
  container.querySelectorAll("select").forEach(initAutoWidthSelect);
  container.querySelectorAll("input").forEach(initAutoWidthInput);
}

function measureTextWidth(el, text) {
  const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  if (!ctx) return String(text || "").length * 9;
  const style = window.getComputedStyle(el);
  ctx.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText(String(text || "")).width;
}

function addBahanRow(data = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="nama" placeholder="Contoh: Tepung" value="${data.nama || ""}" /></td>
    <td><input type="text" class="supplier" placeholder="Nama supplier" value="${data.supplier || ""}" /></td>
    <td><input type="number" class="qty" min="0" step="0.01" value="${data.qty ?? 1}" /></td>
    <td><input type="text" class="satuan" placeholder="kg/pcs/liter" value="${data.satuan || "pcs"}" /></td>
    <td><input type="number" class="harga" min="0" step="100" value="${data.harga ?? 0}" /></td>
    <td><input type="text" class="catatan" placeholder="Opsional" value="${data.catatan || ""}" /></td>
    <td class="subtotal">Rp 0</td>
    <td><button type="button" class="hapus secondary">Hapus</button></td>
  `;

  bindAutoRecalc(tr);
  initAutoWidthFields(tr);
  tr.querySelector(".hapus").addEventListener("click", () => {
    tr.remove();
    if (!bahanRows.children.length) addBahanRow();
    recalculate();
  });

  bahanRows.appendChild(tr);
}

function addBiayaRow(data = {}) {
  const selectedCategory = data.kategori || categories[0];
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <select class="kategori">${buildCategoryOptions(selectedCategory)}</select>
    </td>
    <td><input type="text" class="nama" placeholder="Contoh: Gaji packing" value="${data.nama || ""}" /></td>
    <td><input type="number" class="qty" min="0" step="0.01" value="${data.qty ?? 1}" /></td>
    <td><input type="text" class="satuan" placeholder="jam/hari/kali" value="${data.satuan || "kali"}" /></td>
    <td><input type="number" class="harga" min="0" step="100" value="${data.harga ?? 0}" /></td>
    <td class="subtotal">Rp 0</td>
    <td><button type="button" class="hapus secondary">Hapus</button></td>
  `;

  bindAutoRecalc(tr);
  initAutoWidthFields(tr);
  tr.querySelector(".hapus").addEventListener("click", () => {
    tr.remove();
    if (!biayaRows.children.length) addBiayaRow();
    recalculate();
  });

  biayaRows.appendChild(tr);
}

function normalizeCategoryName(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function buildCategoryOptions(selected = "") {
  return categories
    .map((cat) => `<option value="${cat}" ${cat === selected ? "selected" : ""}>${cat}</option>`)
    .join("");
}

function refreshCategorySelects() {
  [...biayaRows.querySelectorAll(".kategori")].forEach((select) => {
    const current = select.value;
    select.innerHTML = buildCategoryOptions(current);
    if (!categories.includes(current)) {
      select.value = categories[0];
    }
    adjustSelectWidth(select);
  });
}

function renderCategoryList() {
  output.categoryList.innerHTML = "";
  categories.forEach((cat) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "secondary";
    item.textContent = `Hapus: ${cat}`;
    item.addEventListener("click", () => {
      if (categories.length <= 1) return;
      categories = categories.filter((c) => c !== cat);
      refreshCategorySelects();
      renderCategoryList();
      recalculate();
    });
    output.categoryList.appendChild(item);
  });
}

function addCategoryFromInput() {
  const name = normalizeCategoryName(kategoriBaruInput.value);
  if (!name) return;
  if (!categories.includes(name)) {
    categories.push(name);
    refreshCategorySelects();
    renderCategoryList();
    recalculate();
  }
  kategoriBaruInput.value = "";
}

function sumRows(tbody) {
  let total = 0;
  [...tbody.querySelectorAll("tr")].forEach((tr) => {
    const qty = num(tr.querySelector(".qty").value);
    const harga = num(tr.querySelector(".harga").value);
    const subtotal = qty * harga;
    total += subtotal;
    tr.querySelector(".subtotal").textContent = formatIDR(subtotal);
  });
  return total;
}

function getKategoriTotals() {
  const totals = Object.fromEntries(categories.map((c) => [c, 0]));
  [...biayaRows.querySelectorAll("tr")].forEach((tr) => {
    const kategori = tr.querySelector(".kategori").value;
    const qty = num(tr.querySelector(".qty").value);
    const harga = num(tr.querySelector(".harga").value);
    if (!(kategori in totals)) totals[kategori] = 0;
    totals[kategori] += qty * harga;
  });
  return totals;
}

function collectData() {
  return {
    settings: {
      jumlahProduksi: num(fields.jumlahProduksi.value) || 1,
      margin: num(fields.margin.value),
      targetLabaNominal: num(fields.targetLabaNominal.value),
      diskon: num(fields.diskon.value),
      ppn: num(fields.ppn.value),
      hookType: fields.hookType.value,
      categories,
    },
    bahan: [...bahanRows.querySelectorAll("tr")].map((tr) => ({
      nama: tr.querySelector(".nama").value,
      supplier: tr.querySelector(".supplier").value,
      qty: num(tr.querySelector(".qty").value),
      satuan: tr.querySelector(".satuan").value,
      harga: num(tr.querySelector(".harga").value),
      catatan: tr.querySelector(".catatan").value,
    })),
    biaya: [...biayaRows.querySelectorAll("tr")].map((tr) => ({
      kategori: tr.querySelector(".kategori").value,
      nama: tr.querySelector(".nama").value,
      qty: num(tr.querySelector(".qty").value),
      satuan: tr.querySelector(".satuan").value,
      harga: num(tr.querySelector(".harga").value),
    })),
  };
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
  output.autosaveStatus.textContent = `Simpan otomatis aktif - tersimpan ${new Date().toLocaleTimeString("id-ID")}`;
}

function clearSavedData() {
  localStorage.removeItem(STORAGE_KEY);
  categories = ["Tenaga Kerja", "Overhead", "Operasional"];

  fields.jumlahProduksi.value = 1;
  fields.margin.value = 30;
  fields.targetLabaNominal.value = 0;
  fields.diskon.value = 0;
  fields.ppn.value = 11;
  fields.hookType.value = "none";
  adjustSelectWidth(fields.hookType);
  [fields.jumlahProduksi, fields.margin, fields.targetLabaNominal, fields.diskon, fields.ppn].forEach(adjustInputWidth);

  bahanRows.innerHTML = "";
  biayaRows.innerHTML = "";
  addBahanRow({ nama: "Bahan 1", qty: 1, satuan: "pcs", harga: 0 });
  addBiayaRow({ kategori: "Tenaga Kerja", nama: "Biaya 1", qty: 1, satuan: "kali", harga: 0 });
  renderCategoryList();
  output.autosaveStatus.textContent = "Data simpan browser sudah dihapus";
  recalculate();
}

function loadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    fields.jumlahProduksi.value = data.settings?.jumlahProduksi ?? 1;
    fields.margin.value = data.settings?.margin ?? 30;
    fields.targetLabaNominal.value = data.settings?.targetLabaNominal ?? 0;
    fields.diskon.value = data.settings?.diskon ?? 0;
    fields.ppn.value = data.settings?.ppn ?? 11;
    fields.hookType.value = data.settings?.hookType ?? "none";
    adjustSelectWidth(fields.hookType);
    [fields.jumlahProduksi, fields.margin, fields.targetLabaNominal, fields.diskon, fields.ppn].forEach(adjustInputWidth);
    if (Array.isArray(data.settings?.categories) && data.settings.categories.length) {
      categories = data.settings.categories.map(normalizeCategoryName).filter(Boolean);
    }

    bahanRows.innerHTML = "";
    biayaRows.innerHTML = "";

    if (Array.isArray(data.bahan) && data.bahan.length) {
      data.bahan.forEach(addBahanRow);
    } else {
      addBahanRow();
    }

    if (Array.isArray(data.biaya) && data.biaya.length) {
      data.biaya.forEach(addBiayaRow);
    } else {
      addBiayaRow();
    }

    output.autosaveStatus.textContent = "Simpan otomatis aktif - data sebelumnya dimuat";
    renderCategoryList();
    return true;
  } catch {
    return false;
  }
}

function updateWarnings({ margin, diskon, labaTotal, hargaHook, biayaPerPcs }) {
  const warnings = [];
  if (margin < 15) warnings.push("Margin di bawah 15%. Risiko profit terlalu tipis.");
  if (diskon > 30) warnings.push("Diskon di atas 30%. Pastikan tetap ada ruang laba.");
  if (labaTotal < 0) warnings.push("Laba negatif. Harga jual perlu dinaikkan atau biaya diturunkan.");
  if (hargaHook < biayaPerPcs) warnings.push("Harga hook per pcs lebih kecil dari biaya per pcs.");

  output.warningList.innerHTML = "";
  warnings.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = w;
    output.warningList.appendChild(li);
  });
}

function renderLocationLevels(hargaHookBase, biayaPerPcs, jumlahProduksi, hookType) {
  levelRows.innerHTML = "";
  locationLevels.forEach((item) => {
    const variablePct = item.feePct + item.commissionPct + item.spoilagePct;
    const safeDivisor = Math.max(0.05, 1 - variablePct);
    const rawLevelPrice = (hargaHookBase + item.fixedPerPcs) / safeDivisor;
    const levelPrice = applyHookPrice(rawLevelPrice, hookType);
    const effectiveMultiplier = levelPrice / Math.max(1, hargaHookBase);
    const labaPerPcs = levelPrice - biayaPerPcs;
    const labaTotal = labaPerPcs * jumlahProduksi;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.level}</td>
      <td>${item.name}</td>
      <td>${effectiveMultiplier.toFixed(2)}x</td>
      <td>${formatIDR(levelPrice)}</td>
      <td>${formatIDR(labaPerPcs)}</td>
      <td>${formatIDR(labaTotal)}</td>
    `;
    levelRows.appendChild(tr);
  });
}

function recalculate() {
  const totalBahanBaku = sumRows(bahanRows);
  const totalBiayaLainnya = sumRows(biayaRows);
  const kategoriTotals = getKategoriTotals();
  const totalBiaya = totalBahanBaku + totalBiayaLainnya;

  const jumlahProduksi = Math.max(1, Math.round(num(fields.jumlahProduksi.value) || 1));
  fields.jumlahProduksi.value = jumlahProduksi;

  const marginPct = num(fields.margin.value) / 100;
  const diskonPct = num(fields.diskon.value) / 100;
  const ppnPct = num(fields.ppn.value) / 100;
  const targetLabaNominal = num(fields.targetLabaNominal.value);

  const hargaDasarMarginTotal = totalBiaya * (1 + marginPct);
  const hargaDasarLabaTotal = totalBiaya + targetLabaNominal;
  const hargaDasarDipakaiTotal = Math.max(hargaDasarMarginTotal, hargaDasarLabaTotal);

  const hargaDasarPerPcs = hargaDasarDipakaiTotal / jumlahProduksi;
  const hargaSetelahDiskon = hargaDasarPerPcs * (1 - diskonPct);
  const hargaFinal = hargaSetelahDiskon * (1 + ppnPct);
  const hargaHook = applyHookPrice(hargaFinal, fields.hookType.value);

  const omzetTotal = hargaHook * jumlahProduksi;
  const labaTotal = omzetTotal - totalBiaya;
  const biayaPerPcs = totalBiaya / jumlahProduksi;
  const labaPerPcs = labaTotal / jumlahProduksi;

  output.totalBahanBaku.textContent = formatIDR(totalBahanBaku);
  output.totalBiayaLainnya.textContent = formatIDR(totalBiayaLainnya);
  output.categoryTotalsContainer.innerHTML = categories
    .map((cat) => `<div>${cat}: <strong>${formatIDR(kategoriTotals[cat] || 0)}</strong></div>`)
    .join("");
  output.totalBiaya.textContent = formatIDR(totalBiaya);
  output.biayaPerPcs.textContent = formatIDR(biayaPerPcs);
  output.hargaDasar.textContent = formatIDR(hargaDasarPerPcs);
  output.hargaSetelahDiskon.textContent = formatIDR(hargaSetelahDiskon);
  output.hargaFinal.textContent = formatIDR(hargaFinal);
  output.hargaHook.textContent = formatIDR(hargaHook);
  output.laba.textContent = formatIDR(labaTotal);
  output.labaPerPcs.textContent = formatIDR(labaPerPcs);

  output.catatan.textContent = targetLabaNominal > 0
    ? "Harga dasar memakai nilai tertinggi dari target margin vs target laba nominal."
    : "Semua hasil dihitung otomatis saat data berubah.";

  updateWarnings({
    margin: num(fields.margin.value),
    diskon: num(fields.diskon.value),
    labaTotal,
    hargaHook,
    biayaPerPcs,
  });

  renderLocationLevels(hargaHook, biayaPerPcs, jumlahProduksi, fields.hookType.value);

  saveToLocalStorage();
}

function exportPDF() {
  const data = collectData();
  const now = new Date();
  const title = `Laporan Kalkulator Biaya Produk - ${now.toLocaleDateString("id-ID")} ${now.toLocaleTimeString("id-ID")}`;
  const kategoriTotals = getKategoriTotals();
  const peringatan = [...output.warningList.querySelectorAll("li")].map((li) => li.textContent);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const summaryRows = [
    ["Jumlah Produksi", `${data.settings.jumlahProduksi} pcs`],
    ["Target Margin", `${data.settings.margin}%`],
    ["Target Laba Nominal", formatIDR(data.settings.targetLabaNominal)],
    ["Diskon", `${data.settings.diskon}%`],
    ["PPN", `${data.settings.ppn}%`],
    ["Tipe Hook Price", data.settings.hookType],
    ["Total Biaya Produksi", output.totalBiaya.textContent],
    ["Biaya per pcs", output.biayaPerPcs.textContent],
    ["Harga Dasar per pcs", output.hargaDasar.textContent],
    ["Harga Setelah Diskon", output.hargaSetelahDiskon.textContent],
    ["Harga Final Setelah Pajak", output.hargaFinal.textContent],
    ["Harga Hook Rekomendasi", output.hargaHook.textContent],
    ["Laba Total", output.laba.textContent],
    ["Laba per pcs", output.labaPerPcs.textContent],
  ];

  const kategoriTotalsHtml = categories
    .map((cat) => `<tr><td>${escapeHtml(cat)}</td><td>${escapeHtml(formatIDR(kategoriTotals[cat] || 0))}</td></tr>`)
    .join("");

  const bahanHtml = data.bahan
    .map(
      (b) => `<tr>
        <td>${escapeHtml(b.nama || "-")}</td>
        <td>${escapeHtml(b.supplier || "-")}</td>
        <td>${escapeHtml(b.qty)}</td>
        <td>${escapeHtml(b.satuan || "-")}</td>
        <td>${escapeHtml(formatIDR(b.harga))}</td>
        <td>${escapeHtml(b.catatan || "-")}</td>
        <td>${escapeHtml(formatIDR(b.qty * b.harga))}</td>
      </tr>`
    )
    .join("");

  const biayaHtml = data.biaya
    .map(
      (b) => `<tr>
        <td>${escapeHtml(b.kategori)}</td>
        <td>${escapeHtml(b.nama || "-")}</td>
        <td>${escapeHtml(b.qty)}</td>
        <td>${escapeHtml(b.satuan || "-")}</td>
        <td>${escapeHtml(formatIDR(b.harga))}</td>
        <td>${escapeHtml(formatIDR(b.qty * b.harga))}</td>
      </tr>`
    )
    .join("");

  const levelHtml = [...levelRows.querySelectorAll("tr")]
    .map((tr) => {
      const tds = [...tr.querySelectorAll("td")].map((td) => td.textContent);
      return `<tr>${tds.map((v) => `<td>${v}</td>`).join("")}</tr>`;
    })
    .join("");

  const summaryHtml = summaryRows
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("");

  const warningHtml = peringatan.length
    ? `<ul>${peringatan.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`
    : "<p>Tidak ada peringatan.</p>";

  const reportHtml = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1, h2 { margin: 0 0 10px; }
    h2 { margin-top: 24px; font-size: 18px; }
    p { margin: 0 0 12px; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; }
    .meta { margin-bottom: 16px; font-size: 12px; color: #4b5563; }
  </style>
</head>
<body>
  <h1>Laporan Kalkulator Biaya Produk</h1>
  <div class="meta">Dicetak: ${now.toLocaleString("id-ID")}</div>
  <h2>Ringkasan</h2>
  <table>
    <tbody>${summaryHtml}</tbody>
  </table>

  <h2>Rincian Bahan Baku</h2>
  <table>
    <thead><tr><th>Nama</th><th>Supplier</th><th>Qty</th><th>Satuan</th><th>Harga Satuan</th><th>Catatan</th><th>Subtotal</th></tr></thead>
    <tbody>${bahanHtml}</tbody>
  </table>

  <h2>Rincian Biaya Produksi Lainnya</h2>
  <table>
    <thead><tr><th>Kategori</th><th>Nama Biaya</th><th>Qty</th><th>Satuan</th><th>Harga Satuan</th><th>Subtotal</th></tr></thead>
    <tbody>${biayaHtml}</tbody>
  </table>

  <h2>Total per Kategori</h2>
  <table>
    <thead><tr><th>Kategori</th><th>Total</th></tr></thead>
    <tbody>${kategoriTotalsHtml}</tbody>
  </table>

  <h2>Strategi Lokasi Jual (10 Level)</h2>
  <table>
    <thead><tr><th>Level</th><th>Lokasi / Channel</th><th>Pengali Harga</th><th>Harga / pcs</th><th>Laba / pcs</th><th>Laba Total</th></tr></thead>
    <tbody>${levelHtml}</tbody>
  </table>

  <h2>Peringatan Otomatis</h2>
  ${warningHtml}
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(reportHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

if (!loadFromLocalStorage()) {
  renderCategoryList();
  addBahanRow({ nama: "Bahan 1", qty: 1, satuan: "pcs", harga: 0 });
  addBiayaRow({ kategori: "Tenaga Kerja", nama: "Biaya 1", qty: 1, satuan: "kali", harga: 0 });
}

recalculate();
