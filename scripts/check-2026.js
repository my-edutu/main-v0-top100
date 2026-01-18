const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check2026() {
    const { data, error, count } = await supabase
        .from('awardees')
        .select('id, name, year, cohort', { count: 'exact' })
        .eq('year', 2026);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${count} awardees with year 2026`);
    console.table(data);

    // Also check string '2026' just in case
    const { data: dataStr, count: countStr } = await supabase
        .from('awardees')
        .select('id, name, year, cohort', { count: 'exact' })
        .eq('year', '2026');

    console.log(`Found ${countStr} awardees with year '2026'`);
    console.table(dataStr);
}

check2026();
