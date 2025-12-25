'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Users, Eye, Clock, TrendingUp, Calendar, Globe, Award, FileText, Youtube, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  totalAwardees: number
  totalPosts: number
  totalEvents: number
  totalVideos: number
  featuredAwardees: number
  publishedPosts: number
  upcomingEvents: number
  awardeesByCountry: { country: string; count: number }[]
  postsByStatus: { status: string; count: number }[]
  eventsByMonth: { month: string; count: number }[]
  recentActivity: { type: string; title: string; date: string }[]
}

const COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch real data from APIs
      const [awardeesRes, postsRes, eventsRes, youtubeRes] = await Promise.all([
        fetch('/api/awardees').then(r => r.ok ? r.json() : []),
        fetch('/api/posts').then(r => r.ok ? r.json() : []),
        fetch('/api/events').then(r => r.ok ? r.json() : []),
        fetch('/api/youtube').then(r => r.ok ? r.json() : [])
      ])

      const awardees = Array.isArray(awardeesRes) ? awardeesRes : []
      const posts = Array.isArray(postsRes) ? postsRes : []
      const events = Array.isArray(eventsRes) ? eventsRes : []
      const videos = Array.isArray(youtubeRes) ? youtubeRes : []

      // Process awardees by country
      const countryMap = new Map<string, number>()
      awardees.forEach((a: any) => {
        const country = a.country || 'Unknown'
        countryMap.set(country, (countryMap.get(country) || 0) + 1)
      })
      const awardeesByCountry = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // Process posts by status
      const statusMap = new Map<string, number>()
      posts.forEach((p: any) => {
        const status = p.status || 'draft'
        statusMap.set(status, (statusMap.get(status) || 0) + 1)
      })
      const postsByStatus = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status: status.charAt(0).toUpperCase() + status.slice(1), count }))

      // Process events by month
      const monthMap = new Map<string, number>()
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      events.forEach((e: any) => {
        const date = new Date(e.start_at || e.created_at)
        const month = monthNames[date.getMonth()]
        monthMap.set(month, (monthMap.get(month) || 0) + 1)
      })
      const eventsByMonth = monthNames.map(month => ({
        month,
        count: monthMap.get(month) || 0
      }))

      // Recent activity
      const allItems = [
        ...awardees.slice(0, 3).map((a: any) => ({ type: 'Awardee', title: a.name, date: a.created_at })),
        ...posts.slice(0, 3).map((p: any) => ({ type: 'Post', title: p.title, date: p.created_at })),
        ...events.slice(0, 3).map((e: any) => ({ type: 'Event', title: e.title, date: e.created_at }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)

      const now = new Date()
      const upcomingEvents = events.filter((e: any) => new Date(e.start_at) > now).length

      setData({
        totalAwardees: awardees.length,
        totalPosts: posts.length,
        totalEvents: events.length,
        totalVideos: videos.length,
        featuredAwardees: awardees.filter((a: any) => a.featured).length,
        publishedPosts: posts.filter((p: any) => p.status === 'published').length,
        upcomingEvents,
        awardeesByCountry,
        postsByStatus,
        eventsByMonth,
        recentActivity: allItems
      })
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()

    // Set up real-time subscriptions
    const channels = [
      supabase.channel('analytics-awardees').on('postgres_changes', { event: '*', schema: 'public', table: 'awardees' }, () => fetchAnalytics()),
      supabase.channel('analytics-posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchAnalytics()),
      supabase.channel('analytics-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchAnalytics())
    ]

    channels.forEach(ch => ch.subscribe())

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [fetchAnalytics])

  const StatCard = ({ title, value, icon: Icon, gradient, description }: {
    title: string
    value: number | string
    icon: any
    gradient: string
    description?: string
  }) => (
    <div className={cn(
      "relative p-5 rounded-[2rem] bg-gradient-to-br overflow-hidden transition-all hover:scale-[1.02] hover:-translate-y-1 duration-300 group",
      gradient
    )}>
      <Icon className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-10 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
      <div className="relative z-10 space-y-3">
        <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-3xl font-black text-white">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{title}</p>
          {description && <p className="text-[10px] text-white/60 mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-20 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Live Analytics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
            Platform <span className="text-emerald-500">Insights</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">
            Real-time metrics synced with your database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-[10px]">
              Updated {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchAnalytics}
            disabled={loading}
            className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl h-10"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p>Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Awardees"
              value={data?.totalAwardees || 0}
              icon={Users}
              gradient="from-orange-500 to-amber-500 shadow-orange-500/20"
              description={`${data?.featuredAwardees || 0} featured`}
            />
            <StatCard
              title="Total Posts"
              value={data?.totalPosts || 0}
              icon={FileText}
              gradient="from-purple-600 to-indigo-600 shadow-purple-500/20"
              description={`${data?.publishedPosts || 0} published`}
            />
            <StatCard
              title="Total Events"
              value={data?.totalEvents || 0}
              icon={Calendar}
              gradient="from-emerald-500 to-teal-600 shadow-emerald-500/20"
              description={`${data?.upcomingEvents || 0} upcoming`}
            />
            <StatCard
              title="YouTube Videos"
              value={data?.totalVideos || 0}
              icon={Youtube}
              gradient="from-rose-500 to-red-600 shadow-rose-500/20"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Awardees by Country */}
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-white/5 px-6 py-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-orange-500" />
                  Awardees by Country
                </CardTitle>
                <CardDescription className="text-zinc-500">Top represented nations</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.awardeesByCountry} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" stroke="#71717a" fontSize={12} />
                    <YAxis dataKey="country" type="category" stroke="#71717a" fontSize={11} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#f97316" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Events by Month */}
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-white/5 px-6 py-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  Events Timeline
                </CardTitle>
                <CardDescription className="text-zinc-500">Events distribution by month</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data?.eventsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Content Distribution */}
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-white/5 px-6 py-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  Post Status Distribution
                </CardTitle>
                <CardDescription className="text-zinc-500">Content by publication status</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data?.postsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                      label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data?.postsByStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-white/5 px-6 py-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-zinc-500">Latest changes across the platform</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {data?.recentActivity.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        item.type === 'Awardee' && "bg-orange-500/20 text-orange-500",
                        item.type === 'Post' && "bg-purple-500/20 text-purple-500",
                        item.type === 'Event' && "bg-emerald-500/20 text-emerald-500"
                      )}>
                        {item.type === 'Awardee' && <Users className="h-5 w-5" />}
                        {item.type === 'Post' && <FileText className="h-5 w-5" />}
                        {item.type === 'Event' && <Calendar className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        <p className="text-xs text-zinc-500">{item.type}</p>
                      </div>
                      <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {(!data?.recentActivity || data.recentActivity.length === 0) && (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}