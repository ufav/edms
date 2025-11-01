import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  InputAdornment,
  IconButton,
  Alert,
  Grid,
  useTheme,
  useMediaQuery,
  InputLabel,
  OutlinedInput,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  Person as PersonIcon, 
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Description as DescriptionIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language === 'en' ? 'en' : 'ru');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError(t('auth.fill_all_fields'));
      return;
    }
  const handleChangeLang = (lng: 'ru' | 'en') => {
    setLang(lng);
    i18n.changeLanguage(lng);
    try { localStorage.setItem('lang', lng); } catch {}
  };

    
    onLogin(username, password);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
      }}
    >
      <Grid container sx={{ minHeight: '100vh' }}>
        {/* Left Side - Branding */}
        <Grid 
          item 
          xs={12} 
          md={6} 
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.9) 0%, rgba(66, 165, 245, 0.9) 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }
          }}
        >
          <Box sx={{ textAlign: 'center', zIndex: 1 }}>
            <DescriptionIcon sx={{ fontSize: 80, mb: 2, opacity: 0.9 }} />
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 'bold',
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Docste
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 4, 
                opacity: 0.9,
                fontWeight: 300
              }}
            >
              {t('auth.subtitle')}
            </Typography>
            
            {/* Features */}
            <Box sx={{ mt: 6, textAlign: 'left', maxWidth: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 2, fontSize: 32, opacity: 0.8 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {t('auth.feature_security_title')}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {t('auth.feature_security_text')}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SpeedIcon sx={{ mr: 2, fontSize: 32, opacity: 0.8 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {t('auth.feature_efficiency_title')}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {t('auth.feature_efficiency_text')}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DescriptionIcon sx={{ mr: 2, fontSize: 32, opacity: 0.8 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {t('auth.feature_versions_title')}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {t('auth.feature_versions_text')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Right Side - Login Form */}
        <Grid 
          item 
          xs={12} 
          md={6} 
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            backgroundColor: 'white'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            {/* Mobile Logo */}
            {isMobile && (
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main',
                    mb: 1
                  }}
                >
                  EDMS
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  color="text.secondary"
                >
                  {t('auth.subtitle')}
                </Typography>
              </Box>
            )}

            <Typography 
              variant="h4" 
              component="h2" 
              sx={{ 
                fontWeight: 'bold',
                mb: 1,
                color: 'text.primary'
              }}
            >
              {t('auth.welcome')}
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              {t('auth.sign_in_hint')}
            </Typography>

            {/* Language Switch */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="lang-select-label">{t('auth.language')}</InputLabel>
                <Select
                  labelId="lang-select-label"
                  id="lang-select"
                  value={lang}
                  label={t('auth.language')}
                  onChange={(e) => handleChangeLang((e.target.value as 'ru' | 'en'))}
                >
                  <MenuItem value={'ru'}>Русский</MenuItem>
                  <MenuItem value={'en'}>English</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <InputLabel htmlFor="username">{t('auth.username')}</InputLabel>
                <OutlinedInput
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  }
                  label={t('auth.username')}
                />
              </FormControl>
              
              <FormControl fullWidth variant="outlined" sx={{ mb: 4 }}>
                <InputLabel htmlFor="password">{t('auth.password')}</InputLabel>
                <OutlinedInput
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  }
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label={t('auth.password')}
                />
              </FormControl>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                startIcon={<LoginIcon />}
                sx={{ 
                  mt: 2, 
                  mb: 3,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                  }
                }}
              >
                {t('auth.sign_in')}
              </Button>
            </Box>

            {/* Demo Credentials */}
            <Box sx={{ 
              mt: 3, 
              p: 3, 
              bgcolor: 'grey.50', 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                {t('auth.demo_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Username:</strong> admin
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Password:</strong> admin123
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login;
