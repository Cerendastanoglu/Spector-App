import React from 'react';

interface EnhancedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'reorder';
  disabled?: boolean;
  className?: string;
}

export function EnhancedButton({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  disabled = false,
  className = ''
}: EnhancedButtonProps) {
  const baseClasses = {
    primary: 'primary-button',
    secondary: 'secondary-button',
    reorder: 'reorder-button'
  };

  const buttonClass = `${baseClasses[variant]} ${className}`.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClass}
    >
      {children}
    </button>
  );
}

interface EnhancedCardProps {
  children: React.ReactNode;
  variant?: 'enhanced' | 'glass';
  className?: string;
  animate?: boolean;
}

export function EnhancedCard({ 
  children, 
  variant = 'enhanced', 
  className = '',
  animate = false 
}: EnhancedCardProps) {
  const baseClasses = {
    enhanced: 'enhanced-card',
    glass: 'glass-card'
  };

  const animationClass = animate ? 'fade-in' : '';
  const cardClass = `${baseClasses[variant]} ${animationClass} ${className}`.trim();

  return (
    <div className={cardClass}>
      {children}
    </div>
  );
}

interface EnhancedBadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'critical';
  className?: string;
}

export function EnhancedBadge({ 
  children, 
  variant = 'success', 
  className = '' 
}: EnhancedBadgeProps) {
  const variantClass = variant !== 'success' ? variant : '';
  const badgeClass = `enhanced-badge ${variantClass} ${className}`.trim();

  return (
    <span className={badgeClass}>
      {children}
    </span>
  );
}
