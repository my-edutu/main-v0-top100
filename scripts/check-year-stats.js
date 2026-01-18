const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkYearStats() {
    const { data, error } = await supabase
        .from('awardees')
        .select('year');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts = {};
    data.forEach(row => {
        const y = row.year || 'null';
        counts[y] = (counts[y] || 0) + 1;
    });

    console.log('Awardee Year Statistics:');
    console.table(counts);
}

checkYearStats();
