// Supabase Edge Function: create-toyyibpay-bill
// Fetches reservation data from SQL Server backend and creates ToyyibPay bill

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================
    // AUTHENTICATION HANDLING
    // ============================================
    const authHeader = req.headers.get('Authorization')
    const apikeyHeader = req.headers.get('apikey')
    
    console.log('🔐 Authentication check:')
    console.log('   - Authorization header present:', !!authHeader)
    console.log('   - apikey header present:', !!apikeyHeader)
    console.log('   - Authorization header (first 20 chars):', authHeader ? authHeader.substring(0, 20) + '...' : 'NOT SET')
    
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    let isAuthenticated = false
    
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        if (supabaseAnonKey && token === supabaseAnonKey) {
          isAuthenticated = true
          console.log('✅ Authenticated with anon key (public access)')
        } else {
          isAuthenticated = true
          console.log('✅ Authenticated with Bearer token')
        }
      } else {
        if (supabaseAnonKey && authHeader === supabaseAnonKey) {
          isAuthenticated = true
          console.log('✅ Authenticated with anon key (direct)')
        }
      }
    }
    
    if (!isAuthenticated && apikeyHeader) {
      if (supabaseAnonKey && apikeyHeader === supabaseAnonKey) {
        isAuthenticated = true
        console.log('✅ Authenticated with apikey header')
      }
    }
    
    if (!isAuthenticated) {
      console.error('❌ Authentication failed - missing or invalid token')
      return new Response(
        JSON.stringify({ 
          code: 401,
          message: 'Missing or invalid authorization token',
          details: 'Please include Authorization header with Bearer token or apikey header with your Supabase anon key',
          hint: 'Add header: Authorization: Bearer YOUR_ANON_KEY'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('✅ Request authenticated successfully')
    
    // ============================================
    // REQUEST PROCESSING
    // ============================================
    const { reservation_id, name, email, amount, phone } = await req.json()

    console.log(`📝 ========== REQUEST RECEIVED ==========`)
    console.log(`📝 Creating ToyyibPay bill for reservation_id: ${reservation_id}, amount: ${amount}`)
    console.log(`📝 Received data - name: ${name || 'null'}, email: ${email || 'null'}, phone: ${phone || 'null'}`)

    if (!reservation_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: reservation_id, amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const toyyibPayApiKey = Deno.env.get('TOYYIBPAY_API_KEY')
    const toyyibPayCategoryCode = Deno.env.get('TOYYIBPAY_CATEGORY_CODE')
    const toyyibPayEnv = Deno.env.get('TOYYIBPAY_ENV') || 'development'
    const backendBaseUrl = Deno.env.get('BACKEND_BASE_URL') || 'http://172.20.10.5:5000'

    if (!toyyibPayApiKey || !toyyibPayCategoryCode) {
      console.error('❌ ToyyibPay API keys are not configured in environment variables')
      return new Response(
        JSON.stringify({ error: 'ToyyibPay API keys not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const sqlBackendBaseUrl = Deno.env.get('SQL_BACKEND_BASE_URL') || 'http://172.20.10.5:5000'
    const sqlBackendAuthKey = Deno.env.get('SQL_BACKEND_INTERNAL_KEY') || ''

    const toyyibPayBaseUrl = (toyyibPayEnv === 'production') 
      ? 'https://toyyibpay.com' 
      : 'https://dev.toyyibpay.com'

    const reservationIdNumber = Number(reservation_id)
    if (!Number.isInteger(reservationIdNumber)) {
      return new Response(
        JSON.stringify({ error: 'reservation_id must be an integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const reservationUrl = `${sqlBackendBaseUrl}/api/reservations/${reservationIdNumber}`
    const reservationHeaders: HeadersInit = { 'Content-Type': 'application/json' }
    if (sqlBackendAuthKey) reservationHeaders['x-internal-key'] = sqlBackendAuthKey

    const reservationResponse = await fetch(reservationUrl, { method: 'GET', headers: reservationHeaders })
    const reservationText = await reservationResponse.text()
    let reservationJson: any
    try { reservationJson = JSON.parse(reservationText) } catch { reservationJson = null }

    if (!reservationResponse.ok || !reservationJson?.success || !reservationJson?.reservation) {
      return new Response(
        JSON.stringify({ error: reservationJson?.message || 'Reservation not found.', details: reservationJson }),
        { status: reservationResponse.status || 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const reservation = reservationJson.reservation
    const reservationEmail = reservation.email || ''
    
    const customerName = (name && name.trim() !== '') ? name.trim() : (reservation.customer_name || 'Customer')
    const customerEmail = (email && email.trim() !== '') ? email.trim() : reservationEmail
    const customerPhone = (phone && phone.trim() !== '') ? phone.trim() : (reservation.customer_phone || '0123456789')

    const billNameMaxLength = 30
    let billName = `Reservation #${reservation_id}`
    if (billName.length > billNameMaxLength) billName = billName.substring(0, billNameMaxLength)

    const billAmount = parseFloat(amount)
    const billDescription = `Payment for Reservation #${reservation_id} (RM ${billAmount.toFixed(2)})`
    const billAmountInSen = Math.round(billAmount * 100)

    const requestParams = new URLSearchParams({
      userSecretKey: toyyibPayApiKey,
      categoryCode: toyyibPayCategoryCode,
      billName: billName,
      billDescription: billDescription,
      billPriceSetting: '1',
      billPayorInfo: '1',
      billAmount: billAmountInSen.toString(),
      billReturnUrl: `${backendBaseUrl}/toyyibpay-callback?reservation_id=${reservation_id}`, // <-- ADDED
      billCallbackUrl: `${backendBaseUrl}/api/payment/callback?reservation_id=${reservation_id}`,
      billTo: customerName.trim(),
      billEmail: customerEmail.trim(),
      billPhone: customerPhone.trim()
    })

    const toyyibPayUrl = `${toyyibPayBaseUrl}/index.php/api/createBill`

    let response
    try {
      response = await fetch(toyyibPayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestParams.toString()
      })

      const toyyibText = await response.text()
      let responseData: any
      try { responseData = JSON.parse(toyyibText) } catch { responseData = [] }

      if (!Array.isArray(responseData) || responseData.length === 0 || !responseData[0]?.BillCode) {
        return new Response(
          JSON.stringify({ error: 'Failed to create ToyyibPay bill', details: responseData }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const billCode = responseData[0].BillCode
      const paymentUrl = `${toyyibPayBaseUrl}/${billCode}`

      return new Response(
        JSON.stringify({ paymentUrl, billCode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create ToyyibPay bill', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to create ToyyibPay bill', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
