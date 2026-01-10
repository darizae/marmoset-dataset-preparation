import React, { useState } from 'react';
import ResultsTab from './components/results/ResultsTab';
import BundleTab from './components/bundle/BundleTab';
import HelpTab from './components/help/HelpTab';

type Tab = 'trialsBundle' | 'results' | 'help';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('trialsBundle');

    return (
        <div className="app-root">
            <div className="app-container">
                <header className="app-header">
                    <h1>Marmoset Trials Bundle Builder</h1>
                    <p>
                        Build a deployable multi-subject trials bundle (zip) and explore/verify trials + media. Use <span className="chip">Results</span> to analyze outcome files.
                    </p>
                </header>

                <div className="inline-input-row" style={{ marginBottom: '0.5rem' }}>
                    <button
                        className="button"
                        onClick={() => setActiveTab('trialsBundle')}
                        disabled={activeTab === 'trialsBundle'}
                    >
                        Trials Bundle
                    </button>
                    <button
                        className="button"
                        onClick={() => setActiveTab('results')}
                        disabled={activeTab === 'results'}
                    >
                        Results
                    </button>
                    <button
                        className="button"
                        onClick={() => setActiveTab('help')}
                        disabled={activeTab === 'help'}
                    >
                        Help
                    </button>
                </div>

                {activeTab === 'trialsBundle' && <BundleTab />}
                {activeTab === 'results' && <ResultsTab />}
                {activeTab === 'help' && <HelpTab />}
            </div>
        </div>
    );
};

export default App;
