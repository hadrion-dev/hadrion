/* ============================================================
   HADRION — main.js
   Entry point. Orquesta el arranque de todos los módulos.
   ============================================================ */

import { initSidebar }  from './sidebar.js?v=3';
import { initTopbar }   from './topbar.js?v=3';
import { initComposer } from './composer.js?v=3';
import { initChat }     from './chat.js?v=3';

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initTopbar();

  const composer = initComposer();
  initChat(composer);
});
