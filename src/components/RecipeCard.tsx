import React from 'react';
import { motion } from 'motion/react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="group cursor-pointer relative overflow-hidden bg-white rounded-3xl shadow-lg transition-all duration-500 hover:shadow-2xl"
      onClick={() => onClick(recipe)}
    >
      {/* Image Container */}
      <div className="aspect-[3/4] overflow-hidden relative">
        <img 
          src={recipe.image} 
          alt={recipe.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-ink/20 group-hover:bg-ink/40 transition-colors duration-500" />
        
        {/* Category Tag */}
        <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-[10px] uppercase tracking-[0.2em] font-bold text-ink">
          {recipe.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-8 text-center">
        <h3 className="text-2xl font-serif italic mb-3 group-hover:text-gold transition-colors duration-300">
          {recipe.title}
        </h3>
        <p className="text-ink/60 text-sm font-light leading-relaxed line-clamp-2">
          {recipe.description}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-gold text-[10px] uppercase tracking-[0.2em] font-bold">
          <span>View Recipe</span>
          <div className="w-8 h-[1px] bg-gold group-hover:w-12 transition-all duration-500" />
        </div>
      </div>
    </motion.div>
  );
};

export default RecipeCard;
