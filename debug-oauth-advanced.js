// Advanced Google OAuth Debug Script
// Run with: node debug-oauth-advanced.js

console.log('🔬 ADVANCED HOLANU Google OAuth Debug Script')
console.log('=============================================\n')

// Load environment variables
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

async function advancedDebug() {
  console.log('1. Environment Check:')
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ MISSING')
  console.log('SUPABASE_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  console.log()

  try {
    // Test Supabase connection
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    console.log('2. Supabase Connection:')
    console.log('✅ Client created')

    // Test auth endpoint directly
    const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`
    console.log('Testing auth endpoint:', authUrl)

    const response = await fetch(authUrl, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    console.log('Auth endpoint status:', response.status)

    if (response.ok) {
      const settings = await response.json()
      console.log('✅ Auth settings accessible')

      console.log('\n3. OAuth Providers Check:')
      if (settings.providers && Array.isArray(settings.providers)) {
        const googleProvider = settings.providers.find(p => p.name === 'google')
        if (googleProvider) {
          console.log('✅ Google provider found in settings!')
          console.log('Enabled:', googleProvider.enabled)
          console.log('Client ID exists:', !!googleProvider.client_id)
          console.log('Client ID length:', googleProvider.client_id ? googleProvider.client_id.length : 0)
        } else {
          console.log('❌ Google provider NOT found in providers array')
          console.log('Available providers:', settings.providers.map(p => p.name).join(', '))
        }
      } else {
        console.log('❌ No providers array in settings')
        console.log('Settings keys:', Object.keys(settings).join(', '))
      }

      // Test OAuth URL directly
      console.log('\n4. Direct OAuth URL Test:')
      const oauthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fdashboard`

      try {
        const oauthResponse = await fetch(oauthUrl, {
          redirect: 'manual' // Don't follow redirects
        })

        console.log('OAuth URL status:', oauthResponse.status)
        console.log('OAuth URL headers:', Object.fromEntries(oauthResponse.headers.entries()))

        if (oauthResponse.status === 404) {
          console.log('❌ 404 - Provider not configured')
        } else if (oauthResponse.status >= 300 && oauthResponse.status < 400) {
          console.log('✅ Redirect - Provider configured, redirecting to Google')
        } else {
          console.log('⚠️ Unexpected status:', oauthResponse.status)
        }
      } catch (error) {
        console.log('❌ OAuth URL fetch failed:', error.message)
      }

    } else {
      console.log('❌ Cannot access auth settings:', response.status, response.statusText)
    }

  } catch (error) {
    console.log('❌ Supabase test failed:', error.message)
  }

  console.log('\n5. Recommendations:')
  console.log('If Google provider not found:')
  console.log('1. Double-check Supabase project URL')
  console.log('2. Verify you are in the correct project')
  console.log('3. Try toggling Google OFF then ON again')
  console.log('4. Clear browser cache and try incognito')
  console.log('5. Check if Client ID/Secret are correct')
  console.log('6. Verify Google Console redirect URI is correct')
}

advancedDebug().catch(console.error)