# Document Components

Эта папка содержит компоненты для работы с документами и их ревизиями.

## Компоненты

### DocumentViewer
Основной компонент для просмотра документа и его ревизий.
- Отображает детальную информацию о документе
- Показывает таблицу ревизий с возможностью сравнения
- Поддерживает создание новых ревизий

### DocumentRevisionDialog
Диалог для создания новой ревизии документа.
- Загрузка файла
- Описание изменений
- Валидация типов файлов

### DocumentCompareDialog
Диалог для сравнения ревизий документа.
- Выбор двух ревизий для сравнения
- Отображение результатов сравнения
- Показ различий между ревизиями

## Использование

```tsx
import { DocumentViewer, DocumentRevisionDialog, DocumentCompareDialog } from './document';

// В компоненте
<DocumentViewer
  open={documentDetailsOpen}
  document={selectedDocument}
  onClose={() => setDocumentDetailsOpen(false)}
  onNewRevision={() => setNewRevisionOpen(true)}
  onCompareRevisions={() => setCompareOpen(true)}
/>
```
