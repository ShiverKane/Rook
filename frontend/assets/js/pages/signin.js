import { login, signup, updateMe } from "../api.js";
import { setToken } from "../state.js";
import { qs, setStatus } from "../ui.js";

export const init = (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  const route = typeof opts.route === "string" ? opts.route : null;
  const tabSignin = qs("#auth-tab-signin");
  const tabSignup = qs("#auth-tab-signup");
  const title = qs("#auth-title");
  const subtitle = qs("#auth-subtitle");
  const email = qs("#email");
  const password = qs("#password");
  const confirmWrap = qs("#confirm-wrap");
  const confirmPassword = qs("#confirm_password");
  const profileWrap = qs("#profile-wrap");
  const nameInput = qs("#name");
  const avatarInput = qs("#avatar_url");
  const btn = qs("#signin-submit");
  const status = qs("#signin-status");
  if (!email || !password || !btn) {
    return;
  }

  const setTabActive = (el, active) => {
    if (!el) {
      return;
    }
    el.classList.toggle("bg-primary", active);
    el.classList.toggle("text-on-primary", active);
    el.classList.toggle("border-primary/50", active);
    el.classList.toggle("border-outline-variant/30", !active);
    el.classList.toggle("bg-surface-container-low", !active);
    el.classList.toggle("text-on-surface", !active);
  };

  const setMode = (mode, options = {}) => {
    const clearStatus = options.clearStatus !== false;
    const m = mode === "signup" ? "signup" : "signin";
    if (title) {
      title.textContent = m === "signup" ? "Sign up" : "Sign in";
    }
    if (subtitle) {
      subtitle.textContent = m === "signup" ? "Create your account to start listing and messaging." : "Use your account to manage listings and messages.";
    }
    if (confirmWrap) {
      confirmWrap.style.display = m === "signup" ? "" : "none";
    }
    if (profileWrap) {
      profileWrap.style.display = m === "signup" ? "" : "none";
    }
    setTabActive(tabSignin, m === "signin");
    setTabActive(tabSignup, m === "signup");
    btn.dataset.mode = m;
    if (clearStatus) {
      setStatus(status, "");
    }
  };

  const mode = () => (btn?.dataset?.mode === "signup" ? "signup" : "signin");

  const run = async () => {
    setStatus(status, "");
    btn.disabled = true;
    try {
      const emailValue = email.value.trim();
      const passwordValue = password.value;
      if (!emailValue) {
        throw new Error("Vui lòng nhập email.");
      }
      if (!passwordValue) {
        throw new Error("Vui lòng nhập mật khẩu.");
      }

      if (mode() === "signup") {
        const confirmValue = confirmPassword?.value || "";
        if (!confirmValue) {
          throw new Error("Vui lòng xác nhận mật khẩu.");
        }
        if (passwordValue !== confirmValue) {
          throw new Error("Mật khẩu xác nhận không khớp.");
        }
        const data = await signup(emailValue, passwordValue);
        if (data?.access_token) {
          setToken(data.access_token);
          const payload = {
            name: nameInput?.value?.trim() || undefined,
            avatar_url: avatarInput?.value?.trim() || undefined
          };
          try {
            if (payload.name || payload.avatar_url) {
              await updateMe(payload);
            }
          } catch (err) {
            setStatus(status, err?.message || "Đăng ký thành công nhưng lưu profile thất bại.", "error");
          }
          if (!status?.textContent) {
            setStatus(status, "Đăng ký thành công", "success");
          }
          setTimeout(() => {
            if (navigate) {
              navigate("/profile");
              return;
            }
            location.href = "./profile.html";
          }, 300);
        } else {
          try {
            const loginData = await login(emailValue, passwordValue);
            if (loginData?.access_token) {
              setToken(loginData.access_token);
              const payload = {
                name: nameInput?.value?.trim() || undefined,
                avatar_url: avatarInput?.value?.trim() || undefined
              };
              try {
                if (payload.name || payload.avatar_url) {
                  await updateMe(payload);
                }
              } catch (err) {
                setStatus(status, err?.message || "Đăng ký thành công nhưng lưu profile thất bại.", "error");
              }
              if (!status?.textContent) {
                setStatus(status, "Đăng ký thành công", "success");
              }
              setTimeout(() => {
                if (navigate) {
                  navigate("/profile");
                  return;
                }
                location.href = "./profile.html";
              }, 300);
            } else {
              throw new Error("Không thể đăng nhập sau khi đăng ký.");
            }
          } catch (err) {
            const raw = err?.message || "Đăng ký thành công nhưng chưa thể đăng nhập.";
            const msg = /confirm/i.test(raw) ? "Email chưa được xác nhận. Với đồ án, hãy tắt Confirm email trong Supabase Auth settings để đăng ký là dùng được ngay." : raw;
            setStatus(status, msg, "error");
            setMode("signin", { clearStatus: false });
          }
        }
      } else {
        const data = await login(emailValue, passwordValue);
        setToken(data.access_token);
        setStatus(status, "Đăng nhập thành công", "success");
        setTimeout(() => {
          if (navigate) {
            navigate("/profile");
            return;
          }
          location.href = "./profile.html";
        }, 300);
      }
    } catch (e) {
      const raw = e?.message || "Đăng nhập thất bại";
      const msg = /invalid path specified in request url/i.test(raw)
        ? "Sai URL Supabase. ROOK_SUPABASE_REST_URL phải có dạng https://<project>.supabase.co/rest/v1 (hoặc bạn đã set rook_api_base sai trong localStorage)."
        : raw;
      setStatus(status, msg, "error");
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

  if (confirmPassword) {
    confirmPassword.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        run();
      }
    });
  }

  if (tabSignin) {
    tabSignin.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (navigate) {
        navigate("/signin");
        return;
      }
      setMode("signin");
    });
  }
  if (tabSignup) {
    tabSignup.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (navigate) {
        navigate("/signup");
        return;
      }
      setMode("signup");
    });
  }

  const urlMode = new URLSearchParams(location.search || "").get("mode");
  const bodyMode = document.body?.dataset?.authMode || null;
  const initial = (opts.mode || (route === "/signup" ? "signup" : null) || urlMode || bodyMode || "signin").toLowerCase();
  setMode(initial === "signup" ? "signup" : "signin");
};

document.addEventListener("DOMContentLoaded", () => init());
