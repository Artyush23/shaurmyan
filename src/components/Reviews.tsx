import { motion } from 'motion/react';
import { Review } from '../types';
import { Star, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReviewsProps {
  reviews: Review[];
  reviewsLoading?: boolean;
  reviewsError?: string | null;
}

export default function Reviews({ reviews, reviewsLoading = false, reviewsError = null }: ReviewsProps) {
  const { t } = useTranslation();
  const approvedReviews = reviews.filter((review) => review.approved !== false && review.comment.trim());
  const averageRating = approvedReviews.length > 0
    ? (approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length).toFixed(1)
    : '5.0';

  return (
    <section id="reviews" className="py-24 bg-stone-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0 charcoal-grid-bg opacity-30" />
      <div className="absolute right-10 bottom-10 w-64 h-64 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-amber-500 font-extrabold text-xs uppercase tracking-widest font-mono">
            {t('reviews.title')}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-sans text-white tracking-tight mt-1 mb-4">
            {t('reviews.title')}
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm font-light">
            {t('reviews.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-xl flex items-center justify-between">
              <div>
                <span className="text-stone-400 text-[10px] block font-mono font-bold tracking-wider uppercase">
                  {t('hero.rating')}
                </span>
                <span className="text-4xl font-mono font-black text-white">{averageRating}</span>
                <span className="text-xs text-stone-400 block mt-1">
                  {t('reviews.basedOn', { count: approvedReviews.length })}
                </span>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-0.5 justify-end">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-amber-500 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] block text-stone-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/10 mt-2">
                  {t('reviews.subtitle')}
                </span>
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 p-6 sm:p-8 rounded-3xl shadow-xl">
              <h3 className="text-lg font-bold">{t('reviews.leaveReview')}</h3>
              <p className="text-xs text-stone-400 leading-relaxed mt-3">
                {t('menu.modal.shareReview')}
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            {reviewsLoading ? (
              <div className="text-center py-12 p-8 bg-stone-900 rounded-3xl border border-stone-800">
                <p className="text-stone-400 text-sm">{t('reviews.loading')}</p>
              </div>
            ) : reviewsError ? (
              <div className="text-center py-12 p-8 bg-red-950/40 rounded-3xl border border-red-900/60">
                <p className="text-red-200 text-sm">{reviewsError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedReviews.slice(0, 8).map((review, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    key={review.id}
                    className="bg-stone-900 border border-stone-800/80 hover:border-amber-500/10 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start justify-between gap-4 transition-all"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-800'
                            }`}
                          />
                        ))}
                      </div>

                      <p className="text-stone-300 text-xs sm:text-sm font-light leading-relaxed font-sans italic">
                        "{review.comment}"
                      </p>

                      <div className="flex items-center space-x-2 pt-2">
                        <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 text-xs font-bold">
                          {(review.userName || review.author || 'C').charAt(0)}
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-white">
                            {review.userName || review.author}
                          </span>
                          <span className="block text-[10px] text-stone-500">
                            {new Date(review.createdAt).toLocaleDateString('ka-GE', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {review.rating === 5 && (
                      <div className="bg-amber-500/10 text-amber-500 p-2 rounded-2xl flex-shrink-0 self-start hidden sm:block">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {approvedReviews.length === 0 && (
                  <div className="text-center py-12 p-8 bg-stone-900 rounded-3xl border border-dashed border-stone-800">
                    <p className="text-stone-400 text-sm">{t('reviews.empty')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
