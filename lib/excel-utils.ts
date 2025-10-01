import { read, utils } from 'xlsx';

// Function to read awardees from Excel file
export async function readAwardeesFromExcel(filePath: string) {
  try {
    // This function would typically be used server-side
    // For browser/client use, we'd need to handle file input differently
    const response = await fetch(filePath);
    const buffer = await response.arrayBuffer();
    
    const workbook = read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);

    return processAwardeesData(jsonData);
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// Function to process the raw Excel data into our required format
export function processAwardeesData(rawData: any[]) {
  return rawData.map((row: any, index: number) => {
    // Normalize keys to handle different possible column names
    const normalizeKey = (obj: any, keyVariants: string[]): any => {
      for (const variant of keyVariants) {
        const foundKey = Object.keys(obj).find(k => 
          k.toLowerCase().replace(/\s+/g, '').includes(variant.toLowerCase().replace(/\s+/g, ''))
        );
        if (foundKey && obj[foundKey]) {
          return obj[foundKey];
        }
      }
      return null;
    };

    // Extract country name properly - remove abbreviations like "NG Nigeria", keep only "Nigeria"
    let country = normalizeKey(row, ['country', 'nationality']) || '';
    if (country && typeof country === 'string' && country.includes(' ')) {
      // If it looks like "XX CountryName", extract just the country name
      const parts = country.split(' ');
      if (parts.length >= 2 && parts[0].length === 2) { // Two-letter abbreviation
        country = parts.slice(1).join(' '); // Take everything after the abbreviation
      }
    }
    
    // Extract year properly
    let year = normalizeKey(row, ['year', 'batch']);
    if (typeof year === 'string') {
      year = parseInt(year);
    }

    return {
      id: row.id || `awardee-${index + 1}`,
      name: normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`,
      email: normalizeKey(row, ['email', 'mail', 'e-mail']) || null,
      country: country || null,
      cgpa: normalizeKey(row, ['cgpa', 'gpa', 'grade']) || null,
      course: normalizeKey(row, ['course', 'program', 'department']) || null,
      bio: normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30']) || null,
      year: year ? parseInt(year.toString()) : 2024,
      slug: generateSlug(normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`)
    };
  });
}

// Helper function to generate slug
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Function to get statistics from awardees data
export function getAwardeesStats(awardees: any[]) {
  if (!awardees || awardees.length === 0) {
    return {
      totalAwardees: 0,
      totalCountries: 0,
      totalCourses: 0,
      currentYearAwardees: 0,
      recentAwardees: 0,
      topCountries: [],
      topCourses: []
    };
  }

  const currentYear = new Date().getFullYear();
  
  const totalAwardees = awardees.length;
  const totalCountries = [...new Set(awardees.map((a: any) => a.country))].length;
  const totalCourses = [...new Set(awardees.map((a: any) => a.course))].length;
  const currentYearAwardees = awardees.filter((a: any) => a.year === currentYear).length;
  const recentAwardees = awardees.filter((a: any) => 
    a.year === currentYear || 
    (a.year === currentYear - 1 && new Date().getMonth() < 3) // Include last year if we're early in current year
  ).length;

  // Calculate countries distribution
  const countryMap = new Map<string, number>();
  awardees.forEach((awardee: any) => {
    if (awardee.country) {
      countryMap.set(awardee.country, (countryMap.get(awardee.country) || 0) + 1);
    }
  });
  const topCountries = Array.from(countryMap, ([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 countries

  // Calculate course distribution
  const courseMap = new Map<string, number>();
  awardees.forEach((awardee: any) => {
    if (awardee.course) {
      courseMap.set(awardee.course, (courseMap.get(awardee.course) || 0) + 1);
    }
  });
  const topCourses = Array.from(courseMap, ([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 courses

  return {
    totalAwardees,
    totalCountries,
    totalCourses,
    currentYearAwardees,
    recentAwardees,
    topCountries,
    topCourses
  };
}