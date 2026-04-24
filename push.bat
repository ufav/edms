@echo off
set PGPASSWORD=123
pg_dump -h localhost -p 5432 -U postgres -d edms -Fc -f "C:\Users\Marlen\PycharmProjects\edms\edms.dump"
set PGPASSWORD=

cd /d "%~dp0"
git add .
git commit -m "commit"
git push origin main
