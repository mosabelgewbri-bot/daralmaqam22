import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import { X, Clock, Users, ChevronRight } from 'lucide-react';

interface RecipeDetailProps {
  recipe: Recipe | null;
  onClose: () => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onClose }) => {
  if (!recipe) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-ink/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 overflow-y-auto"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 50, opacity: 0 }}
          className="bg-paper w-full max-w-6xl rounded-[3rem] overflow-hidden shadow-2xl relative"
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 z-50 p-4 bg-ink text-white rounded-full hover:bg-gold hover:text-ink transition-all duration-300 shadow-xl"
          >
            <X size={24} />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Image Section */}
            <div className="relative h-[400px] lg:h-full overflow-hidden">
              <img 
                src={recipe.image} 
                alt={recipe.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
              <div className="absolute bottom-12 left-12 text-white">
                <span className="text-gold text-xs uppercase tracking-[0.4em] font-bold mb-4 block">
                  {recipe.category}
                </span>
                <h2 className="text-5xl md:text-7xl font-serif italic leading-tight">
                  {recipe.title}
                </h2>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 md:p-16 overflow-y-auto max-h-[80vh] lg:max-h-none">
              <div className="flex gap-8 mb-12 border-b border-ink/10 pb-8">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-gold" />
                  <span className="text-xs uppercase tracking-widest font-bold text-ink/60">{recipe.prepTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-gold" />
                  <span className="text-xs uppercase tracking-widest font-bold text-ink/60">Serves 2-4</span>
                </div>
              </div>

              <div className="mb-12">
                <h3 className="text-gold text-xs uppercase tracking-[0.4em] font-bold mb-6">Ingredients</h3>
                <ul className="space-y-4">
                  {recipe.ingredients.map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-ink/80 text-lg font-light italic">
                      <div className="w-1.5 h-1.5 bg-gold rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-gold text-xs uppercase tracking-[0.4em] font-bold mb-6">Instructions</h3>
                <div className="space-y-8">
                  {recipe.instructions.map((step, i) => (
                    <div key={i} className="flex gap-6">
                      <span className="text-gold font-serif italic text-3xl opacity-30">0{i + 1}</span>
                      <p className="text-ink/80 text-lg font-light leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-16 pt-12 border-t border-ink/10">
                <button 
                  onClick={onClose}
                  className="w-full py-6 bg-ink text-white text-xs uppercase tracking-[0.3em] font-bold hover:bg-gold hover:text-ink transition-all duration-500 rounded-2xl"
                >
                  Close Recipe
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RecipeDetail;
