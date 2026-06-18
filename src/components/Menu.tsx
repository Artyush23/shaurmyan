import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, CartItem } from '../types';
import { Flame, Star, ShoppingCart, Plus, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

interface MenuProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem, selectedSize: string, selectedPrice: number, addedCustomizations: string[], quantity: number) => void;
}

export default function Menu({ menuItems, onAddToCart }: MenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  
  // Customization state
  const [selectedSizeIdx, setSelectedSizeIdx] = useState<number>(0);
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  const categories = [
    { id: 'all', label: 'ყველა' },
    { id: 'special', label: '✨ საფირმო' },
    { id: 'classic', label: '🌯 კლასიკური' },
    { id: 'combos', label: '🍟 კომბოები' },
    { id: 'drinks', label: '🥤 სასმელები' },
    { id: 'sides', label: '🧀 გარნირი' }
  ];

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const handleOpenCustomize = (item: MenuItem) => {
    setCustomizingItem(item);
    setSelectedSizeIdx(0);
    setSelectedCustomizations([]);
    setQuantity(1);
  };

  const toggleCustomization = (id: string) => {
    setSelectedCustomizations(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  // Dynamic price calculation
  const calculateCurrentPrice = () => {
    if (!customizingItem) return 0;
    const sizeMultiplier = customizingItem.sizes[selectedSizeIdx]?.multiplier || 1;
    const basePrice = customizingItem.price * sizeMultiplier;
    
    const customizationsPrice = selectedCustomizations.reduce((acc, cId) => {
      const custObj = customizingItem.customizations.find(c => c.id === cId);
      return acc + (custObj?.price || 0);
    }, 0);

    return (basePrice + customizationsPrice) * quantity;
  };

  const handleAddConfirm = () => {
    if (!customizingItem) return;
    
    const sizeLabel = customizingItem.sizes[selectedSizeIdx].label;
    const finalSinglePrice = (customizingItem.price * customizingItem.sizes[selectedSizeIdx].multiplier) + 
      selectedCustomizations.reduce((acc, cId) => {
        const custObj = customizingItem?.customizations.find(c => c.id === cId);
        return acc + (custObj?.price || 0);
      }, 0);

    onAddToCart(
      customizingItem,
      sizeLabel,
      finalSinglePrice,
      selectedCustomizations,
      quantity
    );

    setCustomizingItem(null);
  };

  return (
    <section id="menu" className="py-24 cream-grid-bg relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-amber-500 font-black text-xs uppercase tracking-widest font-mono block mb-2">
            💥 CUSTOMIZE IT YOUR WAY
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-stone-950 font-sans tracking-tight mb-4">
            ჩვენი გემრიელი მენიუ
          </h2>
          <p className="text-stone-600 text-sm font-light">
            აირჩიე შენი საყვარელი პორცია, დაამატე გახეხილი ყველი, ორმაგი ხორცი ან ცხარე წიწაკა და მიიღე საოცარი სიამოვნება!
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 scale-102 font-extrabold'
                  : 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                key={item.id}
                className="bg-white border border-stone-100 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 flex flex-col group justify-between"
              >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden bg-stone-100">
                  <img
                    referrerPolicy="no-referrer"
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Popular tags or badge */}
                  {item.popular && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-stone-950 px-3 py-1 rounded-full text-[10px] font-black tracking-wide flex items-center space-x-1 shadow-md">
                      <Star className="w-3 h-3 fill-current" />
                      <span>პოპულარული</span>
                    </div>
                  )}

                  {/* Spicy rate display */}
                  {item.spicyLevel > 0 && (
                    <div className="absolute top-3 right-3 bg-stone-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center space-x-0.5 border border-stone-800">
                      {[...Array(item.spicyLevel)].map((_, idx) => (
                        <Flame key={idx} className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <h3 className="font-extrabold text-stone-900 text-lg leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-stone-500 text-xs font-light line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-mono font-medium">ფასი იწყება</span>
                      <span className="text-xl font-mono font-extrabold text-stone-950">
                        ₾{item.price.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenCustomize(item)}
                      className="px-4 py-2 bg-stone-950 text-white font-extrabold text-xs rounded-xl hover:bg-amber-500 hover:text-stone-950 transition-colors flex items-center space-x-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>შეუკვეთე</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* EMPTY STATE */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <ShieldAlert className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <p className="text-stone-500 text-sm font-medium">ამ კატეგორიაში პროდუქტები ვერ მოიძებნა.</p>
          </div>
        )}

      </div>

      {/* CUSTOMIZATION AND ORDERING DIALOG MODAL */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingItem(null)}
              className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              
              {/* Header Box */}
              <div className="p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="text-2xl font-black text-stone-900">{customizingItem.name}</span>
                    {customizingItem.popular && <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">POPULAR</span>}
                  </div>
                  <p className="text-stone-500 text-xs font-light tracking-wide">{customizingItem.description}</p>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="p-1.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* 1. Size Selection */}
                {customizingItem.sizes && customizingItem.sizes.length > 0 && (
                  <div>
                    <span className="block text-xs font-bold font-mono tracking-wider text-stone-400 uppercase mb-3">
                      📏 აირჩიე ზომა
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {customizingItem.sizes.map((size, index) => {
                        const multipliedPrice = customizingItem.price * size.multiplier;
                        const isSelected = selectedSizeIdx === index;
                        return (
                          <button
                            key={size.label}
                            onClick={() => setSelectedSizeIdx(index)}
                            className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/5 text-amber-600 font-bold shadow-md'
                                : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                            }`}
                          >
                            <span className="block text-xs font-medium whitespace-pre-line leading-tight mb-1.5">{size.label}</span>
                            <span className="font-mono text-sm font-black text-stone-900">
                              ₾{multipliedPrice.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Customizations Addons Selection */}
                {customizingItem.customizations && customizingItem.customizations.length > 0 && (
                  <div>
                    <span className="block text-xs font-bold font-mono tracking-wider text-stone-400 uppercase mb-3">
                      🧀 დამატებები (ჯადოსნური ინგრედიენტები)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customizingItem.customizations.map(c => {
                        const isChecked = selectedCustomizations.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleCustomization(c.id)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                              isChecked
                                ? 'border-amber-500 bg-amber-500/5'
                                : 'border-stone-150 bg-white hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isChecked ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <div className="text-left leading-tight">
                                <span className="block text-xs font-bold text-stone-900">{c.name}</span>
                                <span className="text-[10px] text-stone-500 block font-light">{c.description}</span>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-black text-stone-800">
                              +₾{c.price.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Spice warning or notice if very spicy */}
                {customizingItem.spicyLevel >= 2 && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start space-x-3 text-red-700">
                    <Flame className="w-5 h-5 text-red-500 fill-current flex-shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <span className="block text-xs font-bold">ყურადღება: ეს არის ძალიან ცხარე!</span>
                      <p className="text-[10px] leading-relaxed text-red-650 font-sans mt-0.5">
                        ეს შაურმა მომზადებულია ვულკანური სიმწარის ჩილი სოუსით. დარწმუნდით, რომ სიმწარის ჯირკვლები მზად გაქვთ ამ გამოწვევისთვის.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Footer Actions with Quantity */}
              <div className="p-6 border-t border-stone-150 bg-stone-50 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-4">
                
                {/* Quantity adjustments */}
                <div className="flex items-center justify-center space-x-3 bg-white border border-stone-200 p-1.5 rounded-2xl self-center">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(q => q - 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono text-base font-black w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Add confirm button with price update */}
                <button
                  onClick={handleAddConfirm}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-stone-950 text-white font-extrabold text-sm sm:text-base hover:bg-amber-500 hover:text-stone-900 shadow-xl shadow-stone-900/10 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>დაამატე კალათაში</span>
                  <span className="font-mono font-black ml-1.5 border-l border-white/25 pl-2">
                    ₾{calculateCurrentPrice().toFixed(2)}
                  </span>
                </button>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
