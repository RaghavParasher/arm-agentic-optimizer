const express = require('express');
const cors = require('cors');
const path = require('path');

// Import JavaScript refactoring & analysis modules
const { analyze } = require('./app_analyzer');
const { generateRewrite } = require('./agent_brain');
const { simulatePerformance } = require('./perf_simulator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-process optimization endpoint (cross-platform, zero dependency)
app.post('/api/optimize', (req, res) => {
    const { code, filename } = req.body;
    
    if (!code || !filename) {
        return res.status(400).json({ error: 'Code and filename are required' });
    }
    
    try {
        // Run analysis in-process
        const candidates = analyze(code, filename);
        const { optimizedCode, logs } = generateRewrite(code, filename);
        const performance = simulatePerformance(code, filename);
        
        res.json({
            candidates: candidates,
            optimizedCode: optimizedCode,
            agentLogs: logs,
            performance: performance
        });
    } catch (err) {
        console.error('Optimization error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Arm-Agentic-Optimizer running at http://localhost:${PORT}`);
});
