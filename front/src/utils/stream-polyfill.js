// Пустой полифилл для stream в браузере
// Используется для библиотек, которые пытаются импортировать stream

// Экспортируем пустые классы и функции для совместимости
export const Readable = class Readable {
  constructor() {
    // Пустой конструктор для совместимости
  }
  
  read() {
    return null;
  }
  
  on() {
    return this;
  }
  
  pipe() {
    return this;
  }
};

export const Writable = class Writable {
  constructor() {
    // Пустой конструктор для совместимости
  }
  
  write() {
    return true;
  }
  
  end() {
    return this;
  }
};

export const Transform = class Transform {
  constructor() {
    // Пустой конструктор для совместимости
  }
};

export default {
  Readable,
  Writable,
  Transform,
};

