# LSDTRADE+ Trading Journal

## Setup Instructions

1. Copy `.env.example` to `.env.local` and fill in your values
2. Run `npm install`
3. Run the SQL schema in Supabase SQL Editor
4. Create admin user in Supabase Authentication
5. Run `npm run dev` to test locally
6. Deploy to Vercel

## Admin Access

Email: ssiagos@hotmail.com gets automatic full access (no payment required)

## Environment Variables (Vercel)

Make sure these are set in Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID
- NEXT_PUBLIC_SITE_URL
