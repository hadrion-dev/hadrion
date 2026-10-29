/* ============================================================
   HADRION — composer.js
   Área de escritura: toggle del micro, adjuntar imágenes,
   preview, gestión del botón Send/Stop.
   Expone una API al chat.js para obtener/limpiar la imagen.
   ============================================================ */

export function initComposer() {
  const btnMic       = document.getElementById('btn-micro');
  const btnAttach    = document.getElementById('btn-adjuntar');
  const input        = document.getElementById('input-mensaje');
  const btnEnviar    = document.getElementById('btn-enviar');
  const fileInput    = document.getElementById('input-archivo');
  const preview      = document.getElementById('preview-adjunto');
  const previewImg   = document.getElementById('preview-img');
  const previewNom   = document.getElementById('preview-nombre');
  const btnQuitar    = document.getElementById('btn-preview-quitar');

  let adjunto = null;   // { dataUrl, base64, mime, nombre }

  // --- toggle visual del micro ---
  if (btnMic) {
    btnMic.addEventListener('click', () => {
      btnMic.classList.toggle('activo');
      const activo = btnMic.classList.contains('activo');
      btnMic.setAttribute('aria-label',
        activo ? 'Detener dictado' : 'Dictar por voz');
    });
  }

  // --- abrir file picker ---
  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) {
        alert('Solo se permiten imágenes.');
        return;
      }
      if (f.size > 20 * 1024 * 1024) {
        alert('Máximo 20 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        adjunto = {
          dataUrl,
          base64: dataUrl.split(',')[1],
          mime: f.type,
          nombre: f.name,
        };
        previewImg.src = dataUrl;
        previewNom.textContent = f.name;
        preview.hidden = false;
        fileInput.value = '';
        input.focus();
        refrescarBotonEnviar();
      };
      reader.readAsDataURL(f);
    });
  }

  // --- quitar preview ---
  if (btnQuitar) {
    btnQuitar.addEventListener('click', () => {
      adjunto = null;
      preview.hidden = true;
      previewImg.src = '';
      previewNom.textContent = '';
      refrescarBotonEnviar();
    });
  }

  // --- estado del botón enviar ---
  function refrescarBotonEnviar() {
    if (!btnEnviar) return;
    if (btnEnviar.dataset.estado === 'enviando') return;  // respeta stop
    btnEnviar.disabled = !(input.value.trim() || adjunto);
  }

  if (input) input.addEventListener('input', refrescarBotonEnviar);
  if (btnEnviar) refrescarBotonEnviar();

  console.log('[composer] módulo cargado');

  // API hacia chat.js
  return {
    getAdjunto: () => adjunto,
    limpiarAdjunto: () => {
      adjunto = null;
      if (preview) preview.hidden = true;
      if (previewImg) previewImg.src = '';
      if (previewNom) previewNom.textContent = '';
    },
    getTexto: () => (input ? input.value : ''),
    limpiarTexto: () => { if (input) input.value = ''; },
    refrescar: refrescarBotonEnviar,
    input,
    btnEnviar,
  };
}
