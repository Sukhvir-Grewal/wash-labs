# Wash Labs – Developer Notes

### SEO & Business Info
- ✅ If phone number changes → update in `components/SEOJsonLd.js`
- ✅ If address or postal code changes → update in `components/SEOJsonLd.js`
- ✅ If pricing changes → update in `SEOJsonLd.js` (`priceRange`) AND `components/About.js`
- ✅ If new services added → update text in `components/Services.js` and keywords in `next-seo.config.js`

### Deployment
- `npm run build` → generates sitemap.xml + robots.txt
- Always check `https://www.washlabs.ca/sitemap.xml` after deploy
- If sitemap fails in Google Console → resubmit in Search Console

### Future Ideas
- Add Google Analytics / Plausible
- Add blog section for SEO boost
- Register/maintain Google Business Profile
