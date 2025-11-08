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
  EyeOff
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
}

interface Stats {
  totalAwardees: number;
  totalCountries: number;
  totalCourses: number;
  currentYearAwardees: number;
  recentAwardees: number;
}

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

  useEffect(() => {
    if (awardees.length > 0) {
      calculateStats();
    }
  }, [awardees]);

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = awardees.filter(awardee => 
        awardee.name.toLowerCase().includes(term) ||
        (awardee.country && awardee.country.toLowerCase().includes(term)) ||
        (awardee.course && awardee.course.toLowerCase().includes(term)) ||
        (awardee.bio && awardee.bio.toLowerCase().includes(term))
      );
      setFilteredAwardees(filtered);
    } else {
      setFilteredAwardees(awardees);
    }
  }, [searchTerm, awardees]);

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
        recentAwardees: 0
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

    setStats({
      totalAwardees,
      totalCountries,
      totalCourses,
      currentYearAwardees,
      recentAwardees
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
        method: 'DELETE'
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
      toast.loading('Updating visibility...', { id: `visibility-${id}` });

      const response = await fetch('/api/awardees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          is_public: !currentVisibility
        })
      });

      if (!response.ok) throw new Error('Failed to update visibility');

      const result = await response.json();

      if (result.success) {
        await fetchAwardees({ withSpinner: false });
        toast.success(
          `Profile is now ${!currentVisibility ? 'visible' : 'hidden'}`,
          { id: `visibility-${id}` }
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility', { id: `visibility-${id}` });
    }
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
          Awardees Management
        </h1>
        <p className="text-muted-foreground">Manage and update Top100 Africa Future Leaders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-amber-400/30 rounded-lg mr-3">
                <Calendar className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">{new Date().getFullYear()}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-amber-400/30 rounded animate-pulse" /> : stats?.currentYearAwardees || 0}
            </div>
            <p className="text-xs text-amber-100 mt-1">Current year awardees</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-400/30 rounded-lg mr-3">
                <Award className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Recent</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-emerald-400/30 rounded animate-pulse" /> : stats?.recentAwardees || 0}
            </div>
            <p className="text-xs text-emerald-100 mt-1">This and last year</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Manage Awardees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
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

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAwardees.map((awardee) => (
                      <TableRow key={awardee.id}>
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
                            variant={awardee.is_public !== false ? "default" : "secondary"}
                            size="sm"
                            onClick={() => handleToggleVisibility(awardee.id, awardee.is_public !== false)}
                            title={awardee.is_public !== false ? "Profile is visible - Click to hide" : "Profile is hidden - Click to show"}
                          >
                            {awardee.is_public !== false ? (
                              <><Eye className="h-4 w-4 mr-1" /> Visible</>
                            ) : (
                              <><EyeOff className="h-4 w-4 mr-1" /> Hidden</>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Excel Import/Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
              
              <div className="pt-4">
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
      </div>
    </div>
  );
}
