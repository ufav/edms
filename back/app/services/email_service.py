"""
Email service for sending notifications
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import List, Optional
import logging
from jinja2 import Template

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""
    
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS
    
    def is_configured(self) -> bool:
        """Check if email is properly configured"""
        return bool(self.host and self.user and self.password)
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """
        Send an email to one or more recipients
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            html_content: HTML body of the email
            plain_content: Plain text body (optional, for email clients that don't support HTML)
            cc_emails: List of CC recipients
            bcc_emails: List of BCC recipients
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Email service is not configured. Skipping email send.")
            return False
        
        if not to_emails:
            logger.warning("No recipients specified for email.")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = formataddr((self.from_name, self.from_email))
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            # Add plain text part
            if plain_content:
                part1 = MIMEText(plain_content, 'plain', 'utf-8')
                msg.attach(part1)
            
            # Add HTML part
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part2)
            
            # Collect all recipients
            all_recipients = to_emails.copy()
            if cc_emails:
                all_recipients.extend(cc_emails)
            if bcc_emails:
                all_recipients.extend(bcc_emails)
            
            # Connect and send
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_email, all_recipients, msg.as_string())
            
            logger.info(f"Email sent successfully to {', '.join(to_emails)}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error occurred: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_transmittal_notification(
        self,
        to_emails: List[str],
        transmittal_number: str,
        transmittal_title: str,
        project_name: str,
        sender_name: str,
        sender_company: str,
        documents: List[dict],
        download_link: str,
        expires_in_days: int = 7
    ) -> bool:
        """
        Send a transmittal notification email with download link
        
        Args:
            to_emails: List of recipient emails
            transmittal_number: Transmittal number
            transmittal_title: Transmittal title
            project_name: Project name
            sender_name: Name of person sending
            sender_company: Company sending the transmittal
            documents: List of documents with 'number' and 'title' keys
            download_link: Link to download documents
            expires_in_days: Days until link expires
        """
        subject = f"[EDMS] Трансмиттал {transmittal_number} — {project_name}"
        
        html_content = self._render_transmittal_email(
            transmittal_number=transmittal_number,
            transmittal_title=transmittal_title,
            project_name=project_name,
            sender_name=sender_name,
            sender_company=sender_company,
            documents=documents,
            download_link=download_link,
            expires_in_days=expires_in_days
        )
        
        plain_content = f"""
Трансмиттал: {transmittal_number}
Проект: {project_name}
От: {sender_name}, {sender_company}

Документы:
{chr(10).join([f"- {doc['number']}: {doc['title']}" for doc in documents])}

Скачать документы: {download_link}

Ссылка действительна {expires_in_days} дней.
        """
        
        return self.send_email(
            to_emails=to_emails,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content
        )
    
    def _render_transmittal_email(
        self,
        transmittal_number: str,
        transmittal_title: str,
        project_name: str,
        sender_name: str,
        sender_company: str,
        documents: List[dict],
        download_link: str,
        expires_in_days: int
    ) -> str:
        """Render the transmittal email HTML template"""
        
        template = Template('''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                📄 Новый трансмиттал
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                                {{ transmittal_number }}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <!-- Info -->
                            <table width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                                        <strong style="color: #666;">Проект:</strong>
                                        <span style="color: #333; float: right;">{{ project_name }}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                                        <strong style="color: #666;">Название:</strong>
                                        <span style="color: #333; float: right;">{{ transmittal_title }}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                                        <strong style="color: #666;">Отправитель:</strong>
                                        <span style="color: #333; float: right;">{{ sender_name }}, {{ sender_company }}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Documents -->
                            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">
                                📋 Документы ({{ documents|length }}):
                            </h3>
                            <table width="100%" style="border: 1px solid #e0e0e0; border-radius: 4px; border-collapse: collapse; margin-bottom: 25px;">
                                <thead>
                                    <tr style="background-color: #f5f5f5;">
                                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; color: #666; font-weight: 600;">Номер</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; color: #666; font-weight: 600;">Название</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {% for doc in documents %}
                                    <tr>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #1976d2; font-family: monospace;">{{ doc.number }}</td>
                                        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #333;">{{ doc.title }}</td>
                                    </tr>
                                    {% endfor %}
                                </tbody>
                            </table>
                            
                            <!-- Download Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{ download_link }}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #4caf50 0%, #43a047 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 3px 6px rgba(76, 175, 80, 0.3);">
                                            ⬇️ Скачать документы
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Expiry notice -->
                            <p style="margin: 20px 0 0 0; color: #999; font-size: 13px; text-align: center;">
                                ⏱️ Ссылка действительна {{ expires_in_days }} дней
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
                            <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                                Это автоматическое уведомление от системы EDMS.<br>
                                Если у вас есть вопросы, обратитесь к отправителю.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        ''')
        
        return template.render(
            transmittal_number=transmittal_number,
            transmittal_title=transmittal_title,
            project_name=project_name,
            sender_name=sender_name,
            sender_company=sender_company,
            documents=documents,
            download_link=download_link,
            expires_in_days=expires_in_days
        )


# Global email service instance
email_service = EmailService()
