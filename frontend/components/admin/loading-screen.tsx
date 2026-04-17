import Image from 'next/image';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white">
      {/* Spinning logo */}
      <div
        className="animate-spin"
        style={{ animationDuration: '2s', animationTimingFunction: 'linear' }}
      >
        <Image
          src="/logo0.png"
          alt="IAV Hassan II"
          width={72}
          height={72}
          priority
          className="opacity-90"
        />
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[15px] font-bold tracking-wide text-slate-900">
          Chargement en cours…
        </p>
        <p className="text-[12px] font-medium text-slate-600">IAV Hassan II · DEAA Hub</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-emerald-600"
            style={{
              animation: 'pulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
