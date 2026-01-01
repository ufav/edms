# Диаграмма маршрута документа (Document Workflow)

## Общая схема маршрута согласования документа

```mermaid
graph TD
    Start([Создание документа]) --> CreateRev[Создание первой ревизии]
    CreateRev --> Draft[Draft<br/>Черновик]
    
    Draft --> Upload[Загрузка файла]
    Upload --> FirstRev[Первая ревизия<br/>Revision Description + Step]
    
    FirstRev --> CheckTransmittal{Требуется<br/>трансмиттал?}
    
    CheckTransmittal -->|Да| WaitTransmittal[Ожидание трансмиттала]
    WaitTransmittal --> SendTransmittal[Отправка трансмиттала]
    SendTransmittal --> ReceiveTransmittal[Получение трансмиттала]
    ReceiveTransmittal --> Review[Ревью]
    
    CheckTransmittal -->|Нет| Review
    
    Review --> ReviewDecision{Решение<br/>ревьюера}
    
    ReviewDecision -->|Approved| Approved[Approved<br/>Утверждено]
    ReviewDecision -->|Approved with Comments| ApprovedComments[Approved with Comments<br/>Утверждено с комментариями]
    ReviewDecision -->|Not Reviewed| NotReviewed[Not Reviewed<br/>Не ревьюировано]
    ReviewDecision -->|Rejected| Rejected[Rejected<br/>Отклонено]
    ReviewDecision -->|In Review| InReview[In Review<br/>На ревью]
    
    Approved --> CheckFinal{Финальная<br/>ревизия?}
    ApprovedComments --> CheckFinal
    NotReviewed --> CheckFinal
    
    CheckFinal -->|Да| Final[Финальная ревизия<br/>Документ завершен]
    CheckFinal -->|Нет| CheckRule{Проверка правил<br/>перехода}
    
    CheckRule -->|По review code| NextRev[Следующая ревизия<br/>по правилу]
    CheckRule -->|+1 по порядку| NextSeqRev[Следующая ревизия<br/>по последовательности]
    
    NextRev --> CreateNewRev[Создание новой ревизии]
    NextSeqRev --> CreateNewRev
    CreateNewRev --> Draft
    
    Rejected --> Revise[Доработка]
    Revise --> CreateNewRev
    
    InReview --> Review
    
    Final --> End([Документ утвержден])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style Draft fill:#fff9c4
    style Approved fill:#c8e6c9
    style ApprovedComments fill:#c8e6c9
    style NotReviewed fill:#c8e6c9
    style Rejected fill:#ffcdd2
    style InReview fill:#bbdefb
    style Final fill:#4caf50,color:#fff
```

## Детальная схема компонентов системы

```mermaid
graph LR
    subgraph Project[Проект]
        WP[WorkflowPreset<br/>Шаблон маршрута]
    end
    
    subgraph Sequence[Последовательность ревизий]
        S1[Sequence 1<br/>Rev Desc + Step]
        S2[Sequence 2<br/>Rev Desc + Step]
        S3[Sequence N<br/>Rev Desc + Step]
        S1 --> S2
        S2 --> S3
    end
    
    subgraph Rules[Правила переходов]
        R1[Rule 1<br/>Current Rev + Review Code<br/>→ Next Rev]
        R2[Rule 2<br/>Current Rev + Review Code<br/>→ Next Rev]
    end
    
    subgraph Document[Документ]
        Doc[Document]
        Rev1[Revision 1<br/>Status: Draft]
        Rev2[Revision 2<br/>Status: In Review]
        Rev3[Revision N<br/>Status: Approved]
        Doc --> Rev1
        Rev1 --> Rev2
        Rev2 --> Rev3
    end
    
    subgraph Statuses[Статусы Workflow]
        DraftStatus[Draft]
        InReviewStatus[In Review]
        ApprovedStatus[Approved]
        ApprovedCommentsStatus[Approved with Comments]
        NotReviewedStatus[Not Reviewed]
        RejectedStatus[Rejected]
    end
    
    WP --> Sequence
    WP --> Rules
    Sequence --> Document
    Rules --> Document
    Document --> Statuses
    
    style WP fill:#e3f2fd
    style Sequence fill:#f3e5f5
    style Rules fill:#fff3e0
    style Document fill:#e8f5e9
    style Statuses fill:#fce4ec
```

## Процесс создания и обработки ревизий

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant System as Система
    participant Workflow as Workflow Preset
    participant Revision as Document Revision
    participant Review as Review Process
    participant Transmittal as Transmittal
    
    User->>System: Создать документ
    System->>Workflow: Получить preset проекта
    Workflow->>System: Вернуть последовательность
    System->>Revision: Создать первую ревизию
    Revision-->>System: Ревизия создана (Draft)
    
    User->>System: Загрузить файл
    System->>Revision: Обновить ревизию
    Revision-->>System: Файл загружен
    
    System->>Workflow: Проверить требует ли трансмиттал
    alt Требуется трансмиттал
        System->>Transmittal: Создать трансмиттал
        Transmittal-->>System: Трансмиттал создан
        System->>User: Ожидание отправки трансмиттала
        User->>Transmittal: Отправить трансмиттал
        Transmittal-->>System: Трансмиттал отправлен
    end
    
    System->>Review: Начать процесс ревью
    Review->>Revision: Обновить статус (In Review)
    Revision-->>Review: Статус обновлен
    
    Review->>User: Уведомление о ревью
    User->>Review: Утвердить/Отклонить
    Review->>Revision: Обновить статус
    
    alt Утверждено
        Revision-->>System: Статус: Approved
        System->>Workflow: Проверить правила перехода
        alt Есть правило перехода
            Workflow->>System: Следующая ревизия по правилу
        else Нет правила, есть следующая в последовательности
            Workflow->>System: Следующая ревизия по порядку
        else Финальная ревизия
            System->>Revision: Финальная ревизия
            Revision-->>User: Документ утвержден
        end
    else Отклонено
        Revision-->>System: Статус: Rejected
        System->>User: Требуется доработка
    end
```

## Структура данных Workflow Preset

```mermaid
erDiagram
    WorkflowPreset ||--o{ WorkflowPresetSequence : "имеет"
    WorkflowPreset ||--o{ WorkflowPresetRule : "имеет"
    
    WorkflowPresetSequence }o--|| RevisionDescription : "использует"
    WorkflowPresetSequence }o--|| RevisionStep : "использует"
    
    WorkflowPresetRule }o--|| RevisionDescription : "текущая ревизия"
    WorkflowPresetRule }o--|| RevisionStep : "текущий шаг"
    WorkflowPresetRule }o--|| ReviewCode : "условие перехода"
    WorkflowPresetRule }o--|| RevisionDescription : "следующая ревизия"
    WorkflowPresetRule }o--|| RevisionStep : "следующий шаг"
    WorkflowPresetRule }o--o| DocumentType : "для типа документа"
    
    Document }o--|| Project : "принадлежит"
    Project }o--o| WorkflowPreset : "использует"
    Document ||--o{ DocumentRevision : "имеет"
    
    DocumentRevision }o--|| RevisionDescription : "описание"
    DocumentRevision }o--|| RevisionStep : "шаг"
    DocumentRevision }o--|| WorkflowStatus : "статус"
    
    WorkflowPreset {
        int id PK
        string name
        string description
        boolean is_global
        int created_by FK
    }
    
    WorkflowPresetSequence {
        int id PK
        int preset_id FK
        int sequence_order
        int revision_description_id FK
        int revision_step_id FK
        boolean is_final
        boolean requires_transmittal
        int due_days
    }
    
    WorkflowPresetRule {
        int id PK
        int preset_id FK
        int document_type_id FK
        int current_revision_description_id FK
        int current_revision_step_id FK
        int review_code_id FK
        string operator
        int next_revision_description_id FK
        int next_revision_step_id FK
        int priority
    }
    
    DocumentRevision {
        int id PK
        int document_id FK
        int revision_description_id FK
        int revision_step_id FK
        int workflow_status_id FK
        string number
    }
```

## Пример типичного маршрута документа

```mermaid
graph TD
    Start([Документ создан]) --> Rev01[Ревизия 01<br/>A / For Review]
    
    Rev01 --> Review1{Ревью}
    Review1 -->|Approved| Rev02[Ревизия 02<br/>B / For Review]
    Review1 -->|Rejected| Rev01Rework[Доработка<br/>Ревизия 01]
    Rev01Rework --> Rev01
    
    Rev02 --> Review2{Ревью}
    Review2 -->|Approved| Rev03[Ревизия 03<br/>C / For Approval]
    Review2 -->|Rejected| Rev02Rework[Доработка<br/>Ревизия 02]
    Rev02Rework --> Rev02
    
    Rev03 --> TransmittalCheck{Требуется<br/>трансмиттал?}
    TransmittalCheck -->|Да| CreateTransmittal[Создать трансмиттал]
    CreateTransmittal --> SendTransmittal[Отправить трансмиттал]
    SendTransmittal --> ReceiveTransmittal[Получить трансмиттал]
    ReceiveTransmittal --> Approve[Утверждение]
    
    TransmittalCheck -->|Нет| Approve
    
    Approve --> Final[Финальная ревизия<br/>Approved]
    Final --> End([Документ утвержден])
    
    style Start fill:#e1f5ff
    style End fill:#4caf50,color:#fff
    style Rev01 fill:#fff9c4
    style Rev02 fill:#fff9c4
    style Rev03 fill:#fff9c4
    style Final fill:#4caf50,color:#fff
    style Rev01Rework fill:#ffcdd2
    style Rev02Rework fill:#ffcdd2
```

## Описание компонентов

### WorkflowPreset (Шаблон маршрута)
- **Назначение**: Определяет общий маршрут согласования для проекта
- **Свойства**:
  - `name`: Название шаблона
  - `description`: Описание
  - `is_global`: Глобальный или пользовательский шаблон
  - `created_by`: Создатель шаблона

### WorkflowPresetSequence (Последовательность ревизий)
- **Назначение**: Определяет порядок ревизий в маршруте
- **Свойства**:
  - `sequence_order`: Порядок в последовательности
  - `revision_description_id`: Описание ревизии (A, B, C, и т.д.)
  - `revision_step_id`: Шаг ревизии (For Review, For Approval, и т.д.)
  - `is_final`: Является ли финальной ревизией
  - `requires_transmittal`: Требуется ли трансмиттал для этой ревизии
  - `due_days`: Количество дней на выполнение

### WorkflowPresetRule (Правила переходов)
- **Назначение**: Определяет условия перехода между ревизиями
- **Свойства**:
  - `current_revision_description_id`: Текущее описание ревизии
  - `current_revision_step_id`: Текущий шаг ревизии
  - `review_code_id`: Код ревью, который вызывает переход
  - `operator`: Оператор сравнения (equals, not_equals, in_list, not_in_list)
  - `next_revision_description_id`: Следующее описание ревизии
  - `next_revision_step_id`: Следующий шаг ревизии
  - `document_type_id`: Применяется к конкретному типу документа (опционально)
  - `priority`: Приоритет правила

### DocumentRevision (Ревизия документа)
- **Назначение**: Представляет конкретную ревизию документа
- **Свойства**:
  - `revision_description_id`: Описание ревизии
  - `revision_step_id`: Шаг ревизии
  - `workflow_status_id`: Статус в workflow
  - `number`: Номер ревизии (01, 02, 03, и т.д.)

### WorkflowStatus (Статусы)
- **Draft**: Черновик
- **In Review**: На ревью
- **Approved**: Утверждено
- **Approved with Comments**: Утверждено с комментариями
- **Not Reviewed**: Не ревьюировано
- **Rejected**: Отклонено

## Логика переходов

1. **По умолчанию**: Документ следует последовательности (WorkflowPresetSequence) по порядку
2. **По правилам**: Если есть правило (WorkflowPresetRule), которое соответствует текущей ревизии и review code, переход происходит согласно правилу
3. **Финальная ревизия**: Когда достигнута ревизия с `is_final = true` и она утверждена, документ считается завершенным
4. **Трансмиттал**: Если `requires_transmittal = true`, документ должен быть отправлен через трансмиттал перед утверждением

## Автоматические действия

- При создании первого утвержденного документа проект автоматически переходит из статуса "PLANNING" в "ACTIVE"
- При утверждении ревизии система проверяет правила перехода и создает следующую ревизию при необходимости
- При отклонении ревизии создается новая ревизия для доработки
