# Операторы сравнения в Workflow Rules

## Обзор

Добавлена поддержка операторов сравнения в правилах workflow для более гибкой настройки переходов между ревизиями документов.

## Новые поля в WorkflowPresetRule

- **`operator`** (String, default: "equals") - Оператор сравнения
- **`review_code_list`** (Text, nullable) - JSON список кодов для списковых операторов  
- **`priority`** (Integer, default: 100) - Приоритет правила (меньше = выше приоритет)

## Поддерживаемые операторы

| Оператор | Описание | Пример использования |
|----------|----------|---------------------|
| `equals` | Точное соответствие | `review_code = "3"` |
| `not_equals` | Не равно | `review_code != "3"` |
| `in_list` | В списке | `review_code IN ["1", "2", "4"]` |
| `not_in_list` | Не в списке | `review_code NOT IN ["3"]` |

## Примеры правил для вашей логики

### 1. K + code 3 → K+1 (увеличение номера)

```json
{
  "current_revision_description_id": "K_ID",
  "current_revision_step_id": "01_ID", 
  "operator": "equals",
  "review_code_id": "3_ID",
  "review_code_list": null,
  "priority": 10,
  "next_revision_description_id": null,
  "next_revision_step_id": null,
  "action_on_fail": "increment_number"
}
```

### 2. K + любой код кроме 3 → U01

```json
{
  "current_revision_description_id": "K_ID",
  "current_revision_step_id": "01_ID",
  "operator": "not_equals", 
  "review_code_id": "3_ID",
  "review_code_list": null,
  "priority": 20,
  "next_revision_description_id": "U_ID",
  "next_revision_step_id": "01_ID",
  "action_on_fail": "stay_same"
}
```

### 3. K + коды 1,2,4 → U01 (альтернативный вариант)

```json
{
  "current_revision_description_id": "K_ID",
  "current_revision_step_id": "01_ID",
  "operator": "in_list",
  "review_code_id": null,
  "review_code_list": "[\"1\", \"2\", \"4\"]",
  "priority": 20,
  "next_revision_description_id": "U_ID", 
  "next_revision_step_id": "01_ID",
  "action_on_fail": "stay_same"
}
```

### 4. V01 → финальная ревизия

```json
{
  "current_revision_description_id": "V_ID",
  "current_revision_step_id": "01_ID",
  "operator": "equals",
  "review_code_id": "ANY_ID",
  "review_code_list": null,
  "priority": 100,
  "next_revision_description_id": null,
  "next_revision_step_id": null,
  "action_on_fail": "stay_same"
}
```

## API Endpoints

### Применение правила

**POST** `/api/v1/workflow-rules/apply-rule`

```json
{
  "preset_id": 1,
  "current_revision_description_id": "K_ID",
  "current_revision_step_id": "01_ID",
  "review_code_id": "3_ID"
}
```

**Ответ:**
```json
{
  "rule_matched": true,
  "next_revision": {
    "action": "increment_number",
    "revision_description_id": "K_ID", 
    "revision_step_id": "02_ID"
  },
  "rule_id": 1,
  "message": "Правило успешно применено"
}
```

### Получение правил пресета

**GET** `/api/v1/workflow-rules/presets/{preset_id}/rules`

Возвращает все правила пресета с подробной информацией, отсортированные по приоритету.

## Логика обработки

1. **Проверка текущей ревизии**: Сначала проверяется соответствие `current_revision_description_id` и `current_revision_step_id`

2. **Оценка оператора**: В зависимости от `operator` проверяется условие:
   - `equals`: `rule.review_code_id == current_review_code.id`
   - `not_equals`: `rule.review_code_id != current_review_code.id`  
   - `in_list`: `current_review_code.code IN json.loads(rule.review_code_list)`
   - `not_in_list`: `current_review_code.code NOT IN json.loads(rule.review_code_list)`

3. **Приоритет**: Правила обрабатываются в порядке `priority` (ascending)

4. **Определение следующей ревизии**:
   - Если `next_revision_description_id` указан → переход к конкретной ревизии
   - Если `action_on_fail = "increment_number"` → увеличение номера шага
   - Иначе → без изменений

## Миграция базы данных

Добавлены поля в таблицу `workflow_preset_rules`:
- `operator VARCHAR(20) DEFAULT 'equals'`
- `review_code_list TEXT`  
- `priority INTEGER DEFAULT 100`

## Обратная совместимость

Существующие правила продолжают работать с `operator="equals"` по умолчанию.

## Примеры использования

См. файл `example_workflow_operators.py` для подробных примеров создания правил и API запросов.
