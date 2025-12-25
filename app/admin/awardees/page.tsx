'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Star,
  FileText
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

  // ... existing code ...

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-20 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Awardee Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
            Awardee <span className="text-blue-500">Directory</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">
            Manage, verify, and spotlight future leaders of Africa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/admin/awardees/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-2 sm:px-4 shadow-lg shadow-blue-900/20 font-bold">
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add New</span>
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleExport} className="bg-zinc-950/50 border-white/10 text-zinc-400 hover:text-white rounded-xl h-9 px-2 sm:px-4 font-bold">
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <KPITile
          label="Total Leaders"
          value={stats?.totalAwardees || 0}
          icon={Users}
          color="blue"
          subValue="All time"
        />
        <KPITile
          label="Nations"
          value={stats?.totalCountries || 0}
          icon={Globe}
          color="emerald"
          subValue="Represented"
        />
        <KPITile
          label="Featured"
          value={stats?.featuredAwardees || 0}
          icon={Star}
          color="amber"
          subValue="On Homepage"
        />
        <KPITile
          label="Hidden"
          value={stats?.hiddenAwardees || 0}
          icon={EyeOff}
          color="rose"
          subValue="Private Profiles"
        />
      </div>

      {/* Operations Bar: Import/Export & Filters */}
      <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-zinc-400" />
              Data Operations
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Search & Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search leaders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-950/50 border-white/10 text-white h-11 rounded-xl focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-zinc-600 w-full"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1">
                <FilterButton
                  active={filterType === 'all'}
                  onClick={() => setFilterType('all')}
                  label={`All (${awardees.length})`}
                />
                <FilterButton
                  active={filterType === 'featured'}
                  onClick={() => setFilterType('featured')}
                  label={`Featured (${stats?.featuredAwardees || 0})`}
                  icon={Star}
                  color="amber"
                />
                <FilterButton
                  active={filterType === 'visible'}
                  onClick={() => setFilterType('visible')}
                  label={`Visible (${stats?.visibleAwardees || 0})`}
                  icon={Eye}
                  color="emerald"
                />
                <FilterButton
                  active={filterType === 'hidden'}
                  onClick={() => setFilterType('hidden')}
                  label={`Hidden (${stats?.hiddenAwardees || 0})`}
                  icon={EyeOff}
                  color="rose"
                />
              </div>
            </div>

            {/* Right: Import/Export Actions */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-300">Bulk Data Management</h3>
                <p className="text-xs text-zinc-500">Import records via Excel or export current view.</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="flex-1 min-w-[200px] flex gap-2">
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
                    disabled={uploading}
                    className="flex-1 bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300"
                  >
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {file ? file.name : 'Select Excel'}
                  </Button>
                  {file && (
                    <Button onClick={handleImport} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Import
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExport} className="bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300">
                    <Download className="mr-2 h-4 w-4" /> Export
                  </Button>
                  <a href="/top100 Africa future Leaders 2025.xlsx" download>
                    <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white" title="Download Template">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Selection Actions */}
          {selectedAwardees.size > 0 && (
            <div className="mt-6 flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-in slide-in-from-top-2">
              <span className="text-sm font-medium text-blue-200 px-2">
                {selectedAwardees.size} items selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleBulkFeature(true)} className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">Feature</Button>
                <Button size="sm" variant="ghost" onClick={() => handleBulkVisibility(true)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">Show</Button>
                <Button size="sm" variant="ghost" onClick={() => handleBulkVisibility(false)} className="text-zinc-400 hover:text-zinc-300 hover:bg-white/5">Hide</Button>
                <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">Delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedAwardees(new Set())} className="text-zinc-500">Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Data Table */}
      <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4 text-zinc-500">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p>Accessing secure records...</p>
          </div>
        ) : (
          <div className="relative">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-12 text-zinc-400 pl-6">
                      <input
                        type="checkbox"
                        checked={selectedAwardees.size === filteredAwardees.length && filteredAwardees.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
                      />
                    </TableHead>
                    <TableHead className="text-zinc-400">Profile</TableHead>
                    <TableHead className="text-zinc-400">Name</TableHead>
                    <TableHead className="text-zinc-400">Country</TableHead>
                    <TableHead className="text-zinc-400">Education</TableHead>
                    <TableHead className="text-zinc-400">Year</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAwardees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-zinc-500">
                        No awardees found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAwardees.map((awardee) => (
                      <TableRow key={awardee.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="pl-6">
                          <input
                            type="checkbox"
                            checked={selectedAwardees.has(awardee.id)}
                            onChange={() => handleSelectAwardee(awardee.id)}
                            className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-white/10 group-hover:ring-blue-500/50 transition-all">
                            {awardee.image_url ? (
                              <img src={awardee.image_url} alt={awardee.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-zinc-500">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-zinc-200">{awardee.name}</TableCell>
                        <TableCell>
                          {awardee.country && (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              <span className="text-zinc-400 text-xs font-medium">{awardee.country}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs max-w-[200px] truncate" title={awardee.course || ''}>
                          {awardee.course || '—'}
                        </TableCell>
                        <TableCell className="text-zinc-500 font-mono text-xs">{awardee.year}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 rounded-full ${awardee.featured ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-600 hover:text-amber-400 hover:bg-white/5'}`}
                              onClick={() => handleToggleFeatured(awardee.id, awardee.featured || false)}
                              disabled={loadingStates[awardee.id] === 'featured'}
                            >
                              {loadingStates[awardee.id] === 'featured' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className={`h-4 w-4 ${awardee.featured ? 'fill-current' : ''}`} />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 rounded-full ${awardee.is_public !== false ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-600 hover:text-emerald-400 hover:bg-white/5'}`}
                              onClick={() => handleToggleVisibility(awardee.id, awardee.is_public !== false)}
                              disabled={loadingStates[awardee.id] === 'visibility'}
                            >
                              {loadingStates[awardee.id] === 'visibility' ? <Loader2 className="h-3 w-3 animate-spin" /> : (awardee.is_public !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />)}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(awardee.id)} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(awardee.id)} className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
              {paginatedAwardees.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  No awardees found matching your criteria.
                </div>
              ) : (
                paginatedAwardees.map((awardee) => (
                  <div key={awardee.id} className="relative bg-zinc-950/40 border border-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-3 hover:border-blue-500/30 transition-all overflow-hidden group">
                    {/* Select Checkbox Top Right */}
                    <div className="absolute top-3 right-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedAwardees.has(awardee.id)}
                        onChange={() => handleSelectAwardee(awardee.id)}
                        className="h-4 w-4 sm:h-5 sm:w-5 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                        {awardee.image_url ? (
                          <img src={awardee.image_url} alt={awardee.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-zinc-600">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">{awardee.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-zinc-500 text-[10px] sm:text-xs font-mono">{awardee.year}</span>
                          <span className="h-0.5 w-0.5 rounded-full bg-zinc-700" />
                          <span className="text-blue-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">{awardee.country}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 bg-white/5 rounded-xl p-2 sm:p-3 border border-white/5">
                      <div className="flex justify-between items-center text-[10px] sm:text-xs">
                        <span className="text-zinc-500">Education</span>
                        <span className="text-white font-medium truncate max-w-[120px] sm:max-w-[150px]">{awardee.course || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-600 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">Actions</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFeatured(awardee.id, awardee.featured || false)}
                            className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-full", awardee.featured ? "bg-amber-500/20 text-amber-500" : "bg-white/5 text-zinc-600")}
                          >
                            <Star className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", awardee.featured && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleVisibility(awardee.id, awardee.is_public !== false)}
                            className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-full", awardee.is_public !== false ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-zinc-600")}
                          >
                            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(awardee.id)} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/5 text-zinc-400">
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(awardee.id)} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-rose-500/10 text-rose-500">
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && filteredAwardees.length > ITEMS_PER_PAGE && (
          <div className="border-t border-white/5 p-4 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {startIndex + 1}-{Math.min(endIndex, filteredAwardees.length)} of {filteredAwardees.length} records
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="bg-transparent border-white/10 text-zinc-400 hover:text-white">Previous</Button>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="bg-transparent border-white/10 text-zinc-400 hover:text-white">Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Sub-components
import { cn } from '@/lib/utils';

function KPITile({ label, value, icon: Icon, color, subValue }: any) {
  const colors: any = {
    blue: "from-blue-600 to-indigo-600 shadow-blue-500/20",
    emerald: "from-emerald-600 to-teal-600 shadow-emerald-500/20",
    amber: "from-orange-500 to-amber-500 shadow-orange-500/20",
    rose: "from-rose-600 to-pink-600 shadow-rose-500/20",
  }

  return (
    <div className={cn(
      "relative p-6 rounded-[2rem] border-none bg-gradient-to-br shadow-xl overflow-hidden transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 group",
      colors[color]
    )}>
      {/* Background Icon */}
      <Icon className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-[0.08] -rotate-12 group-hover:scale-110 transition-transform duration-700" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{label}</p>
            {subValue && <span className="text-[10px] font-medium text-white/90 bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">{subValue}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterButton({ active, onClick, label, icon: Icon, color = "blue" }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
        active
          ? `bg-${color}-500/10 text-${color}-400 border-${color}-500/50`
          : "bg-white/5 text-zinc-400 border-transparent hover:bg-white/10 hover:text-zinc-200"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}
