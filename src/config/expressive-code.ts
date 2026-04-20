import type { AstroExpressiveCodeOptions } from "astro-expressive-code";

// Expressive Code configuration — modeled on Starlight's approach.
// See Section 12 of plans/implementation.md.
export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
  themes: ["night-owl", "github-light"],
  themeCssSelector: (theme) =>
    `[data-theme='${theme.type === "dark" ? "dark" : "light"}']`,
  useThemedScrollbars: true,
  useThemedSelectionColors: true,
  cascadeLayer: "components",
  styleOverrides: {
    codeFontFamily: "var(--font-mono)",
    uiFontFamily: "var(--font-body)",
    codeFontSize: "var(--ec-code-font-size)",
    codeLineHeight: "var(--ec-code-line-height)",
    borderRadius: "var(--ec-frame-radius)",
    borderColor: "var(--ec-frame-border)",
    frames: {
      frameBoxShadowCssValue: "none",
      editorActiveTabIndicatorTopColor: "var(--ec-tab-accent)",
      editorActiveTabIndicatorBottomColor: "transparent",
      editorTabBarBackground: "var(--ec-frame-bg)",
      editorBackground: "var(--ec-frame-bg)",
      terminalTitlebarBackground: "var(--ec-frame-bg)",
      terminalBackground: "var(--ec-frame-bg)",
    },
    scrollbarThumbColor: "var(--ec-scrollbar-thumb)",
    scrollbarThumbHoverColor: "var(--ec-scrollbar-thumb)",
  },
  customizeTheme: (theme) => {
    // Ensure EC's own chrome uses our tokens; code token colors still come from
    // the syntax theme, so only the frame integrates with the site.
    theme.colors["editor.background"] = "var(--ec-frame-bg)";
    return theme;
  },
  getBlockLocale: ({ file }) => {
    // Astro page locale lives in the file path: .../[lang]/...
    const match = file.url?.pathname.match(/\/(en|ja)\//);
    return match?.[1] ?? "en";
  },
};
