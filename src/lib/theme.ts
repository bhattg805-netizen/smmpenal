export const themeDefinitions: Record<string, Record<string, string>> = {
  default: {
    '--theme-bg': '#030712',
    '--theme-card-bg': 'rgba(17, 24, 39, 0.7)',
    '--theme-primary': '#2563eb',
    '--theme-accent': '#7c3aed',
    '--theme-text': '#f3f4f6',
    '--theme-border': 'rgba(255, 255, 255, 0.05)',
    '--theme-glow-color': 'rgba(99, 102, 241, 0.15)',
  },
  eternal: {
    '--theme-bg': '#090314',
    '--theme-card-bg': 'rgba(24, 12, 45, 0.75)',
    '--theme-primary': '#a855f7',
    '--theme-accent': '#ec4899',
    '--theme-text': '#f8fafc',
    '--theme-border': 'rgba(168, 85, 247, 0.15)',
    '--theme-glow-color': 'rgba(168, 85, 247, 0.2)',
  },
  grace: {
    '--theme-bg': '#110208',
    '--theme-card-bg': 'rgba(38, 8, 18, 0.75)',
    '--theme-primary': '#f43f5e',
    '--theme-accent': '#fda4af',
    '--theme-text': '#fff1f2',
    '--theme-border': 'rgba(244, 63, 94, 0.15)',
    '--theme-glow-color': 'rgba(244, 63, 94, 0.2)',
  },
  candid: {
    '--theme-bg': '#020a06',
    '--theme-card-bg': 'rgba(10, 26, 18, 0.75)',
    '--theme-primary': '#10b981',
    '--theme-accent': '#f59e0b',
    '--theme-text': '#ecfdf5',
    '--theme-border': 'rgba(16, 185, 129, 0.15)',
    '--theme-glow-color': 'rgba(16, 185, 129, 0.2)',
  },
  light: {
    '--theme-bg': '#f8fafc',
    '--theme-card-bg': 'rgba(255, 255, 255, 0.9)',
    '--theme-primary': '#4f46e5',
    '--theme-accent': '#7c3aed',
    '--theme-text': '#1e293b',
    '--theme-border': 'rgba(15, 23, 42, 0.08)',
    '--theme-glow-color': 'rgba(79, 70, 229, 0.05)',
  }
};

export function applyThemeVariables(themeId: string) {
  const normalizedId = themeId === 'eteral' ? 'eternal' : themeId;
  const active = themeDefinitions[normalizedId] || themeDefinitions.default;
  Object.entries(active).forEach(([key, val]) => {
    document.documentElement.style.setProperty(key, val);
  });
  document.documentElement.setAttribute('data-theme', normalizedId);
}
