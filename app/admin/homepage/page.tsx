'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ArrowUp,
  ArrowDown,
  Home,
  Settings
} from 'lucide-react'

interface HomepageSection {
  id: string
  section_key: string
  title: string | null
  subtitle: string | null
  content: Record<string, any>
  images: string[]
  cta_text: string | null
  cta_url: string | null
  order_position: number
  is_active: boolean
  visibility: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export default function HomepageManagementPage() {
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<HomepageSection>>({
    section_key: '',
    title: '',
    subtitle: '',
    content: {},
    images: [],
    cta_text: '',
    cta_url: '',
    order_position: 0,
    is_active: true,
    visibility: 'public',
    metadata: {}
  })

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/homepage-sections?scope=admin')

      if (!response.ok) throw new Error('Failed to fetch sections')

      const data = await response.json()
      setSections(data)
    } catch (error) {
      console.error('Error fetching sections:', error)
      toast.error('Failed to load homepage sections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  const handleEditSection = (section: HomepageSection) => {
    setEditingSection(section)
    setFormData(section)
    setIsDialogOpen(true)
  }

  const handleCreateNew = () => {
    setEditingSection(null)
    setFormData({
      section_key: '',
      title: '',
      subtitle: '',
      content: {},
      images: [],
      cta_text: '',
      cta_url: '',
      order_position: sections.length + 1,
      is_active: true,
      visibility: 'public',
      metadata: {}
    })
    setIsDialogOpen(true)
  }

  const handleSaveSection = async () => {
    try {
      setIsSaving(true)

      const method = editingSection ? 'PUT' : 'POST'
      const payload = editingSection
        ? { ...formData, id: editingSection.id }
        : formData

      const response = await fetch('/api/homepage-sections', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to save section')

      toast.success(editingSection ? 'Section updated successfully' : 'Section created successfully')
      setIsDialogOpen(false)
      fetchSections()
    } catch (error) {
      console.error('Error saving section:', error)
      toast.error('Failed to save section')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return

    try {
      const response = await fetch('/api/homepage-sections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!response.ok) throw new Error('Failed to delete section')

      toast.success('Section deleted successfully')
      fetchSections()
    } catch (error) {
      console.error('Error deleting section:', error)
      toast.error('Failed to delete section')
    }
  }

  const handleToggleActive = async (section: HomepageSection) => {
    try {
      const response = await fetch('/api/homepage-sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: section.id,
          is_active: !section.is_active
        })
      })

      if (!response.ok) throw new Error('Failed to toggle section')

      toast.success(section.is_active ? 'Section hidden' : 'Section activated')
      fetchSections()
    } catch (error) {
      console.error('Error toggling section:', error)
      toast.error('Failed to toggle section')
    }
  }

  const handleReorder = async (section: HomepageSection, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.id === section.id)
    const newPosition = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newPosition < 0 || newPosition >= sections.length) return

    try {
      // Update order_position for both sections
      const updates = [
        { id: section.id, order_position: newPosition },
        { id: sections[newPosition].id, order_position: currentIndex }
      ]

      await Promise.all(
        updates.map(update =>
          fetch('/api/homepage-sections', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update)
          })
        )
      )

      toast.success('Section reordered successfully')
      fetchSections()
    } catch (error) {
      console.error('Error reordering section:', error)
      toast.error('Failed to reorder section')
    }
  }

  const handleContentChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: value
      }
    }))
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
            <Home className="h-8 w-8 text-orange-500" />
            Homepage Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage homepage content sections, order, and visibility
          </p>
        </div>
        <Button onClick={handleCreateNew} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {/* Sections Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading sections...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {sections.map((section, index) => (
            <Card key={section.id} className={!section.is_active ? 'opacity-50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        Position {section.order_position}
                      </Badge>
                      <Badge variant={section.is_active ? 'default' : 'secondary'}>
                        {section.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                      <Badge variant="outline">
                        {section.visibility}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2 text-xl">
                      {section.title || section.section_key}
                    </CardTitle>
                    {section.subtitle && (
                      <CardDescription>{section.subtitle}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Reorder buttons */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(section, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(section, 'down')}
                      disabled={index === sections.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>

                    {/* Toggle visibility */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(section)}
                    >
                      {section.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSection(section)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Section Key:</span>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded">{section.section_key}</code>
                  </div>
                  {section.cta_text && (
                    <div>
                      <span className="font-semibold">CTA:</span> {section.cta_text}
                      {section.cta_url && ` → ${section.cta_url}`}
                    </div>
                  )}
                  {Object.keys(section.content).length > 0 && (
                    <div>
                      <span className="font-semibold">Content Keys:</span>{' '}
                      {Object.keys(section.content).join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edit Section' : 'Create New Section'}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? 'Update the content and settings for this section'
                : 'Add a new section to the homepage'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Section Key */}
            <div className="space-y-2">
              <Label htmlFor="section_key">Section Key *</Label>
              <Input
                id="section_key"
                value={formData.section_key}
                onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
                placeholder="e.g., hero, about, sponsors"
                disabled={!!editingSection}
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Section title"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle || ''}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Section subtitle"
              />
            </div>

            {/* Content (JSON) */}
            <div className="space-y-2">
              <Label htmlFor="content">Content (JSON)</Label>
              <Textarea
                id="content"
                value={JSON.stringify(formData.content, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setFormData({ ...formData, content: parsed })
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                placeholder='{"description": "Section description", "items": []}'
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {/* CTA Text */}
            <div className="space-y-2">
              <Label htmlFor="cta_text">Call to Action Text</Label>
              <Input
                id="cta_text"
                value={formData.cta_text || ''}
                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                placeholder="e.g., Learn More, Get Started"
              />
            </div>

            {/* CTA URL */}
            <div className="space-y-2">
              <Label htmlFor="cta_url">Call to Action URL</Label>
              <Input
                id="cta_url"
                value={formData.cta_url || ''}
                onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                placeholder="/about, https://example.com"
              />
            </div>

            {/* Order Position */}
            <div className="space-y-2">
              <Label htmlFor="order_position">Order Position</Label>
              <Input
                id="order_position"
                type="number"
                value={formData.order_position || 0}
                onChange={(e) => setFormData({ ...formData, order_position: parseInt(e.target.value) })}
              />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active (visible on homepage)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingSection ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
