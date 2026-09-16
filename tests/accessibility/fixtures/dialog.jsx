import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '@/core/components/context/I18nContext';
import { ModalProvider, useModal } from '@/core/components/context/ModalContext';
import '@/index.css';

function Fixture() {
  const { showPrompt, showConfirm, showAlert } = useModal();
  const [result, setResult] = useState('');
  return (
    <main>
      <h1>Dialog test fixture</h1>
      <button onClick={async () => setResult(JSON.stringify(await showPrompt()))}>Open prompt</button>
      <button onClick={async () => setResult(JSON.stringify(await showConfirm()))}>Open confirmation</button>
      <button onClick={async () => setResult(JSON.stringify(await showAlert()))}>Open alert</button>
      <output>{result}</output>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter><I18nProvider><ModalProvider><Fixture /></ModalProvider></I18nProvider></BrowserRouter>
);