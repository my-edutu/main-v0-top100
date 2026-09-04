import { createAdminClient } from '@/lib/supabase/server'

import type { PortfolioCoverFields, PortfolioCoverGeneration, PortfolioGenerationStatus, PortfolioTailoring, PortfolioVariant } from './types'

export type PortfolioGenerationRow = {
  id: string; member_id: string; status: PortfolioGenerationStatus; tailoring: PortfolioTailoring
  fields: PortfolioCoverFields; attempt: number; options?: Record<string, string> | null
  selected_variant?: PortfolioVariant | null; selected_url?: string | null; failure_code?: string | null
  created_at: string; updated_at: string
}

export function portfolioObjectPath(memberId: string, generationId: string, kind: 'source' | PortfolioVariant) {
  return `${memberId}/${generationId}/${kind}.png`
}

export function mapPortfolioGenerationRow(row: PortfolioGenerationRow): PortfolioCoverGeneration {
  return {
    id: row.id, memberId: row.member_id, status: row.status, tailoring: row.tailoring,
    fields: row.fields ?? {}, attempt: row.attempt, options: {},
    selectedVariant: row.selected_variant ?? undefined, selectedUrl: row.selected_url ?? undefined,
    failureCode: row.failure_code ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

const sourceBucket = () => process.env.PORTFOLIO_SOURCE_BUCKET || 'portfolio-sources'
const optionBucket = () => process.env.PORTFOLIO_OPTION_BUCKET || 'portfolio-options'
const coverBucket = () => process.env.PORTFOLIO_COVER_BUCKET || 'portfolio-covers'

export function createPortfolioCoverRepository() {
  const supabase = createAdminClient()
  return {
    async create(input: { id?: string; memberId: string; tailoring: PortfolioTailoring; fields: PortfolioCoverFields; sourcePath: string; attempt?: number }) {
      const { data, error } = await supabase.from('portfolio_cover_generations').insert({
        ...(input.id ? { id: input.id } : {}),
        member_id: input.memberId, tailoring: input.tailoring, fields: input.fields,
        source_path: input.sourcePath, attempt: input.attempt ?? 1,
      }).select('*').single()
      if (error) throw error
      return mapPortfolioGenerationRow(data as PortfolioGenerationRow)
    },
    async getCurrent(memberId: string) {
      const { data, error } = await supabase.from('portfolio_cover_generations').select('*').eq('member_id', memberId).in('status', ['queued', 'processing', 'ready', 'selected']).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data) return null
      const result = mapPortfolioGenerationRow(data as PortfolioGenerationRow)
      const paths = ((data as { option_paths?: Record<string, string> }).option_paths ?? {}) as Record<PortfolioVariant, string>
      for (const variant of ['executive-charcoal', 'leadership-ivory'] as PortfolioVariant[]) {
        if (paths[variant]) result.options[variant] = await this.signedOptionUrl(paths[variant])
      }
      return result
    },
    async getLatest(memberId: string) {
      const { data, error } = await supabase.from('portfolio_cover_generations').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data ? mapPortfolioGenerationRow(data as PortfolioGenerationRow) : null
    },
    async getOwned(id: string, memberId: string) {
      const { data, error } = await supabase.from('portfolio_cover_generations').select('*').eq('id', id).eq('member_id', memberId).maybeSingle()
      if (error) throw error
      if (!data) return null
      const result = mapPortfolioGenerationRow(data as PortfolioGenerationRow)
      const paths = ((data as { option_paths?: Record<string, string> }).option_paths ?? {}) as Record<PortfolioVariant, string>
      for (const variant of ['executive-charcoal', 'leadership-ivory'] as PortfolioVariant[]) {
        if (paths[variant]) result.options[variant] = await this.signedOptionUrl(paths[variant])
      }
      return result
    },
    async update(id: string, patch: Record<string, unknown>) {
      const { data, error } = await supabase.from('portfolio_cover_generations').update(patch).eq('id', id).select('*').single()
      if (error) throw error
      return mapPortfolioGenerationRow(data as PortfolioGenerationRow)
    },
    async uploadSource(path: string, body: Buffer) {
      const { error } = await supabase.storage.from(sourceBucket()).upload(path, body, { contentType: 'image/png', upsert: false })
      if (error) throw error
    },
    async uploadOption(path: string, body: Buffer) {
      const { error } = await supabase.storage.from(optionBucket()).upload(path, body, { contentType: 'image/png', upsert: false })
      if (error) throw error
    },
    async signedOptionUrl(path: string) {
      const { data, error } = await supabase.storage.from(optionBucket()).createSignedUrl(path, 900)
      if (error) throw error
      return data.signedUrl
    },
    async publishSelection(path: string, memberId: string, id: string, variant: PortfolioVariant) {
      const { data: object, error: downloadError } = await supabase.storage.from(optionBucket()).download(path)
      if (downloadError || !object) throw downloadError ?? new Error('Selected cover is unavailable.')
      const publicPath = `${memberId}/${id}/${variant}.png`
      const { error: uploadError } = await supabase.storage.from(coverBucket()).upload(publicPath, object, { contentType: 'image/png', upsert: true })
      if (uploadError) throw uploadError
      const { data: publicUrl } = supabase.storage.from(coverBucket()).getPublicUrl(publicPath)
      return { path: publicPath, url: publicUrl.publicUrl }
    },
    async select(id: string, memberId: string, variant: PortfolioVariant) {
      const { data, error } = await supabase.from('portfolio_cover_generations').select('option_paths, status').eq('id', id).eq('member_id', memberId).maybeSingle()
      if (error) throw error
      const paths = ((data as { option_paths?: Record<string, string> } | null)?.option_paths ?? {}) as Record<string, string>
      const path = paths[variant]
      if (!path || !['ready', 'selected'].includes(String((data as { status?: string } | null)?.status))) throw new Error('That cover is no longer available.')
      const published = await this.publishSelection(path, memberId, id, variant)
      const { data: updated, error: updateError } = await supabase.from('portfolio_cover_generations').update({ status: 'selected', selected_variant: variant, selected_url: published.url }).eq('id', id).eq('member_id', memberId).select('*').single()
      if (updateError) throw updateError
      const { error: profileError } = await supabase.from('profiles').update({ portfolio_cover_url: published.url }).eq('id', memberId)
      if (profileError) throw profileError
      return mapPortfolioGenerationRow(updated as PortfolioGenerationRow)
    },
    async reset(id: string, adminId: string) {
      const { data, error } = await supabase.from('portfolio_cover_generations').update({ status: 'expired', reset_by: adminId, reset_at: new Date().toISOString() }).eq('id', id).select('*').single()
      if (error) throw error
      return mapPortfolioGenerationRow(data as PortfolioGenerationRow)
    },
  }
}
