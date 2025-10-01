import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { utils, write } from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Fetch all awardees from the database
    const { data: awardees, error } = await supabase
      .from('awardees')
      .select('*');
    
    if (error) {
      console.error('Error fetching awardees for export:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Failed to fetch awardees for export',
        error: error.message 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert awardees data to worksheet format
    const ws = utils.json_to_sheet(awardees.map(awardee => ({
      'Name': awardee.name,
      'Email': awardee.email,
      'Country': awardee.country,
      'CGPA': awardee.cgpa,
      'Course': awardee.course,
      'Bio': awardee.bio,
      'Year': awardee.year,
      'Image URL': awardee.image_url,
      'Created At': awardee.created_at
    })));

    // Create a new workbook and add the worksheet
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Awardees');

    // Generate the Excel file
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Return the Excel file as a response
    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=awardees_export.xlsx',
      },
    });
  } catch (error) {
    console.error('Error exporting awardees:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to export awardees',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}