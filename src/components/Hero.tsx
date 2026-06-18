import React from 'react';
import { motion } from 'motion/react';
import { Flame, Star, Sparkles, ArrowRight } from 'lucide-react';

interface HeroProps {
  onScrollToMenu: () => void;
}

export default function Hero({ onScrollToMenu }: HeroProps) {
  return (
    <section id="hero" className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-stone-950 flex items-center pt-8 md:pt-0">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 charcoal-grid-bg opacity-40" />

      {/* Dynamic fire sparkles rise simulation background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-amber-500/20 rounded-full blur-xl"
            style={{
              width: Math.random() * 80 + 40,
              height: Math.random() * 80 + 40,
              left: `${Math.random() * 100}%`,
              bottom: `-10%`,
            }}
            animate={{
              y: '-120vh',
              x: [0, Math.random() * 80 - 40, 0],
              opacity: [0, 0.6, 0.4, 0],
            }}
            transition={{
              duration: Math.random() * 8 + 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 text-left space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border border-stone-800 px-4 py-2 rounded-full shadow-2xl"
            >
              <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-500 tracking-wider uppercase font-mono">
                🔥 თბილისის ლეგენდარული გემო
              </span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tighter"
              >
                მხოლოდ <span className="gold-text-gradient bg-clip-text text-transparent">ShaurmYAN</span>
                <br />
                არა სხვა რამ!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-stone-300 text-base sm:text-lg max-w-xl font-light leading-relaxed font-sans"
              >
                სადღაც შუაში – ხრაშუნა ოქროსფერ ლავაშსა და ნაზ, ცეცხლზე მოშიშხინე შერჩეულ ხორცს შორის, იბადება ნამდვილი კულინარიული ხელოვნება. დაგემოვნე პრემიუმ ხარისხი!
              </motion.p>
            </div>

            {/* Quick Badges / Core Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-3 md:gap-4 max-w-lg pt-2"
            >
              <div className="bg-stone-900/80 border border-stone-800/80 p-3 rounded-2xl text-center shadow-xl">
                <span className="block text-2xl font-bold text-amber-500 font-mono">100%</span>
                <span className="text-[10px] sm:text-xs text-stone-400 font-medium">ქართული ხორცი</span>
              </div>
              <div className="bg-stone-900/80 border border-stone-800/80 p-3 rounded-2xl text-center shadow-xl">
                <span className="block text-2xl font-bold text-amber-500 font-mono">24/7</span>
                <span className="text-[10px] sm:text-xs text-stone-400 font-medium">ცხელი მიწოდება</span>
              </div>
              <div className="bg-stone-900/80 border border-stone-800/80 p-3 rounded-2xl text-center shadow-xl">
                <span className="block text-2xl font-bold text-amber-500 font-mono">4.9+</span>
                <span className="text-[10px] sm:text-xs text-stone-400 font-medium">საშუალო რეიტინგი</span>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 max-w-md pt-4"
            >
              <button
                onClick={onScrollToMenu}
                className="group relative flex items-center justify-center px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-stone-950 font-black text-base rounded-2xl shadow-2xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  მენიუს ნახვა
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <div className="flex items-center justify-center space-x-2 text-stone-400/90 text-sm py-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((n) => (
                    <img
                      key={n}
                      className="w-8 h-8 rounded-full border-2 border-stone-950 object-cover"
                      src={`https://images.unsplash.com/photo-${n === 1 ? '1534528741775-53994a69daeb' : n === 2 ? '1507003211169-0a1dd7228f2d' : '1494790108377-be9c29b29330'}?auto=format&fit=crop&q=80&w=150`}
                      alt="კმაყოფილი მომხმარებელი"
                    />
                  ))}
                </div>
                <div>
                  <div className="flex items-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] block text-stone-300 font-semibold">%100 კმაყოფილი სტამბა</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Image/Animation Column */}
          <div className="lg:col-span-5 flex justify-center items-center relative py-12">
            {/* Glowing background behind image */}
            <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-amber-500 to-red-600 blur-[80px] opacity-30 animate-pulse z-0" />

            {/* Circular fire rotate wrap */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[360px] h-[360px] border border-dashed border-amber-500/10 rounded-full z-0 pointer-events-none hidden sm:block"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[440px] h-[440px] border border-dotted border-red-500/5 rounded-full z-0 pointer-events-none hidden sm:block"
            />

            {/* Interactive Hero Image Card with multi-layer layout */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
              animate={{ opacity: 1, scale: 1, rotate: -5 }}
              whileHover={{ scale: 1.05, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 60, damping: 15 }}
              className="relative w-72 h-96 sm:w-80 sm:h-[420px] bg-stone-900 border-2 border-amber-500/30 p-4 rounded-3xl shadow-[0_25px_50px_-12px_rgba(216,4,4,0.30)] z-10 cursor-grab"
            >
              <div className="relative w-full h-full overflow-hidden rounded-2xl bg-stone-950 group">
                <img
                  src="/goliath-shaurma.png"
                  alt="Delicious loaded wrapping Shaurma"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Floating details badge inside image */}
                <div className="absolute bottom-4 left-4 right-4 bg-stone-950/90 backdrop-blur-md p-3 rounded-xl border border-stone-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-stone-300 text-[10px] block font-mono">TOP WEEKLY BOMB</span>
                      <span className="text-white font-black text-sm">Signature „Goliath“</span>
                    </div>
                    <span className="font-mono text-amber-500 font-bold text-sm">₾15.50</span>
                  </div>
                </div>
              </div>

              {/* Outside elements overlap */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 -right-6 bg-amber-500 text-stone-950 px-4 py-2 rounded-2xl text-xs font-black shadow-lg transform rotate-12 flex items-center space-x-1"
              >
                <Flame className="w-4 h-4 fill-current text-stone-950" />
                <span>ცხელი და გემრიელი</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-6 bg-red-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-lg transform -rotate-6"
              >
                💯 100% ხარისხი
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
