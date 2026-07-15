'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
    LayoutDashboard,
    Users,
    FileText,
    Calendar,
    Youtube,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Menu,
    X,
    Plus,
    Mail,
    Bell,
    Newspaper,
    Megaphone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Awardees', href: '/admin/awardees', icon: Users },
    { label: 'Member Hub', href: '/admin/member-hub', icon: Bell },
    { label: 'Feature Requests', href: '/admin/feature-requests', icon: Newspaper },
    { label: 'Messages', href: '/admin/messages', icon: Mail },
    { label: 'Notifications', href: '/admin/notifications', icon: Bell },
    { label: 'Editorial', href: '/admin/blog', icon: FileText },
    { label: 'Programs', href: '/admin/events', icon: Calendar },
    { label: 'Channel', href: '/admin/youtube', icon: Youtube },
    { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { label: 'Insights', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
]


interface AdminSidebarProps {
    collapsed: boolean
    onCollapsedChange: (collapsed: boolean) => void
}

export default function AdminSidebar({ collapsed, onCollapsedChange }: AdminSidebarProps) {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [navLoading, setNavLoading] = useState(false)

    useEffect(() => setMounted(true), [])

    // Close mobile menu and stop loading on route change
    useEffect(() => {
        setMobileOpen(false)
        setNavLoading(false)
    }, [pathname])

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (mobileOpen) setMobileOpen(false)
                else onCollapsedChange(true)
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [mobileOpen, onCollapsedChange])

    const handleLogout = async () => {
        const supabase = createClient()
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error('Logout failed')
        } else {
            window.location.href = '/auth/signin'
        }
    }

    if (!mounted) return null

    return (
        <>
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 z-[50] h-20 bg-white/95 backdrop-blur-xl border-b-2 border-orange-200 px-4 flex lg:hidden items-center shadow-lg shadow-orange-100/50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-200 transition-all active:scale-95"
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    <Image
                        src="/Top100 Africa Future leaders Logo .png"
                        alt="Logo"
                        width={96}
                        height={96}
                        className="object-contain drop-shadow-xl"
                        priority
                    />
                </div>
            </header>

            {/* Mobile Floating Action Button */}
            <Link
                href="/admin/awardees/new"
                aria-label="Add awardee"
                className="lg:hidden fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-300/50 active:scale-95 transition-all hover:scale-105"
            >
                <Plus className="h-7 w-7" />
            </Link>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 h-screen z-[55] transition-all duration-300 ease-in-out",
                    // Desktop: white bg, always visible
                    "lg:left-0 lg:border-r lg:border-orange-100",
                    "bg-white text-zinc-600",
                    collapsed ? "lg:w-20" : "lg:w-64",
                    // Mobile: slide in from left
                    mobileOpen ? "left-0 w-72" : "-left-72 lg:left-0",
                    "shadow-xl lg:shadow-md"
                )}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Navigation - starts at top */}
                    <nav aria-label="Admin" className="flex-1 space-y-1 pt-2 overflow-y-auto overflow-x-hidden">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
                            const Icon = item.icon
                            const showLabel = !collapsed || mobileOpen

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    aria-label={showLabel ? undefined : item.label}
                                    title={showLabel ? undefined : item.label}
                                    onClick={() => {
                                        if (pathname !== item.href) setNavLoading(true)
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                        collapsed && !mobileOpen && "lg:justify-center",
                                        isActive
                                            ? "bg-orange-50 text-orange-600 font-semibold"
                                            : "hover:bg-orange-50/50 hover:text-orange-600"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-orange-500" : "text-zinc-400 group-hover:text-orange-500")} />
                                    {showLabel && <span className="text-sm truncate">{item.label}</span>}
                                    {isActive && (
                                        <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Action Button */}
                    {(!collapsed || mobileOpen) && (
                        <div className="mb-4 px-1">
                            <Link href="/admin/awardees/new">
                                <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-none shadow-lg shadow-orange-200 rounded-xl py-5">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Awardee
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-orange-100 space-y-1">
                        {/* Collapse Button - Desktop Only */}
                        <button
                            onClick={() => onCollapsedChange(!collapsed)}
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            className="hidden lg:flex w-full items-center justify-between px-3 py-2.5 hover:bg-orange-50 text-zinc-500 hover:text-orange-600 transition-colors rounded-xl group"
                        >
                            <div className="flex items-center gap-3">
                                {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                                {!collapsed && <span className="text-sm">Collapse</span>}
                            </div>
                            {!collapsed && <span className="text-[10px] bg-orange-100 px-1.5 py-0.5 rounded text-orange-500 font-medium">ESC</span>}
                        </button>

                        <button
                            onClick={handleLogout}
                            aria-label="Log Out"
                            title={collapsed && !mobileOpen ? 'Log Out' : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors rounded-xl",
                                collapsed && !mobileOpen && "lg:justify-center"
                            )}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            {(!collapsed || mobileOpen) && <span className="text-sm">Log Out</span>}
                        </button>
                    </div>
                </div>
            </aside>
            {/* Navigation Loading Overlay - subtle top bar */}
            {navLoading && (
                <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 animate-pulse" />
            )}
        </>
    )
}
