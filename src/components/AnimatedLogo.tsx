import React from 'react';
import { motion } from 'motion/react';

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const [logoImg, setLogoImg] = React.useState<string>('');
  const [siteName, setSiteName] = React.useState<string>('yuthsmm');

  React.useEffect(() => {
    const cachedLogo = localStorage.getItem('websiteLogo');
    const cachedName = localStorage.getItem('websiteName');
    if (cachedLogo) setLogoImg(cachedLogo);
    if (cachedName) setSiteName(cachedName);

    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.websiteLogo !== undefined) {
            setLogoImg(data.websiteLogo);
            localStorage.setItem('websiteLogo', data.websiteLogo);
          }
          if (data.websiteName) {
            setSiteName(data.websiteName);
            localStorage.setItem('websiteName', data.websiteName);
          }
        }
      })
      .catch(err => console.error("Logo fetch error:", err));
  }, []);

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  const sparkVariants = {
    animate: (i: number) => ({
      scale: [0.8, 1.2, 0.8],
      opacity: [0.3, 1, 0.3],
      rotate: [0, 360],
      transition: {
        duration: 2 + i * 0.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    }),
  };

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Dynamic Animated Icon Container */}
      <motion.div
        className="relative flex items-center justify-center cursor-pointer"
        whileHover="hover"
        whileTap="tap"
      >
        {/* Glow Background Pulse */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 opacity-70 blur-md"
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.6, 0.85, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Foreground Icon Frame */}
        <motion.div
          className={`${iconSizes[size]} relative rounded-xl bg-[#090d1a] border border-white/10 flex items-center justify-center overflow-hidden z-10 shadow-lg`}
          variants={{
            hover: {
              scale: 1.05,
              borderColor: 'rgba(255, 255, 255, 0.25)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
            },
            tap: { scale: 0.95 },
          }}
        >
          {logoImg ? (
            <img src={logoImg} alt={siteName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <>
              {/* Neon scan line effect */}
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50"
                animate={{
                  top: ['-10%', '110%'],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              {/* SVG Stylized 'Y' with Connected SMM Network Nodes */}
              <svg
                viewBox="0 0 100 100"
                className="w-4/5 h-4/5 text-white"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Animated Connecting Lines (SMM Network Nodes) */}
                <motion.path
                  d="M20 25 L50 52 M80 25 L50 52 M50 52 L50 85"
                  stroke="url(#lineGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="8 4"
                  animate={{
                    strokeDashoffset: [-24, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Glowing Main 'Y' Character */}
                <motion.path
                  d="M20 25 C30 35, 45 48, 50 52 C55 48, 70 35, 80 25 M50 52 L50 85"
                  stroke="url(#yGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                />

                {/* Pulsing Central Junction Node */}
                <motion.circle
                  cx="50"
                  cy="52"
                  r="6"
                  fill="#a855f7"
                  animate={{
                    r: [5, 8, 5],
                    fill: ['#3b82f6', '#a855f7', '#6366f1'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />

                {/* Tip Nodes */}
                <circle cx="20" cy="25" r="4" fill="#3b82f6" />
                <circle cx="80" cy="25" r="4" fill="#ec4899" />
                <circle cx="50" cy="85" r="4" fill="#10b981" />

                {/* Gradients */}
                <defs>
                  <linearGradient id="yGradient" x1="20" y1="25" x2="80" y2="85">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="100" y2="100">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f472b6" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
              </svg>
            </>
          )}
        </motion.div>

        {/* Small Ambient Sparkles Around the Logo */}
        <motion.div
          custom={1}
          variants={sparkVariants}
          animate="animate"
          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-400 rounded-full blur-[1px] z-20"
        />
        <motion.div
          custom={2}
          variants={sparkVariants}
          animate="animate"
          className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-400 rounded-full blur-[1px] z-20"
        />
      </motion.div>

      {/* Brand Text with Modern Dynamic Color Shift & Letter Hover Stagger */}
      {showText && (
        <div className="flex flex-col items-start leading-none">
          <div className="flex overflow-hidden">
            {siteName.split('').map((char, index) => (
              <motion.span
                key={index}
                className={`${textSizes[size]} font-display font-black tracking-tight`}
                style={{
                  color: index >= Math.floor(siteName.length / 2) ? '#a855f7' : '#3b82f6',
                  display: 'inline-block',
                }}
                animate={{
                  y: [0, -3, 0],
                  filter: ['drop-shadow(0 0 1px rgba(99,102,241,0.2))', 'drop-shadow(0 0 6px rgba(99,102,241,0.6))', 'drop-shadow(0 0 1px rgba(99,102,241,0.2))'],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: index * 0.15,
                  ease: 'easeInOut',
                }}
                whileHover={{
                  scale: 1.25,
                  color: '#f472b6',
                  transition: { duration: 0.1 },
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>
          
          <motion.span
            className="text-[9px] font-mono tracking-[0.2em] uppercase text-gray-500 mt-1 pl-0.5"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            SMM Core Framework
          </motion.span>
        </div>
      )}
    </div>
  );
};
