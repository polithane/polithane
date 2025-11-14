'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '../types'

interface NavbarProps {
  currentUser?: {
    id: string
    name: string
    username: string
    role: UserRole
    avatar?: string
  }
}

export default function Navbar({ currentUser }: NavbarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Ana Sayfa', icon: '🏠' },
    { href: '/kesfet', label: 'Keşfet', icon: '🔍' },
    { href: '/trend', label: 'Trend', icon: '🔥' },
    { href: '/gundem', label: 'Gündem', icon: '📰' },
    { href: '/medya', label: 'Medya', icon: '📺' },
    { href: '/teskilat', label: 'Teşkilat', icon: '🗺️' },
    { href: '/analitik', label: 'Analitik', icon: '📊' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-3xl group-hover:scale-110 transition-transform">🏛️</span>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">PolitPlatform</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ara..."
                  className="w-64 px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </div>

            {/* Post Button - handled by parent pages */}

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-xl">🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile */}
            <Link href="/profil" className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <span className="hidden lg:block text-sm font-medium text-gray-700">
                {currentUser?.name || 'Kullanıcı'}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden border-t border-gray-200 px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive(item.href)
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
