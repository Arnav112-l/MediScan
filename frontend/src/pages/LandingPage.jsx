import React from 'react';
import { Link } from 'react-router-dom';
import { Search, UploadCloud, MessageSquare, Bell, FileText, CheckCircle2, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

const LandingPage = () => {
  const trustedLogos = [
    { name: 'Tata 1mg', img: 'TATA 1mg' },
    { name: 'PharmEasy', img: 'PharmEasy' },
    { name: 'Apollo', img: 'Apollo' },
    { name: 'Netmeds', img: 'netmeds' },
    { name: 'TrueMeds', img: 'truemeds' }
  ];

  // Animation variants
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-white">
      {/* Abstract Background Waves (Animated) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        <svg className="absolute w-full h-full object-cover" preserveAspectRatio="none" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path 
            animate={{ d: ["M0 250C240 100 480 400 720 300C960 200 1200 450 1440 350V800H0V250Z", "M0 270C240 120 480 380 720 320C960 180 1200 470 1440 330V800H0V270Z", "M0 250C240 100 480 400 720 300C960 200 1200 450 1440 350V800H0V250Z"] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
            stroke="#16A34A" strokeOpacity="0.1" strokeWidth="2" fill="url(#wave-gradient)"
          />
          <path d="M0 350C240 200 480 500 720 400C960 300 1200 550 1440 450" stroke="#16A34A" strokeOpacity="0.15" strokeWidth="1" fill="none"/>
          <path d="M0 450C240 300 480 600 720 500C960 400 1200 650 1440 550" stroke="#16A34A" strokeOpacity="0.05" strokeWidth="3" fill="none"/>
          <defs>
            <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse">
              <stop stopColor="#16A34A" stopOpacity="0.05"/>
              <stop offset="1" stopColor="white" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Hero Section */}
      <section className="pt-16 pb-24 lg:pt-24 lg:pb-32 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-2xl pr-4"
          >
            <motion.div variants={fadeUp} className="inline-block px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold tracking-wider uppercase mb-6 shadow-sm border border-green-100">
              AI-POWERED HEALTH INTELLIGENCE
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1B2B] tracking-tight leading-tight mb-6">
              Smarter Choices.<br />
              <span className="text-[#0f803f]">Better Health.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg text-gray-600 mb-8 leading-relaxed max-w-xl font-medium">
              Compare medicine prices across top pharmacies, upload prescriptions, track your medications, and get AI-powered health insights — all in one place.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link to="/dashboard/search" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto bg-[#0f803f] hover:bg-[#0c6b34] text-white rounded-lg px-8 py-3.5 font-bold shadow-md shadow-green-600/20 transform hover:-translate-y-1 transition-transform">
                  Compare Medicines
                </Button>
              </Link>
              <Link to="/dashboard/upload" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white border border-gray-200 text-[#0B1B2B] rounded-lg px-8 py-3.5 font-bold shadow-sm hover:bg-gray-50 transform hover:-translate-y-1 transition-transform">
                  Upload Prescription
                </Button>
              </Link>
            </motion.div>
            
            {/* Feature Icons Row */}
            <motion.div variants={staggerContainer} className="flex flex-wrap items-center gap-6 sm:gap-10 pt-4">
              {[
                { name: 'Compare Prices', icon: Search, color: 'text-green-700' },
                { name: 'Upload Prescription', icon: UploadCloud, color: 'text-purple-600' },
                { name: 'AI Assistant', icon: MessageSquare, color: 'text-gray-700' },
                { name: 'Reminders', icon: Bell, color: 'text-orange-500' },
                { name: 'Lab Reports', icon: FileText, color: 'text-red-500' },
              ].map(f => (
                <motion.div variants={fadeUp} key={f.name} className="flex flex-col items-center gap-3 group cursor-default">
                  <div className={`w-12 h-12 rounded-full border border-gray-100 bg-white shadow-sm flex items-center justify-center ${f.color} group-hover:scale-110 group-hover:shadow-md transition-all`}>
                    <f.icon size={20} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 text-center w-16 leading-tight">{f.name}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          
          {/* Right Side Mockup (Animated floating effect) */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex justify-center lg:justify-end"
          >
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative w-[300px] sm:w-[320px] shrink-0"
            >
              <div className="relative border-[12px] border-[#1C1C1E] rounded-[3rem] shadow-2xl bg-white overflow-hidden h-[620px]">
                
                {/* Dynamic Island / Notch */}
                <div className="absolute top-0 inset-x-0 h-7 bg-[#1C1C1E] rounded-b-3xl w-[45%] mx-auto z-20"></div>
                
                {/* App Header */}
                <div className="bg-[#0f803f] px-6 pt-14 pb-20 text-white rounded-b-[2rem] relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-1.5">
                      <span className="bg-white text-green-700 rounded-[4px] w-5 h-5 flex items-center justify-center text-xs font-black">+</span> 
                      MedScan
                    </h3>
                    <div className="flex gap-3 opacity-90">
                      <Search size={18} strokeWidth={2.5}/>
                      <Bell size={18} strokeWidth={2.5}/>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold">Good Morning!</h2>
                  <p className="text-sm opacity-90 mt-1 font-medium text-green-50">Take care of your health.</p>
                </div>
                
                {/* App Content */}
                <div className="px-5 -mt-12 relative z-20">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Search Medicine', icon: Search, color: 'text-[#0f803f]', delay: 0.1 },
                      { name: 'Upload Prescription', icon: UploadCloud, color: 'text-purple-600', delay: 0.2 },
                      { name: 'Reminders', icon: Bell, color: 'text-orange-500', delay: 0.3 },
                      { name: 'Adherence', icon: CheckCircle2, color: 'text-[#0f803f]', delay: 0.4 },
                      { name: 'Lab Reports', icon: FileText, color: 'text-red-500', delay: 0.5 },
                      { name: 'AI Assistant', icon: MessageSquare, color: 'text-blue-500', delay: 0.6 },
                    ].map(item => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: item.delay, duration: 0.4 }}
                        key={item.name} 
                        className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex flex-col items-center justify-center gap-3 h-[110px] hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <item.icon size={26} className={item.color} strokeWidth={2} />
                        <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{item.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Bottom Bar Indicator */}
                <div className="absolute bottom-2 inset-x-0 flex justify-center">
                  <div className="w-1/3 h-1 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* Trusted By Logos */}
      <section className="pb-16 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.p 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-sm font-bold text-[#0B1B2B] mb-8"
          >
            Trusted by thousands of users across India
          </motion.p>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-8 md:gap-16 items-center"
          >
            {trustedLogos.map((logo, idx) => (
              <motion.span 
                variants={fadeUp}
                key={idx} 
                className="text-xl md:text-2xl font-black text-[#0B1B2B] tracking-tighter flex items-center gap-1 hover:text-green-600 transition-colors cursor-pointer"
              >
                {idx === 0 && 'TATA '}
                {logo.img}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative z-10 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1B2B] mb-4">Everything you need to manage medications</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              MedScan provides a complete suite of tools to help you save money, understand your health, and stay on track with your prescriptions.
            </p>
          </motion.div>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              { title: 'Compare Prices', icon: Search, color: 'text-green-600', bg: 'bg-green-100', desc: 'Find the cheapest generic alternatives for your prescribed medicines across multiple trusted pharmacies.' },
              { title: 'Upload Prescription', icon: UploadCloud, color: 'text-purple-600', bg: 'bg-purple-100', desc: 'Instantly extract medicines from your prescription using our AI-powered OCR technology.' },
              { title: 'AI Health Assistant', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100', desc: 'Get instant answers about side-effects, dosages, and interactions safely from our AI.' },
              { title: 'Smart Reminders', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-100', desc: 'Never miss a dose with automated dashboard and WhatsApp notifications tailored to you.' },
              { title: 'Lab Report Analysis', icon: FileText, color: 'text-red-600', bg: 'bg-red-100', desc: 'Understand your complex blood reports in plain English with highlighted abnormal values.' },
              { title: 'Adherence Tracking', icon: CheckCircle2, color: 'text-[#0f803f]', bg: 'bg-green-100', desc: 'Visualize your medication adherence over time with beautiful, easy-to-read dashboard charts.' }
            ].map((feature, idx) => (
              <motion.div 
                variants={fadeUp} 
                key={idx} 
                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6`}>
                  <feature.icon size={28} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-[#0B1B2B] mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50 relative z-10 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1B2B] mb-4">How MedScan Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps to start saving on your medical bills and managing your health better.
            </p>
          </motion.div>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 relative"
          >
            {/* Connecting line for desktop */}
            <motion.div 
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-green-200 z-0 origin-left"
            ></motion.div>
            
            {[
              { step: '01', title: 'Upload Prescription', desc: 'Take a photo of your prescription. Our AI instantly reads the medicines.' },
              { step: '02', title: 'Compare Prices', desc: 'We search across top pharmacies to find the cheapest generic alternatives.' },
              { step: '03', title: 'Save Money', desc: 'Buy from the cheapest pharmacy or track your intake on your dashboard.' }
            ].map((item, i) => (
              <motion.div variants={fadeUp} key={i} className="relative z-10 flex flex-col items-center text-center">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-24 h-24 rounded-full bg-white border-4 border-green-100 flex items-center justify-center text-3xl font-black text-[#0f803f] shadow-lg mb-6 cursor-pointer"
                >
                  {item.step}
                </motion.div>
                <h3 className="text-xl font-bold text-[#0B1B2B] mb-3">{item.title}</h3>
                <p className="text-gray-600 px-4 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* NEW SECTION: Testimonials */}
      <section className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1B2B] mb-4">Loved by Patients Everywhere</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how MedScan is helping thousands save money and stay healthy.
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { name: 'Rohan Sharma', text: '"MedScan saved me over ₹1,500 on my monthly diabetes medications just by showing me cheaper generics. Absolute lifesaver!"', role: 'Patient' },
              { name: 'Priya Desai', text: '"The AI prescription reader is magic. I just snap a photo of my doctor\'s handwriting and it instantly gives me my meds and reminders."', role: 'Caregiver' },
              { name: 'Amit Patel', text: '"Uploading my blood reports and getting them explained to me in plain English is something I didn\'t know I needed until now."', role: 'Patient' }
            ].map((testimonial, i) => (
              <motion.div 
                variants={fadeUp}
                key={i} 
                className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="flex gap-1 text-[#0f803f] mb-4">
                  {[1,2,3,4,5].map(star => <Star key={star} size={18} fill="currentColor" />)}
                </div>
                <p className="text-gray-700 font-medium mb-6 leading-relaxed">
                  {testimonial.text}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1B2B] text-sm">{testimonial.name}</h4>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 bg-gray-50 relative z-10 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[#0B1B2B] mb-6">About MedScan</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                We started MedScan with a simple mission: to make healthcare transparent, accessible, and affordable for everyone in India. 
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                By leveraging AI and real-time pharmacy data, we empower patients to find the best prices for their medications and understand their health better, without the confusion.
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white shadow-sm border border-gray-100 p-6 rounded-2xl text-center">
                <p className="text-3xl font-black text-[#0f803f] mb-2">1M+</p>
                <p className="text-sm font-bold text-gray-700">Happy Users</p>
              </div>
              <div className="bg-white shadow-sm border border-gray-100 p-6 rounded-2xl text-center mt-8">
                <p className="text-3xl font-black text-blue-600 mb-2">50k+</p>
                <p className="text-sm font-bold text-gray-700">Pharmacies</p>
              </div>
              <div className="bg-white shadow-sm border border-gray-100 p-6 rounded-2xl text-center -mt-8">
                <p className="text-3xl font-black text-orange-600 mb-2">₹10Cr+</p>
                <p className="text-sm font-bold text-gray-700">Money Saved</p>
              </div>
              <div className="bg-white shadow-sm border border-gray-100 p-6 rounded-2xl text-center">
                <p className="text-3xl font-black text-purple-600 mb-2">4.9/5</p>
                <p className="text-sm font-bold text-gray-700">App Rating</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1B2B] mb-6">Get in Touch</h2>
            <p className="text-lg text-gray-600 mb-10">
              Have questions about how MedScan works? Our team is here to help you navigate your healthcare journey.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
                <MessageSquare className="text-[#0f803f] mb-4" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Email Support</h3>
                <p className="text-sm text-gray-500">support@medscan.in</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
                <Bell className="text-[#0f803f] mb-4" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Phone Support</h3>
                <p className="text-sm text-gray-500">+91 1800-123-4567</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0f803f] relative overflow-hidden z-10">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-white opacity-5"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-6"
          >
            Ready to take control of your health?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-green-100 text-lg mb-10 max-w-2xl mx-auto"
          >
            Join thousands of users who are making smarter choices and saving money on their healthcare every single day.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/login">
              <button className="bg-white text-[#0f803f] font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all text-lg">
                Get Started for Free
              </button>
            </Link>
          </motion.div>
        </div>
      </section>
      
    </div>
  );
};

export default LandingPage;
