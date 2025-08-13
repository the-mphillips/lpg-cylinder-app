"use client"

import Link from 'next/link'
import {
  FilePlus,
  User,
  LogOut,
  Settings,
  Menu,
  Moon,
  Sun,
  Users,
  Palette,
  Mail,
  Activity,
  Building,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { DynamicLogo } from '@/components/ui/dynamic-logo'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { api } from '@/lib/trpc/client'

interface User {
  id: string
  username: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string
  permissions: {
    isAdmin: boolean
    isSuperAdmin: boolean
    isSignatory: boolean
    isTester: boolean
  }
}

const settingsCategories = [
  { 
    href: "/settings?tab=users", 
    title: "User Management", 
    description: "Manage users, roles and permissions",
    icon: Users
  },
  { 
    href: "/settings?tab=app-settings", 
    title: "App Settings", 
    description: "Configure general application settings",
    icon: Settings
  },
  { 
    href: "/settings?tab=branding", 
    title: "Branding", 
    description: "Manage logos, colors and company information",
    icon: Palette
  },
  { 
    href: "/settings?tab=email", 
    title: "Email Settings", 
    description: "Configure SMTP, notifications and email logs",
    icon: Mail
  },
  { 
    href: "/settings?tab=system-logs", 
    title: "System Logs", 
    description: "View system and activity logs",
    icon: Activity
  },
  { 
    href: "/settings?tab=customers", 
    title: "Major Customers", 
    description: "Manage major customer relationships",
    icon: Building
  }
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login' || pathname === '/logout'
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()

  // Get current user with tRPC
  const { data: currentUser, isLoading: userLoading, error } = api.auth.getCurrentUser.useQuery(
    undefined,
    { 
      enabled: !isLoginPage,
      retry: false
    }
  )

  // Get branding settings for company name and theming
  const { data: systemSettings = [] } = api.admin.getSystemSettings.useQuery(
    undefined,
    { 
      enabled: !isLoginPage,
      retry: false
    }
  )
  
  // Convert array of settings to object for easier access
  const brandingSettings = systemSettings.reduce((acc: Record<string, string>, setting) => {
    acc[setting.key] = String(setting.value || '')
    return acc
  }, {})

  // Apply dynamic theming based on branding settings
  useEffect(() => {
    if (brandingSettings && typeof document !== 'undefined') {
      const root = document.documentElement
      if (brandingSettings.secondary_color) {
        // Convert hex to RGB for CSS custom properties
        const hex = brandingSettings.secondary_color.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        
        root.style.setProperty('--brand-secondary', `${r} ${g} ${b}`)
        root.style.setProperty('--brand-secondary-hex', brandingSettings.secondary_color)
      }
      if (brandingSettings.primary_color) {
        const hex = brandingSettings.primary_color.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        
        root.style.setProperty('--brand-primary', `${r} ${g} ${b}`)
        root.style.setProperty('--brand-primary-hex', brandingSettings.primary_color)
      }
    }
  }, [brandingSettings])

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false)
      return
    }

    if (!userLoading) {
      if (currentUser && !error) {
        setUser({
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          role: currentUser.role,
          permissions: currentUser.permissions
        })
      }
      setLoading(false)
    }
  }, [currentUser, userLoading, error, isLoginPage])

  const handleLogout = () => {
    window.location.href = '/logout'
  }

  const getDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user.username) {
      return user.username
    }
    if (user.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  const getInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user.username) {
      return user.username.slice(0, 2).toUpperCase()
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  // For login/logout pages, just render children
  if (isLoginPage) {
    return <>{children}</>
  }

  // Show loading state
  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // If no user at this point, middleware should have redirected
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Unable to load user data</p>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-20 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 z-50">
        {/* Logo - Bigger and more prominent */}
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-lg font-semibold"
          >
            <DynamicLogo size="xxl" className="mr-1" />
            {!(brandingSettings?.logo_light_url || brandingSettings?.logo_dark_url) && (
              <span className="hidden sm:inline-block font-bold text-xl">
                {brandingSettings?.company_name || 'BWA GAS'}
              </span>
            )}
          </Link>
        </div>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden md:flex flex-1 justify-center">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className={`text-foreground transition-colors hover:text-foreground font-medium ${
                pathname === '/dashboard' ? 'text-foreground border-b-2 border-primary pb-1' : 'text-muted-foreground'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/reports"
              className={`text-foreground transition-colors hover:text-foreground font-medium ${
                pathname.startsWith('/reports') ? 'text-foreground border-b-2 border-primary pb-1' : 'text-muted-foreground'
              }`}
            >
              Reports
            </Link>

            {/* Settings Dropdown with all categories */}
            {user.permissions.isAdmin && (
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className={`font-medium ${
                      pathname.startsWith('/settings') ? 'text-foreground border-b-2 border-primary pb-1' : 'text-muted-foreground'
                    }`}>
                      <Link
                        href="/settings"
                        className="text-foreground transition-colors hover:text-foreground font-medium"
                      >
                        Settings
                      </Link>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid w-[500px] gap-3 p-4 md:w-[600px] md:grid-cols-2">
                        {settingsCategories.map((category) => {
                          const IconComponent = category.icon
                          return (
                            <NavigationMenuLink key={category.title} asChild>
                              <Link
                                href={category.href}
                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              >
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  <div className="text-sm font-medium leading-none">{category.title}</div>
                                </div>
                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                                  {category.description}
                                </p>
                              </Link>
                            </NavigationMenuLink>
                          )
                        })}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </div>
        </nav>

        {/* Right side - Actions and User Menu */}
        <div className="flex items-center gap-4 ml-auto">
          {/* New Report Button */}
          <Button asChild size="sm" className="btn-branded">
            <Link href="/reports/new">
              <FilePlus className="h-4 w-4 mr-2" />
              New Report
            </Link>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Enhanced User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt={getDisplayName(user)} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{getDisplayName(user)}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email || 'No email'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    Role: {user.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold mb-4"
              >
                <DynamicLogo size="md" className="mr-2" />
                {!brandingSettings?.logo_light_url && (
                  <span>{brandingSettings?.company_name || 'BWA Gas'}</span>
                )}
              </Link>
              
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <Link
                href="/reports"
                className="text-muted-foreground hover:text-foreground"
              >
                Reports
              </Link>
              
              {user.permissions.isAdmin && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <p className="font-semibold mb-2">Settings</p>
                    {settingsCategories.map((category) => {
                      const IconComponent = category.icon
                      return (
                        <Link
                          key={category.title}
                          href={category.href}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2"
                        >
                          <IconComponent className="h-4 w-4" />
                          {category.title}
                        </Link>
                      )
                    })}
                  </div>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </header>
      
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  )
} 