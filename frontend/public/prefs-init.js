// Sets color scheme, light/dark mode, and language before CSS paints, so the
// page doesn't flash the wrong appearance or language on load. Key names and
// logic mirror src/lib/colorScheme.ts (data-scheme), src/lib/theme.ts
// (data-theme), and src/lib/language.ts (lang) -- keep them in sync.
;(function () {
  try {
    var scheme = localStorage.getItem('formout:color-scheme')
    if (scheme) document.documentElement.setAttribute('data-scheme', scheme)
  } catch (e) {}
  try {
    var theme = localStorage.getItem('formout:theme') || 'system'
    var effective =
      theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme
    document.documentElement.setAttribute('data-theme', effective)
  } catch (e) {}
  try {
    var language = localStorage.getItem('formout:language')
    if (language !== 'sv' && language !== 'en') {
      // No stored preference yet -- fall back to the browser's own language,
      // same idea as the theme's "system" option, just detected once here
      // instead of tracked live (browser language doesn't change mid-session
      // the way OS dark/light mode can).
      var candidates = navigator.languages || [navigator.language || '']
      language = candidates.some(function (lang) {
        return lang.toLowerCase().indexOf('sv') === 0
      })
        ? 'sv'
        : 'en'
    }
    document.documentElement.setAttribute('lang', language)
  } catch (e) {}
})()
