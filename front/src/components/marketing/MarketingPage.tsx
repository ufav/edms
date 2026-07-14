import Divider from '@mui/material/Divider';
import AppAppBar from './AppAppBar';
import Hero from './Hero';
import Highlights from './Highlights';
import Features from './Features';
import Footer from './Footer';

// Лендинг на основе шаблона MUI marketing-page, адаптированного под MUI v5.
// Рендерится внутри общего ThemeProvider приложения (App.tsx).
interface MarketingPageProps {
  onDemoLogin?: () => Promise<void>;
  demoError?: string | null;
}

export default function MarketingPage({ onDemoLogin, demoError }: MarketingPageProps) {
  return (
    <>
      <AppAppBar onDemoLogin={onDemoLogin} />
      <Hero onDemoLogin={onDemoLogin} demoError={demoError} />
      <div>
        <Features />
        <Divider />
        <Highlights />
        <Divider />
        <Footer />
      </div>
    </>
  );
}
