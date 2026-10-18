/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // 1. Protection against MIME-type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // 2. Referrer Policy for Privacy & Leakage Prevention
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 3. Content Security Policy (CSP) against XSS attacks
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com https://*.cloudinary.com; connect-src 'self' https://api.razorpay.com https://*.cloudinary.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com;",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
