# Static Website Hosting & Custom Domain Guide

## Hosting Options for Static Websites (No Backend)

### Free Options

**GitHub Pages**

- Pros: Free, automatic deployment from Git, custom domains supported, good for open-source projects
- Cons: Public repos only (unless paid), 1GB size limit, 100GB bandwidth/month limit

**Netlify**

- Pros: Free tier is generous, automatic deployments, built-in CDN, serverless functions available, form handling
- Cons: 100GB bandwidth/month on free tier, builds can be slow on free tier

**Vercel**

- Pros: Excellent performance, great for Next.js/React, automatic deployments, serverless functions, generous free tier
- Cons: Primarily focused on JS frameworks, bandwidth limits on free tier

**Cloudflare Pages**

- Pros: Unlimited bandwidth on free tier, fast global CDN, unlimited requests, good DDoS protection
- Cons: 500 builds/month limit, steeper learning curve

**Firebase Hosting**

- Pros: Free tier available, good integration with other Firebase services, CDN included
- Cons: 10GB storage/1GB bandwidth per month on free tier, can get expensive at scale

### Paid Options

**AWS S3 + CloudFront**

- Pros: Highly scalable, pay-per-use pricing, extremely reliable, full AWS integration
- Cons: More complex setup, costs can add up with traffic, requires AWS knowledge

**DigitalOcean Spaces**

- Pros: Simple pricing ($5/month for 250GB storage + 1TB transfer), easy to use
- Cons: Less features than AWS, smaller CDN network

**Azure Static Web Apps**

- Pros: Good Microsoft integration, automatic SSL, custom domains
- Cons: Can be expensive, Azure-centric ecosystem

### Recommendation

For most static sites: **Cloudflare Pages** or **Netlify** (both have excellent free tiers and are easy to use)

## Custom Domain Support

### All Options Support Custom Domains

**Free Tier (all support custom domains)**

- **GitHub Pages** - Free custom domain support
- **Netlify** - Free custom domain support
- **Vercel** - Free custom domain support
- **Cloudflare Pages** - Free custom domain support (works especially well if you use Cloudflare as your DNS provider)
- **Firebase Hosting** - Free custom domain support

**Paid Options (all support custom domains)**

- **AWS S3 + CloudFront** - Custom domain support included
- **DigitalOcean Spaces** - Custom domain support included
- **Azure Static Web Apps** - Custom domain support included

### Setup Differences

- **Cloudflare Pages** is easiest if your domain is already on Cloudflare DNS (one-click setup)
- **GitHub Pages** requires you to configure DNS records manually
- **Netlify/Vercel** have simple UIs for adding custom domains and auto-configure SSL
- **AWS/Azure** require more configuration steps

All of them provide free SSL certificates (HTTPS) for custom domains via Let's Encrypt or similar services.

## How to Check if Your Domain is on Cloudflare DNS

### Method 1: Check Nameservers (Most Reliable)

Run this command in your terminal:

```bash
dig NS yourdomain.com +short
```

or

```bash
nslookup -type=NS yourdomain.com
```

If your domain is on Cloudflare, you'll see nameservers like:

- `*.ns.cloudflare.com` (e.g., `dana.ns.cloudflare.com`, `walt.ns.cloudflare.com`)

### Method 2: Check Cloudflare Dashboard

- Log into [dash.cloudflare.com](https://dash.cloudflare.com)
- If your domain appears in the list, it's on Cloudflare DNS

### Method 3: Online Tool

- Visit [whatsmydns.net](https://www.whatsmydns.net)
- Enter your domain and select "NS" record type
- If it shows Cloudflare nameservers, you're using Cloudflare DNS

### Method 4: Check Where You Bought the Domain

- Log into your domain registrar (GoDaddy, Namecheap, Google Domains, etc.)
- Look at the nameserver settings
- If they point to `*.ns.cloudflare.com`, you're using Cloudflare

## Moving to Cloudflare DNS

If you're **not** on Cloudflare DNS but want to be:

1. Sign up at Cloudflare
2. Add your domain
3. Update nameservers at your domain registrar to the ones Cloudflare provides
