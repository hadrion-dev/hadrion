/* ============================================================
   HADRION — sidebar.js
   Sidebar: toggle, Nuevo chat, lista persistente y menú por chat
   (pin / download / delete). Acciones reales se agregan después.
   ============================================================ */

const KEY_CHATS = 'hadrion:chats';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cargarChats() {
  try {
    const raw = localStorage.getItem(KEY_CHATS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn('[sidebar] localStorage corrupto, reiniciando');
    return [];
  }
}

function guardarChats(arr) {
  try {
    localStorage.setItem(KEY_CHATS, JSON.stringify(arr));
  } catch (e) {
    console.warn('[sidebar] no se pudo guardar:', e);
  }
}

/* ---------- menú flotante por chat ---------- */

let menuActual = null;   // { el, chatId }

function cerrarMenuActual() {
  if (menuActual && menuActual.el && menuActual.el.parentNode) {
    menuActual.el.parentNode.removeChild(menuActual.el);
  }
  menuActual = null;
}

const ICONS = {
  pin:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 17v5"/>' +
    '<path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>' +
    '</svg>',
  download:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/>' +
    '<line x1="12" y1="15" x2="12" y2="3"/>' +
    '</svg>',
  trash:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="3 6 5 6 21 6"/>' +
    '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
    '<line x1="10" y1="11" x2="10" y2="17"/>' +
    '<line x1="14" y1="11" x2="14" y2="17"/>' +
    '</svg>',
};

function abrirMenu(chat, menuBtn) {
  cerrarMenuActual();

  const menu = document.createElement('div');
  menu.className = 'chat-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML =
    '<button type="button" class="chat-menu-item" data-accion="pin" title="Fijar" role="menuitem">' +
      ICONS.pin +
    '</button>' +
    '<button type="button" class="chat-menu-item" data-accion="download" title="Descargar" role="menuitem">' +
      ICONS.download +
    '</button>' +
    '<button type="button" class="chat-menu-item peligro" data-accion="borrar" title="Borrar" role="menuitem">' +
      ICONS.trash +
    '</button>';

  document.body.appendChild(menu);

  // Posicionar debajo del ⋮, alineado a la derecha
  const rect = menuBtn.getBoundingClientRect();
  const mRect = menu.getBoundingClientRect();
  let top  = rect.bottom + 4;
  let left = rect.right - mRect.width;

  // Si cae fuera por abajo → arriba
  if (top + mRect.height > window.innerHeight - 8) {
    top = rect.top - mRect.height - 4;
  }
  // Si cae fuera por la izquierda → pegado a 8px
  if (left < 8) left = 8;

  menu.style.top  = top  + 'px';
  menu.style.left = left + 'px';

  // Acciones
  menu.querySelectorAll('.chat-menu-item').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const accion = btn.dataset.accion;
      console.log('[sidebar] chat', chat.id, 'accion:', accion);
      // TODO: implementar pin/descargar/borrar en próximo paso
      cerrarMenuActual();
    });
  });

  menuActual = { el: menu, chatId: chat.id };
}

function initMenuGlobal() {
  document.addEventListener('click', (e) => {
    if (!menuActual) return;
    if (menuActual.el.contains(e.target)) return;
    // si el click cae en el botón ⋮ que abrió, no cerrar aquí (lo maneja el toggle)
    if (e.target.closest && e.target.closest('.chat-menu-btn')) return;
    cerrarMenuActual();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarMenuActual();
  });

  window.addEventListener('resize', cerrarMenuActual);
  window.addEventListener('scroll', cerrarMenuActual, true); // capture para sidebar interno
}

/* ---------- init principal ---------- */

export function initSidebar() {
  const sidebar    = document.getElementById('sidebar');
  const btnClose   = document.getElementById('btn-sidebar-close');
  const btnOpen    = document.getElementById('btn-sidebar-open');
  const btnNuevo   = document.getElementById('btn-nuevo-chat');
  const listaChats = document.getElementById('lista-chats');

  if (!sidebar) {
    console.warn('[sidebar] #sidebar no existe. Módulo desactivado.');
    return;
  }

  initMenuGlobal();

  function colapsar() { sidebar.classList.add('colapsado'); }
  function expandir() { sidebar.classList.remove('colapsado'); }
  function toggle()   { sidebar.classList.toggle('colapsado'); }

  function renderItem(chat) {
    const item = document.createElement('div');
    item.className = 'sidebar-chat-item';
    item.dataset.chatId = chat.id;

    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.className = 'chat-main-btn';
    mainBtn.innerHTML =
      '<span class="chat-icono">\u2022</span>' +
      '<span class="chat-titulo">' + escapeHtml(chat.titulo) + '</span>';
    mainBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('hadrion:chat-abrir', {
        detail: { id: chat.id }
      }));
    });

    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'chat-menu-btn';
    menuBtn.setAttribute('aria-label', 'Menu del chat');
    menuBtn.textContent = '\u22EE';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const yaAbierto = menuActual && menuActual.chatId === chat.id;
      if (yaAbierto) cerrarMenuActual();
      else abrirMenu(chat, menuBtn);
    });

    item.appendChild(mainBtn);
    item.appendChild(menuBtn);
    return item;
  }

  function agregarChat(titulo) {
    if (!listaChats) return;
    const chat = {
      id: 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      titulo: (titulo || 'New chat').slice(0, 40),
      ts: Date.now(),
    };
    const chats = cargarChats();
    chats.unshift(chat);
    guardarChats(chats);
    listaChats.prepend(renderItem(chat));
  }

  if (listaChats) {
    const chats = cargarChats();
    chats.forEach((c) => listaChats.appendChild(renderItem(c)));
    console.log('[sidebar]', chats.length, 'chats cargados de localStorage');
  }

  if (btnClose) btnClose.addEventListener('click', colapsar);
  if (btnOpen)  btnOpen.addEventListener('click', toggle);
  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('hadrion:chat-reset'));
    });
  }

  document.addEventListener('hadrion:chat-nuevo', (e) => {
    agregarChat(e && e.detail && e.detail.titulo);
  });

  console.log('[sidebar] módulo cargado');
}
