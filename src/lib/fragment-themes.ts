import type { ThemeRegistrationRaw } from 'shiki';

interface FragmentPalette {
  readonly ink: string;
  readonly muted: string;
  readonly faint: string;
  readonly panel: string;
}

// Shiki colours at build time, so it needs the literal values of the tokens in src/styles/tokens.css.
const darkPalette: FragmentPalette = {
  ink: '#ece7dc',
  muted: '#a8a398',
  faint: '#8f8a80',
  panel: '#17191c',
};

const lightPalette: FragmentPalette = {
  ink: '#1c1b18',
  muted: '#5b5953',
  faint: '#6f6b63',
  panel: '#faf8f2',
};

// A fragment has no state, so it carries no hue: ink for code, muted for what frames it, faint for
// literal text, and italics where the language itself speaks.
const fragmentTheme = (
  name: string,
  type: 'light' | 'dark',
  palette: FragmentPalette,
): ThemeRegistrationRaw => ({
  name,
  type,
  colors: {
    'editor.background': palette.panel,
    'editor.foreground': palette.ink,
  },
  settings: [
    { settings: { foreground: palette.ink, background: palette.panel } },
    {
      scope: ['comment', 'punctuation.definition.comment', 'punctuation'],
      settings: { foreground: palette.muted },
    },
    {
      scope: ['string', 'punctuation.definition.string'],
      settings: { foreground: palette.faint },
    },
    { scope: ['keyword', 'storage'], settings: { foreground: palette.ink, fontStyle: 'italic' } },
    { scope: ['keyword.operator'], settings: { foreground: palette.ink, fontStyle: '' } },
  ],
});

export const fragmentThemes = {
  light: fragmentTheme('fragment-light', 'light', lightPalette),
  dark: fragmentTheme('fragment-dark', 'dark', darkPalette),
};
