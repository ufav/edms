// App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { authStore } from './stores/auth';
import { referenceStore } from './stores/reference';
import LoginPage from './LoginPage';
import Main from './main_v1';
import { notification } from 'antd';

const App = observer(() => {
  useEffect(() => {
    const initializeApp = async () => {
      if (authStore.isAuthenticated) {
        const isValid = await authStore.verifyToken();
        if (isValid) {
          referenceStore.loadReferences();
          authStore.setupInactivityTimer();
        } else {
          authStore.clearUser();
        }
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    const resetTimer = () => {
      if (authStore.isAuthenticated) {
        console.log('Activity detected, resetting timer'); // Для отладки
        authStore.resetInactivityTimer();
      }
    };

    // Добавляем слушатели событий
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer, true);
    window.addEventListener('touchstart', resetTimer);

    return () => {
      // Очищаем слушатели
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer, true);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/main"
          element={authStore.isAuthenticated ? <Main /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
});

export default App;