import Image from 'next/image';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative mb-6 h-28 w-28 animate-spin" style={{ animationDuration: '2s', animationTimingFunction: 'linear' }}>
          <Image
            src="/logo0.png"
            alt="IAV Hassan II"
            fill
            priority
            sizes="112px"
            className="object-contain drop-shadow-sm"
          />
        </div>

        <div className="mb-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-emerald-600"
              style={{
                animation: 'loading-dot 1.1s ease-in-out infinite',
                animationDelay: `${index * 0.16}s`,
              }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[16px] font-bold tracking-wide text-slate-900">
            Chargement en cours…
          </p>
          <p className="text-[12px] font-medium text-slate-600">IAV Hassan II · DEAA Hub</p>
        </div>
      </div>

      <style>{`\n        @keyframes loading-dot {\n          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }\n          40% { opacity: 1; transform: scale(1.15); }\n        }\n      `}</style>
    </div>
  );
}