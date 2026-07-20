import type { Metadata } from 'next';
import { Poppins, Host_Grotesk } from 'next/font/google';
import '../styles/globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const hostGrotesk = Host_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Continuum | Bitcoin-Native Savings Protocol',
  description: 'Time builds wealth. Secure, non-custodial time-locked savings vaults built on Stacks L2 and secured by Bitcoin. Earn penalty-redistributed rewards.',
  icons: {
    icon: [
      { url: '/favicon_cropped.png', type: 'image/png' }
    ],
    apple: [
      { url: '/favicon_cropped.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  openGraph: {
    title: 'Continuum | Bitcoin-Native Savings Protocol',
    description: 'Non-custodial savings vaults for STX and sBTC, secured by Bitcoin through Stacks. Earn rewards by staying committed.',
    type: 'website',
  },
  other: {
    'talentapp:project_verification': '2995476e9dadf74df1deb76c4c114c5611bd6b228ebc68df69871c7054cd23c2bbf2ee080f9609b310be62157f1a93009a2c26e36bbe4257d95bf980ab00e5ee',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${poppins.variable} ${hostGrotesk.variable} font-sans bg-[#090909] text-[#FFFFFF] antialiased`}>
        {children}
      </body>
    </html>
  );
}
