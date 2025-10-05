const fs = require('fs');
const path = require('path');

// Функция для рекурсивного поиска файлов
function findFiles(dir, pattern) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, pattern));
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Найти все .tsx и .ts файлы
const files = findFiles('./src', /\.(tsx?|jsx?)$/);

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Удалить все console.log, console.error, console.warn
    content = content.replace(/^\s*console\.(log|error|warn)\([^)]*\);\s*$/gm, '');
    
    // Удалить console.* в блоках try-catch
    content = content.replace(/^\s*console\.(log|error|warn)\([^)]*\);\s*$/gm, '');
    
    // Удалить пустые строки, оставшиеся после удаления console
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(file, content);
    console.log(`Processed: ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Done!');
