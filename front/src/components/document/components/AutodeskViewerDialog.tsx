import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { autodeskApi } from '../../../api/client';

// Объявляем типы для Autodesk Viewer (загружаются через CDN)
declare global {
  interface Window {
    Autodesk?: any;
  }
}

interface AutodeskViewerDialogProps {
  open: boolean;
  documentId: number;
  revisionId: number;
  fileName: string;
  onClose: () => void;
}

const AutodeskViewerDialog: React.FC<AutodeskViewerDialogProps> = ({
  open,
  documentId,
  revisionId,
  fileName,
  onClose,
}) => {
  const { t } = useTranslation();
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [urn, setUrn] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const scriptsLoadedRef = useRef(false);

  // Загрузка скриптов Autodesk Viewer
  useEffect(() => {
    if (!open || scriptsLoadedRef.current) return;

    const loadScripts = () => {
      // Проверяем, не загружены ли уже скрипты
      if (document.querySelector('script[data-autodesk-viewer]')) {
        scriptsLoadedRef.current = true;
        return;
      }

      // Загружаем CSS
      const existingLink = document.querySelector('link[data-autodesk-viewer]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';
        link.setAttribute('data-autodesk-viewer', 'true');
        document.head.appendChild(link);
      }

      // Загружаем JS
      const existingScript = document.querySelector('script[data-autodesk-viewer]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';
        script.setAttribute('data-autodesk-viewer', 'true');
        script.onload = () => {
          scriptsLoadedRef.current = true;
        };
        script.onerror = () => {
          setError('Не удалось загрузить Autodesk Viewer');
        };
        document.body.appendChild(script);
      } else {
        scriptsLoadedRef.current = true;
      }
    };

    loadScripts();
  }, [open]);

  // Подготовка файла для просмотра
  useEffect(() => {
    if (!open || !documentId || !revisionId) return;

    const prepareFile = async () => {
      setPreparing(true);
      setPreparationError(null);
      setError(null);

      try {
        // Получаем токен доступа
        const tokenData = await autodeskApi.getViewerToken();
        setAccessToken(tokenData.access_token);

        // Подготавливаем файл (загружаем в Autodesk и запускаем перевод)
        const prepareResult = await autodeskApi.prepareFileForViewer(documentId, revisionId);
        setUrn(prepareResult.urn);

        // Ждем завершения перевода
        await waitForTranslation(prepareResult.urn, tokenData.access_token);
      } catch (err: any) {
        console.error('Ошибка подготовки файла:', err);
        setPreparationError(
          err.response?.data?.detail || err.message || 'Ошибка подготовки файла для просмотра'
        );
        setPreparing(false);
      }
    };

    prepareFile();
  }, [open, documentId, revisionId]);

  // Ожидание завершения перевода
  const waitForTranslation = async (fileUrn: string, token: string) => {
    const maxAttempts = 60; // Максимум 5 минут (60 * 5 секунд)
    let attempts = 0;

    const checkStatus = async (): Promise<boolean> => {
      try {
        // Используем Autodesk API напрямую для проверки статуса
        // URN должен быть правильно закодирован для URL
        const urnEncoded = fileUrn.replace(/\+/g, '%2B').replace(/\//g, '%2F').replace(/=/g, '%3D');
        const response = await fetch(
          `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urnEncoded}/manifest`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          // Если 404, возможно файл еще не переведен, продолжаем ждать
          if (response.status === 404) {
            return false;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const manifest = await response.json();
        const status = manifest.status;

        if (status === 'success') {
          return true;
        } else if (status === 'failed' || status === 'timeout') {
          throw new Error(`Перевод файла завершился с ошибкой: ${status}`);
        }

        return false; // Продолжаем ждать
      } catch (err: any) {
        // Если это не ошибка превышения попыток, продолжаем ждать
        if (attempts >= maxAttempts) {
          throw err;
        }
        // Для других ошибок (кроме 404) тоже продолжаем ждать
        return false;
      }
    };

    while (attempts < maxAttempts) {
      attempts++;
      const isReady = await checkStatus();
      if (isReady) {
        setPreparing(false);
        setLoading(false);
        return;
      }
      // Ждем 5 секунд перед следующей проверкой
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error('Превышено время ожидания перевода файла');
  };

  // Инициализация и загрузка модели в Viewer
  useEffect(() => {
    if (!open || !urn || !accessToken || !viewerContainerRef.current || !window.Autodesk) return;
    if (preparing || loading) return;

    const initializeViewer = () => {
      try {
        // Очищаем предыдущий viewer
        if (viewerRef.current) {
          viewerRef.current.finish();
          viewerRef.current = null;
        }

        // Очищаем контейнер
        if (viewerContainerRef.current) {
          viewerContainerRef.current.innerHTML = '';
        }

        const options = {
          env: 'AutodeskProduction',
          getAccessToken: (onTokenReady: (token: string, expire: number) => void) => {
            const expire = 3600; // 1 час
            onTokenReady(accessToken, expire);
          },
        };

        window.Autodesk.Viewing.Initializer(options, () => {
          if (!viewerContainerRef.current) return;

          const viewer = new window.Autodesk.Viewing.GuiViewer3D(viewerContainerRef.current);
          viewerRef.current = viewer;
          viewer.start();

          // Загружаем модель
          const documentId = `urn:${urn}`;
          window.Autodesk.Viewing.Document.load(
            documentId,
            (doc: any) => {
              const viewables = doc.getRoot().getDefaultGeometry();
              if (viewables) {
                viewer.loadDocumentNode(doc, viewables).then(() => {
                  setLoading(false);
                });
              } else {
                setError('Не найдены данные для просмотра');
                setLoading(false);
              }
            },
            (errorCode: number, errorMsg: string) => {
              setError(`Ошибка загрузки модели: ${errorMsg}`);
              setLoading(false);
            }
          );
        });
      } catch (err: any) {
        setError(`Ошибка инициализации просмотрщика: ${err.message}`);
        setLoading(false);
      }
    };

    // Небольшая задержка для гарантии, что скрипты загружены
    const timer = setTimeout(initializeViewer, 100);
    return () => clearTimeout(timer);
  }, [open, urn, accessToken, preparing, loading]);

  // Очистка при закрытии
  useEffect(() => {
    if (!open) {
      if (viewerRef.current) {
        try {
          viewerRef.current.finish();
        } catch (e) {
          // Игнорируем ошибки при очистке
        }
        viewerRef.current = null;
      }
      setUrn(null);
      setAccessToken(null);
      setError(null);
      setPreparationError(null);
      setLoading(true);
      setPreparing(false);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '90vh', maxHeight: '90vh' },
      }}
    >
      <DialogTitle>
        {t('document.view_dwg') || 'Просмотр DWG файла'}: {fileName}
      </DialogTitle>
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
        {preparationError && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{preparationError}</Alert>
          </Box>
        )}
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        {(preparing || loading) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              zIndex: 1000,
            }}
          >
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2">
              {preparing
                ? t('document.preparing_file') || 'Подготовка файла для просмотра...'
                : t('document.loading_viewer') || 'Загрузка просмотрщика...'}
            </Typography>
          </Box>
        )}
        <Box
          ref={viewerContainerRef}
          sx={{
            width: '100%',
            height: '100%',
            minHeight: '600px',
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutodeskViewerDialog;
