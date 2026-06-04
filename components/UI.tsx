
import React, { useRef, useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info, Lock, AlertCircle, ChevronDown, Trash2, Edit2, Loader2 } from 'lucide-react';
import { Notification, NotificationType } from '../types';
import { triggerHaptic } from '../utils';

// Card
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={() => {
        if(onClick) {
            triggerHaptic('light');
            onClick();
        }
    }}
    className={`bg-dark-card border border-white/5 rounded-2xl p-4 shadow-sm ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] active:bg-dark-surface transition-all duration-150' : ''}`}
  >
    {children}
  </div>
);

// SWIPEABLE CARD COMPONENT (NATIVE FEEL)
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  isLocked?: boolean; // If true, disable swipe
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({ children, onEdit, onDelete, onClick, isLocked = false }) => {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const MAX_SWIPE = -140; // Space for two buttons (70px each)
  const THRESHOLD = -50;

  // --- UNIFIED HANDLERS (TOUCH & MOUSE) ---

  const handleStart = (clientX: number) => {
    if (isLocked) return;
    startX.current = clientX;
    currentX.current = clientX;
    setIsSwiping(true);
  };

  const handleMove = (clientX: number) => {
    if (isLocked || !isSwiping) return;
    const diff = clientX - startX.current;
    
    // Only allow left swipe
    if (diff < 0) {
       // Clamp value
       const newOffset = Math.max(diff, MAX_SWIPE * 1.2); // allow a bit of resistance overflow
       setOffset(newOffset);
    } else if (diff > 0 && offset < 0) {
       // Closing swipe
       setOffset(Math.min(0, offset + diff));
    }
  };

  const handleEnd = () => {
    setIsSwiping(false);
    if (offset < THRESHOLD) {
      setOffset(MAX_SWIPE); // Snap open
      triggerHaptic('light');
    } else {
      setOffset(0); // Snap close
    }
  };

  // --- TOUCH EVENTS ---
  const handleTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = () => handleEnd();

  // --- MOUSE EVENTS ---
  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const handleMouseMove = (e: React.MouseEvent) => { if (isSwiping) handleMove(e.clientX); };
  const handleMouseUp = () => { if (isSwiping) handleEnd(); };
  const handleMouseLeave = () => { if (isSwiping) handleEnd(); };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 select-none">
      {/* Background Actions */}
      <div className="absolute inset-y-0 right-0 flex w-[140px] z-0">
        {onEdit && (
          <button 
             onClick={(e) => { 
                e.stopPropagation(); 
                setOffset(0); 
                triggerHaptic('medium');
                onEdit(); 
             }}
             className="flex-1 bg-blue-600 flex items-center justify-center text-white"
          >
             <Edit2 size={20} />
          </button>
        )}
        {onDelete && (
          <button 
             onClick={(e) => { 
                e.stopPropagation(); 
                setOffset(0); 
                triggerHaptic('heavy');
                onDelete(); 
             }}
             className="flex-1 bg-red-600 flex items-center justify-center text-white"
          >
             <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Foreground Content */}
      <div
        ref={ref}
        className={`bg-dark-card border border-white/5 relative z-10 p-4 transition-transform duration-300 ease-out ${onClick ? 'active:bg-dark-surface' : ''}`}
        style={{ 
           transform: `translateX(${offset}px)`,
           transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
            if (offset === 0 && onClick) {
                triggerHaptic('light');
                onClick();
            } else {
                setOffset(0); // Tap to close if open
            }
        }}
      >
        {children}
        {/* Swipe Hint */}
        {!isLocked && offset === 0 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-1 bg-white/5 rounded-full opacity-50 flex items-center justify-center">
                <div className="h-full w-full bg-white/20 rounded-full"></div>
            </div>
        )}
      </div>
    </div>
  );
};

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', fullWidth = false, isLoading = false, className = '', onClick, ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-dark-bg hover:bg-primary-glow shadow-[0_0_15px_rgba(6,182,212,0.3)]",
    secondary: "bg-dark-surface text-slate-200 border border-white/5 hover:bg-slate-700",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
    ghost: "bg-transparent text-slate-400 hover:text-white"
  };

  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-3.5 text-sm",
    lg: "px-6 py-4 text-base"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || props.disabled) return;
      triggerHaptic('medium');
      if (onClick) onClick(e);
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={handleClick}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 20} />
      ) : (
        children
      )}
    </button>
  );
};

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, startIcon, className = '', ...props }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const hasValue = props.value !== undefined && props.value !== '';
  const isClearable = hasValue && !props.disabled && !props.readOnly;

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('light');

    if (props.onChange) {
      const event = {
        target: { ...props, value: '' },
        currentTarget: { ...props, value: '' }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      props.onChange(event);
    }
    
    if (inputRef.current) {
        inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-4">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide ml-1">{label}</label>}
      <div className="relative group">
        {startIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {startIcon}
          </div>
        )}
        <input 
          ref={inputRef}
          className={`w-full bg-dark-bg/50 border ${error ? 'border-red-500/50' : 'border-white/10 group-focus-within:border-primary'} rounded-xl ${startIcon ? 'pl-12' : 'pl-4'} pr-10 py-3.5 text-base text-white placeholder-slate-600 focus:ring-0 transition-colors outline-none disabled:opacity-60 ${className}`}
          style={{ fontSize: '16px' }} // Prevent iOS zoom
          {...props}
        />
        {isClearable && (
          <button 
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1.5 rounded-full bg-white/5"
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {error && <span className="text-red-400 text-xs ml-1 flex items-center gap-1"><AlertCircle size={10}/> {error}</span>}
    </div>
  );
};

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="flex flex-col gap-2 mb-4">
    {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide ml-1">{label}</label>}
    <div className="relative group">
      <select 
        className={`w-full appearance-none bg-dark-bg/50 border border-white/10 group-focus-within:border-primary rounded-xl px-4 py-3.5 text-base text-white focus:ring-0 transition-colors outline-none disabled:opacity-60 ${className}`}
        style={{ fontSize: '16px' }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-dark-card text-white py-2">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <ChevronDown size={18} />
      </div>
    </div>
  </div>
);

// Badge
export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'blue' | 'yellow' | 'gray' }> = ({ children, color = 'gray' }) => {
  const colors = {
    green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    yellow: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    gray: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
};

// Bottom Sheet (Native Feel Modal)
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number; // Support for nested sheets
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, footer, zIndex = 100 }) => {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
        setRender(true);
        triggerHaptic('light');
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <div 
      className={`fixed inset-0 flex items-end justify-center backdrop-sheet transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      style={{ zIndex: zIndex }}
      onClick={onClose}
    >
      <div 
        className={`bg-dark-card w-full max-w-lg rounded-t-3xl border-t border-white/10 shadow-2xl flex flex-col max-h-[90vh] ${isOpen ? 'animate-slide-up' : 'animate-slide-down'}`}
        onClick={e => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
           <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 pb-4 pt-2 flex justify-between items-center border-b border-white/5">
           <h2 className="text-lg font-bold text-white">{title}</h2>
           <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
              <X size={18} />
           </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar overscroll-contain">
           {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="p-4 border-t border-white/5 bg-dark-card pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Confirmation Modal (Centered for Alerts)
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  verificationCode?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'primary',
  onConfirm,
  onCancel,
  verificationCode
}) => {
  const [inputCode, setInputCode] = useState('');
  
  useEffect(() => {
    if (isOpen) {
        setInputCode('');
        triggerHaptic('warning');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center backdrop-sheet p-6 animate-fade-in">
      <div className="bg-dark-card w-full max-w-xs rounded-3xl border border-white/10 p-6 shadow-2xl animate-scale-up">
        <div className="flex flex-col items-center text-center">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
            variant === 'danger' ? 'bg-red-500/20 text-red-500' : 
            variant === 'info' ? 'bg-blue-500/20 text-blue-500' :
            'bg-primary/20 text-primary'
          }`}>
            {verificationCode ? <Lock size={24} /> : 
             variant === 'danger' ? <AlertTriangle size={24} /> : 
             variant === 'info' ? <Info size={24} /> :
             <CheckCircle size={24} />}
          </div>
          
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {message}
          </p>

          {verificationCode && (
            <div className="w-full mb-6">
              <p className="text-xs text-slate-500 mb-2">Ketik: <span className="font-bold text-white">{verificationCode}</span></p>
              <input 
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="w-full bg-dark-bg border border-white/20 rounded-xl px-4 py-3 text-center font-bold tracking-[0.2em] text-white focus:border-primary outline-none"
                maxLength={4}
                autoFocus
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button 
              variant={variant === 'danger' ? 'danger' : 'primary'} 
              onClick={onConfirm}
              disabled={!!verificationCode && inputCode !== verificationCode}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Component (Individual)
const ToastItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({ notification, onRemove }) => {
  const [isPaused, setIsPaused] = useState(false);
  const DURATION = notification.type === 'error' || notification.type === 'warning' ? 5000 : 3000;
  
  useEffect(() => {
    let timer: any;
    if (!isPaused) {
      timer = setTimeout(() => {
        onRemove(notification.id);
      }, DURATION);
    }
    return () => clearTimeout(timer);
  }, [notification.id, onRemove, isPaused, DURATION]);

  // Haptic on Mount
  useEffect(() => {
    if (notification.type === 'success') triggerHaptic('success');
    if (notification.type === 'error') triggerHaptic('warning');
  }, []);

  return (
    <div 
      className="pointer-events-auto relative overflow-hidden flex items-center gap-3 w-full max-w-sm rounded-2xl bg-dark-card/90 border border-white/10 backdrop-blur-xl p-4 shadow-xl animate-slide-down cursor-pointer group"
      onClick={() => onRemove(notification.id)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className={`h-2 w-2 rounded-full shrink-0 ${
        notification.type === 'success' ? 'bg-emerald-500' :
        notification.type === 'error' ? 'bg-red-500' :
        notification.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
      }`} />
      
      <p className="text-sm font-medium text-white flex-1">{notification.message}</p>
      
      {/* Timer Progress Bar */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 w-full">
        <div 
          className={`h-full w-full animate-shrink ${
             notification.type === 'success' ? 'bg-emerald-500' :
             notification.type === 'error' ? 'bg-red-500' :
             notification.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ 
            animationDuration: `${DURATION}ms`,
            animationPlayState: isPaused ? 'paused' : 'running'
          }} 
        />
      </div>
    </div>
  );
};

// Toast Container
export const ToastContainer: React.FC<{ notifications: Notification[]; removeNotification: (id: string) => void }> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-0 inset-x-0 z-[120] flex flex-col items-center gap-2 px-4 pt-safe pointer-events-none mt-2">
      {notifications.map(n => (
        <ToastItem key={n.id} notification={n} onRemove={removeNotification} />
      ))}
    </div>
  );
};
