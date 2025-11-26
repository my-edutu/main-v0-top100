import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createClient } from '@/lib/supabase/server'

type SiteSettings = {
  id?: string

  // General Site Information
  site_name: string
  site_description: string
  site_url: string
  site_tagline?: string
  contact_email: string
  support_email?: string

  // Social Media Links
  social_links: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
    youtube?: string
    tiktok?: string
  }

  // SEO Settings
  seo_meta_title?: string
  seo_meta_description?: string
  seo_meta_keywords?: string[]
  seo_og_image?: string
  seo_twitter_card?: string
  google_analytics_id?: string
  google_tag_manager_id?: string
  google_search_console_verification?: string
  facebook_pixel_id?: string

  // Branding
  logo_url?: string
  logo_dark_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string

  // Email/SMTP Configuration
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string
  smtp_from_email?: string
  smtp_from_name?: string
  email_footer_text?: string

  // Homepage Customization
  hero_title?: string
  hero_subtitle?: string
  hero_cta_text?: string
  hero_cta_url?: string
  hero_background_image?: string
  hero_video_url?: string
  show_hero_section?: boolean
  show_featured_awardees?: boolean
  show_recent_events?: boolean
  show_blog_section?: boolean
  show_impact_section?: boolean
  show_newsletter_section?: boolean
  featured_awardees_title?: string
  featured_awardees_count?: number

  // Footer Customization
  footer_about_text?: string
  footer_copyright?: string
  footer_links?: any[]
  show_footer_social?: boolean
  show_footer_newsletter?: boolean

  // Feature Toggles
  registration_enabled: boolean
  newsletter_enabled: boolean
  blog_enabled?: boolean
  events_enabled?: boolean
  awardees_directory_enabled?: boolean
  contact_form_enabled?: boolean

  // System Settings
  maintenance_mode: boolean
  maintenance_message?: string
  allow_public_profiles?: boolean
  require_email_verification?: boolean
  max_upload_size_mb?: number

  // API Keys & Integration
  youtube_api_key?: string
  google_maps_api_key?: string
  recaptcha_site_key?: string
  recaptcha_secret_key?: string
  brevo_api_key?: string
  cloudinary_cloud_name?: string
  cloudinary_api_key?: string
  cloudinary_api_secret?: string

  // Content Moderation
  enable_comment_moderation?: boolean
  enable_profanity_filter?: boolean
  auto_approve_comments?: boolean

  // Notifications
  admin_notification_email?: string
  notify_on_new_registration?: boolean
  notify_on_new_contact_message?: boolean
  notify_on_new_blog_comment?: boolean

  // Advanced Settings
  custom_css?: string
  custom_js?: string
  custom_head_html?: string
  robots_txt?: string
  sitemap_enabled?: boolean

  created_at?: string
  updated_at?: string
}

const DEFAULT_SETTINGS: Partial<SiteSettings> = {
  site_name: 'Top100 Africa Future Leaders',
  site_description: "Showcasing Africa's emerging leaders",
  site_url: 'https://top100afl.org',
  contact_email: 'admin@top100afl.org',
  social_links: {
    twitter: 'https://twitter.com/top100afl',
    linkedin: 'https://linkedin.com/company/top100afl',
    instagram: 'https://instagram.com/top100afl',
  },
  registration_enabled: true,
  newsletter_enabled: true,
  maintenance_mode: false,
  primary_color: '#000000',
  secondary_color: '#666666',
  accent_color: '#0066cc',
  show_hero_section: true,
  show_featured_awardees: true,
  show_recent_events: true,
  show_blog_section: true,
  show_impact_section: true,
  show_newsletter_section: true,
  featured_awardees_count: 6,
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient(true)

    // Try to fetch settings
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching settings:', error)

      // If table doesn't exist, return default settings
      if (error.message.includes('relation "site_settings" does not exist')) {
        return NextResponse.json(DEFAULT_SETTINGS)
      }

      return NextResponse.json(
        { message: 'Error fetching settings', error: error.message },
        { status: 500 }
      )
    }

    // If no settings exist, return defaults
    if (!data) {
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in settings GET:', error)
    return NextResponse.json(
      { message: 'Error fetching settings', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = await createClient(true)
    const body = await req.json()

    // Validate required fields
    if (!body.site_name || !body.site_url || !body.contact_email) {
      return NextResponse.json(
        { message: 'Missing required fields: site_name, site_url, contact_email' },
        { status: 400 }
      )
    }

    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    // Prepare payload with all fields
    const payload: Partial<SiteSettings> = {
      // General
      site_name: body.site_name,
      site_description: body.site_description || '',
      site_url: body.site_url,
      site_tagline: body.site_tagline,
      contact_email: body.contact_email,
      support_email: body.support_email,

      // Social Links
      social_links: body.social_links || {},

      // SEO
      seo_meta_title: body.seo_meta_title,
      seo_meta_description: body.seo_meta_description,
      seo_meta_keywords: body.seo_meta_keywords || [],
      seo_og_image: body.seo_og_image,
      seo_twitter_card: body.seo_twitter_card || 'summary_large_image',
      google_analytics_id: body.google_analytics_id,
      google_tag_manager_id: body.google_tag_manager_id,
      google_search_console_verification: body.google_search_console_verification,
      facebook_pixel_id: body.facebook_pixel_id,

      // Branding
      logo_url: body.logo_url,
      logo_dark_url: body.logo_dark_url,
      favicon_url: body.favicon_url,
      primary_color: body.primary_color,
      secondary_color: body.secondary_color,
      accent_color: body.accent_color,

      // Email/SMTP
      smtp_host: body.smtp_host,
      smtp_port: body.smtp_port ? parseInt(body.smtp_port) : undefined,
      smtp_username: body.smtp_username,
      smtp_password: body.smtp_password,
      smtp_from_email: body.smtp_from_email,
      smtp_from_name: body.smtp_from_name,
      email_footer_text: body.email_footer_text,

      // Homepage
      hero_title: body.hero_title,
      hero_subtitle: body.hero_subtitle,
      hero_cta_text: body.hero_cta_text,
      hero_cta_url: body.hero_cta_url,
      hero_background_image: body.hero_background_image,
      hero_video_url: body.hero_video_url,
      show_hero_section: Boolean(body.show_hero_section),
      show_featured_awardees: Boolean(body.show_featured_awardees),
      show_recent_events: Boolean(body.show_recent_events),
      show_blog_section: Boolean(body.show_blog_section),
      show_impact_section: Boolean(body.show_impact_section),
      show_newsletter_section: Boolean(body.show_newsletter_section),
      featured_awardees_title: body.featured_awardees_title,
      featured_awardees_count: body.featured_awardees_count ? parseInt(body.featured_awardees_count) : 6,

      // Footer
      footer_about_text: body.footer_about_text,
      footer_copyright: body.footer_copyright,
      footer_links: body.footer_links || [],
      show_footer_social: Boolean(body.show_footer_social),
      show_footer_newsletter: Boolean(body.show_footer_newsletter),

      // Feature Toggles
      registration_enabled: Boolean(body.registration_enabled),
      newsletter_enabled: Boolean(body.newsletter_enabled),
      blog_enabled: Boolean(body.blog_enabled),
      events_enabled: Boolean(body.events_enabled),
      awardees_directory_enabled: Boolean(body.awardees_directory_enabled),
      contact_form_enabled: Boolean(body.contact_form_enabled),

      // System
      maintenance_mode: Boolean(body.maintenance_mode),
      maintenance_message: body.maintenance_message,
      allow_public_profiles: Boolean(body.allow_public_profiles),
      require_email_verification: Boolean(body.require_email_verification),
      max_upload_size_mb: body.max_upload_size_mb ? parseInt(body.max_upload_size_mb) : 10,

      // API Keys
      youtube_api_key: body.youtube_api_key,
      google_maps_api_key: body.google_maps_api_key,
      recaptcha_site_key: body.recaptcha_site_key,
      recaptcha_secret_key: body.recaptcha_secret_key,
      brevo_api_key: body.brevo_api_key,
      cloudinary_cloud_name: body.cloudinary_cloud_name,
      cloudinary_api_key: body.cloudinary_api_key,
      cloudinary_api_secret: body.cloudinary_api_secret,

      // Content Moderation
      enable_comment_moderation: Boolean(body.enable_comment_moderation),
      enable_profanity_filter: Boolean(body.enable_profanity_filter),
      auto_approve_comments: Boolean(body.auto_approve_comments),

      // Notifications
      admin_notification_email: body.admin_notification_email,
      notify_on_new_registration: Boolean(body.notify_on_new_registration),
      notify_on_new_contact_message: Boolean(body.notify_on_new_contact_message),
      notify_on_new_blog_comment: Boolean(body.notify_on_new_blog_comment),

      // Advanced
      custom_css: body.custom_css,
      custom_js: body.custom_js,
      custom_head_html: body.custom_head_html,
      robots_txt: body.robots_txt,
      sitemap_enabled: Boolean(body.sitemap_enabled),
    }

    let result

    if (existingSettings?.id) {
      // Update existing settings
      const { data, error } = await supabase
        .from('site_settings')
        .update(payload)
        .eq('id', existingSettings.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('site_settings')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in settings PUT:', error)
    return NextResponse.json(
      { message: 'Error updating settings', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
