import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Review } from '../types';
import { Star, MessageSquarePlus, User, Check, Send, Sparkles } from 'lucide-react';

interface ReviewsProps {
  reviews: Review[];
  onAddReview: (author: string, rating: number, comment: string) => void;
}

export default function Reviews({ reviews, onAddReview }: ReviewsProps) {
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Filter only approved reviews for client display
  const approvedReviews = reviews.filter(r => r.approved);

  // Math helper
  const averageRating = approvedReviews.length > 0
    ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
    : '5.0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim()) return;

    onAddReview(author, rating, comment);
    
    // reset form
    setAuthor('');
    setRating(5);
    setComment('');
    setJustSubmitted(true);
    
    setTimeout(() => {
      setJustSubmitted(false);
    }, 4000);
  };

  return (
    <section id="reviews" className="py-24 bg-stone-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0 charcoal-grid-bg opacity-30" />
      <div className="absolute right-10 bottom-10 w-64 h-64 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-amber-500 font-extrabold text-xs uppercase tracking-widest font-mono">
            💬 REVIEWS & FEEDBACK
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-sans text-white tracking-tight mt-1 mb-4">
            რას ამბობენ გურმანები?
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm font-light">
            ჩვენთვის თითოეული მომხმარებლის აზრი უმნიშვნელოვანესია. გაგვიზიარე შენი ემოციები ShaurmYAN-ის პირველი ლუკმიდან!
          </p>
        </div>

        {/* Content Section: Grid of Stats + Form + Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Block: Stats & Form */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Average Review Panel */}
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-xl flex items-center justify-between">
              <div>
                <span className="text-stone-400 text-[10px] block font-mono font-bold tracking-wider uppercase">საშუალო რეიტინგი</span>
                <span className="text-4xl font-mono font-black text-white">{averageRating}</span>
                <span className="text-xs text-stone-400 block mt-1">დაფუძნებული {approvedReviews.length} შეფასებაზე</span>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-0.5 justify-end">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-amber-500 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] block text-stone-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/10 mt-2">
                  ✨ 99.8% კმაყოფილება
                </span>
              </div>
            </div>

            {/* Leave a Review Form */}
            <div className="bg-stone-900 border border-stone-800 p-6 sm:p-8 rounded-3xl shadow-xl">
              <div className="flex items-center space-x-2.5 mb-6">
                <MessageSquarePlus className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold">დაწერე შეფასება</h3>
              </div>

              <AnimatePresence mode="wait">
                {justSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <span className="block text-sm font-bold text-amber-400">მადლობა შეფასებისთვის!</span>
                    <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                      თქვენი შეფასება მიღებულია და გამოჩნდება ადმინისტრატორის მიერ დადასტურებისთანავე.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Author Input */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs text-stone-400 font-bold block">სახელი და გვარი</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 py-0.5 text-stone-500" />
                        <input
                          type="text"
                          required
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          placeholder="იოანე იან"
                          className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Star selection */}
                    <div className="space-y-1 text-left">
                      <label className="text-xs text-stone-400 font-bold block">შეფასება (ვარსკვლავი)</label>
                      <div className="flex items-center space-x-1.5 py-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isActive = hoveredRating !== null ? star <= hoveredRating : star <= rating;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(null)}
                              className="focus:outline-none transition-transform active:scale-90"
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${
                                  isActive ? 'text-amber-400 fill-amber-400' : 'text-stone-700'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comment text area */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs text-stone-400 font-bold block">თქვენი კომენტარი</label>
                      <textarea
                        required
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="დაწერე რა მოგეწონა განსაკუთრებით..."
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 px-4 text-xs font-medium text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>გაგზავნა</span>
                    </button>

                  </form>
                )}
              </AnimatePresence>

            </div>

          </div>

          {/* Right Block: Interactive Reviews Lists */}
          <div className="lg:col-span-8">
            <div className="space-y-4">
              {approvedReviews.map((rev, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  key={rev.id}
                  className="bg-stone-900 border border-stone-800/80 hover:border-amber-500/10 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start justify-between gap-4 transition-all"
                >
                  <div className="space-y-2 flex-1">
                    {/* Rating stars inside card */}
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating ? 'text-amber-550 fill-amber-500' : 'text-stone-800'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-stone-300 text-xs sm:text-sm font-light leading-relaxed font-sans italic">
                      „{rev.comment}“
                    </p>

                    <div className="flex items-center space-x-2 pt-2">
                      <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 text-xs font-bold">
                        {rev.author.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-white">{rev.author}</span>
                        <span className="block text-[10px] text-stone-500">
                          {new Date(rev.createdAt).toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkle badge for 5 star ratings */}
                  {rev.rating === 5 && (
                    <div className="bg-amber-500/10 text-amber-500 p-2 rounded-2xl flex-shrink-0 self-start hidden sm:block">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                  )}
                </motion.div>
              ))}

              {approvedReviews.length === 0 && (
                <div className="text-center py-12 p-8 bg-stone-900 rounded-3xl border border-dashed border-stone-800">
                  <p className="text-stone-400 text-sm">აქ ჯერ შეფასებები არ არის.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
