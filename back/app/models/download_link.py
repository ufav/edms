"""
Download link model for secure file sharing
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import secrets
from datetime import datetime, timedelta


class DownloadLink(Base):
    """Temporary download links for transmittals"""
    __tablename__ = "download_links"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    transmittal_id = Column(Integer, ForeignKey("transmittals.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Security settings
    expires_at = Column(DateTime(timezone=True), nullable=False)
    max_downloads = Column(Integer, default=10)  # Max number of downloads allowed
    download_count = Column(Integer, default=0)  # Current download count
    is_active = Column(Boolean, default=True)
    
    # Password protection (optional)
    password_hash = Column(String(255), nullable=True)
    
    # Tracking
    last_downloaded_at = Column(DateTime(timezone=True), nullable=True)
    last_downloaded_ip = Column(String(45), nullable=True)  # IPv6 compatible
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transmittal = relationship("Transmittal", backref="download_links")
    creator = relationship("User", backref="created_download_links")

    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_link(
        transmittal_id: int,
        user_id: int,
        expires_in_days: int = 7,
        max_downloads: int = 10
    ) -> "DownloadLink":
        """Create a new download link"""
        return DownloadLink(
            token=DownloadLink.generate_token(),
            transmittal_id=transmittal_id,
            created_by=user_id,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days),
            max_downloads=max_downloads
        )
    
    def is_valid(self) -> bool:
        """Check if the link is still valid"""
        if not self.is_active:
            return False
        if datetime.utcnow() > self.expires_at.replace(tzinfo=None):
            return False
        if self.max_downloads and self.download_count >= self.max_downloads:
            return False
        return True
    
    def increment_download(self, ip_address: str = None):
        """Record a download"""
        self.download_count += 1
        self.last_downloaded_at = datetime.utcnow()
        if ip_address:
            self.last_downloaded_ip = ip_address
    
    def __repr__(self):
        return f"<DownloadLink(token={self.token[:8]}..., transmittal_id={self.transmittal_id})>"
