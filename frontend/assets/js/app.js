export const getInitial = (name) => {
  const n = (name || "").trim();
  return n ? n[0].toUpperCase() : "?";
};

export const initAvatars = () => {
  const nodes = document.querySelectorAll("[data-avatar]");
  for (const node of nodes) {
    const name = node.getAttribute("data-avatar-name") || "";
    const url = (node.getAttribute("data-avatar-url") || "").trim();
    const img = node.querySelector("[data-avatar-img]");
    const fallback = node.querySelector("[data-avatar-fallback]");
    if (fallback) {
      fallback.textContent = getInitial(name);
    }
    if (!img) {
      continue;
    }
    if (!url) {
      img.style.display = "none";
      if (fallback) {
        fallback.style.display = "flex";
      }
      continue;
    }
    img.src = url;
    img.onload = () => {
      img.style.display = "block";
      if (fallback) {
        fallback.style.display = "none";
      }
    };
    img.onerror = () => {
      img.style.display = "none";
      if (fallback) {
        fallback.style.display = "flex";
      }
    };
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initAvatars();
});
