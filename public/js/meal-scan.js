import { getStoredToken } from "/js/auth.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const SVG_CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
  <circle cx="12" cy="13" r="4"/>
</svg>`;

const SVG_UPLOAD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="17 8 12 3 7 8"/>
  <line x1="12" y1="3" x2="12" y2="15"/>
</svg>`;

export const initMealScan = (containerEl) => {
  let previewUrl = null;
  let currentFile = null;

  // ── Hidden file input ────────────────────────────────────────────────────────

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.cssText = "display:none";
  fileInput.setAttribute("aria-hidden", "true");
  containerEl.appendChild(fileInput);

  // ── State renderers ──────────────────────────────────────────────────────────

  const revokePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  };

  const clearContainer = () => {
    // remove everything except the persistent file input
    [...containerEl.children].forEach((el) => {
      if (el !== fileInput) el.remove();
    });
  };

  const showIdle = () => {
    revokePreview();
    currentFile = null;
    fileInput.value = "";
    clearContainer();

    const zone = document.createElement("div");
    zone.className = "cs-upload-zone";

    const icon = document.createElement("div");
    icon.className = "cs-upload-icon";
    icon.innerHTML = SVG_CAMERA;

    const title = document.createElement("p");
    title.className = "cs-upload-title";
    title.textContent = "Upload a photo of your meal";

    const subtitle = document.createElement("p");
    subtitle.className = "cs-upload-subtitle";
    subtitle.textContent = "Click below to choose an image";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-choose-btn";
    btn.innerHTML = `${SVG_UPLOAD} Choose Image`;
    btn.addEventListener("click", () => fileInput.click());

    zone.append(icon, title, subtitle, btn);
    containerEl.appendChild(zone);
  };

  const showPreviewing = (file) => {
    currentFile = file;
    previewUrl = URL.createObjectURL(file);
    clearContainer();

    const zone = document.createElement("div");
    zone.className = "cs-preview-zone";

    const img = document.createElement("img");
    img.className = "cs-preview-img";
    img.src = previewUrl;
    img.alt = "Meal preview";

    const actions = document.createElement("div");
    actions.className = "cs-preview-actions";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "cs-upload-btn";
    uploadBtn.textContent = "Upload";
    uploadBtn.addEventListener("click", doUpload);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "cs-cancel-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", showIdle);

    actions.append(uploadBtn, cancelBtn);
    zone.append(img, actions);
    containerEl.appendChild(zone);
  };

  const showLoading = () => {
    clearContainer();

    const zone = document.createElement("div");
    zone.className = "cs-loading-zone";

    const spinner = document.createElement("div");
    spinner.className = "cs-spinner";

    const text = document.createElement("p");
    text.className = "cs-loading-text";
    text.textContent = "Analyzing your meal…";

    zone.append(spinner, text);
    containerEl.appendChild(zone);
  };

  const showError = (message) => {
    revokePreview();
    clearContainer();

    const zone = document.createElement("div");
    zone.className = "cs-error-zone";

    const msg = document.createElement("p");
    msg.className = "cs-error-msg";
    msg.textContent = message;

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "cs-retry-btn";
    retryBtn.textContent = "Try Again";
    retryBtn.addEventListener("click", () => {
      if (currentFile) {
        showPreviewing(currentFile);
      } else {
        showIdle();
      }
    });

    zone.append(msg, retryBtn);
    containerEl.appendChild(zone);
  };

  const showResult = (meal) => {
    revokePreview();
    clearContainer();

    const zone = document.createElement("div");
    zone.className = "cs-result-zone";

    const name = document.createElement("h2");
    name.className = "cs-result-name";
    name.textContent = meal.name;

    // Macro grid
    const grid = document.createElement("div");
    grid.className = "cs-nutrient-grid";

    const macros = [
      { label: "Calories", value: meal.totals.calories_kcal, unit: "kcal" },
      { label: "Protein",  value: meal.totals.protein_g,     unit: "g" },
      { label: "Fat",      value: meal.totals.fat_g,         unit: "g" },
      { label: "Carbs",    value: meal.totals.carbohydrates_g, unit: "g" },
    ];

    macros.forEach(({ label, value, unit }) => {
      const card = document.createElement("div");
      card.className = "cs-nutrient-card";

      const val = document.createElement("div");
      val.className = "cs-nutrient-value";
      val.innerHTML = `${value}<span> ${unit}</span>`;

      const lbl = document.createElement("div");
      lbl.className = "cs-nutrient-label";
      lbl.textContent = label;

      card.append(val, lbl);
      grid.appendChild(card);
    });

    // Items table
    const table = document.createElement("table");
    table.className = "cs-result-table";
    table.innerHTML = `
      <thead>
        <tr><th>Item</th><th>Qty</th><th>kcal</th></tr>
      </thead>
      <tbody>
        ${meal.items.map((item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.nutrition.calories_kcal}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr><td colspan="2">Total</td><td>${meal.totals.calories_kcal}</td></tr>
      </tfoot>
    `;

    const scanAgainBtn = document.createElement("button");
    scanAgainBtn.type = "button";
    scanAgainBtn.className = "cs-scan-again-btn";
    scanAgainBtn.textContent = "Scan Another Meal";
    scanAgainBtn.addEventListener("click", showIdle);

    zone.append(name, grid, table, scanAgainBtn);
    containerEl.appendChild(zone);
  };

  // ── Upload logic ─────────────────────────────────────────────────────────────

  const doUpload = async () => {
    if (!currentFile) return;
    showLoading();

    const form = new FormData();
    form.append("image", currentFile);

    try {
      const token = getStoredToken();
      const res = await fetch("/meals/scan-and-record", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? `Upload failed (${res.status})`);
        return;
      }

      const { meal } = await res.json();
      showResult(meal);
    } catch {
      showError("Upload failed. Please check your connection and try again.");
    }
  };

  // ── File selection ────────────────────────────────────────────────────────────

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      showError("Image exceeds the 10 MB size limit. Please choose a smaller file.");
      return;
    }
    showPreviewing(file);
  });

  // Boot
  showIdle();
};
