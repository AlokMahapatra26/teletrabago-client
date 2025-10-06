import React from 'react'
import Link from 'next/link'
import { Button } from '../ui/button'

const LandingPage = () => {
  return (
    <main className="relative min-h-screen bg-white text-black overflow-hidden">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-white pointer-events-none" />
      
      {/* Geometric background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-black opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black opacity-5 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="max-w-5xl w-full space-y-16 text-center">
          
          {/* Hero Section */}
          <div className="space-y-8 animate-in fade-in duration-1000">
            {/* Logo/Brand */}
            <div className="inline-block">
              <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-4">
                Teletrabago
              </h1>
              <div className="h-1.5 w-full bg-black" />
            </div>
            
            {/* Value Proposition */}
            <p className="text-xl md:text-2xl lg:text-3xl font-light text-gray-600 max-w-3xl mx-auto leading-relaxed">
              The future of remote collaboration.
              <br />
              <span className="text-black font-medium">Work together, anywhere.</span>
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto py-12">
            <div className="group p-8 border-2 border-black hover:bg-black hover:text-white transition-all duration-300 cursor-default">
              <div className="text-4xl font-bold mb-3">01</div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Meetings</h3>
              <p className="text-sm opacity-70">High-quality video calls with zero latency</p>
            </div>
            
            <div className="group p-8 border-2 border-black hover:bg-black hover:text-white transition-all duration-300 cursor-default md:translate-y-8">
              <div className="text-4xl font-bold mb-3">02</div>
              <h3 className="text-lg font-semibold mb-2">Live Collaboration</h3>
              <p className="text-sm opacity-70">Edit documents and draw together instantly</p>
            </div>
            
            <div className="group p-8 border-2 border-black hover:bg-black hover:text-white transition-all duration-300 cursor-default">
              <div className="text-4xl font-bold mb-3">03</div>
              <h3 className="text-lg font-semibold mb-2">Team Spaces</h3>
              <p className="text-sm opacity-70">Organize projects with dedicated workspaces</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-8 pt-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="bg-black text-white hover:bg-gray-800 px-12 py-7 text-lg font-semibold rounded-none border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                >
                  Get Started Free
                </Button>
              </Link>
              
              <Link href="/signin">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-white text-black border-2 border-black hover:bg-gray-100 px-12 py-7 text-lg font-semibold rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                >
                  Sign In
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 font-light">
              No credit card required • Free forever plan available
            </p>
          </div>

          {/* Social Proof */}
          <div className="pt-16 border-t-2 border-black max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-6 font-semibold">
              Trusted by teams worldwide
            </p>
            <div className="flex justify-center items-center gap-12 opacity-60">
              <div className="text-2xl font-bold">500+</div>
              <div className="w-px h-8 bg-black" />
              <div className="text-2xl font-bold">Teams</div>
              <div className="w-px h-8 bg-black" />
              <div className="text-2xl font-bold">50K+</div>
              <div className="w-px h-8 bg-black" />
              <div className="text-2xl font-bold">Users</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default LandingPage
