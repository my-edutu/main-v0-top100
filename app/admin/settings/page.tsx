'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Settings, Globe, Mail, Lock, Shield, Users, Database, Server, Loader2,
  Search, Code, Palette, Layout, FileText, Bell, BarChart3, Key, Wrench
} from 'lucide-react'

type FormData = {
  // General
  siteName: string
  siteDescription: string
  siteUrl: string
  siteTagline: string
  contactEmail: string
  supportEmail: string

  // Social Links
  socialLinks: {
    twitter: string
    linkedin: string
    instagram: string
    facebook: string
    youtube: string
    tiktok: string
  }

  // SEO
  seoMetaTitle: string
  seoMetaDescription: string
  seoMetaKeywords: string
  seoOgImage: string
  seoTwitterCard: string
  googleAnalyticsId: string
  googleTagManagerId: string
  googleSearchConsoleVerification: string
  facebookPixelId: string

  // Branding
  logoUrl: string
  logoDarkUrl: string
  faviconUrl: string
  primaryColor: string
  secondaryColor: string
  accentColor: string

  // Email/SMTP
  smtpHost: string
  smtpPort: string
  smtpUsername: string
  smtpPassword: string
  smtpFromEmail: string
  smtpFromName: string
  emailFooterText: string

  // Homepage
  heroTitle: string
  heroSubtitle: string
  heroCtaText: string
  heroCtaUrl: string
  heroBackgroundImage: string
  heroVideoUrl: string
  showHeroSection: boolean
  showFeaturedAwardees: boolean
  showRecentEvents: boolean
  showBlogSection: boolean
  showImpactSection: boolean
  showNewsletterSection: boolean
  featuredAwardeesTitle: string
  featuredAwardeesCount: string

  // Footer
  footerAboutText: string
  footerCopyright: string
  showFooterSocial: boolean
  showFooterNewsletter: boolean

  // Feature Toggles
  registrationEnabled: boolean
  newsletterEnabled: boolean
  blogEnabled: boolean
  eventsEnabled: boolean
  awardeesDirectoryEnabled: boolean
  contactFormEnabled: boolean

  // System
  maintenanceMode: boolean
  maintenanceMessage: string
  allowPublicProfiles: boolean
  requireEmailVerification: boolean
  maxUploadSizeMb: string

  // API Keys
  youtubeApiKey: string
  googleMapsApiKey: string
  recaptchaSiteKey: string
  recaptchaSecretKey: string
  brevoApiKey: string
  cloudinaryCloudName: string
  cloudinaryApiKey: string
  cloudinaryApiSecret: string

  // Content Moderation
  enableCommentModeration: boolean
  enableProfanityFilter: boolean
  autoApproveComments: boolean

  // Notifications
  adminNotificationEmail: string
  notifyOnNewRegistration: boolean
  notifyOnNewContactMessage: boolean
  notifyOnNewBlogComment: boolean

  // Advanced
  customCss: string
  customJs: string
  customHeadHtml: string
  robotsTxt: string
  sitemapEnabled: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState<FormData>({
    siteName: '',
    siteDescription: '',
    siteUrl: '',
    siteTagline: '',
    contactEmail: '',
    supportEmail: '',
    socialLinks: {
      twitter: '',
      linkedin: '',
      instagram: '',
      facebook: '',
      youtube: '',
      tiktok: ''
    },
    seoMetaTitle: '',
    seoMetaDescription: '',
    seoMetaKeywords: '',
    seoOgImage: '',
    seoTwitterCard: 'summary_large_image',
    googleAnalyticsId: '',
    googleTagManagerId: '',
    googleSearchConsoleVerification: '',
    facebookPixelId: '',
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    accentColor: '#0066cc',
    smtpHost: '',
    smtpPort: '',
    smtpUsername: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: '',
    emailFooterText: '',
    heroTitle: '',
    heroSubtitle: '',
    heroCtaText: '',
    heroCtaUrl: '',
    heroBackgroundImage: '',
    heroVideoUrl: '',
    showHeroSection: true,
    showFeaturedAwardees: true,
    showRecentEvents: true,
    showBlogSection: true,
    showImpactSection: true,
    showNewsletterSection: true,
    featuredAwardeesTitle: '',
    featuredAwardeesCount: '6',
    footerAboutText: '',
    footerCopyright: '',
    showFooterSocial: true,
    showFooterNewsletter: true,
    registrationEnabled: true,
    newsletterEnabled: true,
    blogEnabled: true,
    eventsEnabled: true,
    awardeesDirectoryEnabled: true,
    contactFormEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: '',
    allowPublicProfiles: true,
    requireEmailVerification: true,
    maxUploadSizeMb: '10',
    youtubeApiKey: '',
    googleMapsApiKey: '',
    recaptchaSiteKey: '',
    recaptchaSecretKey: '',
    brevoApiKey: '',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
    enableCommentModeration: true,
    enableProfanityFilter: true,
    autoApproveComments: false,
    adminNotificationEmail: '',
    notifyOnNewRegistration: true,
    notifyOnNewContactMessage: true,
    notifyOnNewBlogComment: false,
    customCss: '',
    customJs: '',
    customHeadHtml: '',
    robotsTxt: '',
    sitemapEnabled: true,
  })

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
        siteTagline: data.site_tagline || '',
        contactEmail: data.contact_email || '',
        supportEmail: data.support_email || '',
        socialLinks: data.social_links || {},
        seoMetaTitle: data.seo_meta_title || '',
        seoMetaDescription: data.seo_meta_description || '',
        seoMetaKeywords: data.seo_meta_keywords?.join(', ') || '',
        seoOgImage: data.seo_og_image || '',
        seoTwitterCard: data.seo_twitter_card || 'summary_large_image',
        googleAnalyticsId: data.google_analytics_id || '',
        googleTagManagerId: data.google_tag_manager_id || '',
        googleSearchConsoleVerification: data.google_search_console_verification || '',
        facebookPixelId: data.facebook_pixel_id || '',
        logoUrl: data.logo_url || '',
        logoDarkUrl: data.logo_dark_url || '',
        faviconUrl: data.favicon_url || '',
        primaryColor: data.primary_color || '#000000',
        secondaryColor: data.secondary_color || '#666666',
        accentColor: data.accent_color || '#0066cc',
        smtpHost: data.smtp_host || '',
        smtpPort: data.smtp_port?.toString() || '',
        smtpUsername: data.smtp_username || '',
        smtpPassword: data.smtp_password || '',
        smtpFromEmail: data.smtp_from_email || '',
        smtpFromName: data.smtp_from_name || '',
        emailFooterText: data.email_footer_text || '',
        heroTitle: data.hero_title || '',
        heroSubtitle: data.hero_subtitle || '',
        heroCtaText: data.hero_cta_text || '',
        heroCtaUrl: data.hero_cta_url || '',
        heroBackgroundImage: data.hero_background_image || '',
        heroVideoUrl: data.hero_video_url || '',
        showHeroSection: Boolean(data.show_hero_section ?? true),
        showFeaturedAwardees: Boolean(data.show_featured_awardees ?? true),
        showRecentEvents: Boolean(data.show_recent_events ?? true),
        showBlogSection: Boolean(data.show_blog_section ?? true),
        showImpactSection: Boolean(data.show_impact_section ?? true),
        showNewsletterSection: Boolean(data.show_newsletter_section ?? true),
        featuredAwardeesTitle: data.featured_awardees_title || '',
        featuredAwardeesCount: data.featured_awardees_count?.toString() || '6',
        footerAboutText: data.footer_about_text || '',
        footerCopyright: data.footer_copyright || '',
        showFooterSocial: Boolean(data.show_footer_social ?? true),
        showFooterNewsletter: Boolean(data.show_footer_newsletter ?? true),
        registrationEnabled: Boolean(data.registration_enabled ?? true),
        newsletterEnabled: Boolean(data.newsletter_enabled ?? true),
        blogEnabled: Boolean(data.blog_enabled ?? true),
        eventsEnabled: Boolean(data.events_enabled ?? true),
        awardeesDirectoryEnabled: Boolean(data.awardees_directory_enabled ?? true),
        contactFormEnabled: Boolean(data.contact_form_enabled ?? true),
        maintenanceMode: Boolean(data.maintenance_mode),
        maintenanceMessage: data.maintenance_message || '',
        allowPublicProfiles: Boolean(data.allow_public_profiles ?? true),
        requireEmailVerification: Boolean(data.require_email_verification ?? true),
        maxUploadSizeMb: data.max_upload_size_mb?.toString() || '10',
        youtubeApiKey: data.youtube_api_key || '',
        googleMapsApiKey: data.google_maps_api_key || '',
        recaptchaSiteKey: data.recaptcha_site_key || '',
        recaptchaSecretKey: data.recaptcha_secret_key || '',
        brevoApiKey: data.brevo_api_key || '',
        cloudinaryCloudName: data.cloudinary_cloud_name || '',
        cloudinaryApiKey: data.cloudinary_api_key || '',
        cloudinaryApiSecret: data.cloudinary_api_secret || '',
        enableCommentModeration: Boolean(data.enable_comment_moderation ?? true),
        enableProfanityFilter: Boolean(data.enable_profanity_filter ?? true),
        autoApproveComments: Boolean(data.auto_approve_comments),
        adminNotificationEmail: data.admin_notification_email || '',
        notifyOnNewRegistration: Boolean(data.notify_on_new_registration ?? true),
        notifyOnNewContactMessage: Boolean(data.notify_on_new_contact_message ?? true),
        notifyOnNewBlogComment: Boolean(data.notify_on_new_blog_comment),
        customCss: data.custom_css || '',
        customJs: data.custom_js || '',
        customHeadHtml: data.custom_head_html || '',
        robotsTxt: data.robots_txt || '',
        sitemapEnabled: Boolean(data.sitemap_enabled ?? true),
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
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
          site_tagline: formData.siteTagline,
          contact_email: formData.contactEmail,
          support_email: formData.supportEmail,
          social_links: formData.socialLinks,
          seo_meta_title: formData.seoMetaTitle,
          seo_meta_description: formData.seoMetaDescription,
          seo_meta_keywords: formData.seoMetaKeywords.split(',').map(k => k.trim()).filter(Boolean),
          seo_og_image: formData.seoOgImage,
          seo_twitter_card: formData.seoTwitterCard,
          google_analytics_id: formData.googleAnalyticsId,
          google_tag_manager_id: formData.googleTagManagerId,
          google_search_console_verification: formData.googleSearchConsoleVerification,
          facebook_pixel_id: formData.facebookPixelId,
          logo_url: formData.logoUrl,
          logo_dark_url: formData.logoDarkUrl,
          favicon_url: formData.faviconUrl,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          accent_color: formData.accentColor,
          smtp_host: formData.smtpHost,
          smtp_port: formData.smtpPort,
          smtp_username: formData.smtpUsername,
          smtp_password: formData.smtpPassword,
          smtp_from_email: formData.smtpFromEmail,
          smtp_from_name: formData.smtpFromName,
          email_footer_text: formData.emailFooterText,
          hero_title: formData.heroTitle,
          hero_subtitle: formData.heroSubtitle,
          hero_cta_text: formData.heroCtaText,
          hero_cta_url: formData.heroCtaUrl,
          hero_background_image: formData.heroBackgroundImage,
          hero_video_url: formData.heroVideoUrl,
          show_hero_section: formData.showHeroSection,
          show_featured_awardees: formData.showFeaturedAwardees,
          show_recent_events: formData.showRecentEvents,
          show_blog_section: formData.showBlogSection,
          show_impact_section: formData.showImpactSection,
          show_newsletter_section: formData.showNewsletterSection,
          featured_awardees_title: formData.featuredAwardeesTitle,
          featured_awardees_count: formData.featuredAwardeesCount,
          footer_about_text: formData.footerAboutText,
          footer_copyright: formData.footerCopyright,
          show_footer_social: formData.showFooterSocial,
          show_footer_newsletter: formData.showFooterNewsletter,
          registration_enabled: formData.registrationEnabled,
          newsletter_enabled: formData.newsletterEnabled,
          blog_enabled: formData.blogEnabled,
          events_enabled: formData.eventsEnabled,
          awardees_directory_enabled: formData.awardeesDirectoryEnabled,
          contact_form_enabled: formData.contactFormEnabled,
          maintenance_mode: formData.maintenanceMode,
          maintenance_message: formData.maintenanceMessage,
          allow_public_profiles: formData.allowPublicProfiles,
          require_email_verification: formData.requireEmailVerification,
          max_upload_size_mb: formData.maxUploadSizeMb,
          youtube_api_key: formData.youtubeApiKey,
          google_maps_api_key: formData.googleMapsApiKey,
          recaptcha_site_key: formData.recaptchaSiteKey,
          recaptcha_secret_key: formData.recaptchaSecretKey,
          brevo_api_key: formData.brevoApiKey,
          cloudinary_cloud_name: formData.cloudinaryCloudName,
          cloudinary_api_key: formData.cloudinaryApiKey,
          cloudinary_api_secret: formData.cloudinaryApiSecret,
          enable_comment_moderation: formData.enableCommentModeration,
          enable_profanity_filter: formData.enableProfanityFilter,
          auto_approve_comments: formData.autoApproveComments,
          admin_notification_email: formData.adminNotificationEmail,
          notify_on_new_registration: formData.notifyOnNewRegistration,
          notify_on_new_contact_message: formData.notifyOnNewContactMessage,
          notify_on_new_blog_comment: formData.notifyOnNewBlogComment,
          custom_css: formData.customCss,
          custom_js: formData.customJs,
          custom_head_html: formData.customHeadHtml,
          robots_txt: formData.robotsTxt,
          sitemap_enabled: formData.sitemapEnabled,
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-10 gap-2">
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="hidden md:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">SEO</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              <span className="hidden md:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="homepage" className="flex items-center gap-1">
              <Layout className="h-4 w-4" />
              <span className="hidden md:inline">Homepage</span>
            </TabsTrigger>
            <TabsTrigger value="footer" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Footer</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span className="hidden md:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1">
              <Key className="h-4 w-4" />
              <span className="hidden md:inline">APIs</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              <span className="hidden md:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
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
                    <Label htmlFor="siteName">Site Name *</Label>
                    <Input
                      id="siteName"
                      value={formData.siteName}
                      onChange={(e) => handleInputChange('siteName', e.target.value)}
                      placeholder="Top100 Africa Future Leaders"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="siteUrl">Site URL *</Label>
                    <Input
                      id="siteUrl"
                      value={formData.siteUrl}
                      onChange={(e) => handleInputChange('siteUrl', e.target.value)}
                      placeholder="https://top100afl.org"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="siteTagline">Site Tagline</Label>
                  <Input
                    id="siteTagline"
                    value={formData.siteTagline}
                    onChange={(e) => handleInputChange('siteTagline', e.target.value)}
                    placeholder="Showcasing Africa's emerging leaders"
                  />
                </div>

                <div>
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={formData.siteDescription}
                    onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                    placeholder="Brief description of your platform"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail">Contact Email *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      placeholder="contact@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                      placeholder="support@example.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Social Links
                </CardTitle>
                <CardDescription>Connect with your audience on social platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="twitter">Twitter / X</Label>
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
                  <div>
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      value={formData.socialLinks.facebook}
                      onChange={(e) => handleSocialChange('facebook', e.target.value)}
                      placeholder="https://facebook.com/page"
                    />
                  </div>
                  <div>
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      value={formData.socialLinks.youtube}
                      onChange={(e) => handleSocialChange('youtube', e.target.value)}
                      placeholder="https://youtube.com/@channel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      value={formData.socialLinks.tiktok}
                      onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                      placeholder="https://tiktok.com/@username"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Settings */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-500" />
                  SEO & Meta Tags
                </CardTitle>
                <CardDescription>Optimize your site for search engines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seoMetaTitle">Meta Title</Label>
                  <Input
                    id="seoMetaTitle"
                    value={formData.seoMetaTitle}
                    onChange={(e) => handleInputChange('seoMetaTitle', e.target.value)}
                    placeholder="Top100 Africa Future Leaders"
                  />
                </div>
                <div>
                  <Label htmlFor="seoMetaDescription">Meta Description</Label>
                  <Textarea
                    id="seoMetaDescription"
                    value={formData.seoMetaDescription}
                    onChange={(e) => handleInputChange('seoMetaDescription', e.target.value)}
                    placeholder="Description for search engines"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="seoMetaKeywords">Meta Keywords (comma-separated)</Label>
                  <Input
                    id="seoMetaKeywords"
                    value={formData.seoMetaKeywords}
                    onChange={(e) => handleInputChange('seoMetaKeywords', e.target.value)}
                    placeholder="africa, leaders, youth, education"
                  />
                </div>
                <div>
                  <Label htmlFor="seoOgImage">Open Graph Image URL</Label>
                  <Input
                    id="seoOgImage"
                    value={formData.seoOgImage}
                    onChange={(e) => handleInputChange('seoOgImage', e.target.value)}
                    placeholder="https://example.com/og-image.jpg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  Analytics & Tracking
                </CardTitle>
                <CardDescription>Track your website performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                    <Input
                      id="googleAnalyticsId"
                      value={formData.googleAnalyticsId}
                      onChange={(e) => handleInputChange('googleAnalyticsId', e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="googleTagManagerId">Google Tag Manager ID</Label>
                    <Input
                      id="googleTagManagerId"
                      value={formData.googleTagManagerId}
                      onChange={(e) => handleInputChange('googleTagManagerId', e.target.value)}
                      placeholder="GTM-XXXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="googleSearchConsoleVerification">Search Console Verification</Label>
                    <Input
                      id="googleSearchConsoleVerification"
                      value={formData.googleSearchConsoleVerification}
                      onChange={(e) => handleInputChange('googleSearchConsoleVerification', e.target.value)}
                      placeholder="Verification code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookPixelId">Facebook Pixel ID</Label>
                    <Input
                      id="facebookPixelId"
                      value={formData.facebookPixelId}
                      onChange={(e) => handleInputChange('facebookPixelId', e.target.value)}
                      placeholder="XXXXXXXXXXXXXXX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-pink-500" />
                  Brand Assets
                </CardTitle>
                <CardDescription>Upload your logos and branding assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="logoUrl">Logo URL (Light Mode)</Label>
                  <Input
                    id="logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="logoDarkUrl">Logo URL (Dark Mode)</Label>
                  <Input
                    id="logoDarkUrl"
                    value={formData.logoDarkUrl}
                    onChange={(e) => handleInputChange('logoDarkUrl', e.target.value)}
                    placeholder="https://example.com/logo-dark.png"
                  />
                </div>
                <div>
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    value={formData.faviconUrl}
                    onChange={(e) => handleInputChange('faviconUrl', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Colors</CardTitle>
                <CardDescription>Customize your brand color palette</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        placeholder="#666666"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => handleInputChange('accentColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.accentColor}
                        onChange={(e) => handleInputChange('accentColor', e.target.value)}
                        placeholder="#0066cc"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Homepage Settings */}
          <TabsContent value="homepage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5 text-purple-500" />
                  Hero Section
                </CardTitle>
                <CardDescription>Customize your homepage hero section</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Hero Section</Label>
                    <p className="text-xs text-muted-foreground">Display the hero section on homepage</p>
                  </div>
                  <Switch
                    checked={formData.showHeroSection}
                    onCheckedChange={(checked) => handleInputChange('showHeroSection', checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="heroTitle">Hero Title</Label>
                  <Input
                    id="heroTitle"
                    value={formData.heroTitle}
                    onChange={(e) => handleInputChange('heroTitle', e.target.value)}
                    placeholder="Africa Future Leaders"
                  />
                </div>
                <div>
                  <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                  <Textarea
                    id="heroSubtitle"
                    value={formData.heroSubtitle}
                    onChange={(e) => handleInputChange('heroSubtitle', e.target.value)}
                    placeholder="Showcasing Africa's emerging leaders"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="heroCtaText">CTA Button Text</Label>
                    <Input
                      id="heroCtaText"
                      value={formData.heroCtaText}
                      onChange={(e) => handleInputChange('heroCtaText', e.target.value)}
                      placeholder="Explore Awardees"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heroCtaUrl">CTA Button URL</Label>
                    <Input
                      id="heroCtaUrl"
                      value={formData.heroCtaUrl}
                      onChange={(e) => handleInputChange('heroCtaUrl', e.target.value)}
                      placeholder="/awardees"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="heroBackgroundImage">Background Image URL</Label>
                  <Input
                    id="heroBackgroundImage"
                    value={formData.heroBackgroundImage}
                    onChange={(e) => handleInputChange('heroBackgroundImage', e.target.value)}
                    placeholder="https://example.com/hero-bg.jpg"
                  />
                </div>
                <div>
                  <Label htmlFor="heroVideoUrl">Background Video URL (optional)</Label>
                  <Input
                    id="heroVideoUrl"
                    value={formData.heroVideoUrl}
                    onChange={(e) => handleInputChange('heroVideoUrl', e.target.value)}
                    placeholder="https://example.com/hero-video.mp4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Homepage Sections</CardTitle>
                <CardDescription>Control which sections appear on your homepage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Featured Awardees</Label>
                    <p className="text-xs text-muted-foreground">Display featured awardees section</p>
                  </div>
                  <Switch
                    checked={formData.showFeaturedAwardees}
                    onCheckedChange={(checked) => handleInputChange('showFeaturedAwardees', checked)}
                  />
                </div>

                {formData.showFeaturedAwardees && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6 border-l-2 pl-4">
                    <div>
                      <Label htmlFor="featuredAwardeesTitle">Section Title</Label>
                      <Input
                        id="featuredAwardeesTitle"
                        value={formData.featuredAwardeesTitle}
                        onChange={(e) => handleInputChange('featuredAwardeesTitle', e.target.value)}
                        placeholder="Featured Awardees"
                      />
                    </div>
                    <div>
                      <Label htmlFor="featuredAwardeesCount">Number to Display</Label>
                      <Input
                        id="featuredAwardeesCount"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.featuredAwardeesCount}
                        onChange={(e) => handleInputChange('featuredAwardeesCount', e.target.value)}
                        placeholder="6"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Recent Events</Label>
                    <p className="text-xs text-muted-foreground">Display recent events section</p>
                  </div>
                  <Switch
                    checked={formData.showRecentEvents}
                    onCheckedChange={(checked) => handleInputChange('showRecentEvents', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Blog Section</Label>
                    <p className="text-xs text-muted-foreground">Display blog posts section</p>
                  </div>
                  <Switch
                    checked={formData.showBlogSection}
                    onCheckedChange={(checked) => handleInputChange('showBlogSection', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Impact Section</Label>
                    <p className="text-xs text-muted-foreground">Display impact statistics section</p>
                  </div>
                  <Switch
                    checked={formData.showImpactSection}
                    onCheckedChange={(checked) => handleInputChange('showImpactSection', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Newsletter Section</Label>
                    <p className="text-xs text-muted-foreground">Display newsletter signup section</p>
                  </div>
                  <Switch
                    checked={formData.showNewsletterSection}
                    onCheckedChange={(checked) => handleInputChange('showNewsletterSection', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Footer Settings */}
          <TabsContent value="footer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  Footer Content
                </CardTitle>
                <CardDescription>Customize your website footer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="footerAboutText">About Text</Label>
                  <Textarea
                    id="footerAboutText"
                    value={formData.footerAboutText}
                    onChange={(e) => handleInputChange('footerAboutText', e.target.value)}
                    placeholder="Brief description for the footer"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="footerCopyright">Copyright Text</Label>
                  <Input
                    id="footerCopyright"
                    value={formData.footerCopyright}
                    onChange={(e) => handleInputChange('footerCopyright', e.target.value)}
                    placeholder="© 2024 Top100 Africa Future Leaders"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Social Links</Label>
                    <p className="text-xs text-muted-foreground">Display social media icons in footer</p>
                  </div>
                  <Switch
                    checked={formData.showFooterSocial}
                    onCheckedChange={(checked) => handleInputChange('showFooterSocial', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Newsletter Signup</Label>
                    <p className="text-xs text-muted-foreground">Display newsletter form in footer</p>
                  </div>
                  <Switch
                    checked={formData.showFooterNewsletter}
                    onCheckedChange={(checked) => handleInputChange('showFooterNewsletter', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature Toggles */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  Feature Toggles
                </CardTitle>
                <CardDescription>Enable or disable website features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>User Registration</Label>
                    <p className="text-xs text-muted-foreground">Allow new user registrations</p>
                  </div>
                  <Switch
                    checked={formData.registrationEnabled}
                    onCheckedChange={(checked) => handleInputChange('registrationEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Newsletter Subscriptions</Label>
                    <p className="text-xs text-muted-foreground">Allow newsletter subscriptions</p>
                  </div>
                  <Switch
                    checked={formData.newsletterEnabled}
                    onCheckedChange={(checked) => handleInputChange('newsletterEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Blog</Label>
                    <p className="text-xs text-muted-foreground">Enable blog functionality</p>
                  </div>
                  <Switch
                    checked={formData.blogEnabled}
                    onCheckedChange={(checked) => handleInputChange('blogEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Events</Label>
                    <p className="text-xs text-muted-foreground">Enable events functionality</p>
                  </div>
                  <Switch
                    checked={formData.eventsEnabled}
                    onCheckedChange={(checked) => handleInputChange('eventsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Awardees Directory</Label>
                    <p className="text-xs text-muted-foreground">Enable awardees directory</p>
                  </div>
                  <Switch
                    checked={formData.awardeesDirectoryEnabled}
                    onCheckedChange={(checked) => handleInputChange('awardeesDirectoryEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Contact Form</Label>
                    <p className="text-xs text-muted-foreground">Enable contact form</p>
                  </div>
                  <Switch
                    checked={formData.contactFormEnabled}
                    onCheckedChange={(checked) => handleInputChange('contactFormEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-yellow-500" />
                  System Settings
                </CardTitle>
                <CardDescription>Control system-wide settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-red-600">Maintenance Mode</Label>
                    <p className="text-xs text-muted-foreground">Temporarily disable public access</p>
                  </div>
                  <Switch
                    checked={formData.maintenanceMode}
                    onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                  />
                </div>

                {formData.maintenanceMode && (
                  <div className="ml-6 border-l-2 pl-4">
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Textarea
                      id="maintenanceMessage"
                      value={formData.maintenanceMessage}
                      onChange={(e) => handleInputChange('maintenanceMessage', e.target.value)}
                      placeholder="We are currently performing maintenance..."
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Public Profiles</Label>
                    <p className="text-xs text-muted-foreground">Allow profiles to be publicly visible</p>
                  </div>
                  <Switch
                    checked={formData.allowPublicProfiles}
                    onCheckedChange={(checked) => handleInputChange('allowPublicProfiles', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Email Verification</Label>
                    <p className="text-xs text-muted-foreground">Users must verify email to access site</p>
                  </div>
                  <Switch
                    checked={formData.requireEmailVerification}
                    onCheckedChange={(checked) => handleInputChange('requireEmailVerification', checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="maxUploadSizeMb">Max Upload Size (MB)</Label>
                  <Input
                    id="maxUploadSizeMb"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxUploadSizeMb}
                    onChange={(e) => handleInputChange('maxUploadSizeMb', e.target.value)}
                    placeholder="10"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Comment Moderation</Label>
                    <p className="text-xs text-muted-foreground">Require approval for new comments</p>
                  </div>
                  <Switch
                    checked={formData.enableCommentModeration}
                    onCheckedChange={(checked) => handleInputChange('enableCommentModeration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Profanity Filter</Label>
                    <p className="text-xs text-muted-foreground">Filter inappropriate content</p>
                  </div>
                  <Switch
                    checked={formData.enableProfanityFilter}
                    onCheckedChange={(checked) => handleInputChange('enableProfanityFilter', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  SMTP Configuration
                </CardTitle>
                <CardDescription>Configure email sending settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={formData.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={formData.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpUsername">SMTP Username</Label>
                    <Input
                      id="smtpUsername"
                      value={formData.smtpUsername}
                      onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={formData.smtpPassword}
                      onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpFromEmail">From Email</Label>
                    <Input
                      id="smtpFromEmail"
                      type="email"
                      value={formData.smtpFromEmail}
                      onChange={(e) => handleInputChange('smtpFromEmail', e.target.value)}
                      placeholder="noreply@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpFromName">From Name</Label>
                    <Input
                      id="smtpFromName"
                      value={formData.smtpFromName}
                      onChange={(e) => handleInputChange('smtpFromName', e.target.value)}
                      placeholder="Top100 AFL"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="emailFooterText">Email Footer Text</Label>
                  <Textarea
                    id="emailFooterText"
                    value={formData.emailFooterText}
                    onChange={(e) => handleInputChange('emailFooterText', e.target.value)}
                    placeholder="Email footer content"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-500" />
                  API Keys & Integrations
                </CardTitle>
                <CardDescription>Configure third-party integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="youtubeApiKey">YouTube API Key</Label>
                    <Input
                      id="youtubeApiKey"
                      value={formData.youtubeApiKey}
                      onChange={(e) => handleInputChange('youtubeApiKey', e.target.value)}
                      placeholder="AIzaSy..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="googleMapsApiKey">Google Maps API Key</Label>
                    <Input
                      id="googleMapsApiKey"
                      value={formData.googleMapsApiKey}
                      onChange={(e) => handleInputChange('googleMapsApiKey', e.target.value)}
                      placeholder="AIzaSy..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="recaptchaSiteKey">reCAPTCHA Site Key</Label>
                    <Input
                      id="recaptchaSiteKey"
                      value={formData.recaptchaSiteKey}
                      onChange={(e) => handleInputChange('recaptchaSiteKey', e.target.value)}
                      placeholder="6Lc..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="recaptchaSecretKey">reCAPTCHA Secret Key</Label>
                    <Input
                      id="recaptchaSecretKey"
                      type="password"
                      value={formData.recaptchaSecretKey}
                      onChange={(e) => handleInputChange('recaptchaSecretKey', e.target.value)}
                      placeholder="6Lc..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="brevoApiKey">Brevo API Key</Label>
                    <Input
                      id="brevoApiKey"
                      value={formData.brevoApiKey}
                      onChange={(e) => handleInputChange('brevoApiKey', e.target.value)}
                      placeholder="xkeysib-..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="cloudinaryCloudName">Cloudinary Cloud Name</Label>
                    <Input
                      id="cloudinaryCloudName"
                      value={formData.cloudinaryCloudName}
                      onChange={(e) => handleInputChange('cloudinaryCloudName', e.target.value)}
                      placeholder="cloud-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cloudinaryApiKey">Cloudinary API Key</Label>
                    <Input
                      id="cloudinaryApiKey"
                      value={formData.cloudinaryApiKey}
                      onChange={(e) => handleInputChange('cloudinaryApiKey', e.target.value)}
                      placeholder="123456789012345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cloudinaryApiSecret">Cloudinary API Secret</Label>
                    <Input
                      id="cloudinaryApiSecret"
                      type="password"
                      value={formData.cloudinaryApiSecret}
                      onChange={(e) => handleInputChange('cloudinaryApiSecret', e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-cyan-500" />
                  Admin Notifications
                </CardTitle>
                <CardDescription>Configure admin notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adminNotificationEmail">Admin Notification Email</Label>
                  <Input
                    id="adminNotificationEmail"
                    type="email"
                    value={formData.adminNotificationEmail}
                    onChange={(e) => handleInputChange('adminNotificationEmail', e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Registration Notifications</Label>
                    <p className="text-xs text-muted-foreground">Get notified when users register</p>
                  </div>
                  <Switch
                    checked={formData.notifyOnNewRegistration}
                    onCheckedChange={(checked) => handleInputChange('notifyOnNewRegistration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Contact Message Notifications</Label>
                    <p className="text-xs text-muted-foreground">Get notified of new contact messages</p>
                  </div>
                  <Switch
                    checked={formData.notifyOnNewContactMessage}
                    onCheckedChange={(checked) => handleInputChange('notifyOnNewContactMessage', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Blog Comment Notifications</Label>
                    <p className="text-xs text-muted-foreground">Get notified of new blog comments</p>
                  </div>
                  <Switch
                    checked={formData.notifyOnNewBlogComment}
                    onCheckedChange={(checked) => handleInputChange('notifyOnNewBlogComment', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-gray-500" />
                  Advanced Settings
                </CardTitle>
                <CardDescription>Custom code and advanced configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customCss">Custom CSS</Label>
                  <Textarea
                    id="customCss"
                    value={formData.customCss}
                    onChange={(e) => handleInputChange('customCss', e.target.value)}
                    placeholder="/* Custom CSS styles */"
                    rows={5}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="customJs">Custom JavaScript</Label>
                  <Textarea
                    id="customJs"
                    value={formData.customJs}
                    onChange={(e) => handleInputChange('customJs', e.target.value)}
                    placeholder="// Custom JavaScript code"
                    rows={5}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="customHeadHtml">Custom Head HTML</Label>
                  <Textarea
                    id="customHeadHtml"
                    value={formData.customHeadHtml}
                    onChange={(e) => handleInputChange('customHeadHtml', e.target.value)}
                    placeholder="<!-- Custom HTML for <head> -->"
                    rows={5}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="robotsTxt">Robots.txt Content</Label>
                  <Textarea
                    id="robotsTxt"
                    value={formData.robotsTxt}
                    onChange={(e) => handleInputChange('robotsTxt', e.target.value)}
                    placeholder="User-agent: *&#10;Disallow:"
                    rows={5}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable XML Sitemap</Label>
                    <p className="text-xs text-muted-foreground">Generate XML sitemap for search engines</p>
                  </div>
                  <Switch
                    checked={formData.sitemapEnabled}
                    onCheckedChange={(checked) => handleInputChange('sitemapEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t">
          <Button type="submit" size="lg" disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Settings...
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
