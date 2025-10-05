"""
Пример использования операторов в workflow правилах
"""

import json
from app.models.project import WorkflowPresetRule
from app.services.workflow_rule_processor import WorkflowRuleProcessor

def create_example_preset_rules():
    """
    Создает примеры правил для вашей логики:
    - K + code 3 → K+1 (увеличение номера)
    - K + любой код кроме 3 → U01
    - V01 → финальная ревизия
    """
    
    # Правило 1: K + code 3 → K+1
    rule_k_increment = {
        "current_revision_description_id": "K_ID",  # ID для K
        "current_revision_step_id": "01_ID",  # ID для 01
        "operator": "equals",
        "review_code_id": "3_ID",  # ID для кода 3
        "review_code_list": None,
        "priority": 10,
        "next_revision_description_id": None,  # null для +1
        "next_revision_step_id": None,  # null для +1
        "action_on_fail": "increment_number"
    }
    
    # Правило 2: K + любой код кроме 3 → U01
    rule_k_to_u = {
        "current_revision_description_id": "K_ID",  # ID для K
        "current_revision_step_id": "01_ID",  # ID для 01
        "operator": "not_equals",
        "review_code_id": "3_ID",  # ID для кода 3
        "review_code_list": None,
        "priority": 20,
        "next_revision_description_id": "U_ID",  # ID для U
        "next_revision_step_id": "01_ID",  # ID для 01
        "action_on_fail": "stay_same"
    }
    
    # Альтернативное правило 2 через список: K + коды 1,2,4 → U01
    rule_k_to_u_alternative = {
        "current_revision_description_id": "K_ID",
        "current_revision_step_id": "01_ID",
        "operator": "in_list",
        "review_code_id": None,
        "review_code_list": json.dumps(["1", "2", "4"]),
        "priority": 20,
        "next_revision_description_id": "U_ID",
        "next_revision_step_id": "01_ID",
        "action_on_fail": "stay_same"
    }
    
    # Правило 3: V01 → финальная (блокирует дальнейшие переходы)
    rule_v_final = {
        "current_revision_description_id": "V_ID",  # ID для V
        "current_revision_step_id": "01_ID",  # ID для 01
        "operator": "equals",
        "review_code_id": "ANY_ID",  # Любой код
        "review_code_list": None,
        "priority": 100,
        "next_revision_description_id": None,  # Финальная
        "next_revision_step_id": None,  # Финальная
        "action_on_fail": "stay_same"
    }
    
    return [rule_k_increment, rule_k_to_u, rule_v_final]


def demonstrate_rule_evaluation():
    """
    Демонстрирует как работают операторы
    """
    
    # Пример 1: K01 + code 3 → должно сработать правило увеличения
    print("=== Пример 1: K01 + code 3 ===")
    print("Ожидается: K02 (увеличение номера)")
    
    # Пример 2: K01 + code 1 → должно сработать правило перехода к U
    print("\n=== Пример 2: K01 + code 1 ===")
    print("Ожидается: U01")
    
    # Пример 3: K01 + code 2 → должно сработать правило перехода к U
    print("\n=== Пример 3: K01 + code 2 ===")
    print("Ожидается: U01")
    
    # Пример 4: K01 + code 4 → должно сработать правило перехода к U
    print("\n=== Пример 4: K01 + code 4 ===")
    print("Ожидается: U01")
    
    # Пример 5: V01 + любой код → финальная ревизия
    print("\n=== Пример 5: V01 + любой код ===")
    print("Ожидается: Финальная ревизия (блокировка)")


def create_api_example():
    """
    Пример API запроса для применения правила
    """
    api_request = {
        "preset_id": 1,
        "current_revision_description_id": "K_ID",
        "current_revision_step_id": "01_ID", 
        "review_code_id": "3_ID"
    }
    
    print("=== API запрос для применения правила ===")
    print(json.dumps(api_request, indent=2))
    
    # Ожидаемый ответ
    expected_response = {
        "rule_matched": True,
        "next_revision": {
            "action": "increment_number",
            "revision_description_id": "K_ID",
            "revision_step_id": "02_ID"
        },
        "rule_id": 1,
        "message": "Правило успешно применено"
    }
    
    print("\n=== Ожидаемый ответ ===")
    print(json.dumps(expected_response, indent=2))


if __name__ == "__main__":
    print("=== Примеры правил workflow с операторами ===")
    
    rules = create_example_preset_rules()
    print("\n1. Правила для создания пресета:")
    for i, rule in enumerate(rules, 1):
        print(f"\nПравило {i}:")
        print(json.dumps(rule, indent=2))
    
    print("\n" + "="*50)
    demonstrate_rule_evaluation()
    
    print("\n" + "="*50)
    create_api_example()
