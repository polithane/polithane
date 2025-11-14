'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Ana Sayfa', icon: '🏠' },
    { href: '/kesfet', label: 'Keşfet', icon: '🔍' },
    { href: '/trend', label: 'Trend', icon: '🔥' },
    { href: '/profil', label: 'Profil', icon: '👤' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🏛️</span>
              <span className="text-xl font-bold text-gray-900">PolitPlatform</span>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
              + Paylaş
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer">
              <span className="text-lg">👤</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
