import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-bold shadow-md transform active:scale-95 transition-all duration-150 border-b-4";
  
  const variants = {
    primary: "bg-red-600 text-white border-red-800 hover:bg-red-500",
    secondary: "bg-blue-600 text-white border-blue-800 hover:bg-blue-500",
    danger: "bg-gray-600 text-white border-gray-800 hover:bg-gray-500",
    gold: "bg-yellow-400 text-red-900 border-yellow-600 hover:bg-yellow-300",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};