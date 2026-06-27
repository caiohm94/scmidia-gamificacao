import type { CampaignTheme } from '@/types/database'

/**
 * Converts a CampaignTheme object into an inline CSS string suitable for
 * use in a `style` attribute or a `<style>` tag `:root {}` block.
 *
 * Defaults fall back to the Missão Hexa / Brazilian flag palette.
 */
export function themeToCSS(theme: CampaignTheme): string {
  return `
    --color-primary: ${theme.primary ?? '#009C3B'};
    --color-secondary: ${theme.secondary ?? '#FFDF00'};
    --color-accent: ${theme.accent ?? '#FFFFFF'};
    --color-dark: ${theme.dark ?? '#002776'};
  `.trim()
}
