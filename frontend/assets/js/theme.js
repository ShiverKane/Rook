tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-error-container": "#93000a",
        "outline-variant": "#bfcaba",
        "on-tertiary-container": "#e8f5e9",
        "on-error": "#ffffff",
        "surface-container-highest": "#e1e3df",
        "on-secondary-fixed-variant": "#334d37",
        "error-container": "#ffdad6",
        "inverse-on-surface": "#eff1ed",
        "surface-container": "#eceeeb",
        "primary-fixed-dim": "#88d982",
        "on-primary": "#ffffff",
        "tertiary-fixed": "#d9e6da",
        "surface-dim": "#d8dbd7",
        "inverse-primary": "#88d982",
        "secondary-container": "#c9e7ca",
        "on-secondary": "#ffffff",
        "secondary-fixed": "#cceacd",
        "inverse-surface": "#2e312f",
        "surface-container-low": "#f2f4f0",
        "primary-container": "#2e7d32",
        "tertiary-fixed-dim": "#bdcabe",
        "primary-fixed": "#a3f69c",
        "tertiary-container": "#657167",
        secondary: "#4a654e",
        "surface-bright": "#f8faf6",
        background: "#f8faf6",
        "on-primary-container": "#cbffc2",
        primary: "#0d631b",
        "on-tertiary-fixed-variant": "#3e4a41",
        "surface-container-high": "#e7e9e5",
        "on-surface-variant": "#40493d",
        error: "#ba1a1a",
        "surface-tint": "#1b6d24",
        surface: "#f8faf6",
        "surface-variant": "#e1e3df",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-fixed": "#131e17",
        "on-tertiary": "#ffffff",
        "on-primary-fixed-variant": "#005312",
        "on-surface": "#191c1a",
        "on-primary-fixed": "#002204",
        "secondary-fixed-dim": "#b1ceb2",
        outline: "#707a6c",
        "on-secondary-container": "#4e6952",
        tertiary: "#4d5950",
        "on-secondary-fixed": "#07200e",
        "on-background": "#191c1a"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      spacing: {
        "margin-page": "40px",
        "container-max": "1280px",
        unit: "8px",
        gutter: "24px",
        "stack-sm": "12px",
        "stack-lg": "48px",
        "stack-md": "24px"
      },
      fontFamily: {
        "headline-md": ["Newsreader"],
        "body-md": ["Inter"],
        "display-lg": ["Newsreader"],
        "headline-lg": ["Newsreader"],
        "label-md": ["Inter"],
        "body-lg": ["Inter"]
      },
      fontSize: {
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "500" }],
        "label-md": ["14px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }]
      }
    }
  }
};
