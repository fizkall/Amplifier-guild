export const THEME_KEY = 'ag-theme';
export const SIZE_KEY = 'ag-size';

/** Sayfa çizilmeden önce çalışan betik (layout <head>): tema yanıp sönmesini önler. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;var s=localStorage.getItem('${SIZE_KEY}');if(s==='large')document.documentElement.dataset.size=s;}catch(e){}`;
