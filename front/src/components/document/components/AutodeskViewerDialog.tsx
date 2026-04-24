import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import { autodeskApi } from '../../../api/client';

// Объявляем типы для Autodesk Viewer (загружаются через CDN)
declare global {
  interface Window {
    Autodesk?: any;
  }
}

// Autodesk Viewing.Initializer можно вызывать ТОЛЬКО один раз на вкладку.
// Повторный вызов молча ломает SDK или конфликтует с предыдущим контекстом.
let autodeskInitialized = false;

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
  const markupsCoreRef = useRef<any>(null);
  const markupsGuiRef = useRef<any>(null);
  const markupsEventCleanupRef = useRef<Array<() => void>>([]);
  // Флаг защиты от рекурсии при принудительном переключении слоя.
  // Когда мы сами делаем leaveEditMode/enterEditMode для редиректа в
  // EDMS_MARKUPS, SDK присылает несколько EVENT_EDITMODE_CHANGED —
  // их нужно игнорировать, иначе сработает restoreMarkupsAfterExit или
  // новый редирект.
  const layerRedirectingRef = useRef(false);
  const lastSavedMarkupRef = useRef<string>('');
  const savedMarkupsRef = useRef<string>('');
  const populatedLayersRef = useRef<Set<string>>(new Set());
  const viewerInitializedRef = useRef(false);
  // Рефы для актуальных props — чтобы замыкания в setInterval/event listeners
  // не работали со «старым» documentId/revisionId после смены ревизии.
  const documentIdRef = useRef(documentId);
  const revisionIdRef = useRef(revisionId);
  documentIdRef.current = documentId;
  revisionIdRef.current = revisionId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [urn, setUrn] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = accessToken;
  const [markupsReady, setMarkupsReady] = useState(false);
  const [markupSavedAt, setMarkupSavedAt] = useState<string | null>(null);
  const scriptsLoadedRef = useRef(false);
  const currentViewerUrnRef = useRef<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const VIEWER_SDK_VERSION = '7.100';
  const MARKUP_LAYER_NAME = 'EDMS_MARKUPS';
  const DBG_PREFIX = '[DWG-MARKUPS-TRACE]';
  const dbg = (stage: string, details?: any) => {
    const ts = new Date().toISOString();
    if (details !== undefined) {
      console.log(`${DBG_PREFIX} ${ts} ${stage}`, details);
    } else {
      console.log(`${DBG_PREFIX} ${ts} ${stage}`);
    }
  };
  const restoreMarkupsAfterExit = (core: any, viewer: any, reason: string) => {
    try {
      dbg('markups.exit.restore.start', { reason });
      // На Exit generateData() у SDK может вернуть обрезанные/служебные
      // данные. Поэтому используем ПОСЛЕДНИЙ СОХРАНЁННЫЙ XML, чтобы не
      // затереть слой неполным содержимым.
      const candidate = lastSavedMarkupRef.current || savedMarkupsRef.current || null;
      dbg('markups.exit.restore.candidate', {
        reason,
        source: lastSavedMarkupRef.current ? 'lastSaved' : (savedMarkupsRef.current ? 'cachedSaved' : 'none'),
        hasCandidate: Boolean(candidate),
        candidateLength: candidate?.length || 0,
      });
      if (candidate) {
        // Держим hideLmvUi/restoreLmvUi отключёнными и на этом шаге —
        // иначе show() снова спрячет нижний тулбар Viewer.
        try { (core as any).hideLmvUi = () => {}; } catch { /* ignore */ }
        try { (core as any).restoreLmvUi = () => {}; } catch { /* ignore */ }

        try { core?.leaveEditMode?.(); } catch { /* ignore */ }
        try { core?.show?.(); } catch { /* ignore */ }
        const ok = core?.loadMarkups?.(candidate, MARKUP_LAYER_NAME);
        dbg('markups.exit.restore.loadMarkups.called', { reason, layer: MARKUP_LAYER_NAME, ok });
      }
      try { viewer?.setToolbarVisible?.(true); } catch { /* ignore */ }
      try { viewer?.toolbar?.setVisible?.(true); } catch { /* ignore */ }
      dbg('markups.exit.restore.toolbar_state', {
        reason,
        viewerToolbarVisibleApi: typeof viewer?.setToolbarVisible === 'function',
        hasViewerToolbarObj: Boolean(viewer?.toolbar),
        hasMarkupsGui: Boolean(markupsGuiRef.current),
      });
    } catch (e) {
      console.warn('[Markups] restore after exit failed:', e);
      dbg('markups.exit.restore.failed', { reason, error: e });
    }
  };

  // Загрузка скриптов Autodesk Viewer
  useEffect(() => {
    if (!open || scriptsLoadedRef.current) return;
    let detachScriptListener: (() => void) | null = null;
    dbg('scripts.useEffect.start', { open, scriptsLoadedRef: scriptsLoadedRef.current, hasAutodesk: Boolean(window.Autodesk) });

    const loadScripts = () => {
      // Проверяем, не загружены ли уже скрипты
      if (document.querySelector('script[data-autodesk-viewer]') && window.Autodesk) {
        scriptsLoadedRef.current = true;
        setScriptsLoaded(true);
        dbg('scripts.already_loaded');
        return;
      }

      // Загружаем CSS
      const existingLink = document.querySelector('link[data-autodesk-viewer]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${VIEWER_SDK_VERSION}/style.min.css`;
        link.setAttribute('data-autodesk-viewer', 'true');
        document.head.appendChild(link);
        dbg('scripts.css.appended', { href: link.href });
      }

      // Загружаем JS
      const existingScript = document.querySelector('script[data-autodesk-viewer]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${VIEWER_SDK_VERSION}/viewer3D.min.js`;
        script.setAttribute('data-autodesk-viewer', 'true');
        script.onload = () => {
          scriptsLoadedRef.current = true;
          setScriptsLoaded(true);
          dbg('scripts.js.onload', { src: script.src });
        };
        script.onerror = () => {
          setError('Не удалось загрузить Autodesk Viewer');
          dbg('scripts.js.onerror', { src: script.src });
        };
        document.body.appendChild(script);
        dbg('scripts.js.appended', { src: script.src });
      } else if (window.Autodesk) {
        scriptsLoadedRef.current = true;
        setScriptsLoaded(true);
        dbg('scripts.js.exists_autodesk_ready');
      } else {
        const onLoad = () => {
          scriptsLoadedRef.current = true;
          setScriptsLoaded(true);
          existingScript.removeEventListener('load', onLoad);
          dbg('scripts.js.existing_onload_fired');
        };
        existingScript.addEventListener('load', onLoad);
        detachScriptListener = () => {
          try { existingScript.removeEventListener('load', onLoad); } catch { /* ignore */ }
        };
      }
    };

    loadScripts();
    return () => {
      dbg('scripts.useEffect.cleanup');
      if (detachScriptListener) detachScriptListener();
    };
  }, [open]);

  // Подготовка файла для просмотра
  useEffect(() => {
    if (!open || !documentId || !revisionId) return;

    const prepareFile = async () => {
      dbg('prepare.start', { documentId, revisionId });
      setPreparing(true);
      setPreparationError(null);
      setError(null);

      try {
        // Получаем токен доступа
        const tokenData = await autodeskApi.getViewerToken();
        setAccessToken(tokenData.access_token);
        dbg('prepare.token.received');

        // Подготавливаем файл (загружаем в Autodesk и запускаем перевод)
        const prepareResult = await autodeskApi.prepareFileForViewer(documentId, revisionId);
        setUrn(prepareResult.urn);
        dbg('prepare.urn.received', { urn: prepareResult.urn });

        // Ждем завершения перевода
        await waitForTranslation(prepareResult.urn, tokenData.access_token);
        dbg('prepare.translation.ready');
      } catch (err: any) {
        console.error('Ошибка подготовки файла:', err);
        dbg('prepare.error', err);
        setPreparationError(
          err.response?.data?.detail || err.message || 'Ошибка подготовки файла для просмотра'
        );
        setPreparing(false);
        setLoading(false); // иначе оверлей-спиннер остаётся навсегда
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
        // Для явных ошибок перевода не продолжаем цикл ожидания
        if (String(err?.message || '').includes('Перевод файла завершился с ошибкой')) {
          throw err;
        }
        // Если это не ошибка превышения попыток, продолжаем ждать
        if (attempts >= maxAttempts) {
          throw err;
        }
        // Для временных ошибок продолжаем polling
        return false;
      }
    };

    while (attempts < maxAttempts) {
      attempts++;
      dbg('translation.poll', { attempt: attempts, maxAttempts, urn: fileUrn });
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
    if (!open || !urn || !accessToken || !viewerContainerRef.current || !window.Autodesk || !scriptsLoaded) return;
    if (preparing) return;
    // Не пересобираем viewer, если он уже создан в рамках этого открытия
    // диалога, кроме случая смены URN (смена ревизии).
    if (viewerInitializedRef.current && currentViewerUrnRef.current === urn) return;
    dbg('viewer.useEffect.start', {
      open, urn, preparing, scriptsLoaded,
      viewerInitialized: viewerInitializedRef.current,
      currentViewerUrn: currentViewerUrnRef.current,
    });

    const initializeViewer = () => {
      try {
        dbg('viewer.initialize.start', { urn });
        // Очищаем предыдущий viewer
        if (viewerRef.current) {
          dbg('viewer.previous.finish');
          viewerRef.current.finish();
          viewerRef.current = null;
        }
        markupsCoreRef.current = null;
        markupsEventCleanupRef.current.forEach((cleanup) => {
          try { cleanup(); } catch { /* ignore */ }
        });
        markupsEventCleanupRef.current = [];
        setMarkupsReady(false);

        // Очищаем контейнер
        if (viewerContainerRef.current) {
          viewerContainerRef.current.innerHTML = '';
        }

        viewerInitializedRef.current = true;
        currentViewerUrnRef.current = urn;
        dbg('viewer.initialize.flags_set', { currentViewerUrn: currentViewerUrnRef.current });

        const options = {
          env: 'AutodeskProduction',
          getAccessToken: (onTokenReady: (token: string, expire: number) => void) => {
            const expire = 3600; // 1 час
            const token = accessTokenRef.current || accessToken;
            dbg('viewer.getAccessToken.called', { hasToken: Boolean(token) });
            onTokenReady(token as string, expire);
          },
        };

        const onInitialized = () => {
          if (!viewerContainerRef.current) return;
          dbg('viewer.initializer.callback');

          const viewer = new window.Autodesk.Viewing.GuiViewer3D(viewerContainerRef.current);
          viewerRef.current = viewer;
          const startCode = viewer.start();
          dbg('viewer.start', { startCode });
          if (startCode !== 0) {
            setError(`Ошибка запуска просмотрщика (код ${startCode})`);
            return;
          }
          try { viewer.setTheme('light-theme'); } catch { /* ignore */ }

          // Загружаем модель
          const viewerDocumentUrn = `urn:${urn}`;
          window.Autodesk.Viewing.Document.load(
            viewerDocumentUrn,
            (doc: any) => {
              const viewables = doc.getRoot().getDefaultGeometry();
              if (viewables) {
                viewer.loadDocumentNode(doc, viewables).then(async () => {
                  try {
                    try { viewer.resize(); } catch { /* ignore */ }
                    dbg('viewer.model.loaded.node');

                    // Ждём полную загрузку геометрии — MarkupsCore.loadMarkups
                    // требует, чтобы модель была отрендерена, иначе маркапы не
                    // отображаются (молча игнорируются).
                    await new Promise<void>((resolve) => {
                      const GEOM_EVT = window.Autodesk.Viewing.GEOMETRY_LOADED_EVENT;
                      try {
                        if (viewer.model?.isLoadDone?.()) {
                          resolve();
                          return;
                        }
                      } catch { /* ignore */ }
                      const onGeom = () => {
                        try { viewer.removeEventListener(GEOM_EVT, onGeom); } catch { /* ignore */ }
                        resolve();
                      };
                      viewer.addEventListener(GEOM_EVT, onGeom);
                      // Страховка: если событие не придёт — продолжим через 5с
                      setTimeout(() => {
                        try { viewer.removeEventListener(GEOM_EVT, onGeom); } catch { /* ignore */ }
                        resolve();
                      }, 5000);
                    });

                    // MarkupsCore сначала: именно он отвечает за генерацию данных/сохранение
                    let core: any = null;
                    try {
                      core = await viewer.loadExtension('Autodesk.Viewing.MarkupsCore');
                      dbg('markups.core.loaded');
                    } catch (e1: any) {
                      console.error('load MarkupsCore failed:', e1);
                      setError(
                        `Markups не инициализированы: Autodesk.Viewing.MarkupsCore не загрузилось. ${e1?.message || e1}`
                      );
                    }

                    if (core) {
                      markupsCoreRef.current = core;
                      markupsEventCleanupRef.current.forEach((cleanup) => {
                        try { cleanup(); } catch { /* ignore */ }
                      });
                      markupsEventCleanupRef.current = [];

                      // GUI-надстройку можно пытаться грузить отдельно (она влияет на тулбар)
                      try {
                        const gui = await viewer.loadExtension('Autodesk.Viewing.MarkupsGui');
                        markupsGuiRef.current = gui;
                        dbg('markups.gui.loaded');
                      } catch (e2: any) {
                        console.warn('load MarkupsGui failed (fallback to core only):', e2);
                        dbg('markups.gui.load_failed', e2);
                      }

                      setMarkupsReady(true);

                      // Забираем сохранённые маркапы и подгружаем слой.
                      // Важно: не вызываем core.show() на старте, иначе SDK
                      // может скрыть LMV toolbar, и пользователь не сможет
                      // открыть меню маркапов.
                      try {
                        const saved = await autodeskApi.getRevisionMarkups(documentId, revisionId);
                        if (saved?.markup_data) {
                          savedMarkupsRef.current = saved.markup_data;
                          lastSavedMarkupRef.current = saved.markup_data;
                          console.log('[Markups] saved markup cached, length:', saved.markup_data.length);
                          dbg('markups.saved.loaded_from_server', { length: saved.markup_data.length });

                          try {
                            // Правильная последовательность по APS blog:
                            // leaveEditMode -> show -> loadMarkups. В hidden
                            // состоянии слой не создаётся и loadMarkups
                            // возвращает false.
                            //
                            // ВАЖНО: core.show() внутри вызывает hideLmvUi(),
                            // которая прячет нижний тулбар Viewer, отключает
                            // selection/hover и блокирует добавление новых
                            // маркапов. Отключаем hideLmvUi/restoreLmvUi
                            // ТОЛЬКО на этом инстансе core (не патчим
                            // глобальный SDK). Это единственный надёжный
                            // способ сохранить доступ к нижнему toolbar при
                            // видимом слое маркапов.
                            try { (core as any).hideLmvUi = () => {}; } catch { /* ignore */ }
                            try { (core as any).restoreLmvUi = () => {}; } catch { /* ignore */ }

                            core.leaveEditMode?.();
                            core.show?.();
                            const ok = core.loadMarkups?.(saved.markup_data, MARKUP_LAYER_NAME);
                            console.log('[Markups] initial loadMarkups ok:', ok);
                            dbg('markups.saved.initial_loadMarkups', { ok, layer: MARKUP_LAYER_NAME });
                            populatedLayersRef.current.add(MARKUP_LAYER_NAME);

                            // Страховка: форсим тулбар обратно и логируем
                            // его реальное DOM-состояние для диагностики.
                            try { viewer.setToolbarVisible?.(true); } catch { /* ignore */ }
                            try { viewer.toolbar?.setVisible?.(true); } catch { /* ignore */ }
                            setTimeout(() => {
                              try {
                                const host = viewerContainerRef.current;
                                const tb = host?.querySelector('#guiviewer3d-toolbar') as HTMLElement | null;
                                const adsk = host?.querySelector('.adsk-toolbar') as HTMLElement | null;
                                const descEl = (el: HTMLElement | null) => {
                                  if (!el) return null;
                                  const r = el.getBoundingClientRect();
                                  const cs = getComputedStyle(el);
                                  return {
                                    tag: el.tagName,
                                    id: el.id,
                                    cls: String(el.className || ''),
                                    childrenCount: el.childElementCount,
                                    display: cs.display,
                                    visibility: cs.visibility,
                                    opacity: cs.opacity,
                                    zIndex: cs.zIndex,
                                    position: cs.position,
                                    pointerEvents: cs.pointerEvents,
                                    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                                  };
                                };
                                const allToolbars = Array.from(host?.querySelectorAll('.adsk-toolbar, [id$="toolbar"]') || []) as HTMLElement[];
                                const toolbarChildren = tb
                                  ? Array.from(tb.children).map((c) => descEl(c as HTMLElement))
                                  : [];
                                const snapshot = {
                                  hostRect: host ? (() => {
                                    const r = host.getBoundingClientRect();
                                    return { x: r.x, y: r.y, w: r.width, h: r.height };
                                  })() : null,
                                  toolbar: descEl(tb),
                                  toolbarChildren,
                                  toolbarParent: descEl(tb?.parentElement || null),
                                  toolbarParent2: descEl(tb?.parentElement?.parentElement || null),
                                  adskToolbar: descEl(adsk),
                                  allToolbarsFound: allToolbars.length,
                                  allToolbars: allToolbars.map(descEl),
                                  viewerToolbarObj: viewer.toolbar ? {
                                    visible: viewer.toolbar.isVisible?.(),
                                    controlsCount: viewer.toolbar._controls ? Object.keys(viewer.toolbar._controls).length : 'unknown',
                                  } : null,
                                };
                                // Плоский вывод JSON — чтобы в копии из консоли
                                // объекты не сворачивались в "{…}".
                                console.log('[DWG-MARKUPS-TRACE-JSON] markups.toolbar.dom_state', JSON.stringify(snapshot));
                                dbg('markups.toolbar.dom_state', snapshot);
                              } catch (e) {
                                dbg('markups.toolbar.dom_state.error', e);
                              }
                            }, 100);
                          } catch (e) {
                            console.warn('[Markups] initial populate failed:', e);
                          }
                        } else {
                          console.log('[Markups] No saved markups for revision', revisionId);
                        }
                        setMarkupSavedAt(saved?.updated_at || null);
                        dbg('markups.saved.updated_at', { updatedAt: saved?.updated_at || null });
                      } catch (err) {
                        console.warn('[Markups] fetch failed:', err);
                        dbg('markups.saved.fetch_failed', err);
                      }

                      // Автосохранение отключено, но обрабатываем Exit из
                      // Markups: часть версий SDK скрывает/сбрасывает оверлей
                      // при выходе из edit mode.
                      try {
                        const getActiveLayerName = (): string | null => {
                          try {
                            return (
                              core.editMode?.layer ||
                              core.activeLayer ||
                              core.getActiveLayer?.() ||
                              null
                            );
                          } catch { return null; }
                        };
                        const getLayerNames = (): string[] => {
                          try {
                            if (Array.isArray(core.layersArray)) return core.layersArray.slice();
                            if (core.layers && typeof core.layers === 'object') return Object.keys(core.layers);
                            if (typeof core.getLayersNames === 'function') return core.getLayersNames();
                          } catch { /* ignore */ }
                          return [];
                        };

                        const onEditModeChanged = () => {
                          const inEditMode = Boolean(core.editMode);
                          const layer = getActiveLayerName();
                          const layers = getLayerNames();
                          dbg('markups.event.editmode_changed', {
                            inEditMode,
                            activeLayer: layer,
                            layers,
                            redirecting: layerRedirectingRef.current,
                            hasLastSaved: Boolean(lastSavedMarkupRef.current),
                            hasCachedSaved: Boolean(savedMarkupsRef.current),
                          });

                          // Игнорируем собственные события во время редиректа
                          if (layerRedirectingRef.current) {
                            dbg('markups.event.editmode_changed.skipped_redirect');
                            return;
                          }

                          if (!inEditMode) {
                            setTimeout(() => {
                              restoreMarkupsAfterExit(core, viewer, 'event_editmode_changed');
                            }, 0);
                            return;
                          }

                          // Если SDK вошёл в edit mode НЕ в наш слой (включая
                          // случай activeLayer=null — дефолтный безымянный
                          // слой SDK), принудительно переключаем на
                          // EDMS_MARKUPS. Это гарантирует, что новые маркапы
                          // попадают в тот же слой, что и старые, и
                          // generateData() вернёт их все вместе.
                          if (layer !== MARKUP_LAYER_NAME) {
                            dbg('markups.editmode.wrong_layer.redirect', {
                              from: layer,
                              to: MARKUP_LAYER_NAME,
                            });
                            layerRedirectingRef.current = true;
                            try {
                              try { core.leaveEditMode?.(); } catch { /* ignore */ }
                              try { core.enterEditMode?.(MARKUP_LAYER_NAME); } catch { /* ignore */ }
                              dbg('markups.editmode.wrong_layer.redirected', {
                                newActiveLayer: getActiveLayerName(),
                              });
                            } finally {
                              // Чуть позже снимаем флаг — чтобы все event-ы
                              // редиректа (leave + enter) успели прийти.
                              setTimeout(() => {
                                layerRedirectingRef.current = false;
                              }, 50);
                            }
                          }
                        };
                        core.addEventListener?.('EVENT_EDITMODE_CHANGED', onEditModeChanged);
                        markupsEventCleanupRef.current.push(() => {
                          try { core.removeEventListener?.('EVENT_EDITMODE_CHANGED', onEditModeChanged); } catch { /* ignore */ }
                        });

                        // В некоторых версиях SDK клик "Exit" в markups GUI
                        // не триггерит EVENT_EDITMODE_CHANGED. Ловим клик в
                        // пределах всего viewer-контейнера и анализируем
                        // target/ancestors, чтобы найти кнопку Exit.
                        const hostEl = viewerContainerRef.current;
                        if (hostEl) {
                          const describeEl = (el: Element | null) => {
                            if (!el) return null;
                            const htmlEl = el as HTMLElement;
                            return {
                              tag: el.tagName,
                              id: htmlEl.id || '',
                              cls: htmlEl.className ? String(htmlEl.className) : '',
                              title: htmlEl.getAttribute?.('title') || '',
                              text: (htmlEl.textContent || '').trim().slice(0, 64),
                            };
                          };
                          const isExitLike = (el: Element) => {
                            const htmlEl = el as HTMLElement;
                            const cls = (htmlEl.className ? String(htmlEl.className) : '').toLowerCase();
                            const title = (htmlEl.getAttribute?.('title') || '').toLowerCase();
                            const id = (htmlEl.id || '').toLowerCase();
                            const text = (htmlEl.textContent || '').trim().toLowerCase();
                            return (
                              cls.includes('exit') ||
                              title.includes('exit') ||
                              id.includes('exit') ||
                              cls.includes('markup-done') ||
                              cls.includes('markup-exit') ||
                              title === 'done' ||
                              text === 'exit' ||
                              text === 'done'
                            );
                          };
                          const onHostClickCapture = (ev: Event) => {
                            const target = ev.target as HTMLElement | null;
                            if (!target) return;
                            const chain: Element[] = [];
                            let cur: Element | null = target;
                            let depth = 0;
                            while (cur && depth < 6) {
                              chain.push(cur);
                              cur = cur.parentElement;
                              depth += 1;
                            }
                            dbg('viewer.host.click', {
                              target: describeEl(target),
                              parents: chain.slice(1).map(describeEl),
                            });
                            const exitEl = chain.find(isExitLike);
                            if (exitEl) {
                              dbg('markups.gui.exit_click_detected', { el: describeEl(exitEl) });
                              setTimeout(() => {
                                restoreMarkupsAfterExit(core, viewer, 'gui_exit_click');
                              }, 0);
                            }
                          };
                          hostEl.addEventListener('click', onHostClickCapture, true);
                          markupsEventCleanupRef.current.push(() => {
                            try { hostEl.removeEventListener('click', onHostClickCapture, true); } catch { /* ignore */ }
                          });

                          const onHostKeyDown = (ev: KeyboardEvent) => {
                            dbg('viewer.host.keydown', { key: ev.key, inEditMode: Boolean(core.editMode) });
                            if (ev.key === 'Escape') {
                              setTimeout(() => {
                                restoreMarkupsAfterExit(core, viewer, 'escape_key');
                              }, 0);
                            }
                          };
                          hostEl.addEventListener('keydown', onHostKeyDown, true);
                          markupsEventCleanupRef.current.push(() => {
                            try { hostEl.removeEventListener('keydown', onHostKeyDown, true); } catch { /* ignore */ }
                          });
                        }
                      } catch (e) {
                        console.warn('[Markups] exit handler hook failed:', e);
                        dbg('markups.exit.handler_hook_failed', e);
                      }
                    }
                  } finally {
                    setLoading(false);
                    dbg('viewer.loading.false');
                  }
                });
              } else {
                setError('Не найдены данные для просмотра');
                setLoading(false);
                dbg('viewer.no_viewables');
              }
            },
            (_errorCode: number, errorMsg: string) => {
              setError(`Ошибка загрузки модели: ${errorMsg}`);
              setLoading(false);
              dbg('viewer.document.load_failed', { errorMsg });
            }
          );
        };

        // Initializer — строго один вызов на вкладку. Повторный вызов
        // ломает SDK. После первого успешного старта дёргаем onInitialized
        // напрямую.
        if (autodeskInitialized) {
          dbg('viewer.initializer.reuse');
          onInitialized();
        } else {
          dbg('viewer.initializer.first_call');
          window.Autodesk.Viewing.Initializer(options, () => {
            autodeskInitialized = true;
            dbg('viewer.initializer.done');
            onInitialized();
          });
        }
      } catch (err: any) {
        setError(`Ошибка инициализации просмотрщика: ${err.message}`);
        setLoading(false);
        dbg('viewer.initialize.error', err);
      }
    };

    initializeViewer();
  }, [open, urn, accessToken, preparing, scriptsLoaded]);

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
      setMarkupsReady(false);
      markupsCoreRef.current = null;
      markupsGuiRef.current = null;
      markupsEventCleanupRef.current.forEach((cleanup) => {
        try { cleanup(); } catch { /* ignore */ }
      });
      markupsEventCleanupRef.current = [];
      savedMarkupsRef.current = '';
      populatedLayersRef.current = new Set();
      lastSavedMarkupRef.current = '';
      viewerInitializedRef.current = false;
      currentViewerUrnRef.current = null;
    }
  }, [open]);

  // Гарантированный cleanup на unmount компонента (например, размонтирование
  // при переключении страниц). useEffect([open]) выше не сработает, если
  // open уже false на момент unmount — viewer тогда утечёт.
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.finish(); } catch { /* ignore */ }
        viewerRef.current = null;
      }
      markupsEventCleanupRef.current.forEach((cleanup) => {
        try { cleanup(); } catch { /* ignore */ }
      });
      markupsEventCleanupRef.current = [];
      viewerInitializedRef.current = false;
      currentViewerUrnRef.current = null;
    };
  }, []);

  const hasMeaningfulMarkupContent = (markupData: string): boolean => {
    const trimmed = markupData.trim();
    if (!trimmed) return false;
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) return true;
      const meaningfulTags = new Set([
        'path',
        'rect',
        'circle',
        'ellipse',
        'polyline',
        'polygon',
        'line',
        'text',
        'image',
        'freehand',
        'callout',
        'dimension',
        'markup',
      ]);
      const elements = Array.from(doc.getElementsByTagName('*'));
      return elements.some((el) => {
        const name = (el.localName || el.tagName || '').toLowerCase();
        if (meaningfulTags.has(name)) return true;
        if (name === 'g' && el.getAttribute('id')) return true;
        if (name === 'svg') return false;
        if (name === 'defs') return false;
        if (name === 'style') return false;
        if (name === 'metadata') return false;
        return el.attributes.length > 0 || (el.textContent || '').trim().length > 0;
      });
    } catch {
      return /<(?:[a-z0-9]+:)?(?:markup|freehand|callout|dimension|g|path|rect|circle|ellipse|polyline|polygon|line|text|image)\b/i.test(trimmed);
    }
  };

  const saveMarkupsToServer = async () => {
    const core = markupsCoreRef.current;
    if (!core) return;
    try {
      const getActiveLayerName = (): string | null => {
        try {
          return (
            core.editMode?.layer ||
            core.activeLayer ||
            core.getActiveLayer?.() ||
            null
          );
        } catch { return null; }
      };
      const getLayerNames = (): string[] => {
        try {
          if (Array.isArray(core.layersArray)) return core.layersArray.slice();
          if (core.layers && typeof core.layers === 'object') return Object.keys(core.layers);
          if (typeof core.getLayersNames === 'function') return core.getLayersNames();
        } catch { /* ignore */ }
        return [];
      };
      dbg('save.click.start', {
        documentId: documentIdRef.current,
        revisionId: revisionIdRef.current,
        hasCore: Boolean(core),
        hasLastSaved: Boolean(lastSavedMarkupRef.current),
        lastSavedLength: lastSavedMarkupRef.current?.length || 0,
        activeLayer: getActiveLayerName(),
        layers: getLayerNames(),
        inEditMode: Boolean(core.editMode),
      });

      // Всегда коммитим текущие правки перед generateData(): в edit mode
      // generateData возвращает содержимое рабочего буфера активного
      // tool-а, а не слоя. Без leaveEditMode старые маркапы из слоя
      // EDMS_MARKUPS и новые правки не будут склеены.
      // SDK не отдаёт имя активного слоя через публичные поля
      // (activeLayer=null, layers=[]), поэтому делаем это БЕЗУСЛОВНО,
      // если есть edit mode.
      const wasInEditMode = Boolean(core.editMode);
      if (wasInEditMode) {
        dbg('save.commit_edits_before_generate', {
          activeLayerReported: getActiveLayerName(),
          layers: getLayerNames(),
        });
        try { core.leaveEditMode?.(); } catch { /* ignore */ }
      }

      const raw = core.generateData?.();
      dbg('save.generateData.raw_type', { type: typeof raw });

      let data: string | null = null;
      if (typeof raw === 'string') {
        data = raw;
      } else if (raw && typeof raw === 'object') {
        const candidates = [
          (raw as any).markup_data,
          (raw as any).markupData,
          (raw as any).data,
          (raw as any).xml,
          (raw as any).markups,
        ];
        const firstString = candidates.find((c) => typeof c === 'string');
        data = firstString ? firstString : JSON.stringify(raw);
      }

      if (!data || data.trim().length === 0) return;
      if (data === lastSavedMarkupRef.current) return;
      const sampleHead = data.slice(0, 200);
      const sampleTail = data.slice(-200);
      const layerMatches = Array.from(data.matchAll(/layer=\"([^\"]+)\"|data-layer=\"([^\"]+)\"/g))
        .map((m) => m[1] || m[2])
        .filter((x) => !!x);
      const uniqueLayersInXml = Array.from(new Set(layerMatches));
      console.log('[DWG-MARKUPS-TRACE-JSON] save.generateData.sample', JSON.stringify({
        length: data.length,
        head: sampleHead,
        tail: sampleTail,
        uniqueLayersInXml,
      }));
      dbg('save.generateData.normalized', {
        length: data.length,
        uniqueLayersInXml,
      });

      const hasRealContent = hasMeaningfulMarkupContent(data);
      dbg('save.content.check', { hasRealContent });
      if (!hasRealContent) {
        setError('Не удалось сохранить: Autodesk вернул пустые данные маркапов. Завершите текущий элемент (Esc/Enter) и попробуйте снова.');
        dbg('save.content.empty_blocked');
        return;
      }

      // Бэк отклоняет пустую строку. Если пользователь стёр все фигуры
      // вручную, передаём минимальный валидный плейсхолдер, чтобы запись
      // в БД обновилась на «пусто».
      const payload = data;
      const result = await autodeskApi.saveRevisionMarkups(
        documentIdRef.current,
        revisionIdRef.current,
        payload,
      );
      dbg('save.api.success', { updatedAt: result.updated_at || null, payloadLength: payload.length });

      // Возвращаем пользователя в edit mode нашего слоя, если он был в нём
      // до сохранения. Так он сможет продолжить рисовать без клика Markup.
      if (wasInEditMode) {
        try {
          core.enterEditMode?.(MARKUP_LAYER_NAME);
          dbg('save.reenter_edit_mode', { layer: MARKUP_LAYER_NAME });
        } catch (e) {
          dbg('save.reenter_edit_mode.failed', e);
        }
      }

      // Разделяем тулбары: после сохранения мягко держим видимым
      // общий тулбар Viewer, не вмешиваясь в режим Markups.
      try { viewerRef.current?.setToolbarVisible?.(true); } catch { /* ignore */ }
      try { viewerRef.current?.toolbar?.setVisible?.(true); } catch { /* ignore */ }
      // Если Markups GUI загружен, оставляем его панель доступной.
      try { markupsGuiRef.current?.show?.(); } catch { /* ignore */ }
      dbg('save.toolbar.restore.called', {
        hasViewer: Boolean(viewerRef.current),
        hasViewerToolbarObj: Boolean(viewerRef.current?.toolbar),
        hasMarkupsGui: Boolean(markupsGuiRef.current),
      });

      lastSavedMarkupRef.current = payload;
      setMarkupSavedAt(result.updated_at || null);
      setError(null);
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ||
        e?.message ||
        (typeof e === 'string' ? e : JSON.stringify(e));
      console.error('Autosave markups error:', detail);
      dbg('save.error', { detail });
      setError(`Ошибка сохранения маркапов: ${detail}`);
    }
  };

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
      <DialogContent
        sx={{
          p: 0,
          position: 'relative',
          overflow: 'hidden',
          '& .autodesk-viewer-host': {
            colorScheme: 'light',
            position: 'relative',
          },
          // SVG-оверлей маркапов (layer-order-id="markups-svg") рендерится
          // поверх всего и визуально перекрывает нижний тулбар вьюера.
          // Поднимаем тулбар и панель инструментов маркапов выше оверлея.
          // pointer-events оверлея НЕ трогаем — в edit mode MarkupsCore сам
          // переключает их, и принудительный none сломает рисование.
          '& .autodesk-viewer-host .adsk-toolbar': {
            zIndex: '500 !important',
            pointerEvents: 'auto !important',
            display: 'flex !important',
            visibility: 'visible !important',
            opacity: '1 !important',
          },
          // Нижний тулбар viewer схлопывается до height:0 после MarkupsCore.show()
          // в некоторых версиях SDK. Форсим минимальную высоту и прижимаем
          // к низу контейнера, не трогая position, чтобы не сломать его layout.
          '& .autodesk-viewer-host #guiviewer3d-toolbar': {
            display: 'flex !important',
            visibility: 'visible !important',
            opacity: '1 !important',
            zIndex: '500 !important',
            minHeight: '40px !important',
            height: 'auto !important',
            bottom: '10px !important',
            alignItems: 'center',
          },
          '& .autodesk-viewer-host #guiviewer3d-toolbar > *': {
            minHeight: '40px',
          },
          // MarkupsCore.show() / MarkupsGui прячут inline-стилем
          // display:none все группы контролов (navTools, modelTools,
          // settingsTools). Форсим их обратно, но оставляем adsk-hidden
          // (штатно скрытые — например measureTools для DWG).
          '& .autodesk-viewer-host #guiviewer3d-toolbar .adsk-control-group:not(.adsk-hidden)': {
            display: 'flex !important',
            visibility: 'visible !important',
            opacity: '1 !important',
            pointerEvents: 'auto !important',
          },
          '& .autodesk-viewer-host #guiviewer3d-toolbar .adsk-control-group:not(.adsk-hidden) .adsk-control:not(.adsk-hidden)': {
            display: 'flex !important',
            visibility: 'visible !important',
          },
          '& .autodesk-viewer-host .markups-gui-panel, & .autodesk-viewer-host .adsk-docking-panel': {
            zIndex: '501 !important',
          },
          // Сам SVG-оверлей маркапов (id="markupsgui-svg" / layer-order-id)
          // в режиме show() стоит над канвасом — не даём ему перекрывать тулбар.
          '& .autodesk-viewer-host svg[id*="markups"]': {
            zIndex: 50,
          },
        }}
      >
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
          className="autodesk-viewer-host"
          ref={viewerContainerRef}
          sx={{
            width: '100%',
            height: '100%',
            minHeight: '600px',
          }}
        />
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" sx={{ mr: 2, color: 'text.secondary' }}>
          {markupSavedAt ? `Маркапы сохранены: ${new Date(markupSavedAt).toLocaleString()}` : 'Маркапы не сохранены'}
        </Typography>
        <Tooltip title="Сохранить маркапы">
          <span>
            <IconButton
              onClick={() => void saveMarkupsToServer()}
              disabled={preparing || loading || !!preparationError || !markupsReady}
              color="primary"
              aria-label="Сохранить маркапы"
            >
              <SaveIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutodeskViewerDialog;
