import { FloorPlan } from './components/FloorPlan';
import './App.css';

function App() {
  return (
    <div className="app">
      <header>
        <h1>Floor Plan Viewer</h1>
      </header>
      <main>
        <FloorPlan />
      </main>
    </div>
  );
}

export default App;
