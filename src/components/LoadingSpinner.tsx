import React from 'react';

interface LoadingSpinnerProps {
  /** Se true, mostra un overlay fullscreen semitrasparente */
  overlay?: boolean;
  /** Dimensione dello spinner in px (default 40) */
  size?: number;
  /** Messaggio opzionale sotto lo spinner */
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  overlay = false,
  size = 40,
  message,
}) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        style={{ width: size, height: size }}
        className="rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"
      />
      {message && (
        <p className="text-sm font-medium text-gray-500 animate-pulse">{message}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
