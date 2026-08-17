import { useState } from 'react';
import Stepper from './components/Stepper';
import UploadStep from './components/UploadStep';
import EditStep from './components/EditStep';
import ResultsStep from './components/ResultsStep';
import { DEFAULT_RATES } from './lib/calculations';
import { useLocalStorageState } from './lib/useLocalStorageState';

function App() {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState([]);
  const [rates, setRates] = useLocalStorageState('takeoff-engine.rates', DEFAULT_RATES);

  const handleItemsParsed = (parsedItems) => {
    setItems(parsedItems);
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="no-print bg-white border-b border-slate-200 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2">
          <span className="text-xl font-bold text-indigo-600">Takeoff Engine</span>
          <span className="text-sm text-slate-400">Construction Estimating</span>
        </div>
      </header>

      <Stepper step={step} onStepClick={(s) => (s <= step ? setStep(s) : null)} />

      {step === 1 && <UploadStep onItemsParsed={handleItemsParsed} />}

      {step === 2 && (
        <EditStep
          items={items}
          onItemsChange={setItems}
          rates={rates}
          onRatesChange={setRates}
          onCalculate={() => setStep(3)}
        />
      )}

      {step === 3 && <ResultsStep items={items} rates={rates} onBack={() => setStep(2)} />}
    </div>
  )
}

export default App
