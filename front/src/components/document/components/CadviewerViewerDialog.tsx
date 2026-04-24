import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import jQuery from 'jquery';
import 'jquery-ui-bundle/jquery-ui.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as cadviewer from 'cadviewer';
import './CadviewerViewerDialog.css';
import { cadviewerApi } from '../../../api/client';

const FLOOR_ID = 'floorPlan';

const CADVIEWER_CALLBACK_STUBS: string[] = [
  'cvjs_insertSpaceObjectCustomCodePlaceholder',
  'cvjs_graphicalObjectOnChange',
  'cvjs_OnLoadEndRedlines',
  'cvjs_ObjectSelected',
  'cvjs_measurementCallback',
  'cvjs_CalibrateMeasurementCallback',
  'cvjs_Url_callback',
  'cvjs_loadSpaceImage_UserConfiguration',
  'cvjs_NoObjectSelected',
  'cvjs_SVGfileObjectClicked',
  'cvjs_SVGfileObjectMouseEnter',
  'cvjs_SVGfileObjectMouseLeave',
  'cvjs_SVGfileObjectMouseMove',
  'cvjs_ParseDisplayDataMaps',
  'cvjs_QuickCountCallback',
  'cvjs_OnHyperlinkClick',
  'cvjs_setUpStickyNotesRedlines',
  'custom_host_parser_PopUpMenu',
  'cvjs_customHostParser',
  'drawPathsGeneric',
  'cvjs_callbackForModalDisplay',
  'cvjs_populateMyCustomPopUpBody',
  'cvjs_customModalPopUpBody',
  'cvjs_NoObjectSelectedStickyNotes',
  'cvjs_NoObjectSelectedHyperlinks',
  'cvjs_ObjectSelectedHyperlink',
  'cvjs_ObjectSelectedStickyNotes',
  'cvjs_saveStickyNotesRedlinesUser',
  'cvjs_loadStickyNotesRedlinesUser',
  'my_own_clickmenu1',
  'my_own_clickmenu2',
  'cvjs_popupTitleClick',
  'cvjs_mousedown',
  'cvjs_click',
  'cvjs_mouseup',
  'cvjs_dblclick',
  'cvjs_mouseout',
  'cvjs_mouseover',
  'cvjs_mouseleave',
  'cvjs_mouseenter',
  'cvjs_graphicalObjectCreated',
  'cvjs_QuickCountColorSelected',
  ...Array.from({ length: 10 }, (_, i) => `custom_callback${i + 1}`),
  ...Array.from({ length: 20 }, (_, i) => `cvjs_customCommand_${String(i + 1).padStart(2, '0')}`),
];

function noop() {}

interface CadviewerViewerDialogProps {
  open: boolean;
  documentId: number;
  revisionId: number;
  fileName: string;
  onClose: () => void;
}

/**
 * Просмотр DWG/DXF через CADViewer JS + внешний CADViewer Conversion Server (Node, порт по умолчанию 3000).
 * Требуется: npm i, VITE_CADVIEWER_CONVERSION_SERVER_URL, лицензия CADViewer (см. env).
 */
const CadviewerViewerDialog: React.FC<CadviewerViewerDialogProps> = ({
  open,
  documentId,
  revisionId,
  fileName,
  onClose,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initedRef = useRef(false);
  const resizeHandlerRef = useRef<() => void>(() => {});

  const conversionServerUrl =
    (import.meta as any).env?.VITE_CADVIEWER_CONVERSION_SERVER_URL || 'http://localhost:3000/';
  const frontendBaseUrl =
    (import.meta as any).env?.VITE_CADVIEWER_FRONTEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin + '/' : 'http://localhost:5173/');
  const appAssetsPath = '/cadviewer/assets/app/';
  const licenseJson = (import.meta as any).env?.VITE_CADVIEWER_LICENSE_JSON as string | undefined;

  const runInitAndLoad = useCallback(
    async (dwgUrl: string, filenameBase: string) => {
      const w = window as unknown as { $: typeof jQuery; jQuery: typeof jQuery };
      w.$ = jQuery;
      w.jQuery = jQuery;
      await import('jquery-ui-bundle/jquery-ui.min.js');

      const ServerBackEndUrl = conversionServerUrl.endsWith('/')
        ? conversionServerUrl
        : `${conversionServerUrl}/`;
      const ServerUrl = ServerBackEndUrl;
      const ServerLocation = '';

      cadviewer.cvjs_setNoModalMode(false);
      cadviewer.cvjs_debugMode(false);
      cadviewer.cvjs_setCallbackQuickCount(false);

      cadviewer.cvjs_setAllServerPaths_and_Handlers(
        ServerBackEndUrl,
        ServerUrl,
        ServerLocation,
        'NodeJS',
        'ReactJS',
        FLOOR_ID,
        ''
      );

      CADVIEWER_CALLBACK_STUBS.forEach((name) => {
        cadviewer.cvjs_setCallbackMethod(name, noop);
      });

      cadviewer.cvjs_setCallbackMethod('cvjs_OnLoadEnd', function cvjs_OnLoadEnd() {
        try {
          cadviewer.cvjs_resizeWindow_position(FLOOR_ID);
          cadviewer.cvjs_resetZoomPan(FLOOR_ID);
        } catch {
          /* ignore */
        }
      });

      cadviewer.cvjs_CADViewerPro(true);
      cadviewer.cvjs_PrintToPDFWindowRelativeSize(0.8);
      cadviewer.cvjs_setFileModalEditMode(false);
      cadviewer.cvjs_setCADViewerInterfaceVersion(8);
      cadviewer.cvjs_loadCADViewerLanguage('English', '');

      const BaseAttributes = {
        fill: '#FFF',
        'fill-opacity': 0.01,
        stroke: '#FFF',
        'stroke-width': 0.1,
        'stroke-linejoin': 'round',
        'stroke-opacity': 0.01,
      };
      const HighlightAttributes = {
        fill: '#Ffa500',
        'fill-opacity': 0.3,
        stroke: '#7B3804',
        'stroke-width': 2.5,
        'stroke-linejoin': 'round',
        'stroke-opacity': 1.0,
      };
      const SelectAttributes = {
        fill: '#F00',
        'fill-opacity': 0.3,
        stroke: '#5B0303',
        'stroke-linejoin': 'round',
        'stroke-width': 4,
        'stroke-opacity': 1.0,
      };

      cadviewer.cvjs_InitCADViewer_highLight_popUp_app(
        FLOOR_ID,
        appAssetsPath,
        BaseAttributes,
        HighlightAttributes,
        SelectAttributes,
        ''
      );

      if (licenseJson && licenseJson.trim().startsWith('{')) {
        try {
          cadviewer.cvjs_setLicenseKeyDirect(licenseJson.trim());
        } catch {
          /* ignore */
        }
      }

      cadviewer.cvjs_allowFileLoadToServer(false);

      // First trigger conversion, then load resulting SVG directly
      const convUrl = `${ServerBackEndUrl}getcadviewercontent?` +
        `remainOnServer=1&fileTag=${filenameBase}&Type=svg&contentLocation=${encodeURIComponent(dwgUrl)}`;
      const resp = await fetch(convUrl);
      if (!resp.ok) throw new Error(`Conversion server error: ${resp.status}`);
      // Discard response body (conversion is done, SVG cached on server)
      await resp.text();

      // Load SVG directly from conversion server's file cache
      const svgUrl = `${ServerBackEndUrl}converters/files/${filenameBase}.svg`;
      cadviewer.cvjs_LoadDrawing(FLOOR_ID, svgUrl, filenameBase);

      initedRef.current = true;
      setLoading(false);
    },
    [appAssetsPath, conversionServerUrl, frontendBaseUrl, licenseJson]
  );

  useEffect(() => {
    if (!open) {
      initedRef.current = false;
      setLoading(true);
      setError(null);
      window.removeEventListener('resize', resizeHandlerRef.current);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Wait for Dialog DOM to be ready and SVG element to have dimensions
        await new Promise((r) => setTimeout(r, 300));
        if (cancelled) return;
        const svgEl = document.getElementById(FLOOR_ID);
        if (!svgEl) {
          throw new Error('SVG element not found in DOM');
        }
        const src = await cadviewerApi.getDwgSource(documentId, revisionId);
        if (cancelled) return;
        await runInitAndLoad(src.dwg_url, src.filename_base);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (e as Error)?.message ||
          'CADViewer';
        setError(String(msg));
        setLoading(false);
      }
    };

    load();

    resizeHandlerRef.current = () => {
      try {
        if (initedRef.current) {
          cadviewer.cvjs_resizeWindow_position(FLOOR_ID);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('resize', resizeHandlerRef.current);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', resizeHandlerRef.current);
    };
  }, [open, documentId, revisionId, runInitAndLoad]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '92vh', maxHeight: '92vh' },
      }}
    >
      <DialogTitle>
        {t('document.view_dwg')}: {fileName}
      </DialogTitle>
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, minHeight: 560, position: 'relative', display: open ? 'block' : 'none' }}>
          {(loading || error) && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                px: 2,
                bgcolor: 'rgba(255,255,255,0.92)',
              }}
            >
              {loading && !error && (
                <>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary">
                    {t('document.cadviewer_loading')}
                  </Typography>
                </>
              )}
              {error && <Alert severity="error">{error}</Alert>}
            </Box>
          )}
          <div key={`${documentId}-${revisionId}`} id={FLOOR_ID} className="edms-cadviewer-svg" />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CadviewerViewerDialog;
