const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkYears() {
    const { data, error } = await supabase
        .from('awardees')
        .select('name, year, cohort')
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Awardees data:');
    console.table(data);
}

checkYears();
