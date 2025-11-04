import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  ButtonGroup,
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
  loginError?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, loginError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language === 'en' ? 'en' : 'ru');

  const handleChangeLang = (lng: 'ru' | 'en') => {
    setLang(lng);
    i18n.changeLanguage(lng);
    try { localStorage.setItem('lang', lng); } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError(t('auth.fill_all_fields'));
      return;
    }
    
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
        position: 'relative'
      }}
    >
      {/* Global Language Switcher - top-right corner */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <ButtonGroup size="small" variant="outlined" color="inherit">
          <Button 
            variant={lang === 'ru' ? 'contained' : 'outlined'} 
            onClick={() => handleChangeLang('ru')}
          >
            RU
          </Button>
          <Button 
            variant={lang === 'en' ? 'contained' : 'outlined'} 
            onClick={() => handleChangeLang('en')}
          >
            EN
          </Button>
        </ButtonGroup>
      </Box>
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

            {/* Error Message */}
            <Box sx={{ mt: 3, height: '80px', position: 'relative' }}>
              {loginError && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    '& .MuiAlert-message': {
                      width: '100%'
                    }
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                    {t('auth.login_error') || 'Ошибка входа'}
                  </Typography>
                  <Typography variant="body2">
                    {loginError}
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login;
