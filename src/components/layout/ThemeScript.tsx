import { THEME_PREF_KEY } from "@/lib/theme";

/** Applies the stored theme before first paint and skips a repeat splash. */
export function ThemeScript() {
  const script = `
(function(){try{
  var prefs=JSON.parse(localStorage.getItem('${THEME_PREF_KEY}')||'null')||{};
  var mode=prefs.mode!==undefined?prefs.mode:(localStorage.getItem('oblee-mode')||'');
  var allowed=['','dark','glass','min','vibe','xmas'];
  if(allowed.indexOf(mode)>-1&&mode){document.documentElement.setAttribute('data-mode',mode);}
  if(sessionStorage.getItem('oblee-splash')==='1'){document.documentElement.setAttribute('data-splash','seen');}
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
