#!/bin/bash

# Admin Control System Setup Script
# This script sets up the database schema and verifies admin functionality

set -e  # Exit on error

echo "======================================"
echo "Top100 Africa Future Leaders"
echo "Admin Control System Setup"
echo "======================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable not set"
    echo "Please set it with: export DATABASE_URL='your_database_url'"
    exit 1
fi

echo "✅ Database URL configured"
echo ""

# Run core schema
echo "📊 Running core schema migration..."
psql "$DATABASE_URL" < supabase/schema.sql
echo "✅ Core schema applied"
echo ""

# Run homepage sections migration
echo "🏠 Running homepage sections migration..."
psql "$DATABASE_URL" < supabase/migrations/001_create_homepage_sections.sql
echo "✅ Homepage sections table created"
echo ""

# Run awardees table migration
echo "🎓 Running awardees table migration..."
psql "$DATABASE_URL" < supabase/migrations/002_create_awardees_table.sql
echo "✅ Awardees table created"
echo ""

# Verify tables exist
echo "🔍 Verifying tables..."
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;" -t | grep -E '(profiles|posts|events|awardees|homepage_sections|youtube_videos)'

if [ $? -eq 0 ]; then
    echo "✅ All core tables verified"
else
    echo "⚠️  Some tables may be missing"
fi
echo ""

# Check for admin user
echo "👤 Checking for admin users..."
ADMIN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM profiles WHERE role = 'admin';")

if [ "$ADMIN_COUNT" -eq 0 ]; then
    echo "⚠️  No admin users found"
    echo "📝 To create an admin user:"
    echo "   1. Sign up via the app at /auth/signup"
    echo "   2. Run: psql \$DATABASE_URL -c \"UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';\""
else
    echo "✅ Found $ADMIN_COUNT admin user(s)"
fi
echo ""

# Check RLS policies
echo "🔒 Verifying Row Level Security policies..."
RLS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_policies;")
echo "✅ $RLS_COUNT RLS policies configured"
echo ""

# Check indexes
echo "📑 Verifying database indexes..."
INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
echo "✅ $INDEX_COUNT indexes created"
echo ""

# Summary
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next Steps:"
echo "1. Create an admin user (see instructions above)"
echo "2. Start the development server: npm run dev"
echo "3. Access admin dashboard at: http://localhost:3000/admin"
echo "4. Test API endpoints with admin credentials"
echo ""
echo "Admin Features Available:"
echo "  ✅ Blog/Posts Management (/admin/blog)"
echo "  ✅ Awardees Management (/admin/awardees)"
echo "  ✅ Events Management (/admin/events)"
echo "  ✅ Homepage CMS (/admin/homepage)"
echo "  ✅ User Management (/admin/users)"
echo ""
echo "For detailed documentation, see:"
echo "  - ADMIN_CONTROL_SYSTEM_IMPLEMENTATION.md"
echo "  - ADMIN_SYSTEM_DOCUMENTATION.md"
echo ""
