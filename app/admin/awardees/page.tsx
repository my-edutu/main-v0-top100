'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Search,
  Loader2,
  X,
  Image as ImageIcon,
  Users,
  Globe,
  GraduationCap,
  Calendar,
  Award,
  Eye,
  EyeOff,
  Star
} from 'lucide-react';

interface Awardee {
  id: string;
  slug: string;
  name: string;
  email?: string;
  country?: string;
  cgpa?: string | number;
  course?: string;
  bio?: string;
  year?: number;
  image_url?: string;
  is_public?: boolean;
  avatar_url?: string;
  tagline?: string;
  headline?: string;
  social_links?: Record<string, string>;
  achievements?: any[];
  interests?: string[];
  featured?: boolean;
}

interface Stats {
  totalAwardees: number;
  totalCountries: number;
  totalCourses: number;
  currentYearAwardees: number;
  recentAwardees: number;
  featuredAwardees: number;
  visibleAwardees: number;
  hiddenAwardees: number;
}

type FilterType = 'all' | 'featured' | 'visible' | 'hidden';

export default function AwardeesManagement() {
  const router = useRouter();
  const [awardees, setAwardees] = useState<Awardee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAwardees, setFilteredAwardees] = useState<Awardee[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedAwardees, setSelectedAwardees] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;
  const [loadingStates, setLoadingStates] = useState<Record<string, 'visibility' | 'featured'>>({});

  // Helper function to handle auth errors
  const handleAuthError = (error: any, toastId: string) => {
    if (error.message?.includes('Authentication required') || error.message?.includes('Admin access required')) {
      toast.error('Your session has expired. Please sign in again.', { id: toastId });
      setTimeout(() => {
        router.push('/auth/signin?redirect=/admin/awardees');
      }, 2000);
    } else {
      toast.error(error instanceof Error ? error.message : 'An error occurred', { id: toastId });
    }
  };

  useEffect(() => {
    if (awardees.length > 0) {
      calculateStats();
    }
  }, [awardees]);

  useEffect(() => {
    let filtered = awardees;

    // Apply filter type
    if (filterType === 'featured') {
      filtered = filtered.filter(a => a.featured === true);
    } else if (filterType === 'visible') {
      filtered = filtered.filter(a => a.is_public !== false);
    } else if (filterType === 'hidden') {
      filtered = filtered.filter(a => a.is_public === false);
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(awardee =>
        awardee.name.toLowerCase().includes(term) ||
        (awardee.country && awardee.country.toLowerCase().includes(term)) ||
        (awardee.course && awardee.course.toLowerCase().includes(term)) ||
        (awardee.bio && awardee.bio.toLowerCase().includes(term))
      );
    }

    setFilteredAwardees(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, awardees, filterType]);

  const fetchAwardees = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    try {
      if (withSpinner) {
        setLoading(true);
        toast.loading('Loading awardees...', { id: 'loading-awardees' });
      }

      const response = await fetch('/api/awardees');
      if (!response.ok) throw new Error('Failed to fetch awardees');

      const data = await response.json();
      const normalized: Awardee[] = Array.isArray(data)
        ? data.map((awardee: any) => {
            const parsedYear = typeof awardee.year === 'string' ? parseInt(awardee.year, 10) : awardee.year;
            const sanitizedCountry = awardee.country ? awardee.country.toString().trim() : null;
            const sanitizedCourse = awardee.course ? awardee.course.toString().trim() : null;

            return {
              ...awardee,
              name: (awardee.name ?? '').toString().trim(),
              country: sanitizedCountry && sanitizedCountry.length > 0 ? sanitizedCountry : null,
              course: sanitizedCourse && sanitizedCourse.length > 0 ? sanitizedCourse : null,
              year: typeof parsedYear === 'number' && !Number.isNaN(parsedYear) ? parsedYear : null,
            } as Awardee;
          })
        : [];
      setAwardees(normalized);
      setFilteredAwardees(normalized);
      if (withSpinner) {
        toast.success('Awardees loaded successfully', { id: 'loading-awardees' });
      }
    } catch (error) {
      console.error('Error fetching awardees:', error);
      if (withSpinner) {
        toast.error('Failed to fetch awardees', { id: 'loading-awardees' });
      } else {
        toast.error('Failed to refresh awardees');
      }
    } finally {
      if (withSpinner) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAwardees();
  }, [fetchAwardees]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-awardees-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'awardees' }, () => {
        fetchAwardees({ withSpinner: false });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAwardees]);

  const calculateStats = () => {
    if (awardees.length === 0) {
      setStats({
        totalAwardees: 0,
        totalCountries: 0,
        totalCourses: 0,
        currentYearAwardees: 0,
        recentAwardees: 0,
        featuredAwardees: 0,
        visibleAwardees: 0,
        hiddenAwardees: 0
      });
      return;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const sanitizedCountries = awardees
      .map(a => (a.country ?? '').toString().trim())
      .filter(Boolean);
    const sanitizedCourses = awardees
      .map(a => (a.course ?? '').toString().trim())
      .filter(Boolean);

    const totalAwardees = awardees.length;
    const totalCountries = new Set(sanitizedCountries).size;
    const totalCourses = new Set(sanitizedCourses).size;
    const currentYearAwardees = awardees.filter(
      a => typeof a.year === 'number' && a.year === currentYear
    ).length;

    const recentAwardees = awardees.filter(a => {
      if (typeof a.year !== 'number') {
        return false;
      }

      if (a.year === currentYear) {
        return true;
      }

      if (a.year === currentYear - 1) {
        return currentMonth < 3;
      }

      return false;
    }).length;

    const featuredAwardees = awardees.filter(a => a.featured === true).length;
    const visibleAwardees = awardees.filter(a => a.is_public !== false).length;
    const hiddenAwardees = awardees.filter(a => a.is_public === false).length;

    setStats({
      totalAwardees,
      totalCountries,
      totalCourses,
      currentYearAwardees,
      recentAwardees,
      featuredAwardees,
      visibleAwardees,
      hiddenAwardees
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        toast.success(`Selected file: ${selectedFile.name}`);
      } else {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select an Excel file first');
      return;
    }

    try {
      setUploading(true);
      toast.loading('Importing awardees...', { id: 'import-awardees' });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/awardees/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json().catch(() => null);
      const isSuccessful = response.ok && result?.success;
      
      if (isSuccessful) {
        const message = result?.message || `Imported ${result?.imported ?? 0} awardees successfully`;
        toast.success(message, { id: 'import-awardees' });
        setFile(null);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        await fetchAwardees({ withSpinner: false });
      } else {
        const errorMessage = result?.error || result?.message || 'Failed to import awardees';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error importing awardees:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import awardees', { id: 'import-awardees' });
    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    // Download the Excel file
    window.location.href = '/api/awardees/export';
    toast.success('Export started');
  };

  const handleAddNew = () => {
    router.push('/admin/awardees/new');
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/awardees/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this awardee?')) return;

    try {
      toast.loading('Deleting awardee...', { id: `delete-${id}` });

      const response = await fetch(`/api/awardees?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete awardee');

      const result = await response.json();

      if (result.success) {
        // Refresh the awardee list
        await fetchAwardees({ withSpinner: false });
        toast.success(result.message, { id: `delete-${id}` });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error deleting awardee:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete awardee', { id: `delete-${id}` });
    }
  };

  const handleToggleVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      // Set loading state for this button
      setLoadingStates(prev => ({ ...prev, [id]: 'visibility' }));
      toast.loading('Updating visibility...', { id: `visibility-${id}` });

      const response = await fetch('/api/awardees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id,
          is_public: !currentVisibility
        })
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result?.message || result?.error || `Failed to update visibility (${response.status})`;
        const debugInfo = result?.debug ? ` - ${JSON.stringify(result.debug)}` : '';
        throw new Error(errorMsg + debugInfo);
      }

      if (result.success) {
        // Optimistically update local state immediately
        const newVisibility = !currentVisibility;
        setAwardees(prevAwardees =>
          prevAwardees.map(a =>
            a.id === id ? { ...a, is_public: newVisibility } : a
          )
        );

        toast.success(
          `Profile is now ${newVisibility ? 'visible' : 'hidden'}`,
          { id: `visibility-${id}` }
        );

        // Fetch in background to ensure sync
        fetchAwardees({ withSpinner: false });
      } else {
        throw new Error(result.message || 'Failed to update visibility');
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      handleAuthError(error, `visibility-${id}`);
    } finally {
      // Clear loading state
      setLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      // Set loading state for this button
      setLoadingStates(prev => ({ ...prev, [id]: 'featured' }));
      toast.loading('Updating featured status...', { id: `featured-${id}` });

      const response = await fetch('/api/awardees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id,
          featured: !currentFeatured
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          result,
        });
        const errorMsg = result?.message || result?.error || `Failed to update featured status (${response.status})`;
        const debugInfo = result?.debug ? ` - ${JSON.stringify(result.debug)}` : '';
        throw new Error(errorMsg + debugInfo);
      }

      if (result.success) {
        // Optimistically update local state immediately
        const newFeatured = !currentFeatured;
        setAwardees(prevAwardees =>
          prevAwardees.map(a =>
            a.id === id ? { ...a, featured: newFeatured } : a
          )
        );

        toast.success(
          `Awardee is now ${newFeatured ? 'featured' : 'unfeatured'}`,
          { id: `featured-${id}` }
        );

        // Fetch in background to ensure sync
        fetchAwardees({ withSpinner: false });
      } else {
        throw new Error(result.message || 'Failed to update featured status');
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      handleAuthError(error, `featured-${id}`);
    } finally {
      // Clear loading state
      setLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSelectAll = () => {
    if (selectedAwardees.size === filteredAwardees.length) {
      setSelectedAwardees(new Set());
    } else {
      setSelectedAwardees(new Set(filteredAwardees.map(a => a.id)));
    }
  };

  const handleSelectAwardee = (id: string) => {
    const newSelected = new Set(selectedAwardees);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAwardees(newSelected);
  };

  const handleBulkFeature = async (featured: boolean) => {
    if (selectedAwardees.size === 0) {
      toast.error('Please select at least one awardee');
      return;
    }

    try {
      toast.loading(`${featured ? 'Featuring' : 'Unfeaturing'} ${selectedAwardees.size} awardees...`, { id: 'bulk-feature' });

      const promises = Array.from(selectedAwardees).map(id =>
        fetch('/api/awardees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id, featured })
        })
      );

      await Promise.all(promises);
      await fetchAwardees({ withSpinner: false });
      setSelectedAwardees(new Set());
      toast.success(`Successfully ${featured ? 'featured' : 'unfeatured'} ${selectedAwardees.size} awardees`, { id: 'bulk-feature' });
    } catch (error) {
      console.error('Error bulk updating featured status:', error);
      toast.error('Failed to update featured status', { id: 'bulk-feature' });
    }
  };

  const handleBulkVisibility = async (isPublic: boolean) => {
    if (selectedAwardees.size === 0) {
      toast.error('Please select at least one awardee');
      return;
    }

    try {
      toast.loading(`${isPublic ? 'Showing' : 'Hiding'} ${selectedAwardees.size} awardees...`, { id: 'bulk-visibility' });

      const promises = Array.from(selectedAwardees).map(id =>
        fetch('/api/awardees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id, is_public: isPublic })
        })
      );

      await Promise.all(promises);
      await fetchAwardees({ withSpinner: false });
      setSelectedAwardees(new Set());
      toast.success(`Successfully ${isPublic ? 'showed' : 'hid'} ${selectedAwardees.size} awardees`, { id: 'bulk-visibility' });
    } catch (error) {
      console.error('Error bulk updating visibility:', error);
      toast.error('Failed to update visibility', { id: 'bulk-visibility' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAwardees.size === 0) {
      toast.error('Please select at least one awardee');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedAwardees.size} awardees? This action cannot be undone.`)) {
      return;
    }

    try {
      toast.loading(`Deleting ${selectedAwardees.size} awardees...`, { id: 'bulk-delete' });

      const promises = Array.from(selectedAwardees).map(id =>
        fetch(`/api/awardees?id=${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      );

      await Promise.all(promises);
      await fetchAwardees({ withSpinner: false });
      setSelectedAwardees(new Set());
      toast.success(`Successfully deleted ${selectedAwardees.size} awardees`, { id: 'bulk-delete' });
    } catch (error) {
      console.error('Error bulk deleting awardees:', error);
      toast.error('Failed to delete awardees', { id: 'bulk-delete' });
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredAwardees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAwardees = filteredAwardees.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
          Awardees Management
        </h1>
        <p className="text-muted-foreground">Manage and update Top100 Africa Future Leaders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-blue-400/30 rounded-lg mr-3">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Total</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-blue-400/30 rounded animate-pulse" /> : stats?.totalAwardees || 0}
            </div>
            <p className="text-xs text-blue-100 mt-1">All awardees</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-green-400/30 rounded-lg mr-3">
                <Globe className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Countries</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-green-400/30 rounded animate-pulse" /> : stats?.totalCountries || 0}
            </div>
            <p className="text-xs text-green-100 mt-1">From different countries</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-purple-400/30 rounded-lg mr-3">
                <GraduationCap className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Courses</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-purple-400/30 rounded animate-pulse" /> : stats?.totalCourses || 0}
            </div>
            <p className="text-xs text-purple-100 mt-1">Different fields</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setFilterType('featured')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-400/30 rounded-lg mr-3">
                <Star className="h-6 w-6 fill-current" />
              </div>
              <CardTitle className="text-lg">Featured</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-yellow-400/30 rounded animate-pulse" /> : stats?.featuredAwardees || 0}
            </div>
            <p className="text-xs text-yellow-100 mt-1">On homepage</p>
          </CardContent>
        </Card>
      </div>

      {/* Import/Export Section - Moved to top on desktop */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Excel Import/Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Import Awardees</h3>
              <div className="flex flex-col gap-2">
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={handleFileUploadClick}
                  className="w-full justify-start"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {file ? file.name : 'Select Excel File'}
                    </>
                  )}
                </Button>
                {file && (
                  <div className="flex items-center justify-between bg-secondary p-2 rounded">
                    <span className="text-xs truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  onClick={handleImport}
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Export Awardees</h3>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExport}
              >
                <Download className="mr-2 h-4 w-4" />
                Download as Excel
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Template</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Download a sample Excel template to format your data correctly.
              </p>
              <a
                href="/top100 Africa future Leaders 2025.xlsx"
                download
                className="w-full"
              >
                <Button
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Awardees Table - Now full width */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Manage Awardees</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search awardees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button onClick={handleAddNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Awardee
                </Button>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  All ({awardees.length})
                </Button>
                <Button
                  variant={filterType === 'featured' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('featured')}
                  className={filterType === 'featured' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  <Star className="mr-1 h-3 w-3" />
                  Featured ({stats?.featuredAwardees || 0})
                </Button>
                <Button
                  variant={filterType === 'visible' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('visible')}
                  className={filterType === 'visible' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Visible ({stats?.visibleAwardees || 0})
                </Button>
                <Button
                  variant={filterType === 'hidden' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('hidden')}
                  className={filterType === 'hidden' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  <EyeOff className="mr-1 h-3 w-3" />
                  Hidden ({stats?.hiddenAwardees || 0})
                </Button>
              </div>

              {/* Bulk Actions */}
              {selectedAwardees.size > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium self-center">
                    {selectedAwardees.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkFeature(true)}
                  >
                    <Star className="mr-1 h-3 w-3" />
                    Feature All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkFeature(false)}
                  >
                    <Star className="mr-1 h-3 w-3" />
                    Unfeature All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkVisibility(true)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Show All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkVisibility(false)}
                  >
                    <EyeOff className="mr-1 h-3 w-3" />
                    Hide All
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAwardees(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedAwardees.size === filteredAwardees.length && filteredAwardees.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAwardees.map((awardee) => (
                      <TableRow key={awardee.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedAwardees.has(awardee.id)}
                            onChange={() => handleSelectAwardee(awardee.id)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell>
                          {awardee.image_url ? (
                            <img 
                              src={awardee.image_url} 
                              alt={awardee.name} 
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{awardee.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{awardee.country}</Badge>
                        </TableCell>
                        <TableCell>{awardee.course}</TableCell>
                        <TableCell>{awardee.year}</TableCell>
                        <TableCell>
                          <Button
                            variant={awardee.featured ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleFeatured(awardee.id, awardee.featured || false)}
                            title={awardee.featured ? "Featured on homepage - Click to unfeature" : "Not featured - Click to feature"}
                            className={awardee.featured ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                            disabled={loadingStates[awardee.id] === 'featured'}
                          >
                            {loadingStates[awardee.id] === 'featured' ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                {awardee.featured ? 'Unfeaturing...' : 'Featuring...'}
                              </>
                            ) : (
                              <>
                                <Star className={`h-4 w-4 mr-1 ${awardee.featured ? 'fill-current' : ''}`} />
                                {awardee.featured ? 'Featured' : 'Feature'}
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={awardee.is_public !== false ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleVisibility(awardee.id, awardee.is_public !== false)}
                            title={awardee.is_public !== false ? "Profile is visible - Click to hide" : "Profile is hidden - Click to show"}
                            className={awardee.is_public !== false ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                            disabled={loadingStates[awardee.id] === 'visibility'}
                          >
                            {loadingStates[awardee.id] === 'visibility' ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                {awardee.is_public !== false ? 'Hiding...' : 'Showing...'}
                              </>
                            ) : (
                              <>
                                {awardee.is_public !== false ? (
                                  <><Eye className="h-4 w-4 mr-1" /> Visible</>
                                ) : (
                                  <><EyeOff className="h-4 w-4 mr-1" /> Hidden</>
                                )}
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(awardee.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(awardee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredAwardees.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredAwardees.length)} of {filteredAwardees.length} awardees
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="w-10"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
