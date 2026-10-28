import React, { useState, useEffect, useRef } from 'react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  containerClassName?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  fallbackSrc = "/logo.png", 
  className, 
  containerClassName,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Check if already loaded (for cached images)
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${containerClassName || "w-full h-full"}`}>
      {/* Skeleton / Placeholder - Positioned behind the image */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-[#030A91] animate-spin opacity-20" />
        </div>
      )}

      {/* Actual Image - No opacity filters to ensure visibility */}
      <img
        ref={imgRef}
        src={error ? fallbackSrc : src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover relative z-10 ${className}`}
        {...props}
      />
    </div>
  );
};
