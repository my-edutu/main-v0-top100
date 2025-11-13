'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, Eye, Clock, TrendingUp, Calendar, Globe, Award, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface AnalyticsData {
  awardeesByCountry: { country: string; count: number }[]
  postsByMonth: { month: string; posts: number }[]
  viewsByPost: { title: string; views: number }[]
  registrationByEvent: { event: string; registrations: number }[]
  userGrowth: { month: string; newUsers: number }[]
  featuredContent: { type: string; count: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        
        // In a real implementation, we would fetch this data from our API
        // For now, we'll generate mock data
        
        // Mock data for analytics
        const mockData: AnalyticsData = {
          awardeesByCountry: [
            { country: 'Nigeria', count: 42 },
            { country: 'Kenya', count: 38 },
            { country: 'South Africa', count: 35 },
            { country: 'Ghana', count: 28 },
            { country: 'Egypt', count: 22 },
          ],
          postsByMonth: [
            { month: 'Jan', posts: 12 },
            { month: 'Feb', posts: 19 },
            { month: 'Mar', posts: 15 },
            { month: 'Apr', posts: 18 },
            { month: 'May', posts: 22 },
            { month: 'Jun', posts: 17 },
          ],
          viewsByPost: [
            { title: 'Leadership Summit', views: 1245 },
            { title: 'Innovation Workshop', views: 987 },
            { title: 'Tech Conference', views: 876 },
            { title: 'Business Forum', views: 765 },
            { title: 'Education Roundtable', views: 654 },
          ],
          registrationByEvent: [
            { event: 'Leadership Summit', registrations: 250 },
            { event: 'Innovation Workshop', registrations: 198 },
            { event: 'Tech Conference', registrations: 187 },
            { event: 'Business Forum', registrations: 156 },
          ],
          userGrowth: [
            { month: 'Jan', newUsers: 45 },
            { month: 'Feb', newUsers: 52 },
            { month: 'Mar', newUsers: 48 },
            { month: 'Apr', newUsers: 60 },
            { month: 'May', newUsers: 72 },
            { month: 'Jun', newUsers: 68 },
          ],
          featuredContent: [
            { type: 'Posts', count: 12 },
            { type: 'Events', count: 8 },
            { type: 'Awardees', count: 24 },
            { type: 'YouTube', count: 15 },
          ]
        }
        
        setAnalyticsData(mockData)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const StatCard = ({ title, value, icon: Icon, color, description }: { 
    title: string, 
    value: string, 
    icon: any, 
    color: string,
    description?: string
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">Performance metrics and insights</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Awardees" 
              value="165" 
              icon={Users} 
              color="bg-blue-500" 
              description="All time registered"
            />
            <StatCard 
              title="Total Views" 
              value="24.5K" 
              icon={Eye} 
              color="bg-green-500" 
              description="This month"
            />
            <StatCard 
              title="Active Events" 
              value="8" 
              icon={Calendar} 
              color="bg-orange-500" 
              description="Currently running"
            />
            <StatCard 
              title="Featured Content" 
              value="59" 
              icon={Award} 
              color="bg-purple-500" 
              description="Highlighted items"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Awardees by Country */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Awardees by Country
                </CardTitle>
                <CardDescription>Top countries represented</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.awardeesByCountry}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Posts by Month */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Posts by Month
                </CardTitle>
                <CardDescription>Content published per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.postsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="posts" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Views by Post */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-500" />
                  Views by Post
                </CardTitle>
                <CardDescription>Most viewed content</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.viewsByPost}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Featured Content Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Featured Content Distribution
                </CardTitle>
                <CardDescription>Types of featured content</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData?.featuredContent}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData?.featuredContent.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}