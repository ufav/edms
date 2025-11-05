"""
Audit log schemas
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class AuditLogBase(BaseModel):
    action: str
    entity_type: str
    entity_id: int
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: int
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    
    # User info
    user_username: Optional[str] = None
    user_full_name: Optional[str] = None
    
    class Config:
        from_attributes = True

