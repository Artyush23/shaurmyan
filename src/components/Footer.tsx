import React from 'react';
import { Flame, Phone, MapPin, Clock, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-white pt-16 pb-8 border-t border-stone-900 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        
        {/* Upper grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-stone-900 text-left">
          
          {/* Logo Brand information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-amber-500 p-2 rounded-lg text-stone-950">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xl font-black tracking-tighter text-white">
                Shaurm<span className="text-amber-500">YAN</span>
              </span>
            </div>
            <p className="text-stone-400 text-xs font-light leading-relaxed font-sans">
              ლეგენდარული კულინარიული ხელოვნება თბილისის გულში. ხარისხი, რომელიც უცვლელია ყოველდღე.
            </p>
          </div>

          {/* Operating hours list */}
          <div className="space-y-4">
            <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest font-mono block">
              🕰️ სამუშაო საათები
            </span>
            <div className="space-y-2 text-xs text-stone-400 font-sans">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500/80" />
                <span>ორშაბათი - კვირა: 24/7 ყოველდღე</span>
              </div>
              <span className="block text-[10px] text-green-500">● ცხელი ხაზი და სამზარეულო მუშაობს შეუჩერებლად</span>
            </div>
          </div>

          {/* Contact details */}
          <div className="space-y-4">
            <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest font-mono block">
              📞 კონტაქტი
            </span>
            <div className="space-y-3 text-xs text-stone-400 font-sans">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-amber-500/80" />
                <span className="font-mono text-white text-sm font-bold">+995 599 00 11 22</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-amber-500/80 flex-shrink-0 mt-0.5" />
                <span>ილია ჭავჭავაძის გამზ. 24, თბილისი, საქართველო</span>
              </div>
            </div>
          </div>

          {/* Slogan details */}
          <div className="space-y-4">
            <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest font-mono block">
              👑 პრემიუმ გარანტია
            </span>
            <p className="text-stone-400 text-xs font-light font-sans leading-relaxed">
              ყოველი შაურმა მზადდება 100% ნატურალური ფერმერული ხორცით და საფირმო, გემრიელი ხელნაკეთი სოუსით.
            </p>
          </div>

        </div>

        {/* Brand credit copyrights */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500 text-xs">
          <span>&copy; {new Date().getFullYear()} ShaurmYAN. ყველა უფლება დაცულია.</span>
          <div className="flex items-center space-x-1.5 font-mono text-[10px]">
            <span>CRAFTED WITH</span>
            <Heart className="w-3.5 h-3.5 text-red-600 fill-current animate-pulse" />
            <span>IN TBILISI, GEORGIA</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
