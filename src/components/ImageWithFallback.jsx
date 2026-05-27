// src/components/ImageWithFallback.jsx
// Sprint 8 — Imagem com lazy loading, fallback e skeleton placeholder.

import React, { useState, useRef, useEffect } from 'react';

const ImageWithFallback = ({
  src,
  alt = '',
  fallback = null,       // componente JSX de fallback (ex: iniciais)
  className = '',
  skeletonClassName = '',
  eager = false,         // true = carrega imediatamente (above the fold)
  onLoad,
}) => {
  const [status, setStatus]   = useState('loading'); // 'loading' | 'loaded' | 'error'
  const [inView, setInView]   = useState(eager);
  const imgRef                = useRef(null);

  // Intersection Observer para lazy load
  useEffect(() => {
    if (eager || !imgRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: '100px' }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [eager]);

  // Reset quando src muda
  useEffect(() => {
    setStatus('loading');
  }, [src]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Skeleton */}
      {status === 'loading' && (
        <div className={`absolute inset-0 animate-pulse bg-surface-2 ${skeletonClassName}`} />
      )}

      {/* Fallback em caso de erro */}
      {(status === 'error' || !src) && fallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}

      {/* Imagem real */}
      {inView && src && (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => { setStatus('loaded'); onLoad?.(); }}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
};

export default ImageWithFallback;
