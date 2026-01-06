import React, { useState } from 'react';
import { ArrowRight, Check, Zap, Layout, Shield, Smartphone, Play, Command, FileText, Tags, MousePointer2, Lock, Sparkles, Database, Send, Layers, X, Globe, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

// Purchase Links - Update these with your actual store URLs
const PURCHASE_LINKS = {
  lynkId: 'https://lynk.id/yangpentingtekad/77j3dzw39x2v', // Indonesia
  gumroad: 'https://merubahhidupmu.gumroad.com/l/promptnest', // Global
};

interface LandingPageProps {
  onGetStarted: () => void;
}

// Feature Carousel Slides
const FEATURE_SLIDES = [
  {
    image: '/features/prompt-library.png',
    title: 'A Clean, Dynamic & Ready-to-Use Prompt Library',
    description: 'Manage, store, and run AI prompts from a single cloud-based dashboard.'
  },
  {
    image: '/features/card-interface.png',
    title: 'Intuitive Card-Based Interface',
    description: 'Each prompt is displayed in a clear, actionable card—just click Run, or Fill & Run.'
  },
  {
    image: '/features/search-filter.png',
    title: 'Find Prompts Faster, Stay Organized',
    description: 'Access any prompt in seconds with favorites, sorting, tag filters, and global search.'
  },
  {
    image: '/features/prompt-editor.png',
    title: 'Structured Prompts, Not Just Plain Text',
    description: 'Each prompt comes fully structured—with platform, tags, and reusable variables.'
  },
  {
    image: '/features/version-history.png',
    title: 'All Edit History Securely Saved',
    description: 'Every change is automatically stored and can be restored anytime.'
  }
];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % FEATURE_SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-[#111]">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="https://ui-avatars.com/api/?name=PN&background=111&color=fff&size=64&bold=true" className="w-8 h-8 rounded-lg shadow-sm" alt="PromptNest Logo" />
            <span className="font-bold text-xl tracking-tight text-gray-900">PromptNest</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <Lock size={14} /> Member Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Zap size={12} fill="currentColor" />
              Exclusive Access
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Your second brain <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500">for AI prompts.</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Store, organize, and execute your best ideas across ChatGPT, Claude, and Gemini from one beautiful workspace. <br /><span className="text-gray-900 font-medium">Valid License Key required.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 bg-gray-900 hover:bg-black text-white text-base font-medium rounded-2xl transition-all shadow-xl shadow-gray-900/10 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2"
              >
                Enter License Key <ArrowRight size={18} />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 text-gray-700 text-base font-medium rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                How it works
              </button>
            </div>
          </div>

          {/* Abstract Hero Visual - Floating Cards */}
          <div className="mt-20 relative max-w-5xl mx-auto px-6 h-[400px] sm:h-[500px] perspective-1000 animate-in fade-in zoom-in-95 duration-1000 delay-500">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-blue-100 via-purple-100 to-orange-100 opacity-60 blur-3xl rounded-full pointer-events-none" />

            <div className="absolute left-1/2 top-10 -translate-x-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200/60 p-6 sm:p-8 transform rotate-0 hover:rotate-0 transition-transform duration-500 z-20">
              <div className="flex justify-between items-start mb-6">
                <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 text-xs font-bold rounded-lg uppercase tracking-wide">ChatGPT</span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">The Feynman Simplifier</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Explain <span className="bg-orange-50 text-orange-700 px-1 rounded border border-orange-100 font-medium">{'{{concept}}'}</span> to me as if I were a 12-year-old. Use analogies and avoid jargon to ensure deep understanding.
              </p>
              <div className="flex gap-2 mb-6">
                <span className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-medium rounded-md border border-gray-100">Learning</span>
                <span className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-medium rounded-md border border-gray-100">Education</span>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-gray-50">
                <div className="h-2 w-16 bg-gray-100 rounded-full" />
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg shadow-lg">
                  <Play size={12} fill="currentColor" /> Run Prompt
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 bg-white border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Master your workflow in 3 steps</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Stop losing your best prompts in random docs or chat histories. PromptNest brings structure to the chaos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 mb-6 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Database size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Collect & Store</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Save your high-performing prompts securely. Automatic version history ensures you never lose an iteration.</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 mb-6 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Tags size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Tag & Organize</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Categorize prompts with custom tags and platforms. Find exactly what you need in seconds with lightning-fast search.</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 mb-6 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Send size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Execute Anywhere</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Fill your custom variables and hit 'Run'. PromptNest copies your input and opens your favorite AI tool instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Carousel Section */}
        <section className="py-20 bg-[#FDFBF7] overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider mb-6">
                <Sparkles size={12} /> App Preview
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">See PromptNest in Action</h2>
              <p className="text-gray-500 max-w-xl mx-auto">A visual tour of the features that make PromptNest your ultimate AI prompt companion.</p>
            </div>

            {/* Carousel Container */}
            <div className="relative">
              {/* Main Image */}
              <div className="relative overflow-hidden mx-auto max-w-4xl">
                <div className="aspect-square relative">
                  <img
                    src={FEATURE_SLIDES[currentSlide].image}
                    alt={FEATURE_SLIDES[currentSlide].title}
                    className="w-full h-full object-cover transition-opacity duration-500"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <button
                onClick={prevSlide}
                className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:scale-110 transition-all z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:scale-110 transition-all z-10"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Dot Indicators */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {FEATURE_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentSlide
                    ? 'bg-gray-900 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                />
              ))}
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center justify-center gap-3 mt-6 overflow-x-auto pb-2 no-scrollbar">
              {FEATURE_SLIDES.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-300 ${index === currentSlide
                    ? 'border-gray-900 shadow-lg scale-110'
                    : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                >
                  <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-[#FDFBF7]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-6">
                  Features
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">Built for power users <br />who value speed.</h2>

                <div className="space-y-6">
                  {[
                    { title: 'Dynamic Variables', desc: 'Identify placeholders with {{variable}} and fill them on the fly.', icon: <Layers size={20} className="text-blue-500" /> },
                    { title: 'Version Control', desc: 'Every save creates a restore point. Experiment without fear.', icon: <History size={20} className="text-purple-500" /> },
                    { title: 'Cross-Platform Support', desc: 'Native support for ChatGPT, Claude, Gemini, Grok, and more.', icon: <Zap size={20} className="text-orange-500" /> },
                    { title: 'Cloud Sync', desc: 'Access your library from any device. Always in sync, always ready.', icon: <Shield size={20} className="text-green-500" /> }
                  ].map((feature, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1">{feature.icon}</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">{feature.title}</h4>
                        <p className="text-gray-500 text-sm">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-2 rounded-3xl shadow-2xl border border-gray-100 rotate-2 hidden lg:block">
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                  <div className="space-y-4">
                    <div className="h-4 w-3/4 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-32 w-full bg-white rounded-xl border border-gray-200 flex items-center justify-center">
                      <Sparkles className="text-gray-200" size={32} />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-8 w-24 bg-gray-900 rounded-lg" />
                      <div className="h-8 w-8 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="bg-gray-900 rounded-[2.5rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 blur-3xl rounded-full" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to organize your <br />AI intelligence?</h2>
                <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">Join the exclusive community of AI artisans using PromptNest.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={() => setShowBuyModal(true)}
                    className="px-10 py-4 bg-white text-gray-900 hover:bg-gray-100 text-base font-bold rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={18} /> Get License Now
                  </button>
                  <button
                    onClick={onGetStarted}
                    className="px-10 py-4 bg-transparent border-2 border-white/30 text-white hover:bg-white/10 text-base font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Lock size={18} /> Already have license?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-80">
            <img src="https://ui-avatars.com/api/?name=PN&background=111&color=fff&size=64&bold=true" className="w-6 h-6 rounded-md grayscale" alt="Logo" />
            <span className="font-bold text-gray-900">PromptNest</span>
          </div>
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} PromptNest. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <button onClick={() => setShowBuyModal(true)} className="hover:text-gray-900 cursor-pointer">Get License</button>
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Support</a>
          </div>
        </div>
      </footer>

      {/* Purchase Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBuyModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Your License</h3>
              <p className="text-gray-500 text-sm">Choose your preferred payment platform</p>
            </div>

            <div className="space-y-4">
              {/* Lynk.id - Indonesia */}
              <a
                href={PURCHASE_LINKS.lynkId}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-white border-2 border-red-100 rounded-2xl hover:border-red-300 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <span className="text-2xl">🇮🇩</span>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-gray-900">Lynk.id</h4>
                  <p className="text-xs text-gray-500">Indonesia • Rupiah (IDR)</p>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" size={20} />
              </a>

              {/* Gumroad - Global */}
              <a
                href={PURCHASE_LINKS.gumroad}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-white border-2 border-pink-100 rounded-2xl hover:border-pink-300 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                  <Globe className="text-pink-600" size={24} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-gray-900">Gumroad</h4>
                  <p className="text-xs text-gray-500">Global • USD / International</p>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" size={20} />
              </a>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              After purchase, you'll receive your license key via email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const History = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
  </svg>
);

export default LandingPage;