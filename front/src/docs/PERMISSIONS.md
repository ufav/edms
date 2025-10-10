# Система разрешений и ролей

## Обзор

Централизованная система управления ролями и разрешениями для EDMS приложения.

## Роли

### 1. Admin (Администратор)
- **Полные права доступа**
- Может видеть все проекты
- Может создавать, редактировать и удалять проекты
- Может управлять пользователями
- Может управлять участниками проектов
- Доступ к админке

### 2. Operator (Оператор)
- **Ограниченные права**
- Может создавать проекты
- Может управлять участниками в своих проектах
- НЕ может удалять проекты (только создатель или админ)
- НЕ может видеть страницы "Пользователи" и "Админка"
- Видит только свои проекты

### 3. Viewer (Наблюдатель)
- **Только просмотр**
- НЕ может создавать проекты
- НЕ может управлять участниками
- НЕ может видеть страницы "Пользователи" и "Админка"
- Может только просматривать назначенные проекты

## Разрешения

### canViewUsers
- **Описание**: Доступ к странице управления пользователями
- **Роли**: Admin

### canViewAdmin
- **Описание**: Доступ к админке
- **Роли**: Admin

### canCreateProjects
- **Описание**: Возможность создавать проекты
- **Роли**: Admin, Operator

### canDeleteProjects
- **Описание**: Возможность удалять проекты (только свои для operator)
- **Роли**: Admin (любые проекты), Operator (только свои проекты)

### canDeleteAnyProjects
- **Описание**: Возможность удалять любые проекты в системе
- **Роли**: Admin

### canManageProjectMembers
- **Описание**: Управление участниками проектов
- **Роли**: Admin (все проекты), Operator (свои проекты)

### canViewAllProjects
- **Описание**: Просмотр всех проектов в системе
- **Роли**: Admin

### canViewWorkflows
- **Описание**: Доступ к странице управления workflow
- **Роли**: Admin, Operator

## Таблица разрешений

| Разрешение | Admin | Operator | Viewer |
|------------|-------|----------|--------|
| `canViewUsers` | ✅ | ❌ | ❌ |
| `canViewAdmin` | ✅ | ❌ | ❌ |
| `canCreateProjects` | ✅ | ✅ | ❌ |
| `canDeleteProjects` | ✅ | ✅* | ❌ |
| `canDeleteAnyProjects` | ✅ | ❌ | ❌ |
| `canManageProjectMembers` | ✅ | ✅* | ❌ |
| `canViewAllProjects` | ✅ | ❌ | ❌ |
| `canViewWorkflows` | ✅ | ✅ | ❌ |

*Operator может удалять только проекты, в которых он является владельцем (создателем)

## Использование

### Хук usePermissions
```typescript
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const permissions = usePermissions();
  
  if (permissions.canCreateProjects) {
    // Показать кнопку создания проекта
  }
};
```

### Хук usePermission
```typescript
import { usePermission } from '../hooks/usePermissions';

const MyComponent = () => {
  const canCreate = usePermission('canCreateProjects');
  
  return canCreate ? <CreateButton /> : null;
};
```

### Хук useRole
```typescript
import { useRole } from '../hooks/usePermissions';

const MyComponent = () => {
  const { isAdmin, isOperator, isViewer, role } = useRole();
  
  return (
    <div>
      {isAdmin && <AdminPanel />}
      {isOperator && <OperatorPanel />}
      {isViewer && <ViewerPanel />}
    </div>
  );
};
```

### Компонент PermissionGate
```typescript
import { PermissionGate } from '../components/PermissionGate';

const MyComponent = () => {
  return (
    <PermissionGate permission="canCreateProjects">
      <CreateButton />
    </PermissionGate>
  );
};
```

### Компонент RoleGate
```typescript
import { RoleGate } from '../components/PermissionGate';

const MyComponent = () => {
  return (
    <RoleGate role="admin">
      <AdminPanel />
    </RoleGate>
  );
};
```

## Миграция

### Старый способ (НЕ рекомендуется)
```typescript
// ❌ Плохо - дублирование логики
if (userStore.currentUser?.role === 'admin') {
  // показать элемент
}
```

### Новый способ (Рекомендуется)
```typescript
// ✅ Хорошо - централизованная логика
import { usePermissions } from '../hooks/usePermissions';

const permissions = usePermissions();
if (permissions.canViewUsers) {
  // показать элемент
}
```

## Преимущества

1. **Централизация**: Вся логика ролей в одном месте
2. **Консистентность**: Одинаковые проверки во всех компонентах
3. **Поддержка**: Легко добавлять новые роли и разрешения
4. **Типизация**: TypeScript поддержка для всех разрешений
5. **Тестирование**: Легко тестировать логику разрешений
6. **Производительность**: Мемоизация разрешений

## Добавление новых разрешений

1. Добавьте разрешение в интерфейс `Permission` в `usePermissions.ts`
2. Обновите логику в `usePermissions` для каждой роли
3. Используйте новое разрешение в компонентах
4. Обновите документацию
