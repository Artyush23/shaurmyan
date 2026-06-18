import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, CheckCircle2, Award, Heart, HelpCircle } from 'lucide-react';

interface AnatomyItem {
  side: 'left' | 'right';
  step: string;
  title: string;
  description: string;
  highlight: string;
  icon: string;
}

const ANATOMY_STEPS: AnatomyItem[] = [
  {
    side: 'left',
    step: '01',
    title: 'ხრაშუნა ოქროსფერი ლავაში',
    description: 'ყოველდღიურად ახლად გამომცხვარი თხელი ლავაში, რომელიც გრილზე იბრაწება იდეალურ ოქროსფერ ფერამდე და ინარჩუნებს სიმტკიცესა და ხრაშუნა ტექსტურას ბოლო ლუკმამდე.',
    highlight: '🔥 იდეალური ხრაშუნი',
    icon: '🫓'
  },
  {
    side: 'right',
    step: '02',
    title: 'ორმაგად მარინირებული ხორცი',
    description: 'ადგილობრივ ფერმებში შერჩეული ხორცი, რომელიც 24 საათის განმავლობაში მარინადდება კავკასიურ მთის სანელებლებში და იწვება მბრუნავ ცეცხლზე წვნიანი გულის შესანარჩუნებლად.',
    highlight: '🥩 წვნიანი და ნაზი',
    icon: '🍗'
  },
  {
    side: 'left',
    step: '03',
    title: 'საფირმო „YAN“ საიდუმლო სოუსი',
    description: 'არანაირი მზა კეტჩუპი ან მაიონეზი! ჩვენი შეფ-მზარეულის მიერ ნატურალურ მაწონზე, ნიორსა და ახალდაკეპილ პიტნაზე დამზადებული ნაზი თხევადი სოუსი.',
    highlight: '🥣 ჯანსაღი და უნიკალური',
    icon: '🌿'
  },
  {
    side: 'right',
    step: '04',
    title: 'სულგუნისა და მოცარელას გული',
    description: 'ნამდვილი ქართული სულგუნისა და იტალიური მოცარელას ოქროს ბალანსი, რომელიც დნება ცხელ ხორცთან შეხებისას და ქმნის საოცრად წელვად გულს.',
    highlight: '🧀 გამდნარი ნეტარება',
    icon: '🧀'
  },
  {
    side: 'left',
    step: '05',
    title: 'ცოცხალი და ხრაშუნა ბოსტნეული',
    description: 'მხოლოდ ახლად დაჭრილი ტკბილი პომიდორი კუბიკებით, ნაზი მწვანილი, დამარინადებული წითელი ხახვი და სურვილისამებრ ცხარე ჰალაპენიო.',
    highlight: '🍅 ჯანსაღი სიახლე',
    icon: '🥗'
  }
];

export default function ScrollShowcase() {
  return (
    <section id="anatomy" className="relative py-24 bg-stone-900 border-t border-b border-stone-800 text-white overflow-hidden">
      {/* Visual glowing layout backdrops */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-stone-950 to-transparent pointer-events-none z-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-stone-950 to-transparent pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-600/5 blur-[120px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-500 text-xs font-semibold mb-4 uppercase tracking-widest font-mono"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>როგორ ვამზადებთ?</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl font-black tracking-tight mb-4"
          >
            Shaurm<span className="text-amber-500">YAN</span>–ის ანატომია
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-stone-400 text-sm sm:text-base font-light font-sans"
          >
            ჩაიხედე ჩვენი საფირმო ხელოვნების სიღრმეში. თითოეული ინგრედიენტი შერჩეულია საუკეთესო გასტრონომიული გამოცდილებისთვის.
          </motion.p>
        </div>

        {/* Timed Scroll-Triggered Layout List */}
        <div className="relative border-l border-stone-800 md:border-l-0 md:before:absolute md:before:inset-y-0 md:before:left-1/2 md:before:w-0.5 md:before:bg-stone-800 space-y-16 lg:space-y-24">
          
          {ANATOMY_STEPS.map((item, index) => {
            const isLeft = item.side === 'left';
            
            return (
              <div key={item.step} className="relative flex flex-col md:flex-row md:justify-between items-stretch">
                
                {/* Visual dot on the timeline for desktops */}
                <div className="absolute -left-[17px] md:left-1/2 md:-translate-x-4 top-0 z-20 flex items-center justify-center">
                  <motion.div
                    whileInView={{ scale: [0.8, 1.2, 1] }}
                    viewport={{ once: true, margin: '-100px' }}
                    className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40 text-stone-950 font-mono font-black text-xs"
                  >
                    {item.step}
                  </motion.div>
                </div>

                {/* Left Side (Content or spacing) */}
                <div className={`w-full md:w-[46%] pl-8 md:pl-0 ${isLeft ? 'md:text-right' : 'md:order-2 md:text-left'}`}>
                  <motion.div
                    initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                    className="bg-stone-950/50 hover:bg-stone-950/80 border border-stone-850 p-6 sm:p-8 rounded-3xl transition-all shadow-xl hover:shadow-amber-500/5 duration-300"
                  >
                    <div className={`flex items-center space-x-3 mb-3 ${isLeft ? 'md:flex-row-reverse md:space-x-reverse' : ''}`}>
                      <span className="text-3xl sm:text-4xl">{item.icon}</span>
                      <span className="text-xs font-bold font-mono tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        {item.highlight}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2 leading-tight">
                      {item.title}
                    </h3>

                    <p className="text-stone-400 text-xs sm:text-sm font-light leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </motion.div>
                </div>

                {/* Spacing for desktop opposite side */}
                <div className="hidden md:block w-[46%]" />

              </div>
            );
          })}
        </div>

        {/* Floating Call to Action */}
        <div className="mt-20 text-center relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex flex-col items-center bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-800 p-8 rounded-3xl max-w-xl mx-auto text-center"
          >
            <div className="bg-amber-500/10 p-3 rounded-2xl mb-4 text-amber-500">
              <Award className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold mb-1">უპირველესი ხარისხის გარანტია!</h4>
            <p className="text-stone-400 text-xs font-light font-sans max-w-sm">
              ჩვენ არასოდეს ვიყენებთ გაყინულ ხორცს ან გუშინდელ ინგრედიენტებს. ყოველი შეკვეთა იწყება ნულიდან.
            </p>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
