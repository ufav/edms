#!/usr/bin/env python3
"""
Исправление функции get_projects в projects.py
"""

import os
import sys

# Читаем файл
file_path = "app/api/v1/endpoints/projects.py"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Заменяем проблемный блок
old_block = '''    projects = projects_query.all()
    return [
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "project_code": project.project_code,
            "status": project.status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "budget": project.budget,
            "client": project.client,
            "manager_id": project.manager_id,
            "user_role": 'superadmin' if current_user.role == 'superadmin' else None,  # Роль текущего пользователя в проекте
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None
        }
        for project in projects
    ]'''

new_block = '''    projects = projects_query.all()
    
    # Получаем роли пользователей в проектах
    result = []
    for project in projects:
        # Для суперадмина роль всегда "superadmin"
        if current_user.role == 'superadmin':
            user_role = 'superadmin'
        else:
            # Находим роль текущего пользователя в проекте
            user_member = db.query(ProjectMember).filter(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == current_user.id
            ).first()
            
            user_role = user_member.role if user_member else None
        
        result.append({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "project_code": project.project_code,
            "status": project.status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "budget": project.budget,
            "client": project.client,
            "manager_id": project.manager_id,
            "user_role": user_role,  # Роль текущего пользователя в проекте
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None
        })
    
    return result'''

# Заменяем в содержимом
new_content = content.replace(old_block, new_block)

# Записываем обратно
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ Файл projects.py исправлен!")
