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
        throw new Error("Please enter your email.");
      }
      if (!passwordValue) {
        throw new Error("Please enter your password.");
      }

      if (mode() === "signup") {
        const confirmValue = confirmPassword?.value || "";
        if (!confirmValue) {
          throw new Error("Please confirm your password.");
        }
        if (passwordValue !== confirmValue) {
          throw new Error("Passwords do not match.");
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
            setStatus(status, err?.message || "Sign up succeeded, but saving profile failed.", "error");
          }
          if (!status?.textContent) {
            setStatus(status, "Sign up successful.", "success");
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
                setStatus(status, err?.message || "Sign up succeeded, but saving profile failed.", "error");
              }
              if (!status?.textContent) {
                setStatus(status, "Sign up successful.", "success");
              }
              setTimeout(() => {
                if (navigate) {
                  navigate("/profile");
                  return;
                }
                location.href = "./profile.html";
              }, 300);
            } else {
              throw new Error("Couldn't sign in after sign up.");
            }
          } catch (err) {
            const raw = err?.message || "Sign up succeeded, but couldn't sign in yet.";
            const msg = /confirm/i.test(raw) ? "Your email is not confirmed. For this project, disable email confirmation in Supabase Auth settings to allow immediate sign-in." : raw;
            setStatus(status, msg, "error");
            setMode("signin", { clearStatus: false });
          }
        }
      } else {
        const data = await login(emailValue, passwordValue);
        setToken(data.access_token);
        setStatus(status, "Signed in.", "success");
        setTimeout(() => {
          if (navigate) {
            navigate("/profile");
            return;
          }
          location.href = "./profile.html";
        }, 300);
      }
    } catch (e) {
      const raw = e?.message || "Sign in failed.";
      const msg = /invalid path specified in request url/i.test(raw)
        ? "Invalid Supabase URL. ROOK_SUPABASE_REST_URL must look like https://<project>.supabase.co/rest/v1 (or rook_api_base is set incorrectly in localStorage)."
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
