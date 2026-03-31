import React from 'react';
import { motion } from 'motion/react';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference text-white">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-serif tracking-widest uppercase"
      >
        Baileys
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex gap-8 text-xs uppercase tracking-[0.2em] font-medium"
      >
        <a href="#recipes" className="hover:text-gold transition-colors">Recipes</a>
        <a href="#about" className="hover:text-gold transition-colors">About</a>
        <a href="#contact" className="hover:text-gold transition-colors">Contact</a>
      </motion.div>
    </nav>
  );
};

export default Navbar;
