import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testAdminAPI() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const url = `${baseUrl}/api/posts?scope=admin`

  console.log(`📡 Testing admin API endpoint: ${url}\n`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error Response:', errorText)
      return
    }

    const data = await response.json()

    if (Array.isArray(data)) {
      console.log(`\n✅ API returned ${data.length} posts:\n`)

      data.forEach((post: any, index: number) => {
        console.log(`${index + 1}. "${post.title}"`)
        console.log(`   ID: ${post.id}`)
        console.log(`   Slug: ${post.slug}`)
        console.log(`   Status: ${post.status}`)
        console.log(`   Featured: ${post.is_featured || post.isFeatured ? 'Yes' : 'No'}`)
        console.log('')
      })
    } else {
      console.log('⚠️  Response is not an array:', data)
    }
  } catch (error) {
    console.error('💥 Error testing API:', error)
  }
}

testAdminAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
