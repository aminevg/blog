import type { AstroExpressiveCodeOptions } from "astro-expressive-code";

// Expressive Code configuration. Rose Pine Dawn on cream paper, Rose Pine
// Moon for the system-dark variant. Frame tokens pinned to the Tufte palette.
export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
  themes: ["rose-pine-dawn", "rose-pine-moon"],
  // Rely on the default `prefers-color-scheme` media query; disable the
  // manual theme selector since the site has no toggle.
  themeCssSelector: false,
  useThemedScrollbars: true,
  useThemedSelectionColors: true,
  cascadeLayer: "components",
  styleOverrides: {
    borderColor: "var(--color-rule)",
    borderRadius: "2px",
    borderWidth: "1px",
    codeBackground: "var(--color-surface)",
    codeFontFamily: "var(--font-mono)",
    codeFontSize: "0.9rem",
    codeLineHeight: "1.55",
    uiFontFamily: "var(--font-sans)",
    uiFontSize: "0.72rem",
    uiFontWeight: "500",
    frames: {
      frameBoxShadowCssValue: "none",
      editorActiveTabIndicatorTopColor: "var(--color-accent)",
      editorActiveTabIndicatorBottomColor: "transparent",
      editorTabBarBackground: "var(--color-surface)",
      editorBackground: "var(--color-surface)",
      terminalTitlebarBackground: "var(--color-surface)",
      terminalBackground: "var(--color-surface)",
    },
  },
  getBlockLocale: ({ file }) => {
    const match = file.url?.pathname.match(/\/(en|ja)\//);
    return match?.[1] ?? "en";
  },
};
