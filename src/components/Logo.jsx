import React from 'react';

const Logo = ({ size = 'large' }) => {
  const sizes = {
    large: 'w-72',
    small: 'w-40'
  };

  return (
    <div className="flex flex-col items-center text-center">

      <img
        src="/logo.png"
        alt="Draft Play Logo"
        className={`${sizes[size]} object-contain`}
      />

    </div>
  );
};

export default Logo;
