export const qs = (sel) => document.querySelector(sel);
export const qsa = (sel) => Array.from(document.querySelectorAll(sel));

export const setText = (el, text) => {
  if (!el) {
    return;
  }
  el.textContent = text ?? "";
};

export const fmtVnd = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "";
  }
  return new Intl.NumberFormat("vi-VN").format(num);
};

export const fmtDateTime = (iso) => {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toLocaleString("vi-VN");
};

export const setStatus = (el, message, kind = "info") => {
  if (!el) {
    return;
  }
  el.style.display = message ? "block" : "none";
  el.textContent = message || "";
  const map = {
    info: "text-on-surface-variant",
    success: "text-primary",
    error: "text-error"
  };
  el.className = `text-[12px] mt-3 ${map[kind] || map.info}`;
};
