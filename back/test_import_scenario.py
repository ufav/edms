#!/usr/bin/env python3
"""
Создание тестового Excel файла для проверки сценария импорта
"""

import pandas as pd
import os

# Создаем тестовые данные
data = {
    'discipline_code': ['HHH', 'HHH'],  # HHH существует в БД
    'document_type_code': ['CAL', 'UNKNOWN']  # CAL существует, UNKNOWN - нет
}

df = pd.DataFrame(data)

# Сохраняем в Excel файл
output_file = 'test_import_scenario.xlsx'
df.to_excel(output_file, index=False)

# Файл создан без вывода
