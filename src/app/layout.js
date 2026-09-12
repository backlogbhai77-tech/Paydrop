import './globals.css'

export const metadata = {
  title: 'PayDrop | Get Paid Before Delivery',
  description: 'Locked file transfers for creators and freelancers',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
