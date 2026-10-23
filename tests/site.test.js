import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { authModeFromLocation, AUTH_PATH_MODES, isPublicSitePath, normalizePathname, PUBLIC_SITE_PATHS, screenFromPath, screenPath } from '../src/routing.js';
import { validateContactForm } from '../src/contactForm.js';
import { BLOG_ARTICLES, articleWordCount } from '../src/blogArticles.js';

test('public page paths and authenticated finance screens have stable routes', () => {
  assert.deepEqual([...PUBLIC_SITE_PATHS], ['/', '/about', '/contact', '/blog', '/privacy-policy', '/terms-and-conditions']);
  assert.equal(isPublicSitePath('/blog/monthly-budget-guide'), true);
  assert.equal(isPublicSitePath('/login'), false);
  assert.equal(screenPath('home'), '/app');
  for (const screen of ['transactions', 'reports', 'settings']) {
    assert.equal(screenFromPath(screenPath(screen)), screen);
  }
  assert.equal(screenFromPath('/'), 'home');
  assert.equal(normalizePathname('/privacy-policy/'), '/privacy-policy');
  assert.equal(screenFromPath('/transactions/'), 'transactions');
});

test('the journal contains eight distinct, complete guides and one image path per article', () => {
  const expectedSlugs = [
    'monthly-budget-guide', 'saving-money-tips', 'needs-vs-wants', 'emergency-fund-guide',
    'track-income-expenses', 'budgeting-mistakes', 'financial-goals', 'monthly-spending-review'
  ];
  assert.deepEqual(BLOG_ARTICLES.map(article => article.slug), expectedSlugs);
  assert.equal(new Set(BLOG_ARTICLES.map(article => article.slug)).size, 8);
  assert.equal(new Set(BLOG_ARTICLES.map(article => article.image)).size, 8);
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (const article of BLOG_ARTICLES) {
    assert.ok(article.alt.length > 15, `${article.slug} has descriptive image text`);
    assert.ok(existsSync(path.join(projectRoot, 'public', article.image.replace(/^\//, ''))), `${article.slug} image exists`);
    assert.ok(articleWordCount(article) >= 600 && articleWordCount(article) <= 900, `${article.slug} has ${articleWordCount(article)} words`);
    assert.ok(article.sections.length >= 5, `${article.slug} has multiple practical sections`);
  }
});

test('email and password entry routes resolve the expected auth views', () => {
  assert.deepEqual(AUTH_PATH_MODES, { '/login': 'login', '/signup': 'signup', '/forgot-password': 'forgot' });
  assert.equal(authModeFromLocation('/signup'), 'signup');
  assert.equal(authModeFromLocation('/', '?flow=recovery'), 'recovery');
});

test('contact form requires all fields and validates email before delivery', () => {
  assert.deepEqual(validateContactForm({ name: '', email: '', subject: '', message: '' }), {
    name: 'This field is required.',
    email: 'This field is required.',
    subject: 'This field is required.',
    message: 'This field is required.'
  });
  assert.deepEqual(validateContactForm({ name: 'A User', email: 'not-an-email', subject: 'Question', message: 'Hello' }), {
    email: 'Enter a valid email address.'
  });
  assert.deepEqual(validateContactForm({ name: 'A User', email: 'person@example.com', subject: 'Question', message: 'Hello' }), {});
});
