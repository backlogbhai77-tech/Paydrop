export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/d/', '/dashboard'],
      },
    ],
    sitemap: 'https://paydrop-two.vercel.app/sitemap.xml',
  }
}
