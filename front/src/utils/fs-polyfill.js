// Пустой полифилл для fs в браузере
// Используется для библиотек, которые пытаются импортировать fs

// Экспортируем пустые функции для совместимости
// В браузере эти функции не используются, но библиотеки могут проверять их наличие
export const writeFileSync = () => {
  // В браузере файлы сохраняются через XLSX.writeFile, который использует FileSaver
  // Эта функция не должна вызываться в браузере
  console.warn('fs.writeFileSync called in browser - this should not happen');
};

export const readFileSync = () => {
  console.warn('fs.readFileSync called in browser - this should not happen');
  return null;
};

export const existsSync = () => {
  // Всегда возвращаем false, так как в браузере нет файловой системы
  return false;
};

export const mkdirSync = () => {
  // В браузере не создаем директории
  return null;
};

export const readdirSync = () => {
  // В браузере нет директорий
  return [];
};

export const statSync = () => {
  // В браузере нет файловой системы
  return null;
};

export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
};

export default {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  constants,
};

