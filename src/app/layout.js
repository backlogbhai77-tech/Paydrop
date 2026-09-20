import './globals.css'

export const metadata = {
  metadataBase: new URL('https://paydrop-two.vercel.app'),
  title: {
    default: 'ReleaseDrop — Secure Payment-Locked Deliveries for Creators',
    template: '%s | ReleaseDrop'
  },
  description: 'Deliver final client work with automated preview watermarking. High-res assets unlock instantly post-settlement. Zero ghosting.',
  keywords: ['file transfer', 'freelancer escrow', 'payment locked download', 'client deliverables', 'video editor invoicing'],
  authors: [{ name: 'ReleaseDrop Studio' }],
  creator: 'ReleaseDrop',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ReleaseDrop — Secure Payment-Locked Deliveries',
    description: 'Get paid before you hand over final files. Watermarked client inspection and automated escrow release.',
    url: 'https://paydrop-two.vercel.app',
    siteName: 'ReleaseDrop',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReleaseDrop — Secure Payment-Locked Deliveries',
    description: 'Get paid before delivering master deliverables.',
  },
  icons: {
    icon: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
  }
}

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ReleaseDrop',
    url: 'https://paydrop-two.vercel.app',
    description: 'Payment-locked digital delivery tool for creative freelancers and studios.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased bg-[#F8FAFC] text-slate-900 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  )
}
