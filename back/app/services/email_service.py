"""
Email service for sending notifications
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formataddr
from email.header import Header
from typing import List, Optional
import logging
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import io

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
        
        # Настройка Jinja2 для загрузки шаблонов из директории templates/email
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=True
        )
    
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
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[dict]] = None
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
            attachments: List of dicts with 'filename' and 'content' (bytes) keys
            
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
            # Create message - use 'mixed' if we have attachments, 'alternative' otherwise
            if attachments:
                msg = MIMEMultipart('mixed')
            else:
                msg = MIMEMultipart('alternative')
            
            msg['From'] = formataddr((self.from_name, self.from_email))
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            # Create alternative part for text/html
            if attachments:
                alt_part = MIMEMultipart('alternative')
                msg.attach(alt_part)
                text_container = alt_part
            else:
                text_container = msg
            
            # Add plain text part
            if plain_content:
                part1 = MIMEText(plain_content, 'plain', 'utf-8')
                text_container.attach(part1)
            
            # Add HTML part
            part2 = MIMEText(html_content, 'html', 'utf-8')
            text_container.attach(part2)
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    filename = attachment.get('filename', 'attachment')
                    content = attachment.get('content')
                    if content:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(content)
                        encoders.encode_base64(part)
                        # Правильное кодирование имени файла для email
                        # Используем Header для поддержки не-ASCII символов
                        encoded_filename = Header(filename, 'utf-8').encode()
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename="{encoded_filename}"'
                        )
                        # Также добавляем Content-Type для Excel файлов
                        if filename.endswith('.xlsx'):
                            part.add_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                        msg.attach(part)
            
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
        subject = f"[EDMS] Transmittal {transmittal_number} — {project_name}"
        
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
Transmittal: {transmittal_number}
Project: {project_name}
Sender: {sender_name}{', ' + sender_company if sender_company else ''}

Documents:
{chr(10).join([f"- {doc['number']}: {doc.get('revision', '-')}" for doc in documents])}

Download: {download_link}

Link valid for {expires_in_days} days.
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
        template = self.jinja_env.get_template('transmittal.html')
        
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


    def send_review_excel_report(
        self,
        to_emails: List[str],
        project_name: str,
        excel_content: bytes,
        filename: str,
        language: str = "ru"
    ) -> bool:
        """
        Send review Excel report via email
        
        Args:
            to_emails: List of recipient email addresses
            project_name: Name of the project
            excel_content: Excel file content as bytes
            filename: Name of the Excel file
            language: Language for email content ('ru' or 'en')
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        if language == "ru":
            subject = f"[EDMS] Отчет по ревью — {project_name}"
            html_content = self._render_review_report_email_ru(project_name, filename)
            plain_content = f"Отчет по ревью для проекта {project_name}.\n\nФайл: {filename}"
        else:
            subject = f"[EDMS] Review Report — {project_name}"
            html_content = self._render_review_report_email_en(project_name, filename)
            plain_content = f"Review report for project {project_name}.\n\nFile: {filename}"
        
        return self.send_email(
            to_emails=to_emails,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content,
            attachments=[{
                'filename': filename,
                'content': excel_content
            }]
        )
    
    def _render_review_report_email_ru(self, project_name: str, filename: str) -> str:
        """Render Russian email template for review report"""
        template = self.jinja_env.get_template('review_report_ru.html')
        return template.render(project_name=project_name, filename=filename)
    
    def _render_review_report_email_en(self, project_name: str, filename: str) -> str:
        """Render English email template for review report"""
        template = self.jinja_env.get_template('review_report_en.html')
        return template.render(project_name=project_name, filename=filename)


# Global email service instance
email_service = EmailService()
