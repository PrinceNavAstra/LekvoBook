import "./globals.css";
import { SpeedInsights } from '@vercel/speed-insights/next';
export const metadata={title:"Lekvo Book",description:"Modern cloud ledger for small businesses"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<SpeedInsights /></body></html>}