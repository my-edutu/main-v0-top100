'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
    Newspaper,
    Loader2,
    Search,
    Eye,
    MessageSquare,
    Mail,
    Phone,
    FileText,
    Calendar,
    DollarSign,
    CheckCircle,
    Clock,
    XCircle,
    User,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface FeatureRequest {
    id: string
    awardee_id: string
    awardee_name: string
    has_own_article: boolean
    article_content?: string
    needs_article_written: boolean
    contact_email: string
    whatsapp_number: string
    amount: number
    currency: string
    status: 'pending' | 'contacted' | 'paid' | 'in_progress' | 'published' | 'cancelled'
    payment_status?: 'pending' | 'confirmed' | 'refunded'
    admin_notes?: string
    created_at: string
    updated_at?: string
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    contacted: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    in_progress: 'bg-purple-100 text-purple-800',
    published: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
}

const paymentStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    refunded: 'bg-red-100 text-red-800',
}

export default function FeatureRequestsPage() {
    const [requests, setRequests] = useState<FeatureRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null)
    const [updating, setUpdating] = useState(false)
    const [adminNotes, setAdminNotes] = useState('')

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/feature-requests')
            if (response.ok) {
                const data = await response.json()
                setRequests(data.data || [])
            } else {
                toast.error('Failed to fetch feature requests')
            }
        } catch (error) {
            console.error('Error fetching requests:', error)
            toast.error('Failed to fetch feature requests')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleUpdateStatus = async (id: string, status: string, paymentStatus?: string) => {
        setUpdating(true)
        try {
            const response = await fetch('/api/feature-requests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    status,
                    payment_status: paymentStatus,
                    admin_notes: adminNotes
                })
            })

            if (response.ok) {
                toast.success('Request updated successfully')
                fetchRequests()
                setSelectedRequest(null)
                setAdminNotes('')
            } else {
                toast.error('Failed to update request')
            }
        } catch (error) {
            toast.error('Failed to update request')
        } finally {
            setUpdating(false)
        }
    }

    const filteredRequests = requests.filter(request => {
        const matchesSearch =
            request.awardee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || request.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        paid: requests.filter(r => r.status === 'paid' || r.payment_status === 'confirmed').length,
        published: requests.filter(r => r.status === 'published').length,
    }

    if (loading) {
        return (
            <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading feature requests...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-800 bg-clip-text text-transparent">
                    Feature Requests
                </h1>
                <p className="text-muted-foreground">Manage awardee news feature requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Total Requests</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.pending}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.paid}</p>
                                <p className="text-xs text-muted-foreground">Paid</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Newspaper className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.published}</p>
                                <p className="text-xs text-muted-foreground">Published</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchRequests}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">No Feature Requests</h3>
                        <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== 'all'
                                ? 'No requests match your filters'
                                : 'No feature requests have been submitted yet'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-lg">{request.awardee_name}</h3>
                                            <Badge className={statusColors[request.status] || 'bg-gray-100'}>
                                                {request.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            {request.payment_status && (
                                                <Badge variant="outline" className={paymentStatusColors[request.payment_status]}>
                                                    Payment: {request.payment_status}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                <a href={`mailto:${request.contact_email}`} className="hover:underline">
                                                    {request.contact_email}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-4 w-4" />
                                                <a href={`https://wa.me/${request.whatsapp_number.replace(/\D/g, '')}`} target="_blank" className="hover:underline">
                                                    {request.whatsapp_number}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center gap-4 text-sm">
                                            <span className="font-medium text-green-600">
                                                ₦{request.amount?.toLocaleString()}
                                            </span>
                                            {request.has_own_article ? (
                                                <Badge variant="outline" className="bg-blue-50">Has Article</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-orange-50">Needs Article Written</Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRequest(request)
                                                        setAdminNotes(request.admin_notes || '')
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Feature Request: {request.awardee_name}</DialogTitle>
                                                    <DialogDescription>
                                                        Submitted on {new Date(request.created_at).toLocaleString()}
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-6">
                                                    {/* Contact Info */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 bg-gray-50 rounded-lg">
                                                            <p className="text-xs text-muted-foreground mb-1">Email</p>
                                                            <a href={`mailto:${request.contact_email}`} className="font-medium hover:underline">
                                                                {request.contact_email}
                                                            </a>
                                                        </div>
                                                        <div className="p-4 bg-gray-50 rounded-lg">
                                                            <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                                                            <a
                                                                href={`https://wa.me/${request.whatsapp_number.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                className="font-medium hover:underline"
                                                            >
                                                                {request.whatsapp_number}
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {/* Article Content */}
                                                    <div>
                                                        <h4 className="font-medium mb-2">
                                                            {request.has_own_article ? 'Submitted Article' : 'Article Status'}
                                                        </h4>
                                                        {request.has_own_article && request.article_content ? (
                                                            <div className="p-4 bg-gray-50 rounded-lg max-h-[200px] overflow-y-auto">
                                                                <pre className="whitespace-pre-wrap text-sm">{request.article_content}</pre>
                                                            </div>
                                                        ) : (
                                                            <p className="text-muted-foreground text-sm italic">
                                                                Awardee requested help writing the article
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Status Update */}
                                                    <div className="border-t pt-4">
                                                        <h4 className="font-medium mb-3">Update Status</h4>
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div>
                                                                <label className="text-sm text-muted-foreground mb-1 block">Request Status</label>
                                                                <Select
                                                                    value={selectedRequest?.status || request.status}
                                                                    onValueChange={(value) => setSelectedRequest(prev => prev ? { ...prev, status: value as any } : null)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="pending">Pending</SelectItem>
                                                                        <SelectItem value="contacted">Contacted</SelectItem>
                                                                        <SelectItem value="paid">Paid</SelectItem>
                                                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                                                        <SelectItem value="published">Published</SelectItem>
                                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <label className="text-sm text-muted-foreground mb-1 block">Payment Status</label>
                                                                <Select
                                                                    value={selectedRequest?.payment_status || request.payment_status || 'pending'}
                                                                    onValueChange={(value) => setSelectedRequest(prev => prev ? { ...prev, payment_status: value as any } : null)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="pending">Pending</SelectItem>
                                                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                                                        <SelectItem value="refunded">Refunded</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="text-sm text-muted-foreground mb-1 block">Admin Notes</label>
                                                            <Textarea
                                                                value={adminNotes}
                                                                onChange={(e) => setAdminNotes(e.target.value)}
                                                                placeholder="Add internal notes about this request..."
                                                                rows={3}
                                                            />
                                                        </div>

                                                        <Button
                                                            className="w-full"
                                                            disabled={updating}
                                                            onClick={() => handleUpdateStatus(
                                                                request.id,
                                                                selectedRequest?.status || request.status,
                                                                selectedRequest?.payment_status || request.payment_status
                                                            )}
                                                        >
                                                            {updating ? (
                                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            ) : (
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                            )}
                                                            Save Changes
                                                        </Button>
                                                    </div>

                                                    {/* Quick Actions */}
                                                    <div className="border-t pt-4">
                                                        <h4 className="font-medium mb-3">Quick Actions</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button variant="outline" size="sm" asChild>
                                                                <a href={`mailto:${request.contact_email}`}>
                                                                    <Mail className="h-4 w-4 mr-1" />
                                                                    Send Email
                                                                </a>
                                                            </Button>
                                                            <Button variant="outline" size="sm" asChild>
                                                                <a
                                                                    href={`https://wa.me/${request.whatsapp_number.replace(/\D/g, '')}?text=Hi ${request.awardee_name}, regarding your feature request...`}
                                                                    target="_blank"
                                                                >
                                                                    <MessageSquare className="h-4 w-4 mr-1" />
                                                                    WhatsApp
                                                                </a>
                                                            </Button>
                                                            <Button variant="outline" size="sm" asChild>
                                                                <Link href={`/admin/awardees/edit/${request.awardee_id}`}>
                                                                    <User className="h-4 w-4 mr-1" />
                                                                    View Awardee
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
