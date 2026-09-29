// src/components/PublicPagesFooter.jsx
//
// Rodapé de navegação compartilhado entre as páginas públicas (Landing,
// Sobre, Termos, Privacidade, Perfil Público). Usa <Link> do react-router —
// pro crawler do Google não faz diferença nenhuma em relação a um <a href>
// cru (os dois compilam pro mesmo <a href> no HTML final), mas pro usuário
// real clicando é navegação client-side, sem reload de página.
//
// current: qual página está montando o rodapé, pra não mostrar link pra
// ela mesma (ex: na página de Termos, não faz sentido linkar "Termos de
// uso" de novo).

import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/', key: 'home', label: 'Início' },
  { to: '/sobre', key: 'sobre', label: 'Sobre' },
  { to: '/termos', key: 'termos', label: 'Termos de uso' },
  { to: '/privacidade', key: 'privacidade', label: 'Privacidade' },
];

export function PublicPagesFooter({ current, className = '' }) {
  const visible = LINKS.filter((l) => l.key !== current);

  return (
    <nav
      aria-label="Navegação entre páginas públicas"
      className={`flex justify-center flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-text-mid pt-2 ${className}`}
    >
      {visible.map((l) => (
        <Link key={l.key} to={l.to} className="hover:text-cyan-electric transition-colors">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export default PublicPagesFooter;
