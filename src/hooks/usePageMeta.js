// src/hooks/usePageMeta.js
// Atualiza <title> e meta description na navegação client-side (o HTML
// pré-renderizado já traz os valores certos para rastreadores; isto cobre quem
// navega dentro do app sem recarregar).
import { useEffect } from 'react';

export function usePageMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      const el = document.querySelector('meta[name="description"]');
      if (el) el.setAttribute('content', description);
    }
  }, [title, description]);
}

export default usePageMeta;
