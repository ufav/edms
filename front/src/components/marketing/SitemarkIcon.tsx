import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

// Брендинг лендинга. Заменяет логотип "Sitemark" из шаблона MUI на Docste.
export default function SitemarkIcon() {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        mr: 2,
        lineHeight: 1,
      }}
    >
      <DescriptionRoundedIcon
        sx={{ color: 'primary.main', fontSize: 28, mr: 0.5, display: 'block' }}
      />
      <Typography
        variant="h6"
        component="span"
        sx={{
          fontWeight: 700,
          lineHeight: 1,
          color: 'text.primary',
          letterSpacing: '-0.02em',
          display: 'block',
        }}
      >
        Docste
      </Typography>
    </Box>
  );
}
