import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AnimatedLanding() {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId;
    const FADE_DURATION = 0.5;

    const loopLogic = () => {
      if (!video) return;

      const { currentTime, duration } = video;
      
      if (duration) {
        if (currentTime < FADE_DURATION) {
          video.style.opacity = currentTime / FADE_DURATION;
        } else if (currentTime > duration - FADE_DURATION) {
          video.style.opacity = (duration - currentTime) / FADE_DURATION;
        } else {
          video.style.opacity = 1;
        }
      }

      animationFrameId = requestAnimationFrame(loopLogic);
    };

    const handleEnded = () => {
      video.style.opacity = 0;
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(e => console.error("Video play failed", e));
      }, 100);
    };

    video.addEventListener('ended', handleEnded);
    video.play().catch(e => console.error("Video play failed", e));
    animationFrameId = requestAnimationFrame(loopLogic);

    return () => {
      if (video) video.removeEventListener('ended', handleEnded);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full bg-white selection:bg-black/10">
      
      {/* Background Video Layer - FIXED so it stays behind content while scrolling */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none origin-bottom flex items-end" 
      >
        <div className="relative w-full" style={{ height: 'calc(100vh - 300px)' }}>
          <video 
            ref={videoRef}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
            muted 
            playsInline
            className="w-full h-full object-cover opacity-0 transition-opacity duration-[500ms]"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="font-serif text-3xl tracking-tight text-black flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain -ml-2" />
          <span>EventSphere<sup>®</sup></span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-sans">
          <a href="#home" className="text-black transition-colors">Home</a>
          <a href="#features" className="text-[#6F6F6F] hover:text-black transition-colors">Features</a>
          <a href="#events" className="text-[#6F6F6F] hover:text-black transition-colors">Events</a>
          <a href="#contact" className="text-[#6F6F6F] hover:text-black transition-colors">Contact</a>
        </div>
        <button 
          onClick={() => navigate('/admin')}
          className="bg-black text-white font-sans rounded-full px-6 py-2.5 text-sm hover:scale-[1.03] transition-transform duration-300"
        >
          Organizer Login
        </button>
      </nav>

      {/* Hero Section */}
      <main id="home" className="relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-screen" style={{ marginTop: '-80px', paddingBottom: '10rem' }}>
        <h1 className="text-5xl sm:text-7xl md:text-8xl max-w-7xl font-normal font-serif text-black leading-[0.95] mt-20" style={{ letterSpacing: '-2.46px' }}>
          Beyond <span className="text-[#6F6F6F] italic">events, </span>we craft <span className="text-[#6F6F6F] italic">the unforgettable.</span>
        </h1>
        
        <p className="text-base sm:text-lg font-sans max-w-2xl mt-8 leading-relaxed text-[#6F6F6F]">
          Building platforms for visionary organizers, vibrant campuses, and thoughtful creators. Through the noise, we craft elegant ticketing experiences and seamless event management.
        </p>

        <button 
          onClick={() => navigate('/admin')}
          className="bg-black text-white font-sans rounded-full px-14 py-5 text-base mt-12 hover:scale-[1.03] transition-transform duration-300 shadow-xl shadow-black/10"
        >
          Create Event
        </button>
      </main>

      {/* Blank Spacer to scroll past video smoothly */}
      <div className="h-32 w-full relative z-10 bg-gradient-to-b from-transparent to-white"></div>

      {/* Features Section */}
      <section id="features" className="relative z-20 bg-white py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-serif text-black mb-16 text-center">
            Architecting the Experience
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { title: "Seamless Ticketing", desc: "Instantly generate and distribute gorgeous, cinematic digital tickets that your attendees will want to keep forever." },
              { title: "AI Event Co-Pilot", desc: "Let our intelligent assistant draft your event details, schedule, and branding in seconds, not hours." },
              { title: "Dynamic Access Control", desc: "Real-time scanning and attendance tracking with a smooth, latency-free verification system at the gates." }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="flex flex-col items-center text-center p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-500 rounded-3xl bg-white"
              >
                <div className="w-12 h-12 bg-black rounded-full mb-6 flex items-center justify-center text-white text-xl font-serif">{i + 1}</div>
                <h3 className="text-2xl font-serif text-black mb-4">{feature.title}</h3>
                <p className="text-[#6F6F6F] font-sans leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events Showcase Section */}
      <section id="events" className="relative z-20 bg-gray-50 py-32 px-6 border-y border-gray-100">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-serif text-black mb-6">
            Featured Moments
          </h2>
          <p className="text-[#6F6F6F] max-w-2xl mx-auto mb-16">
            A glimpse into the extraordinary experiences curated on our platform.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div 
              className="aspect-[4/3] bg-gray-200 rounded-3xl overflow-hidden relative group"
            >
              <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 grayscale hover:grayscale-0" alt="Tech Conference" />
              <div className="absolute inset-0 bg-black/40 flex items-end p-8">
                <h3 className="text-white text-3xl font-serif">Global Tech Summit '26</h3>
              </div>
            </div>
            <div 
              className="aspect-[4/3] bg-gray-200 rounded-3xl overflow-hidden relative group"
            >
              <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 grayscale hover:grayscale-0" alt="Music Festival" />
              <div className="absolute inset-0 bg-black/40 flex items-end p-8">
                <h3 className="text-white text-3xl font-serif">Aurora Music Festival</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-20 bg-black py-32 px-6 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-serif mb-8">
            Ready to curate?
          </h2>
          <p className="text-gray-400 font-sans mb-12 text-lg">
            Join the hundreds of organizers redefining what an event should feel like.
          </p>
          <button 
            onClick={() => navigate('/admin')}
            className="bg-white text-black font-sans rounded-full px-12 py-4 text-base hover:scale-[1.03] transition-transform duration-300"
          >
            Start Building
          </button>
        </div>
        <div className="mt-32 pt-8 border-t border-gray-800 text-gray-500 text-sm font-sans flex flex-col sm:flex-row gap-4 justify-between max-w-7xl mx-auto items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-5 h-5 opacity-50 grayscale" />
            <span>© 2026 EventSphere. All rights reserved.</span>
          </div>
          <div className="space-x-6">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
      </section>

    </div>
  );
}
