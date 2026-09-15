// Clerk reads our CSS variables, so the sign-in card follows light and dark mode.
// Newer and older variable names are both given; Clerk ignores the ones it doesn't know.
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--solid)",
    colorPrimaryForeground: "var(--on-solid)",
    colorBackground: "var(--surface)",
    colorForeground: "var(--ink)",
    colorText: "var(--ink)",
    colorMutedForeground: "var(--ink-3)",
    colorTextSecondary: "var(--ink-3)",
    colorInput: "var(--surface)",
    colorInputBackground: "var(--surface)",
    colorInputForeground: "var(--ink)",
    colorInputText: "var(--ink)",
    colorNeutral: "var(--ink)",
    colorBorder: "var(--line-2)",
    colorDanger: "var(--danger)",
    borderRadius: "8px",
    fontFamily: "var(--font)",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: {
      width: "100%",
      boxShadow: "0 0 0 1px var(--line)",
      borderRadius: "12px",
    },
  },
};
