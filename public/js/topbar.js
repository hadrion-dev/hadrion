/* ============================================================
   HADRION — topbar.js
   Módulo de la barra superior. Solo toggle visual de la bocina.
   No reproduce audio todavía (eso se engancha cuando el chat exista).
   ============================================================ */

export function initTopbar() {
  const btnTts = document.getElementById('btn-tts');
  if (!btnTts) {
    console.warn('[topbar] #btn-tts no existe. Módulo desactivado.');
    return;
  }

  btnTts.addEventListener('click', () => {
    btnTts.classList.toggle('activo');
    const activo = btnTts.classList.contains('activo');
    btnTts.textContent = activo ? '🔊' : '🔇';
    btnTts.setAttribute('aria-label',
      activo ? 'Silenciar lectura de voz' : 'Leer en voz alta');
  });

  console.log('[topbar] módulo cargado');
}
