// Debug script for Google OAuth issues
// Run with: node debug-oauth.js

console.log('🔍 HOLANU Google OAuth Debug Script')
console.log('=====================================\n')

// Load environment variables from .env.local
const fs = require('fs')
const path = require('path')

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf8')
    const envVars = {}

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        if (value.startsWith('"') && value.endsWith('"')) {
          envVars[key.trim()] = value.slice(1, -1)
        } else {
          envVars[key.trim()] = value
        }
      }
    })

    return envVars
  } catch (error) {
    console.log('❌ Cannot load .env.local file:', error.message)
    return {}
  }
}

const envVars = loadEnvFile()
process.env = { ...process.env, ...envVars }

// Check environment variables
console.log('1. Environment Variables Check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ NOT SET')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('ANON_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length)
  console.log('ANON_KEY starts with:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...')
}
console.log()

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('2. Supabase Connection Test:')

  try {
    // Dynamic import for ESM compatibility
    const { createClient } = await import('@supabase/supabase-js')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    console.log('✅ Supabase client created successfully')

    // Test basic connection
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    console.log('Session check:', sessionError ? '❌ Error' : '✅ OK')

    if (sessionError) {
      console.log('Session error:', sessionError.message)
    }

    // Test settings endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const settings = await response.json()
      console.log('✅ Auth settings accessible')

      // Check if Google OAuth is enabled
      const googleProvider = settings.providers?.find(p => p.name === 'google')
      if (googleProvider) {
        console.log('✅ Google OAuth provider found')
        console.log('Google enabled:', googleProvider.enabled)
        console.log('Client ID exists:', !!googleProvider.client_id)
      } else {
        console.log('❌ Google OAuth provider not found')
      }
    } else {
      console.log('❌ Cannot access auth settings:', response.status, response.statusText)
    }

  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message)
  }

  console.log()
}

// Test OAuth URL construction
function testOAuthURL() {
  console.log('3. OAuth URL Construction Test:')

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ports = [3000, 3001, 3002, 3003]
  const redirectUrls = ports.map(port => `http://localhost:${port}/dashboard`)

  console.log('Testing multiple ports (redirect to dashboard):')
  redirectUrls.forEach(url => {
    const oauthUrl = `${baseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(url)}`
    console.log(`Port ${url.split(':')[2].split('/')[0]}: ${oauthUrl}`)
  })
  console.log()
}

// Test callback route
async function testCallbackRoute() {
  console.log('4. Callback Route Test:')

  const ports = [3000, 3001, 3002, 3003]
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/auth/callback`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log(`Port ${port} - Status: ${response.status}, Accessible: ${response.status !== 404}`)

    } catch (error) {
      console.log(`Port ${port} - ❌ Failed: ${error.message}`)
    }
  }
  console.log()
}

// Test manual OAuth URL
async function testManualOAuth() {
  console.log('5. Manual OAuth URL Test:')

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const redirectUrl = 'http://localhost:3000/dashboard' // Port 3000, langsung ke dashboard

  const oauthUrl = `${baseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`

  console.log('Manual OAuth URL (port 3000):')
  console.log(oauthUrl)
  console.log()
  console.log('📋 Instructions:')
  console.log('1. Copy URL di atas')
  console.log('2. Paste di browser baru (incognito)')
  console.log('3. Jika redirect ke Google login = Supabase OK')
  console.log('4. Jika error = Konfigurasi Supabase salah')
  console.log()
}

// Run all tests
async function runDebug() {
  await testSupabaseConnection()
  testOAuthURL()
  await testCallbackRoute()
  testManualOAuth()

  console.log('🎯 DEBUG SUMMARY:')
  console.log('================')
  console.log('1. ✅ Pastikan Google OAuth provider enabled di Supabase')
  console.log('2. ✅ Pastikan credentials Google dimasukkan dengan benar')
  console.log('3. ✅ Pastikan redirect URLs match antara Supabase & Google Console')
  console.log('4. ✅ Test manual OAuth URL di browser incognito')
  console.log('5. ✅ Check browser console saat klik login Google')
  console.log('6. ✅ Check Supabase Auth logs untuk error details')
  console.log()
  console.log('🚀 LANGKAH CEPAT:')
  console.log('1. Jalankan: node debug-oauth.js')
  console.log('2. Copy manual OAuth URL (port 3000)')
  console.log('3. Test di browser incognito')
  console.log('4. Jika berhasil ke Google = Supabase OK, masalah di frontend')
  console.log('5. Jika error = Konfigurasi Supabase salah')
  console.log()
  console.log('📞 Jika masih bermasalah, share:')
  console.log('- Output debug script lengkap')
  console.log('- Browser console errors')
  console.log('- Screenshot Supabase dashboard')
  console.log('- Port yang digunakan Next.js (biasanya 3000)')
}

runDebug().catch(console.error)