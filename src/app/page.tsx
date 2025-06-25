'use client'

import { useEffect } from 'react'

export default function HomePage() {
  useEffect(() => {
    // Redirect to login page
    window.location.href = '/login'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">LPG Cylinder Testing System</h1>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
