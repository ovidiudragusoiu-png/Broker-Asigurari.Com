# SEO & Google Search Console setup

Canonical host: **https://www.sigur.ai** (Vercel primary domain). Requests to `https://sigur.ai` are redirected to `www` at the edge.

## After deploy

1. **Remove preview env vars in Vercel** (if still set):
   - Delete `SITE_PREVIEW_MODE` and `SITE_PREVIEW_PASSWORD` from Project → Settings → Environment Variables.
2. **Verify the site is public**: open https://www.sigur.ai in incognito — you should see the homepage, not a password screen.
3. **Google Search Console** (https://search.google.com/search-console):
   - Add property: **URL prefix** `https://www.sigur.ai`
   - Verify via HTML tag: copy the `content` value from Google's meta tag, set `GOOGLE_SITE_VERIFICATION` in Vercel, redeploy.
   - Submit sitemap: `https://www.sigur.ai/sitemap.xml`
   - Use **URL inspection** → Request indexing for `/`, `/rca`, and key blog URLs.

## Local

```env
# .env.local (optional)
GOOGLE_SITE_VERIFICATION=your_token_from_search_console
```
