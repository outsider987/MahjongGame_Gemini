
import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';

interface OrientationGuardProps {
  children: React.ReactNode;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if height > width (Portrait)
      // We use innerHeight/Width which is robust for mobile browsers
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isPortraitMode);
    };

    // Check immediately
    checkOrientation();

    // Add listeners
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (isPortrait) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-8 text-center animate-fadeIn">
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse"></div>
           <Smartphone size={64} className="relative z-10 text-gray-300 animate-[spin_3s_ease-in-out_infinite]" />
           <RotateCcw size={32} className="absolute -right-2 -bottom-2 text-yellow-500 z-20 animate-bounce" />
        </div>
        
        <h2 className="text-2xl font-bold text-yellow-500 mb-4">請旋轉您的裝置</h2>
        <p className="text-gray-400 max-w-xs mx-auto leading-relaxed">
          為了獲得最佳的麻將體驗，本遊戲僅支援橫向模式 (Landscape Mode)。
        </p>
        
        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 text-sm text-gray-500">
           如果您已鎖定螢幕旋轉，請先解除鎖定。
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
