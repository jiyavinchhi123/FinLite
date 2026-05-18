const normalize = (value) => String(value || "").trim();

const unique = (items) => {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    const val = normalize(item);
    const key = val.toLowerCase();
    if (!val || seen.has(key)) return;
    seen.add(key);
    out.push(val);
  });
  return out;
};

const getKey = (companyId, type) =>
  `sbfm_custom_categories_${companyId || "global"}_${type}`;

export const getCustomCategories = (companyId, type) => {
  try {
    const raw = localStorage.getItem(getKey(companyId, type));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? unique(parsed) : [];
  } catch {
    return [];
  }
};

export const getCategoryOptions = (baseCategories, companyId, type) =>
  unique([...(baseCategories || []), ...getCustomCategories(companyId, type)]);

export const addCustomCategory = (companyId, type, category) => {
  const nextCategory = normalize(category);
  if (!nextCategory) return [];
  const existing = getCustomCategories(companyId, type);
  const next = unique([...existing, nextCategory]);
  localStorage.setItem(getKey(companyId, type), JSON.stringify(next));
  return next;
};

export const findCategoryInText = (text, categories) => {
  const normalizedText = normalize(text).toLowerCase();
  if (!normalizedText) return "";
  const sorted = [...(categories || [])]
    .map((c) => normalize(c))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const category of sorted) {
    const pattern = category.toLowerCase();
    if (normalizedText.includes(pattern)) {
      return category;
    }
  }
  return "";
};
