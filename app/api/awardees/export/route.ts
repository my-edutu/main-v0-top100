import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/require-admin';
import { utils, write } from 'xlsx';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Require admin authentication
  const adminCheck = await requireAdmin(req);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const supabase = createClient(true); // Use service role for admin operations

    // Fetch all awardees from the database
    const { data: awardees, error } = await supabase
      .from('awardees')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching awardees for export:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch awardees for export',
        error: error.message
      }, { status: 500 });
    }

    if (!awardees || awardees.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No awardees found to export'
      }, { status: 404 });
    }

    // Convert awardees data to worksheet format with all fields
    const ws = utils.json_to_sheet(awardees.map((awardee: any) => ({
      'ID': awardee.id || '',
      'Name': awardee.name || '',
      'Slug': awardee.slug || '',
      'Email': awardee.email || '',
      'Country': awardee.country || '',
      'CGPA': awardee.cgpa || '',
      'Course': awardee.course || '',
      'Bio': awardee.bio || '',
      'Year': awardee.year || '',
      'Image URL': awardee.image_url || '',
      'Avatar URL': awardee.avatar_url || '',
      'Tagline': awardee.tagline || '',
      'Headline': awardee.headline || '',
      'Featured': awardee.featured ? 'Yes' : 'No',
      'Visible': awardee.is_public !== false ? 'Yes' : 'No',
      'LinkedIn': awardee.social_links?.linkedin || '',
      'Twitter': awardee.social_links?.twitter || '',
      'Instagram': awardee.social_links?.instagram || '',
      'Facebook': awardee.social_links?.facebook || '',
      'Website': awardee.social_links?.website || '',
      'Interests': Array.isArray(awardee.interests) ? awardee.interests.join(', ') : '',
      'Profile ID': awardee.profile_id || '',
      'Created At': awardee.created_at || '',
      'Updated At': awardee.updated_at || ''
    })));

    // Set column widths for better readability
    const columnWidths = [
      { wch: 36 }, // ID
      { wch: 30 }, // Name
      { wch: 30 }, // Slug
      { wch: 30 }, // Email
      { wch: 20 }, // Country
      { wch: 10 }, // CGPA
      { wch: 30 }, // Course
      { wch: 50 }, // Bio
      { wch: 10 }, // Year
      { wch: 50 }, // Image URL
      { wch: 50 }, // Avatar URL
      { wch: 30 }, // Tagline
      { wch: 30 }, // Headline
      { wch: 10 }, // Featured
      { wch: 10 }, // Visible
      { wch: 30 }, // LinkedIn
      { wch: 30 }, // Twitter
      { wch: 30 }, // Instagram
      { wch: 30 }, // Facebook
      { wch: 30 }, // Website
      { wch: 40 }, // Interests
      { wch: 36 }, // Profile ID
      { wch: 25 }, // Created At
      { wch: 25 }  // Updated At
    ];
    ws['!cols'] = columnWidths;

    // Create a new workbook and add the worksheet
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Awardees');

    // Generate the Excel file
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Create response with timestamped filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `awardees-export-${timestamp}.xlsx`;

    // Return the Excel file as a response
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Error exporting awardees:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to export awardees',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}