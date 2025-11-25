const { createClient } = require('@supabase/supabase-js');
const { read, utils } = require('xlsx');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const slugify = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const normalizeKey = (obj, keyVariants) => {
  const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const variant of keyVariants) {
    const normalizedVariant = normalize(variant);
    const foundKey = Object.keys(obj).find(key =>
      normalize(String(key)).includes(normalizedVariant)
    );
    if (foundKey) {
      const candidate = obj[foundKey];
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return candidate;
      }
    }
  }
  return null;
};

async function importAwardees() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    db: { schema: 'public' }
  });

  console.log('🚀 Starting awardees import...\n');

  try {
    // Read Excel file
    const excelPath = path.join(process.cwd(), 'public', 'top100 Africa future Leaders 2025.xlsx');
    console.log('📁 Reading Excel file:', excelPath);

    const buffer = fs.readFileSync(excelPath);
    const workbook = read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${rows.length} rows in Excel file\n`);

    // Parse rows
    const currentYear = new Date().getFullYear();
    const payload = rows.map((row, index) => {
      // Clean country
      let country = normalizeKey(row, ['country', 'nationality']) || '';
      if (country && typeof country === 'string' && country.includes(' ')) {
        const parts = country.split(' ');
        if (parts.length >= 2 && parts[0].length === 2) {
          country = parts.slice(1).join(' ');
        }
      }
      if (typeof country === 'string') {
        country = country.trim();
      } else if (country) {
        country = String(country);
      }

      // Extract year
      let year = normalizeKey(row, ['year', 'batch']);
      if (typeof year === 'string') {
        const parsed = parseInt(year, 10);
        year = Number.isFinite(parsed) ? parsed : null;
      }

      const rawName = normalizeKey(row, ['name', 'fullname', 'awardee']);
      const name = (() => {
        if (typeof rawName === 'string') return rawName.trim();
        if (rawName !== null && rawName !== undefined) return String(rawName);
        return `Awardee ${index + 1}`;
      })();
      const slug = slugify(name);
      const rawEmail = normalizeKey(row, ['email', 'mail', 'e-mail']);
      const rawCgpa = normalizeKey(row, ['cgpa', 'gpa', 'grade']);
      const rawCourse = normalizeKey(row, ['course', 'program', 'department']);
      const rawBio = normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30']);

      // Extract additional fields
      const rawAvatarUrl = normalizeKey(row, ['avatar', 'avatar_url', 'image', 'photo', 'picture']);
      const rawTagline = normalizeKey(row, ['tagline', 'title', 'position']);
      const rawHeadline = normalizeKey(row, ['headline', 'summary', 'intro']);

      // Social links
      const rawLinkedIn = normalizeKey(row, ['linkedin', 'linkedin_url', 'linked_in']);
      const rawTwitter = normalizeKey(row, ['twitter', 'twitter_url', 'x']);
      const rawInstagram = normalizeKey(row, ['instagram', 'instagram_url', 'ig']);
      const rawFacebook = normalizeKey(row, ['facebook', 'facebook_url', 'fb']);
      const rawWebsite = normalizeKey(row, ['website', 'website_url', 'portfolio']);

      const socialLinks = {};
      if (rawLinkedIn) socialLinks.linkedin = rawLinkedIn.toString().trim();
      if (rawTwitter) socialLinks.twitter = rawTwitter.toString().trim();
      if (rawInstagram) socialLinks.instagram = rawInstagram.toString().trim();
      if (rawFacebook) socialLinks.facebook = rawFacebook.toString().trim();
      if (rawWebsite) socialLinks.website = rawWebsite.toString().trim();

      return {
        name,
        slug,
        email: rawEmail ? rawEmail.toString().trim() : null,
        country: typeof country === 'string' && country.length > 0 ? country : null,
        cgpa: rawCgpa !== null && rawCgpa !== undefined ? rawCgpa.toString().trim() : null,
        course: rawCourse ? rawCourse.toString().trim() : null,
        bio: rawBio ? rawBio.toString().trim() : null,
        year: typeof year === 'number' && Number.isFinite(year) ? year : currentYear,
        avatar_url: rawAvatarUrl ? rawAvatarUrl.toString().trim() : null,
        tagline: rawTagline ? rawTagline.toString().trim() : null,
        headline: rawHeadline ? rawHeadline.toString().trim() : null,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : {},
        achievements: [],
        interests: [],
        is_public: true
      };
    });

    console.log('📊 Processing awardees...');
    console.log(`   Total to import: ${payload.length}`);

    // Check for existing awardees
    const chunkSize = 99;
    let existingAwardees = [];

    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('awardees')
        .select('id, slug')
        .in('slug', chunk.map(item => item.slug));

      if (error) {
        console.error('❌ Error checking existing awardees:', error.message);
        throw error;
      }

      if (data) {
        existingAwardees = existingAwardees.concat(data);
      }
    }

    console.log(`   Found ${existingAwardees.length} existing awardees (will be updated)`);

    // Skip existing awardees (no duplicates)
    const existingSlugs = new Set(existingAwardees.map(item => item.slug));
    const newPayload = payload.filter(item => !existingSlugs.has(item.slug));

    if (newPayload.length === 0) {
      console.log('\n✅ All awardees already exist in database!');
      return;
    }

    console.log(`   New awardees to import: ${newPayload.length}`);

    // Upsert awardees in chunks to avoid timeout
    console.log('\n💾 Importing to database...');

    const batchSize = 50;
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < newPayload.length; i += batchSize) {
      const batch = newPayload.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(newPayload.length / batchSize);

      console.log(`   Batch ${batchNum}/${totalBatches}: Importing ${batch.length} awardees...`);

      try {
        const { data, error } = await supabase
          .from('awardees')
          .insert(batch)
          .select();

        if (error) {
          console.error(`   ❌ Batch ${batchNum} failed:`, error.message);
          failed += batch.length;
        } else {
          imported += data?.length || batch.length;
          console.log(`   ✅ Batch ${batchNum} complete (${data?.length || batch.length} awardees)`);
        }
      } catch (err) {
        console.error(`   ❌ Batch ${batchNum} error:`, err.message);
        failed += batch.length;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (failed > 0) {
      console.log(`\n⚠️  Import completed with errors`);
      console.log(`   Successful: ${imported}`);
      console.log(`   Failed: ${failed}`);
    }

    console.log('\n✅ Import completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total processed: ${payload.length}`);
    console.log(`   Successfully imported: ${imported}`);
    console.log(`   Failed: ${failed}`);

    // Sample data
    console.log('\n📝 Sample awardees:');
    payload.slice(0, 3).forEach((awardee, idx) => {
      console.log(`\n   ${idx + 1}. ${awardee.name}`);
      console.log(`      Email: ${awardee.email || 'N/A'}`);
      console.log(`      Country: ${awardee.country || 'N/A'}`);
      console.log(`      Slug: ${awardee.slug}`);
    });

    console.log('\n✨ Next steps:');
    console.log('   1. Visit http://localhost:3000/admin/awardees to view all awardees');
    console.log('   2. Use visibility toggle to show/hide profiles');
    console.log('   3. Visit http://localhost:3000/awardees to see public directory');

  } catch (error) {
    console.error('\n❌ Error during import:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importAwardees();
