/* ============================================================
   HADRION — chat.js
   Envío vía proxy /api/chat (mismo origen), streaming SSE,
   timeout 30s, cancelar con Stop, y disparo de eventos para
   que el sidebar se entere cuando arranca un chat.
   ============================================================ */

const MODELO = 'ornith';
const TIMEOUT_MS = 30000;

export function initChat(composer) {
  const msgsInner = document.getElementById('msgs-inner');
  const btnEnviar = composer.btnEnviar;
  const input     = composer.input;

  if (!msgsInner || !btnEnviar || !input) {
    console.warn('[chat] faltan elementos clave. Módulo desactivado.');
    return;
  }

  let history = [];
  let abortCtrl = null;
  let enviando = false;

  function scrollBottom() {
    const box = document.getElementById('msgs');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function addBurbuja(role, texto) {
    const w = document.getElementById('welcome');
    if (w) w.remove();
    const row = document.createElement('div');
    row.className = 'msg-row ' + role;
    const b = document.createElement('div');
    b.className = 'msg ' + role;
    if (role === 'asst' && !texto) b.classList.add('thinking');
    else b.textContent = texto || '';
    row.appendChild(b);
    msgsInner.appendChild(row);
    scrollBottom();
    return b;
  }

  function setEstadoEnviando() {
    enviando = true;
    btnEnviar.dataset.estado = 'enviando';
    btnEnviar.textContent = 'Stop';
    btnEnviar.disabled = false;
    btnEnviar.classList.add('stop');
  }

  function setEstadoListo() {
    enviando = false;
    delete btnEnviar.dataset.estado;
    btnEnviar.textContent = 'Send';
    btnEnviar.classList.remove('stop');
    composer.refrescar();
  }

  function limpiarVisualYHistory() {
    history = [];
    if (abortCtrl) {
      try { abortCtrl.abort('reset'); } catch (e) {}
      abortCtrl = null;
    }
    msgsInner.innerHTML = '';
    const w = document.createElement('div');
    w.id = 'welcome';
    w.innerHTML =
      '<div class="welcome-big">Hello 👋</div>' +
      '<div class="welcome-sub">How can I help you today?</div>';
    msgsInner.appendChild(w);
    setEstadoListo();
  }

  async function enviar() {
    const texto = composer.getTexto().trim();
    const adjunto = composer.getAdjunto();
    if (!texto && !adjunto) return;

    const esNuevo = history.length === 0;

    // contenido del turno del usuario
    let contenido;
    if (adjunto) {
      contenido = [];
      if (texto) contenido.push({ type: 'text', text: texto });
      contenido.push({
        type: 'image_url',
        image_url: { url: 'data:' + adjunto.mime + ';base64,' + adjunto.base64 }
      });
    } else {
      contenido = texto;
    }

    history.push({ role: 'user', content: contenido });

    // si es el primer mensaje, avisar al sidebar
    if (esNuevo) {
      document.dispatchEvent(new CustomEvent('hadrion:chat-nuevo', {
        detail: { titulo: (texto || 'Imagen').slice(0, 40) }
      }));
    }

    const userBubble = addBurbuja('user', texto || '(imagen)');
    if (adjunto) {
      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = adjunto.dataUrl;
      userBubble.appendChild(img);
    }

    composer.limpiarTexto();
    composer.limpiarAdjunto();

    const asstBubble = addBurbuja('asst', '');

    abortCtrl = new AbortController();
    setEstadoEnviando();

    let full = '';
    let timeoutId = null;
    let primerChunk = false;

    timeoutId = setTimeout(() => {
      if (!primerChunk && abortCtrl) abortCtrl.abort('timeout');
    }, TIMEOUT_MS);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODELO, messages: history, stream: true }),
        signal: abortCtrl.signal,
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (!res.body) throw new Error('sin body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!primerChunk) { primerChunk = true; clearTimeout(timeoutId); }

        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const j = JSON.parse(payload);
            const delta =
              j && j.choices && j.choices[0] && j.choices[0].delta &&
              j.choices[0].delta.content;
            if (delta) {
              full += delta;
              asstBubble.classList.remove('thinking');
              asstBubble.textContent = full;
              scrollBottom();
            }
          } catch (e) {}
        }
      }

      if (!full) {
        asstBubble.classList.remove('thinking');
        asstBubble.textContent = '(respuesta vacía)';
      }
      history.push({ role: 'assistant', content: full });
    } catch (e) {
      clearTimeout(timeoutId);
      asstBubble.classList.remove('thinking');
      if (e && e.name === 'AbortError') {
        if (!primerChunk) {
          asstBubble.textContent = 'Error 404: sin respuesta en 30 segundos';
        } else {
          asstBubble.textContent = full || '(cancelado)';
          if (full) history.push({ role: 'assistant', content: full });
        }
      } else {
        asstBubble.textContent = 'Error: ' + (e.message || 'desconocido');
      }
    } finally {
      abortCtrl = null;
      clearTimeout(timeoutId);
      setEstadoListo();
      input.focus();
    }
  }

  btnEnviar.addEventListener('click', () => {
    if (enviando) { if (abortCtrl) abortCtrl.abort('manual'); }
    else enviar();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!enviando) enviar();
    }
  });

  document.addEventListener('hadrion:chat-reset', limpiarVisualYHistory);

  console.log('[chat] módulo cargado');
}
