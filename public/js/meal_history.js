// ── Helpers ───────────────────────────────────────────────────────────────────

const toLocalDateKey = (isoString) => {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayKey = () => toLocalDateKey(new Date().toISOString());
const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d.toISOString());
};

export const formatDateLabel = (dateKey) => {
  if (dateKey === todayKey()) return "Today";
  if (dateKey === yesterdayKey()) return "Yesterday";
  const [y, m, day] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: "long", day: "numeric" });
};

export const groupByDate = (meals) => {
  const map = new Map();
  for (const meal of meals) {
    const key = toLocalDateKey(meal.recordedAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(meal);
  }
  // meals already sorted newest-first by API; map insertion order preserves that
  return map;
};

export const sumTotals = (meals) =>
  meals.reduce(
    (acc, m) => ({
      calories_kcal: acc.calories_kcal + (m.totals?.calories_kcal || 0),
      protein_g: acc.protein_g + (m.totals?.protein_g || 0),
      fat_g: acc.fat_g + (m.totals?.fat_g || 0),
      carbohydrates_g: acc.carbohydrates_g + (m.totals?.carbohydrates_g || 0),
    }),
    { calories_kcal: 0, protein_g: 0, fat_g: 0, carbohydrates_g: 0 }
  );

export const formatTime = (isoString) =>
  new Date(isoString).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// ── Renderers ─────────────────────────────────────────────────────────────────

const SVG_PLACEHOLDER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:100%;height:100%;color:#ccc">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <circle cx="8.5" cy="8.5" r="1.5"/>
  <polyline points="21 15 16 10 5 21"/>
</svg>`;

const SVG_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:18px;height:18px">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  <path d="M10 11v6"/>
  <path d="M14 11v6"/>
  <path d="M9 6V4h6v2"/>
</svg>`;

const SVG_CHEVRON = `<svg class="cs-history-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="18 15 12 9 6 15"/>
</svg>`;

export const renderGroupHeader = (label, count, totals) => {
  const el = document.createElement("div");
  el.className = "cs-history-group-header";
  el.setAttribute("role", "button");
  el.setAttribute("aria-expanded", "true");
  el.setAttribute("tabindex", "0");
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); }
  });
  el.innerHTML = `
    <div class="cs-history-group-top">
      <div class="cs-history-group-title">
        <span class="cs-history-date">${label}</span>
        <span class="cs-history-count">${count} meal${count !== 1 ? "s" : ""}</span>
      </div>
      ${SVG_CHEVRON}
    </div>
    <div class="cs-history-group-totals">
      <span>${Math.round(totals.calories_kcal)} cal</span>
      <span>P: ${Math.round(totals.protein_g)}g</span>
      <span>C: ${Math.round(totals.carbohydrates_g)}g</span>
      <span>F: ${Math.round(totals.fat_g)}g</span>
    </div>
  `;
  return el;
};

export const renderMealCard = (meal, onDelete) => {
  const card = document.createElement("div");
  card.className = "cs-history-meal-card";
  card.dataset.mealId = meal.id;

  const thumb = document.createElement("div");
  thumb.className = "cs-history-thumb";
  if (meal.imageThumbnail) {
    const img = document.createElement("img");
    img.src = meal.imageThumbnail;
    img.alt = meal.mealName || "Meal";
    img.className = "cs-history-thumb-img";
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = SVG_PLACEHOLDER;
  }

  const info = document.createElement("div");
  info.className = "cs-history-meal-info";

  const name = document.createElement("div");
  name.className = "cs-history-meal-name";
  name.textContent = meal.mealName || "Unnamed Meal";

  const time = document.createElement("div");
  time.className = "cs-history-meal-time";
  time.textContent = formatTime(meal.recordedAt);

  const badges = document.createElement("div");
  badges.className = "cs-history-badges";

  const t = meal.totals || {};
  [
    `${Math.round(t.calories_kcal || 0)} cal`,
    `P: ${Math.round(t.protein_g || 0)}g`,
    `C: ${Math.round(t.carbohydrates_g || 0)}g`,
    `F: ${Math.round(t.fat_g || 0)}g`,
  ].forEach((text) => {
    const b = document.createElement("span");
    b.className = "cs-history-badge";
    b.textContent = text;
    badges.appendChild(b);
  });

  info.append(name, time, badges);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "cs-history-delete-btn";
  deleteBtn.setAttribute("aria-label", "Delete meal");
  deleteBtn.innerHTML = SVG_TRASH;
  deleteBtn.addEventListener("click", () => onDelete(meal.id, card));

  card.append(thumb, info, deleteBtn);
  return card;
};

// ── Main ──────────────────────────────────────────────────────────────────────

export const initMealHistory = async (container, getToken) => {
  container.innerHTML = "";

  const renderEmpty = () => {
    container.innerHTML = `
      <div class="cs-card cs-empty-state">
        <svg class="cs-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p class="cs-empty-title">No meals tracked yet</p>
        <p class="cs-empty-subtitle">Scan your first meal to see it here!</p>
      </div>`;
  };

  const renderError = () => {
    container.innerHTML = `
      <div class="cs-card cs-empty-state">
        <p class="cs-empty-title">Could not load history</p>
        <p class="cs-empty-subtitle">Please check your connection and try again.</p>
      </div>`;
  };

  let meals;
  try {
    const token = getToken();
    const res = await fetch("/meals/history", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { renderError(); return; }
    ({ meals } = await res.json());
  } catch {
    renderError();
    return;
  }

  if (!meals || meals.length === 0) { renderEmpty(); return; }

  const groups = groupByDate(meals);

  const attachToggle = (header, body) => {
    header.addEventListener("click", () => {
      const collapsed = body.hidden;
      body.hidden = !collapsed;
      header.setAttribute("aria-expanded", String(collapsed));
      header.classList.toggle("cs-history-group-header--collapsed", !collapsed);
    });
  };

  const handleDelete = async (mealId, cardEl) => {
    const token = getToken();
    try {
      const res = await fetch(`/meals/${mealId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
    } catch {
      return;
    }

    const groupEl = cardEl.closest(".cs-history-group");
    cardEl.remove();

    const remaining = groupEl.querySelectorAll(".cs-history-meal-card");
    if (remaining.length === 0) {
      groupEl.remove();
      return;
    }

    // Update header totals and count
    const remainingMealIds = [...remaining].map((c) => c.dataset.mealId);
    const updatedMeals = meals.filter((m) => remainingMealIds.includes(m.id));
    const newTotals = sumTotals(updatedMeals);
    const header = groupEl.querySelector(".cs-history-group-header");
    const body = groupEl.querySelector(".cs-history-group-body");
    const label = header.querySelector(".cs-history-date").textContent;
    const newHeader = renderGroupHeader(label, remaining.length, newTotals);
    // Preserve existing collapsed/expanded state when replacing the header
    if (body.hidden) {
      newHeader.setAttribute("aria-expanded", "false");
      newHeader.classList.add("cs-history-group-header--collapsed");
    } else {
      newHeader.setAttribute("aria-expanded", "true");
      newHeader.classList.remove("cs-history-group-header--collapsed");
    }
    attachToggle(newHeader, body);
    header.replaceWith(newHeader);
  };

  for (const [dateKey, dateMeals] of groups) {
    const groupEl = document.createElement("div");
    groupEl.className = "cs-history-group";

    const totals = sumTotals(dateMeals);
    const label = formatDateLabel(dateKey);
    const header = renderGroupHeader(label, dateMeals.length, totals);

    const body = document.createElement("div");
    body.className = "cs-history-group-body";
    body.hidden = true;

    for (const meal of dateMeals) {
      body.appendChild(renderMealCard(meal, handleDelete));
    }

    header.setAttribute("aria-expanded", "false");
    header.classList.add("cs-history-group-header--collapsed");
    attachToggle(header, body);
    groupEl.append(header, body);
    container.appendChild(groupEl);
  }
};
