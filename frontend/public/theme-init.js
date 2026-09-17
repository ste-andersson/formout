// Sätter färgschema och ljust/mörkt läge innan CSS:n målas upp, så sidan
// inte flimrar till fel utseende vid laddning. Nyckelnamnen och logiken
// speglar src/lib/colorScheme.ts (data-scheme) och src/lib/theme.ts
// (data-theme) -- håll dem i synk.
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
})()
