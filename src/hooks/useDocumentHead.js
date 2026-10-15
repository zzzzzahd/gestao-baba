// src/hooks/useDocumentHead.js
// Ajusta <title>, meta description, canonical, Open Graph e JSON-LD no cliente
// (navegação SPA). O HTML estático dos guias vem do prerender; este hook só
// mantém o <head> coerente quando a pessoa chega aqui navegando pelo app.
// Ao desmontar, restaura o que estava antes e remove o JSON-LD.

import { useEffect } from 'react';

const JSONLD_ID = 'dp-jsonld';

const upsertMeta = (attr, key, content, undo) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
    undo.push(() => el.remove());
  } else {
    const prev = el.getAttribute('content');
    undo.push(() => el.setAttribute('content', prev ?? ''));
  }
  el.setAttribute('content', content);
};

const upsertCanonical = (href, undo) => {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
    undo.push(() => el.remove());
  } else {
    const prev = el.getAttribute('href');
    undo.push(() => el.setAttribute('href', prev ?? ''));
  }
  el.setAttribute('href', href);
};

export default function useDocumentHead(config) {
  // Serializa pra não reexecutar o efeito a cada render com objeto novo.
  const key = config ? JSON.stringify(config) : '';

  useEffect(() => {
    if (!config) return undefined;
    const undo = [];
    const prevTitle = document.title;
    const { title, description, canonical, ogType = 'website', jsonLd } = config;

    if (title) {
      document.title = title;
      undo.push(() => { document.title = prevTitle; });
      upsertMeta('property', 'og:title', title, undo);
      upsertMeta('name', 'twitter:title', title, undo);
    }
    if (description) {
      upsertMeta('name', 'description', description, undo);
      upsertMeta('property', 'og:description', description, undo);
      upsertMeta('name', 'twitter:description', description, undo);
    }
    if (canonical) {
      upsertCanonical(canonical, undo);
      upsertMeta('property', 'og:url', canonical, undo);
    }
    upsertMeta('property', 'og:type', ogType, undo);

    if (jsonLd) {
      const old = document.getElementById(JSONLD_ID);
      if (old) old.remove();
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = JSONLD_ID;
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
      undo.push(() => script.remove());
    }

    return () => { undo.reverse().forEach((fn) => fn()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
