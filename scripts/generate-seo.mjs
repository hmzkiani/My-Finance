import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOG_ARTICLES } from '../src/blogArticles.js';
import { SITE_METADATA } from '../src/siteMetadata.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'dist');
const templatePath = join(outputRoot, 'index.html');
if (!existsSync(templatePath)) throw new Error('Vite build output is missing at dist/index.html. Run vite build first.');

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function configuredOrigin() {
  const value = String(process.env.VITE_PUBLIC_SITE_URL || '').trim();
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('VITE_PUBLIC_SITE_URL must be the actual production HTTPS origin only, for example the domain assigned to this Vercel deployment.');
  }
  return url.origin;
}

function buildPage(template, route, metadata, origin) {
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(metadata.title)}</title>`);
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, '');
  html = html.replace(/<meta\s+property=["']og:[^>]*>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:[^>]*>/gi, '');
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, '');
  const tags = [`<meta name="description" content="${htmlEscape(metadata.description)}" />`,
    `<meta property="og:title" content="${htmlEscape(metadata.title)}" />`,
    `<meta property="og:description" content="${htmlEscape(metadata.description)}" />`,
    `<meta property="og:type" content="${htmlEscape(metadata.type || 'website')}" />`,
    '<meta property="og:site_name" content="My Finance" />',
    `<meta name="twitter:card" content="${metadata.image ? 'summary_large_image' : 'summary'}" />`];
  if (metadata.type === 'article' && metadata.section) tags.push(`<meta property="article:section" content="${htmlEscape(metadata.section)}" />`);
  const imageFile = metadata.image ? resolve(outputRoot, metadata.image.replace(/^\//, '')) : '';
  if (origin) {
    const canonical = new URL(route, `${origin}/`).toString();
    tags.push(`<link rel="canonical" href="${htmlEscape(canonical)}" />`);
    tags.push(`<meta property="og:url" content="${htmlEscape(canonical)}" />`);
    if (metadata.image && existsSync(imageFile)) tags.push(`<meta property="og:image" content="${htmlEscape(new URL(metadata.image, canonical).toString())}" />`);
  }
  return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}

const origin = configuredOrigin();
const routes = Object.entries(SITE_METADATA).map(([path, metadata]) => ({ path, metadata }));
for (const article of BLOG_ARTICLES) {
  routes.push({
    path: `/blog/${article.slug}`,
    metadata: { title: `${article.title} — My Finance Journal`, description: article.excerpt, image: article.image, type: 'article', section: article.category }
  });
}

const baseHtml = readFileSync(templatePath, 'utf8');
const routeUrls = [];
for (const { path, metadata } of routes) {
  const html = buildPage(baseHtml, path, metadata, origin);
  if (path === '/') writeFileSync(templatePath, html);
  else {
    const destination = join(outputRoot, path.replace(/^\//, ''), 'index.html');
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, html);
  }
  if (origin) routeUrls.push(new URL(path, `${origin}/`).toString());
}

const robots = ['User-agent: *', 'Allow: /', 'Disallow: /app', 'Disallow: /transactions', 'Disallow: /reports', 'Disallow: /settings', 'Disallow: /login', 'Disallow: /signup', 'Disallow: /forgot-password'];
if (origin) robots.push(`Sitemap: ${origin}/sitemap.xml`);
writeFileSync(join(outputRoot, 'robots.txt'), `${robots.join('\n')}\n`);

const sitemapPath = join(outputRoot, 'sitemap.xml');
if (origin) {
  const entries = routeUrls.map(url => `  <url><loc>${htmlEscape(url)}</loc></url>`).join('\n');
  writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`);
  console.log(`Generated SEO metadata, canonical pages, and a ${routeUrls.length}-URL sitemap for ${origin}.`);
} else {
  if (existsSync(sitemapPath)) rmSync(sitemapPath);
  console.warn('VITE_PUBLIC_SITE_URL is not set: generated unique page metadata, but skipped canonical URLs and sitemap until the real production domain is configured.');
}
