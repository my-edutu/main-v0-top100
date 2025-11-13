'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Settings, Globe, Mail, Lock, Shield, Users, Database, Server, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    siteName: 'Top100 Africa Future Leaders',
    siteDescription: 'Showcasing Africa\'s emerging leaders',
    siteUrl: 'https://top100afl.org',
    contactEmail: 'admin@top100afl.org',
    socialLinks: {
      twitter: 'https://twitter.com/top100afl',
      linkedin: 'https://linkedin.com/company/top100afl',
      instagram: 'https://instagram.com/top100afl',
    },
    registrationEnabled: true,
    newsletterEnabled: true,
    maintenanceMode: false,
  })

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()

      setFormData({
        siteName: data.site_name || '',
        siteDescription: data.site_description || '',
        siteUrl: data.site_url || '',
        contactEmail: data.contact_email || '',
        socialLinks: data.social_links || {},
        registrationEnabled: Boolean(data.registration_enabled),
        newsletterEnabled: Boolean(data.newsletter_enabled),
        maintenanceMode: Boolean(data.maintenance_mode),
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSocialChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      toast.loading('Saving settings...', { id: 'save-settings' })

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: formData.siteName,
          site_description: formData.siteDescription,
          site_url: formData.siteUrl,
          contact_email: formData.contactEmail,
          social_links: formData.socialLinks,
          registration_enabled: formData.registrationEnabled,
          newsletter_enabled: formData.newsletterEnabled,
          maintenance_mode: formData.maintenanceMode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save settings')
      }

      toast.success('Settings saved successfully!', { id: 'save-settings' })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to save settings',
        { id: 'save-settings' }
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
          Site Settings
        </h1>
        <p className="text-muted-foreground">Configure your platform settings and preferences</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* General Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                General Settings
              </CardTitle>
              <CardDescription>Basic information about your platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={formData.siteName}
                    onChange={(e) => handleInputChange('siteName', e.target.value)}
                    placeholder="Platform name"
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={formData.siteUrl}
                    onChange={(e) => handleInputChange('siteUrl', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="siteDescription">Description</Label>
                <Textarea
                  id="siteDescription"
                  value={formData.siteDescription}
                  onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                  placeholder="Brief description of your platform"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-500" />
                Contact Information
              </CardTitle>
              <CardDescription>How users can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Social Links
              </CardTitle>
              <CardDescription>Connect with your audience on social platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={formData.socialLinks.twitter}
                  onChange={(e) => handleSocialChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/username"
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.socialLinks.linkedin}
                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.socialLinks.instagram}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/username"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                System Settings
              </CardTitle>
              <CardDescription>Platform behavior and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Registration Enabled</Label>
                  <p className="text-xs text-muted-foreground">Allow new user registrations</p>
                </div>
                <Switch
                  checked={formData.registrationEnabled}
                  onCheckedChange={(checked) => handleInputChange('registrationEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Newsletter Enabled</Label>
                  <p className="text-xs text-muted-foreground">Allow newsletter subscriptions</p>
                </div>
                <Switch
                  checked={formData.newsletterEnabled}
                  onCheckedChange={(checked) => handleInputChange('newsletterEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-xs text-muted-foreground">Temporarily disable public access</p>
                </div>
                <Switch
                  checked={formData.maintenanceMode}
                  onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-500" />
                System Management
              </CardTitle>
              <CardDescription>Administrative actions for the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                  <Server className="h-8 w-8 mb-2" />
                  <span>Backup Data</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                  <Database className="h-8 w-8 mb-2" />
                  <span>Restore Data</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                  <Lock className="h-8 w-8 mb-2" />
                  <span>Security Audit</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="lg:col-span-3 flex justify-end">
            <Button type="submit" size="lg" disabled={saving || loading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save All Settings'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}