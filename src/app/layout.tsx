import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'B2T · Calculadora 3D',description:'Custos claros. Impressões rentáveis.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
