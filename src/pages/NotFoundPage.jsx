import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    return () => {
      if (meta.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-6">
        <p className="text-6xl font-black text-cyan-electric">404</p>

        <div className="space-y-2">
          <h1 className="text-lg font-black">
            Essa página não existe
          </h1>

          <p className="text-sm text-text-mid font-bold leading-relaxed">
            O link pode estar quebrado, desatualizado, ou a página pode ter
            sido removida.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="bg-cyan-electric text-black font-black text-xs uppercase py-3 rounded-xl"
          >
            Ir pra página inicial
          </Link>

          <Link
            to="/sobre"
            className="text-cyan-electric text-xs font-black uppercase underline"
          >
            Saiba o que é o Draft Play
          </Link>
        </div>
      </div>
    </div>
  );
}
