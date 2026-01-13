# TRADESAVE+ Trading Journal

Professional trading journal application built with Next.js, Supabase, and Stripe.

## Features

- ✅ Multiple trading journals per user
- ✅ Trade logging with PnL, RR, direction, outcome
- ✅ Statistics (win rate, total PnL, avg RR)
- ✅ Email/password authentication
- ✅ Discord OAuth (free access for server members)
- ✅ Stripe subscription (£9/month)
- ✅ Admin bypass (ssiagos@hotmail.com)

---

## SETUP INSTRUCTIONS

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

3. **IMPORTANT: Disable Email Confirmation**
   - Go to **Authentication > Providers > Email**
   - Turn OFF "Confirm email"
   - This allows instant signup without email verification

4. **Run the Database Schema**
   - Go to **SQL Editor > New Query**
   - Paste the entire contents of `supabase-schema.sql`
   - Click **Run**

5. **Create Admin User**
   - Go to **Authentication > Users > Add User**
   - Email: `ssiagos@hotmail.com`
   - Password: `123456` (or your choice)
   - The trigger will automatically give this user "active" subscription

### Step 2: Discord OAuth Setup (Optional - for free Discord member access)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **OAuth2 > General**
   - Copy the Client ID
   - Copy the Client Secret
4. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

5. In Supabase:
   - Go to **Authentication > Providers > Discord**
   - Enable Discord
   - Paste Client ID and Client Secret

6. Get your Discord Server ID:
   - In Discord, enable Developer Mode (Settings > Advanced)
   - Right-click your server → Copy ID
   - Add to env: `DISCORD_GUILD_ID=your-server-id`

### Step 3: Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your **Secret Key** from Developers > API Keys → `STRIPE_SECRET_KEY`
3. Create a Product:
   - Go to **Products > Add Product**
   - Name: "TRADESAVE+ Pro"
   - Price: £9/month recurring
   - Copy the Price ID → `STRIPE_PRICE_ID`
4. Set up Webhook:
   - Go to **Developers > Webhooks > Add Endpoint**
   - URL: `https://tradesaveplus.com/api/stripe/webhook`
   - Events: Select all `checkout.session.*`, `customer.subscription.*`, `invoice.*`
   - Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

### Step 4: Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID`
   - `NEXT_PUBLIC_SITE_URL` = `https://tradesaveplus.com`
   - `DISCORD_GUILD_ID` (optional)
5. Deploy!

### Step 5: Connect Domain

1. In Vercel, go to **Settings > Domains**
2. Add `tradesaveplus.com`
3. Follow DNS configuration instructions

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Fill in your values

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## User Flows

### Public User (Paid)
1. Visit homepage → Click "Get Started"
2. Sign up with email/password
3. Redirected to pricing page
4. Click "Subscribe" → Stripe checkout
5. Payment completes → Redirected to dashboard
6. Create journals, log trades

### Discord Member (Free)
1. Visit homepage → Click "Discord Members"
2. Login with Discord OAuth
3. System checks if user is in TRADESAVE+ Discord server
4. If YES → Free "active" subscription → Dashboard
5. If NO → Show error, suggest paid subscription

### Admin
1. Login with `ssiagos@hotmail.com`
2. Automatic "active" subscription (no payment needed)
3. Full dashboard access

---

## Troubleshooting

### "Invalid login credentials"
- Make sure the user exists in Supabase Authentication
- Check password is correct
- Ensure email confirmation is disabled

### Signup shows "Check your email" but no email sent
- Go to Supabase > Authentication > Providers > Email
- Turn OFF "Confirm email"
- This enables instant signup

### Dashboard shows "Loading..." forever
- Check browser console for errors
- Verify Supabase environment variables are correct
- Make sure the SQL schema was run successfully

### Stripe checkout not working
- Verify STRIPE_SECRET_KEY is correct
- Verify STRIPE_PRICE_ID exists and is active
- Check NEXT_PUBLIC_SITE_URL matches your domain

### Discord login not working
- Verify Discord app is set up in Supabase providers
- Check redirect URL is correct
- Verify DISCORD_GUILD_ID is correct

---

## Support

For issues, contact the developer or check the Vercel deployment logs.
