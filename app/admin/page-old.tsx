'use client'

import { useState, useEffect, useCallback } from 'react'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 

  Users, 

  Youtube, 

  FileSpreadsheet, 

  Plus, 

  BarChart3,

  Settings,

  LogOut,

  Globe,

  GraduationCap,

  Calendar,

  MapPin,

  Activity,

  TrendingUp,

  PieChart,

  Award,

  Briefcase

} from 'lucide-react'

import { toast } from 'sonner'

const ADMIN_ENABLED = true


// Define interfaces for our data

interface Awardee {

  id: string;

  name: string;

  country?: string | null;

  course?: string | null;

  year?: number | null;

  is_featured?: boolean;

}



interface Stats {

  totalAwardees: number;

  totalCountries: number;

  totalPosts: number;

  totalFeaturedPosts: number;

  totalYouTubeVideos: number;

  recentAwardees: number;

}



export default function AdminDashboard() {

  const router = useRouter()
  if (!ADMIN_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-6 text-center text-white">
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl font-semibold">Admin console offline</h1>
          <p className="text-sm text-zinc-300">
            Internal tooling is paused while we prepare the public launch. Core team members can still reach the staging dashboard through the private link shared internally.
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

  const [courses, setCourses] = useState<{course: string, count: number}[]>([])



  // Define fetchStats before using it in useEffect

  const fetchStats = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {

    try {

      if (withSpinner) {

        setLoading(true);

      }

      

      const awardeesResponse = await fetch('/api/awardees');

      const rawAwardees = awardeesResponse.ok ? await awardeesResponse.json() : [];

      const normalizedAwardees: Awardee[] = Array.isArray(rawAwardees)

        ? rawAwardees.map((awardee: any) => {

            const parsedYear = typeof awardee.year === 'string' ? parseInt(awardee.year, 10) : awardee.year;

            const safeYear = typeof parsedYear === 'number' && !Number.isNaN(parsedYear) ? parsedYear : null;

            const trimmedCountry = awardee.country ? awardee.country.toString().trim() : null;

            const trimmedCourse = awardee.course ? awardee.course.toString().trim() : null;



            return {

              ...awardee,

              country: trimmedCountry && trimmedCountry.length > 0 ? trimmedCountry : null,

              course: trimmedCourse && trimmedCourse.length > 0 ? trimmedCourse : null,

              year: safeYear,

            } as Awardee;

          })

        : [];

      

      const postsResponse = await fetch('/api/posts');

      const posts = postsResponse.ok ? await postsResponse.json() : [];

      

      const youtubeResponse = await fetch('/api/youtube');

      const youtubeVideos = youtubeResponse.ok ? await youtubeResponse.json() : [];

      

      const totalAwardees = normalizedAwardees.length;

      const nonEmptyCountries = normalizedAwardees

        .map(awardee => awardee.country)

        .filter((value): value is string => typeof value === 'string' && value.length > 0);

      const nonEmptyCourses = normalizedAwardees

        .map(awardee => awardee.course)

        .filter((value): value is string => typeof value === 'string' && value.length > 0);

      const totalCountries = new Set(nonEmptyCountries).size;

      const totalPosts = Array.isArray(posts) ? posts.length : 0;

      const totalFeaturedPosts = Array.isArray(posts)

        ? posts.filter((post: any) => post.is_featured || post.isFeatured).length

        : 0;

      const totalYouTubeVideos = Array.isArray(youtubeVideos) ? youtubeVideos.length : 0;



      const currentYear = new Date().getFullYear();

      const currentMonth = new Date().getMonth();

      const recentAwardees = normalizedAwardees.filter(awardee => {

        if (typeof awardee.year !== 'number') {

          return false;

        }



        if (awardee.year === currentYear) {

          return true;

        }



        if (awardee.year === currentYear - 1) {

          return currentMonth < 3;

        }



        return false;

      }).length;

      

      const countryMap = new Map<string, number>();

      nonEmptyCountries.forEach(country => {

        countryMap.set(country, (countryMap.get(country) || 0) + 1);

      });

      const countriesArray = Array.from(countryMap, ([country, count]) => ({ country, count }))

        .sort((a, b) => b.count - a.count)

        .slice(0, 5);

      

      const courseMap = new Map<string, number>();

      nonEmptyCourses.forEach(course => {

        courseMap.set(course, (courseMap.get(course) || 0) + 1);

      });

      const coursesArray = Array.from(courseMap, ([course, count]) => ({ course, count }))

        .sort((a, b) => b.count - a.count)

        .slice(0, 5);

      

      setStats({

        totalAwardees,

        totalCountries,

        totalPosts,

        totalFeaturedPosts,

        totalYouTubeVideos,

        recentAwardees

      });

      setCountries(countriesArray);

      setCourses(coursesArray);

    } catch (error) {

      console.error('Error fetching stats:', error);

      if (withSpinner) {

        toast.error('Failed to load dashboard stats');

      }

    } finally {

      if (withSpinner) {

        setLoading(false);

      }

    }

  }, []);



  // Fetch stats from API

  useEffect(() => {

    fetchStats();

    

    const interval = setInterval(() => {

      fetchStats({ withSpinner: false });

    }, 30000); // Refresh every 30 seconds

    

    return () => clearInterval(interval);

  }, [fetchStats]);





  const handleLogout = async () => {
    try {
      toast.loading('Logging out...', { id: 'logout' })
      toast.success('Logged out successfully', { id: 'logout' })
      router.push('/auth/signin')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Failed to log out', { id: 'logout' })
    }

  }



  return (

    <div className="container mx-auto py-8">

      <div className="flex justify-between items-center mb-8">

        <div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">

            Admin Dashboard

          </h1>

          <p className="text-muted-foreground">Manage your Top100 Africa Future Leaders content</p>

        </div>

        <div className="flex items-center space-x-4">

          <Button variant="outline" onClick={handleLogout}>

            <LogOut className="mr-2 h-4 w-4" />

            Logout

          </Button>

        </div>

      </div>



      {/* Stats Overview Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-shadow">

          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <div>

              <CardTitle className="text-lg font-medium">Total Awardees</CardTitle>

              <CardDescription className="text-blue-100">All time awardees</CardDescription>

            </div>

            <div className="p-3 bg-blue-400/30 rounded-full">

              <Users className="h-6 w-6" />

            </div>

          </CardHeader>

          <CardContent>

            <div className="text-3xl font-bold">

              {loading ? <div className="h-8 w-16 bg-blue-400/30 rounded animate-pulse" /> : stats?.totalAwardees || 0}

            </div>

            <div className="flex items-center text-sm text-blue-100 mt-1">

              <TrendingUp className="h-4 w-4 mr-1" />

              <span>+5% from last month</span>

            </div>

          </CardContent>

        </Card>



        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-shadow">

          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <div>

              <CardTitle className="text-lg font-medium">Countries</CardTitle>

              <CardDescription className="text-green-100">Awardees by country</CardDescription>

            </div>

            <div className="p-3 bg-green-400/30 rounded-full">

              <Globe className="h-6 w-6" />

            </div>

          </CardHeader>

          <CardContent>

            <div className="text-3xl font-bold">

              {loading ? <div className="h-8 w-16 bg-green-400/30 rounded animate-pulse" /> : stats?.totalCountries || 0}

            </div>

            <div className="flex items-center text-sm text-green-100 mt-1">

              <TrendingUp className="h-4 w-4 mr-1" />

              <span>+2 from last month</span>

            </div>

          </CardContent>

        </Card>



        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-shadow">

          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <div>

              <CardTitle className="text-lg font-medium">Featured Posts</CardTitle>

              <CardDescription className="text-purple-100">Highlighted content</CardDescription>

            </div>

            <div className="p-3 bg-purple-400/30 rounded-full">

              <Award className="h-6 w-6" />

            </div>

          </CardHeader>

          <CardContent>

            <div className="text-3xl font-bold">

              {loading ? <div className="h-8 w-16 bg-purple-400/30 rounded animate-pulse" /> : stats?.totalFeaturedPosts || 0}

            </div>

            <div className="flex items-center text-sm text-purple-100 mt-1">

              <TrendingUp className="h-4 w-4 mr-1" />

              <span>+1 this week</span>

            </div>

          </CardContent>

        </Card>



        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-xl transition-shadow">

          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <div>

              <CardTitle className="text-lg font-medium">This Year</CardTitle>

              <CardDescription className="text-amber-100">New awardees in {new Date().getFullYear()}</CardDescription>

            </div>

            <div className="p-3 bg-amber-400/30 rounded-full">

              <Calendar className="h-6 w-6" />

            </div>

          </CardHeader>

          <CardContent>

            <div className="text-3xl font-bold">

              {loading ? <div className="h-8 w-16 bg-amber-400/30 rounded animate-pulse" /> : stats?.recentAwardees || 0}

            </div>

            <div className="flex items-center text-sm text-amber-100 mt-1">

              <TrendingUp className="h-4 w-4 mr-1" />

              <span>+3 from last year</span>

            </div>

          </CardContent>

        </Card>

      </div>



      {/* Distribution Stats Cards */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Top Countries Card */}

        <Card className="lg:col-span-1 hover:shadow-lg transition-shadow">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-orange-100 rounded-lg">

                <MapPin className="h-6 w-6 text-orange-600" />

              </div>

              <div>

                <CardTitle>Top Countries</CardTitle>

                <CardDescription>Most represented countries</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-4">

              {loading ? (

                Array.from({ length: 5 }).map((_, i) => (

                  <div key={i} className="flex justify-between items-center">

                    <div className="flex items-center space-x-2">

                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>

                    </div>

                    <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>

                  </div>

                ))

              ) : countries.length > 0 ? (

                countries.map((item, index) => (

                  <div key={index} className="flex justify-between items-center">

                    <div className="flex items-center space-x-2">

                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-amber-500' : 'bg-gray-500'}`}></div>

                      <span>{item.country}</span>

                    </div>

                    <span className="font-semibold">{item.count}</span>

                  </div>

                ))

              ) : (

                <p className="text-center text-muted-foreground py-4">No data available</p>

              )}

            </div>

          </CardContent>

        </Card>



        {/* Top Courses Card */}

        <Card className="lg:col-span-1 hover:shadow-lg transition-shadow">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-blue-100 rounded-lg">

                <GraduationCap className="h-6 w-6 text-blue-600" />

              </div>

              <div>

                <CardTitle>Top Courses</CardTitle>

                <CardDescription>Popular fields of study</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-4">

              {loading ? (

                Array.from({ length: 5 }).map((_, i) => (

                  <div key={i} className="flex justify-between items-center">

                    <div className="flex items-center space-x-2">

                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>

                    </div>

                    <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>

                  </div>

                ))

              ) : courses.length > 0 ? (

                courses.map((item, index) => (

                  <div key={index} className="flex justify-between items-center">

                    <div className="flex items-center space-x-2">

                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-amber-500' : 'bg-gray-500'}`}></div>

                      <span>{item.course}</span>

                    </div>

                    <span className="font-semibold">{item.count}</span>

                  </div>

                ))

              ) : (

                <p className="text-center text-muted-foreground py-4">No data available</p>

              )}

            </div>

          </CardContent>

        </Card>



        {/* Quick Actions Card */}

        <Card className="lg:col-span-1 hover:shadow-lg transition-shadow">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-purple-100 rounded-lg">

                <Activity className="h-6 w-6 text-purple-600" />

              </div>

              <div>

                <CardTitle>Quick Actions</CardTitle>

                <CardDescription>Manage your content</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="grid grid-cols-2 gap-3">

              <Button 

                className="h-14 flex flex-col justify-center py-3 bg-blue-500 hover:bg-blue-600"

                onClick={() => router.push('/admin/blog')}

              >

                <FileText className="h-5 w-5 mb-1" />

                <span className="text-xs">Blogs</span>

              </Button>

              <Button 

                className="h-14 flex flex-col justify-center py-3 bg-green-500 hover:bg-green-600"

                onClick={() => router.push('/admin/awardees')}

              >

                <Users className="h-5 w-5 mb-1" />

                <span className="text-xs">Awardees</span>

              </Button>

              <Button 

                className="h-14 flex flex-col justify-center py-3 bg-red-500 hover:bg-red-600"

                onClick={() => router.push('/admin/youtube')}

              >

                <Youtube className="h-5 w-5 mb-1" />

                <span className="text-xs">YouTube</span>

              </Button>

              <Button 

                className="h-14 flex flex-col justify-center py-3 bg-indigo-500 hover:bg-indigo-600"

                onClick={() => router.push('/admin/events')}

              >

                <Calendar className="h-5 w-5 mb-1" />

                <span className="text-xs">Events</span>

              </Button>

              <Button 

                className="h-14 flex flex-col justify-center py-3 bg-amber-500 hover:bg-amber-600"

                onClick={() => router.push('/admin/awardees/import')}

              >

                <FileSpreadsheet className="h-5 w-5 mb-1" />

                <span className="text-xs">Import</span>

              </Button>

            </div>

          </CardContent>

        </Card>

      </div>



      {/* Content Management Cards */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Blog Management Card */}

        <Card className="hover:shadow-xl transition-all border-l-4 border-l-blue-500">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-blue-100 rounded-lg">

                <FileText className="h-6 w-6 text-blue-600" />

              </div>

              <div>

                <CardTitle>Blog Management</CardTitle>

                <CardDescription>Manage featured and regular blog posts</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              <Button 

                className="w-full bg-blue-500 hover:bg-blue-600 text-white" 

                onClick={() => router.push('/admin/blog')}

              >

                <BarChart3 className="mr-2 h-4 w-4" />

                View All Posts

              </Button>

              <Button 

                variant="outline" 

                className="w-full" 

                onClick={() => router.push('/admin/blog/new')}

              >

                <Plus className="mr-2 h-4 w-4" />

                Create New Post

              </Button>

            </div>

          </CardContent>

        </Card>



        {/* Events Management Card */}

        <Card className="hover:shadow-xl transition-all border-l-4 border-l-orange-500">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-orange-100 rounded-lg">

                <Calendar className="h-6 w-6 text-orange-600" />

              </div>

              <div>

                <CardTitle>Events Management</CardTitle>

                <CardDescription>Curate your program timeline and registration links</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              <Button 

                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" 

                onClick={() => router.push('/admin/events')}

              >

                <Calendar className="mr-2 h-4 w-4" />

                Manage Events

              </Button>

              <Button 

                variant="outline" 

                className="w-full" 

                onClick={() => router.push('/admin/events?create=1')}

              >

                <Plus className="mr-2 h-4 w-4" />

                Add New Event

              </Button>

            </div>

          </CardContent>

        </Card>



        {/* Awardees Management Card */}

        <Card className="hover:shadow-xl transition-all border-l-4 border-l-green-500">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-green-100 rounded-lg">

                <Users className="h-6 w-6 text-green-600" />

              </div>

              <div>

                <CardTitle>Awardees Management</CardTitle>

                <CardDescription>Add, update, and import awardees via Excel</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              <Button 

                className="w-full bg-green-500 hover:bg-green-600 text-white" 

                onClick={() => router.push('/admin/awardees')}

              >

                <Users className="mr-2 h-4 w-4" />

                Manage Awardees

              </Button>

              <Button 

                variant="outline" 

                className="w-full" 

                onClick={() => router.push('/admin/awardees/import')}

              >

                <FileSpreadsheet className="mr-2 h-4 w-4" />

                Import via Excel

              </Button>

            </div>

          </CardContent>

        </Card>



        {/* YouTube Links Card */}

        <Card className="hover:shadow-xl transition-all border-l-4 border-l-red-500">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-red-100 rounded-lg">

                <Youtube className="h-6 w-6 text-red-600" />

              </div>

              <div>

                <CardTitle>YouTube Management</CardTitle>

                <CardDescription>Update YouTube links in real-time</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              <Button 

                className="w-full bg-red-500 hover:bg-red-600 text-white" 

                onClick={() => router.push('/admin/youtube')}

              >

                <Youtube className="mr-2 h-4 w-4" />

                Manage YouTube Links

              </Button>

            </div>

          </CardContent>

        </Card>

      </div>



      {/* Additional Feature Cards */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Analytics Card */}

        <Card className="hover:shadow-xl transition-all border-l-4 border-l-purple-500">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-purple-100 rounded-lg">

                <BarChart3 className="h-6 w-6 text-purple-600" />

              </div>

              <div>

                <CardTitle>Analytics</CardTitle>

                <CardDescription>View content performance metrics</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              <Button 

                className="w-full bg-purple-500 hover:bg-purple-600 text-white"

                onClick={() => router.push('/admin/analytics')}

              >

                <BarChart3 className="mr-2 h-4 w-4" />

                View Analytics

              </Button>

            </div>

          </CardContent>

        </Card>



        {/* Settings Card */}

        <Card className="hover:shadow-xl transition-all border-l-4 border-l-gray-500">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-gray-100 rounded-lg">

                <Settings className="h-6 w-6 text-gray-600" />

              </div>

              <div>

                <CardTitle>Settings</CardTitle>

                <CardDescription>Manage site settings and configurations</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              <Button
                className="w-full bg-gray-500 hover:bg-gray-600 text-white"
                onClick={() => router.push('/admin/settings')}
              >

                <Settings className="mr-2 h-4 w-4" />

                Site Settings

              </Button>

            </div>

          </CardContent>

        </Card>



        {/* Content Overview Card */}

        <Card className="hover:shadow-xl transition-all border-l-4 border-l-amber-500">

          <CardHeader>

            <div className="flex items-center space-x-3">

              <div className="p-2 bg-amber-100 rounded-lg">

                <BarChart3 className="h-6 w-6 text-amber-600" />

              </div>

              <div>

                <CardTitle>Content Overview</CardTitle>

                <CardDescription>Quick stats about your content</CardDescription>

              </div>

            </div>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              <div className="flex justify-between">

                <span>Active Posts:</span>

                <span className="font-semibold">{stats?.totalPosts || 0}</span>

              </div>

              <div className="flex justify-between">

                <span>Featured Posts:</span>

                <span className="font-semibold">{stats?.totalFeaturedPosts || 0}</span>

              </div>

              <div className="flex justify-between">

                <span>Awardees:</span>

                <span className="font-semibold">{stats?.totalAwardees || 0}</span>

              </div>

              <div className="flex justify-between">

                <span>YouTube Links:</span>

                <span className="font-semibold">{stats?.totalYouTubeVideos || 0}</span>

              </div>

            </div>

          </CardContent>

        </Card>

      </div>

    </div>

  )

}



