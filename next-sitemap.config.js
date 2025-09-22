/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://www.washlabs.ca", // ✅ your domain
  generateRobotsTxt: true,            // ✅ generates robots.txt automatically
  sitemapSize: 5000,
  changefreq: "monthly",              // how often pages are likely to change
  priority: 0.7,                      // importance level for indexing
};
