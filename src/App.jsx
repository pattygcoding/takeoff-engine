import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Stepper from './components/Stepper';
import UploadStep from './components/UploadStep';
import EditStep from './components/EditStep';
import ResultsStep from './components/ResultsStep';
import { DEFAULT_RATES } from './lib/calculations';
import { useLocalStorageState } from './lib/useLocalStorageState';

const STEP_PATHS = { 1: '/', 2: '/edit', 3: '/results' };

function App() {
  const [items, setItems] = useState([]);
  const [rates, setRates] = useLocalStorageState('takeoff-engine.rates', DEFAULT_RATES);
  const navigate = useNavigate();

  const handleItemsParsed = (parsedItems) => {
    setItems(parsedItems);
    navigate('/edit');
  };

  const goToStep = (step) => navigate(STEP_PATHS[step]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="no-print bg-white border-b border-slate-200 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2">
          <span className="text-xl font-bold text-indigo-600">Takeoff Engine</span>
          <span className="text-sm text-slate-400">Construction Estimating</span>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <>
              <Stepper step={1} onStepClick={goToStep} />
              <UploadStep onItemsParsed={handleItemsParsed} />
            </>
          }
        />
        <Route
          path="/edit"
          element={
            items.length === 0 ? (
              <Navigate to="/" replace />
            ) : (
              <>
                <Stepper step={2} onStepClick={goToStep} />
                <EditStep
                  items={items}
                  onItemsChange={setItems}
                  rates={rates}
                  onRatesChange={setRates}
                  onCalculate={() => navigate('/results')}
                />
              </>
            )
          }
        />
        <Route
          path="/results"
          element={
            items.length === 0 ? (
              <Navigate to="/" replace />
            ) : (
              <>
                <Stepper step={3} onStepClick={goToStep} />
                <ResultsStep items={items} rates={rates} onBack={() => navigate('/edit')} />
              </>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
