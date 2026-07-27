import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Globe, Leaf } from 'lucide-react';

export default function AnimatedLanding() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax layers for hero section
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacityText = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scaleText = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div ref={containerRef} className="bg-stone-950 text-stone-100 min-h-[300vh] font-sans selection:bg-emerald-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-stone-950/20 backdrop-blur-md border-b border-white/10">
        <div className="font-serif text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200 uppercase font-light">
          EventSphere
        </div>
        <button 
          onClick={() => navigate('/admin')}
          className="group relative px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center space-x-2 backdrop-blur-md"
        >
          <span className="font-medium text-sm tracking-wide">Organizer Login</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-emerald-300" />
        </button>
      </nav>

      {/* Hero Parallax Section */}
      <div className="h-screen w-full relative overflow-hidden flex items-center justify-center sticky top-0">
        
        {/* Animated Concert Lights / Gradient Orbs Background */}
        <motion.div 
          style={{ y: yBg }} 
          className="absolute inset-0 z-0 bg-stone-950 overflow-hidden"
        >
          {/* Animated Orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 100, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-emerald-600/30 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
              x: [0, -100, 0],
              y: [0, 100, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/2 -right-1/4 w-[600px] h-[600px] bg-teal-600/20 rounded-full blur-[100px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.3, 0.1],
              y: [0, -100, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            className="absolute -bottom-1/4 left-1/3 w-[900px] h-[900px] bg-indigo-600/20 rounded-full blur-[150px]" 
          />
          
          {/* Noise overlay for texture */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&q=80&w=1000')] bg-repeat" />
        </motion.div>

        {/* CSS Bird Animations */}
        <div className="bird-container">
          <div className="bird bird-1" style={{ '--bird-scale': '1.2' }}></div>
          <div className="bird bird-2" style={{ '--bird-scale': '0.8' }}></div>
          <div className="bird bird-3" style={{ '--bird-scale': '1' }}></div>
          <div className="bird bird-4" style={{ '--bird-scale': '0.6' }}></div>
          <div className="bird bird-5" style={{ '--bird-scale': '0.9' }}></div>
        </div>

        {/* Foreground Hero Text */}
        <motion.div 
          style={{ y: yBg, opacity: opacityText, scale: scaleText }}
          className="relative z-20 text-center px-4"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-full nature-glass text-emerald-100 font-medium text-xs tracking-widest uppercase mb-8"
          >
            <Leaf className="w-4 h-4 text-emerald-300" />
            <span>Curate beautiful moments</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-6xl md:text-8xl lg:text-9xl font-serif tracking-tight leading-[1] text-white drop-shadow-2xl font-light"
          >
            CREATE.<br/>
            <span className="italic text-transparent bg-clip-text bg-gradient-to-br from-emerald-200 via-teal-100 to-stone-200">
              CAPTIVATE.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 text-lg md:text-xl text-stone-300 max-w-2xl mx-auto font-light leading-relaxed"
          >
            An elegant platform for managing college fests, school symposiums, and vibrant campus events with sophisticated digital ticketing.
          </motion.p>
        </motion.div>
      </div>

      {/* Feature Sections (Triggered on Scroll) */}
      <div className="relative z-30 bg-stone-950 py-32 px-6">
        <div className="max-w-6xl mx-auto space-y-40">
          
          {/* Feature 1 */}
          <Section>
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="w-16 h-16 nature-glass rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-900/20">
                  <Sparkles className="w-8 h-8 text-emerald-300" />
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-light mb-6">Beautiful Ticketing</h2>
                <p className="text-stone-400 text-lg leading-relaxed mb-8 font-light">
                  Create unique event links instantly. Design stunning digital passes that reflect the elegance of your event. 
                  Say goodbye to generic PDFs and hello to interactive, beautifully crafted dynamic passes.
                </p>
              </div>
              <div className="relative h-96 rounded-[2rem] overflow-hidden nature-glass p-2">
                <div className="w-full h-full rounded-3xl overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000" alt="Event Tickets and Passes" className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent opacity-60" />
                </div>
              </div>
            </div>
          </Section>

          {/* Feature 2 */}
          <Section>
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1 relative h-96 rounded-[2rem] overflow-hidden nature-glass p-2">
                <div className="w-full h-full rounded-3xl overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1520583457224-aee11bad5112?auto=format&fit=crop&q=80&w=1000" alt="QR Code Scanning at Event Entrance" className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent opacity-60" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="w-16 h-16 nature-glass rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-900/20">
                  <ShieldCheck className="w-8 h-8 text-teal-300" />
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-light mb-6">Seamless Access</h2>
                <p className="text-stone-400 text-lg leading-relaxed mb-8 font-light">
                  Provide a tranquil arrival experience. Our real-time database lookups and secure QR scanning ensure your guests transition effortlessly into your curated world.
                </p>
              </div>
            </div>
          </Section>

          {/* CTA */}
          <Section>
            <div className="text-center max-w-3xl mx-auto py-24 px-8 rounded-[3rem] nature-glass relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000')] bg-cover opacity-20 mix-blend-overlay" />
              <div className="absolute inset-0 bg-gradient-to-b from-stone-950/10 to-stone-950/80" />
              
              <div className="relative z-10">
                <Globe className="w-12 h-12 text-emerald-300 mx-auto mb-8 opacity-80" />
                <h2 className="text-4xl md:text-5xl font-serif font-light mb-8">Host your first event today</h2>
                <button 
                  onClick={() => navigate('/admin')}
                  className="px-10 py-4 bg-white text-stone-900 font-medium tracking-wide rounded-full hover:bg-stone-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-10 cursor-pointer uppercase text-sm"
                >
                  Access Organizer Portal
                </button>
              </div>
            </div>
          </Section>

        </div>
      </div>
      
    </div>
  );
}

// Reusable animated section wrapper
function Section({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

