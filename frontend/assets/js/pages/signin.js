import { login } from "../api.js";
import { setToken } from "../state.js";
import { qs, setStatus } from "../ui.js";

export const init = (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  const email = qs("#email");
  const password = qs("#password");
  const btn = qs("#signin-submit");
  const status = qs("#signin-status");
  if (!email || !password || !btn) {
    return;
  }

  const run = async () => {
    setStatus(status, "");
    btn.disabled = true;
    try {
      const data = await login(email.value.trim(), password.value);
      setToken(data.access_token);
      setStatus(status, "Đăng nhập thành công", "success");
      setTimeout(() => {
        if (navigate) {
          navigate("/profile");
          return;
        }
        location.href = "./profile.html";
      }, 300);
    } catch (e) {
      setStatus(status, e.message || "Đăng nhập thất bại", "error");
    } finally {
      btn.disabled = false;
    }
  };

  btn.addEventListener("click", run);
  password.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      run();
    }
  });
};

document.addEventListener("DOMContentLoaded", () => init());
