'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Globe, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Youtube, 
  Calendar, 
  BarChart3, 
  Activity, 
  ActivityIcon, 
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Eye,
  MessageCircle,
  Settings,
  ExternalLink,
  MoreHorizontal,
  ChevronRight,
  Filter,
  Download,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

const ADMIN_ENABLED = true

interface Awardee {
  id: string
  name: string
  country?: string | null
  course?: string | null
  year?: number | null
  is_featured?: boolean
}

interface Stats {
  totalAwardees: number
  totalCountries: number
  totalPosts: number
  totalFeaturedPosts: number
  totalYouTubeVideos: number
  recentAwardees: number
  totalEvents: number
  activeUsers: number
  engagementRate: number
  pendingApprovals: number
}

interface RecentActivity {
  id: string
  title: string
  description: string
  time: string
  type: 'awardee' | 'post' | 'event' | 'youtube'
  status: 'completed' | 'pending' | 'failed'
}

interface ContentStats {
  title: string
  views: number
  likes: number
  comments: number
}

export default function AdminDashboard() {
  const router = useRouter()

  if (!ADMIN_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-6 text-center text-white">
        <div className="max-w-xl space-y-4">
          <h1 className="text-2xl font-semibold">Admin console offline</h1>
          <p className="text-sm text-zinc-300">
            Internal tooling is paused while we prepare the public launch.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-yellow-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-yellow-400"
          >
            Back to homepage
          </a>
        </div>
      </div>
    )
  }

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [countries, setCountries] = useState<{country: string, count: number}[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [contentStats, setContentStats] = useState<ContentStats[]>([])

  const fetchStats = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    try {
      if (withSpinner) setLoading(true)

      const awardeesResponse = await fetch('/api/awardees')
      const eventsResponse = await fetch('/api/events')
      const postsResponse = await fetch('/api/posts')
      const youtubeResponse = await fetch('/api/youtube')
      
      const rawAwardees = awardeesResponse.ok ? await awardeesResponse.json() : []
      const events = eventsResponse.ok ? await eventsResponse.json() : []
      const posts = postsResponse.ok ? await postsResponse.json() : []
      const youtubeVideos = youtubeResponse.ok ? await youtubeResponse.json() : []

      const normalizedAwardees: Awardee[] = Array.isArray(rawAwardees)
        ? rawAwardees.map((awardee: any) => {
            const parsedYear = typeof awardee.year === 'string' ? parseInt(awardee.year, 10) : awardee.year
            const safeYear = typeof parsedYear === 'number' && !Number.isNaN(parsedYear) ? parsedYear : null
            const trimmedCountry = awardee.country ? awardee.country.toString().trim() : null

            return {
              ...awardee,
              country: trimmedCountry && trimmedCountry.length > 0 ? trimmedCountry : null,
              year: safeYear,
            } as Awardee
          })
        : []

      const totalAwardees = normalizedAwardees.length
      const nonEmptyCountries = normalizedAwardees
        .map(awardee => awardee.country)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)

      const totalCountries = new Set(nonEmptyCountries).size
      const totalPosts = Array.isArray(posts) ? posts.length : 0
      const totalFeaturedPosts = Array.isArray(posts)
        ? posts.filter((post: any) => post.is_featured || post.isFeatured).length
        : 0
      const totalYouTubeVideos = Array.isArray(youtubeVideos) ? youtubeVideos.length : 0
      const totalEvents = Array.isArray(events) ? events.length : 0

      // Calculate recent awardees
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      const recentAwardees = normalizedAwardees.filter(awardee => {
        if (typeof awardee.year !== 'number') return false
        if (awardee.year === currentYear) return true
        if (awardee.year === currentYear - 1) return currentMonth < 3
        return false
      }).length

      // Country distribution
      const countryMap = new Map<string, number>()
      nonEmptyCountries.forEach(country => {
        countryMap.set(country, (countryMap.get(country) || 0) + 1)
      })
      const countriesArray = Array.from(countryMap, ([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Simulate other stats
      const activeUsers = 245
      const engagementRate = 78.3
      const pendingApprovals = 7

      setStats({
        totalAwardees,
        totalCountries,
        totalPosts,
        totalFeaturedPosts,
        totalYouTubeVideos,
        recentAwardees,
        totalEvents,
        activeUsers,
        engagementRate,
        pendingApprovals
      })
      setCountries(countriesArray)

      // Generate mock recent activity
      const mockActivity: RecentActivity[] = [
        { id: '1', title: 'New awardee added', description: 'John Doe from Nigeria', time: '2 min ago', type: 'awardee', status: 'completed' },
        { id: '2', title: 'Blog post published', description: 'Africa\'s Tech Revolution', time: '15 min ago', type: 'post', status: 'completed' },
        { id: '3', title: 'Event scheduled', description: 'Leadership Summit 2024', time: '35 min ago', type: 'event', status: 'completed' },
        { id: '4', title: 'Content pending approval', description: 'New blog post', time: '1 hour ago', type: 'post', status: 'pending' },
        { id: '5', title: 'YouTube video added', description: 'Awardee interview', time: '2 hours ago', type: 'youtube', status: 'completed' },
      ]
      setRecentActivity(mockActivity)

      // Generate mock content stats
      const mockContentStats: ContentStats[] = [
        { title: 'Africa\'s Tech Revolution', views: 12450, likes: 820, comments: 42 },
        { title: 'Rising Leaders in Agriculture', views: 9800, likes: 640, comments: 35 },
        { title: 'Education for All Initiative', views: 8250, likes: 530, comments: 28 },
        { title: 'Sustainable Energy Solutions', views: 7600, likes: 480, comments: 31 },
      ]
      setContentStats(mockContentStats)

    } catch (error) {
      console.error('Error fetching stats:', error)
      if (withSpinner) toast.error('Failed to load dashboard stats')
    } finally {
      if (withSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    const interval = setInterval(() => {
      fetchStats({ withSpinner: false })
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchStats])

  // KPI Card Component with gradient backgrounds
  const KPICard = ({ title, value, change, icon: Icon, trend, gradient }: { 
    title: string, 
    value: number | string, 
    change: string, 
    icon: React.ComponentType<{ className?: string }>, 
    trend: 'up' | 'down',
    gradient: string 
  }) => (
    <Card className={`hover:shadow-xl transition-all ${gradient}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
          <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-200' : 'text-red-200'}`}>
          {trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          <span className="text-white/90">{change}</span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2 text-lg">Welcome back! Here's what's happening with your platform.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Executive Summary - KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Awardees" 
          value={stats?.totalAwardees || 0} 
          change="+12% from last month" 
          icon={Users} 
          trend="up" 
          gradient="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
        />
        <KPICard 
          title="Countries" 
          value={stats?.totalCountries || 0} 
          change="+3 new countries" 
          icon={Globe} 
          trend="up" 
          gradient="bg-gradient-to-br from-green-500 to-green-600 text-white"
        />
        <KPICard 
          title="Active Users" 
          value={stats?.activeUsers || 0} 
          change="+5.2% from last month" 
          icon={Activity} 
          trend="up" 
          gradient="bg-gradient-to-br from-purple-500 to-purple-600 text-white"
        />
        <KPICard 
          title="Engagement Rate" 
          value={`${stats?.engagementRate || 0}%`} 
          change="+2.1% from last month" 
          icon={BarChart3} 
          trend="up" 
          gradient="bg-gradient-to-br from-amber-500 to-amber-600 text-white"
        />
      </div>

      {/* Content Management and Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Management Hub */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Content Management</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage and organize all platform content</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/blog')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Awardees */}
              <button
                onClick={() => router.push('/admin/awardees')}
                className="flex flex-col items-center justify-center p-5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <span className="text-base font-semibold mb-1">Awardees</span>
                <span className="text-sm text-white/90">{stats?.totalAwardees || 0}</span>
              </button>
              
              {/* Blog Posts */}
              <button
                onClick={() => router.push('/admin/blog')}
                className="flex flex-col items-center justify-center p-5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <span className="text-base font-semibold mb-1">Blog Posts</span>
                <span className="text-sm text-white/90">{stats?.totalPosts || 0}</span>
              </button>
              
              {/* Events */}
              <button
                onClick={() => router.push('/admin/events')}
                className="flex flex-col items-center justify-center p-5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <span className="text-base font-semibold mb-1">Events</span>
                <span className="text-sm text-white/90">{stats?.totalEvents || 0}</span>
              </button>
              
              {/* YouTube */}
              <button
                onClick={() => router.push('/admin/youtube')}
                className="flex flex-col items-center justify-center p-5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <div className="p-3 rounded-full bg-white/20 mb-3">
                  <Youtube className="h-7 w-7 text-white" />
                </div>
                <span className="text-base font-semibold mb-1">YouTube</span>
                <span className="text-sm text-white/90">{stats?.totalYouTubeVideos || 0}</span>
              </button>
            </div>

            {/* Pending Approvals */}
            <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-start">
                <div className="p-2 rounded-lg bg-amber-100 mr-3">
                  <AlertCircle className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-amber-800">Pending Approvals</h3>
                    <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {stats?.pendingApprovals || 0} items
                    </span>
                  </div>
                  <p className="mt-2 text-amber-700">
                    Review and approve content before it goes live on the platform.
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/admin/blog?status=pending');
                    }}
                  >
                    Review Items
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Recent Activity</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Latest platform updates</p>
              </div>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-4 pb-4 last:pb-0">
                    <div className="h-12 w-12 rounded-xl bg-gray-200 animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  </div>
                ))
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 pb-4 last:pb-0 group hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <div className={`p-3 rounded-xl flex items-center justify-center ${
                      activity.type === 'awardee' ? 'bg-blue-100' :
                      activity.type === 'post' ? 'bg-green-100' :
                      activity.type === 'event' ? 'bg-orange-100' : 'bg-red-100'
                    }`}>
                      {activity.type === 'awardee' && <UserPlus className="h-6 w-6 text-blue-600" />}
                      {activity.type === 'post' && <FileText className="h-6 w-6 text-green-600" />}
                      {activity.type === 'event' && <Calendar className="h-6 w-6 text-orange-600" />}
                      {activity.type === 'youtube' && <Youtube className="h-6 w-6 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900 truncate">{activity.title}</p>
                      <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-gray-500">{activity.time}</span>
                        {activity.status === 'completed' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" /> Completed
                          </span>
                        )}
                        {activity.status === 'pending' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-6 text-base">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Performance and Top Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Content Performance */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Content Performance</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Top-performing content metrics</p>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {contentStats.map((content, index) => (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-900 truncate">{content.title}</p>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <Eye className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{content.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <ActivityIcon className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{content.likes.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MessageCircle className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{content.comments}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Top Countries</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Geographic distribution of awardees</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/awardees')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center p-3">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-10 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))
              ) : countries.length > 0 ? (
                countries.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 group hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`
                        h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white
                        ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                          'bg-gradient-to-br from-blue-400 to-blue-600'}
                      `}>
                        {index + 1}
                      </div>
                      <span className="text-base font-medium text-gray-900">{item.country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-bold text-gray-700">{item.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-6 text-base">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => router.push('/admin/awardees/import')}
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <div className="p-3 rounded-full bg-white/20 mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <span className="text-base font-semibold">Import Awardees</span>
        </button>
        <button
          onClick={() => router.push('/admin/blog/new')}
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <div className="p-3 rounded-full bg-white/20 mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <span className="text-base font-semibold">Create Post</span>
        </button>
        <button
          onClick={() => router.push('/admin/events?create=1')}
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <div className="p-3 rounded-full bg-white/20 mb-3">
            <Calendar className="h-6 w-6" />
          </div>
          <span className="text-base font-semibold">Add Event</span>
        </button>
        <button
          onClick={() => router.push('/admin/analytics')}
          className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <div className="p-3 rounded-full bg-white/20 mb-3">
            <BarChart3 className="h-6 w-6" />
          </div>
          <span className="text-base font-semibold">Analytics</span>
        </button>
      </div>
    </div>
  )
}
