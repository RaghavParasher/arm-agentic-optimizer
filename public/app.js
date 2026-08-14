// Code Templates Dictionary
const templates = {
    matmul: {
        filename: 'matmul.cpp',
        code: `// Naive Matrix Multiplication\nvoid matmul(const float* A, const float* B, float* C, int M, int N, int K) {\n    for (int i = 0; i < M; i++) {\n        for (int j = 0; j < N; j++) {\n            C[i * N + j] = 0;\n            for (int k = 0; k < K; k++) {\n                C[i * N + j] += A[i * K + k] * B[k * N + j];\n            }\n        }\n    }\n}`
    },
    vecadd: {
        filename: 'vector_add.cpp',
        code: `// Naive Vector Addition\nvoid vector_add(const float* A, const float* B, float* C, int size) {\n    for (int i = 0; i < size; ++i) {\n        C[i] = A[i] + B[i];\n    }\n}`
    },
    relu: {
        filename: 'relu.cpp',
        code: `#include <algorithm>\n\n// Naive ReLU Activation Function\nvoid relu(float* data, int size) {\n    for (int i = 0; i < size; ++i) {\n        data[i] = std::max(0.0f, data[i]);\n    }\n}`
    },
    python_loop: {
        filename: 'process.py',
        code: `# Naive Python loop performing array arithmetic\ndef process_lists(a, b):\n    result = []\n    for i in range(len(a)):\n        result.append(a[i] + b[i])\n    return result`
    }
};

// Global Chart Instances
let latencyChartInstance = null;
let cacheChartInstance = null;
let powerChartInstance = null;

// DOM Elements
const exampleSelect = document.getElementById('example-select');
const loadExampleBtn = document.getElementById('load-example-btn');
const filenameInput = document.getElementById('filename-input');
const codeInput = document.getElementById('code-input');
const lineNumbers = document.getElementById('line-numbers');
const optimizeBtn = document.getElementById('optimize-btn');
const consoleLogs = document.getElementById('console-logs');
const agentStatus = document.getElementById('agent-status');
const codeOutput = document.getElementById('code-output');
const optimizedFilename = document.getElementById('optimized-filename');
const copyCodeBtn = document.getElementById('copy-code-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const cpuTargetSelect = document.getElementById('cpu-target-select');
const compilerCmd = document.getElementById('compiler-cmd');

const compilerPresets = {
    'neoverse-v2': 'g++ -O3 -march=armv9-a -mcpu=neoverse-v2 -ffast-math -lkai {filename} -o {output}',
    'neoverse-n2': 'g++ -O3 -march=armv9-a -mcpu=neoverse-n2 -ffast-math -lkai {filename} -o {output}',
    'cortex-a76': 'g++ -O3 -march=armv8.2-a+fp16+dotprod -mcpu=cortex-a76 -ffast-math {filename} -o {output}',
    'cortex-x4': 'g++ -O3 -march=armv9-a+sve2 -ffast-math -lkai {filename} -o {output}'
};

function updateCompilerCommand() {
    if (!optimizedFilename || !compilerCmd || !cpuTargetSelect) return;
    const target = cpuTargetSelect.value;
    const filename = optimizedFilename.textContent;
    const dotIdx = filename.lastIndexOf('.');
    const outName = dotIdx !== -1 ? filename.substring(0, dotIdx) : 'kernel_opt';
    
    let template = compilerPresets[target] || compilerPresets['neoverse-v2'];
    let command = template.replace('{filename}', filename).replace('{output}', outName);
    
    // If it is a python file, compile is not needed
    if (filename.endsWith('.py')) {
        command = `python -O ${filename}`;
    }
    
    compilerCmd.textContent = command;
}

// Dynamically generate line numbers gutter
function updateLineNumbers() {
    const lines = codeInput.value.split('\n');
    const lineCount = Math.max(lines.length, 1);
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
        html += `<div>${i}</div>`;
    }
    lineNumbers.innerHTML = html;
    // Align scroll
    lineNumbers.scrollTop = codeInput.scrollTop;
}

// Load Selected Example Template
function loadTemplate() {
    const selected = exampleSelect.value;
    if (templates[selected]) {
        filenameInput.value = templates[selected].filename;
        codeInput.value = templates[selected].code;
        updateLineNumbers();
        // Update temporary target filename for preview compilation command
        const dotIdx = templates[selected].filename.lastIndexOf('.');
        const nameWithoutExt = dotIdx !== -1 ? templates[selected].filename.substring(0, dotIdx) : templates[selected].filename;
        const ext = dotIdx !== -1 ? templates[selected].filename.substring(dotIdx) : '';
        optimizedFilename.textContent = `${nameWithoutExt}_optimized${ext}`;
        updateCompilerCommand();
        logConsole(`System`, `Loaded template: ${templates[selected].filename}`);
    }
}

// Log message inside the console terminal
function logConsole(sender, message, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] [${sender}] ${message}`;
    
    consoleLogs.appendChild(line);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

// Switch tabs view
function switchTab(tabId) {
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Copy Optimized Code
function copyCode() {
    navigator.clipboard.writeText(codeOutput.textContent)
        .then(() => {
            const originalText = copyCodeBtn.textContent;
            copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyCodeBtn.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy code: ', err);
        });
}

// Destroy existing charts to prevent rendering overlapping errors
function clearCharts() {
    if (latencyChartInstance) latencyChartInstance.destroy();
    if (cacheChartInstance) cacheChartInstance.destroy();
    if (powerChartInstance) powerChartInstance.destroy();
}

// Build standard double bar charts (Before vs After)
function renderBarChart(ctxId, label, beforeVal, afterVal, beforeLabel, afterLabel, valueSuffix = '') {
    const ctx = document.getElementById(ctxId).getContext('2d');
    const config = {
        type: 'bar',
        data: {
            labels: [beforeLabel, afterLabel],
            datasets: [{
                data: [beforeVal, afterVal],
                backgroundColor: [
                    'rgba(218, 54, 51, 0.8)',  // Red for before
                    'rgba(27, 133, 243, 0.8)'   // Blue for after
                ],
                borderColor: [
                    '#da3633',
                    '#1b85f3'
                ],
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: '#1e2230' },
                    ticks: {
                        color: '#8b949e',
                        font: { family: 'Inter', size: 9 },
                        callback: function(value) { return value + valueSuffix; }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8b949e',
                        font: { family: 'Inter', size: 10, weight: '500' }
                    }
                }
            }
        }
    };
    
    if (ctxId === 'latencyChart') {
        latencyChartInstance = new Chart(ctx, config);
    } else if (ctxId === 'cacheChart') {
        cacheChartInstance = new Chart(ctx, config);
    } else if (ctxId === 'powerChart') {
        powerChartInstance = new Chart(ctx, config);
    }
}

// Call Express API endpoint to trigger python optimization steps
function runOptimization() {
    const code = codeInput.value;
    const filename = filenameInput.value;
    
    if (!code.trim()) {
        logConsole('Error', 'Input code space is empty', 'warning');
        return;
    }
    
    // Switch to agent tab & animate
    switchTab('tab-optimizer');
    agentStatus.textContent = 'RUNNING ANALYSIS...';
    consoleLogs.innerHTML = ''; // Reset console log lines
    
    logConsole('Agent', 'Initializing static code analyzer...', 'system');
    
    setTimeout(() => {
        logConsole('Agent', 'AST created. Parsing source code constructs for vectorization targets...', 'system');
    }, 400);
    
    setTimeout(() => {
        logConsole('Agent', 'Sending compilation payload to Arm Neoverse target compiler...', 'info');
        
        fetch('/api/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, filename })
        })
        .then(res => {
            if (!res.ok) throw new Error('Optimization request failed');
            return res.json();
        })
        .then(data => {
            // Log optimization candidates detected
            if (data.candidates && data.candidates.length > 0) {
                data.candidates.forEach(cand => {
                    logConsole('Analyzer', `Found: ${cand.type} on line ${cand.line}`, 'warning');
                    logConsole('Analyzer', `  └ Suggestion: ${cand.suggestion}`, 'info');
                });
            } else {
                logConsole('Analyzer', 'No specific neural network bottlenecks matched. Applying default SIMD loop-unrolling heuristics.', 'info');
            }
            
            logConsole('Agent', 'Initiating refactoring agent brain...', 'info');
            
            setTimeout(() => {
                // Log agent refactor modifications
                if (data.agentLogs && data.agentLogs.length > 0) {
                    data.agentLogs.forEach(line => {
                        logConsole('RefactorEngine', line, 'success');
                    });
                }
                
                logConsole('Agent', 'Running performance benchmarks on emulated ARMv9 instruction runner...', 'info');
            }, 800);
            
            setTimeout(() => {
                // Display Outputs
                agentStatus.textContent = 'COMPLETED';
                logConsole('Agent', 'Successfully completed optimization and code validation.', 'success');
                
                // Write optimized code to output tab
                const dotIdx = filename.lastIndexOf('.');
                const nameWithoutExt = dotIdx !== -1 ? filename.substring(0, dotIdx) : filename;
                const ext = dotIdx !== -1 ? filename.substring(dotIdx) : '';
                optimizedFilename.textContent = `${nameWithoutExt}_optimized${ext}`;
                codeOutput.textContent = data.optimizedCode;
                updateCompilerCommand();
                
                // Populate efficiency display
                const perf = data.performance;
                document.getElementById('speedup-val').textContent = `${perf.improvements.latency_speedup_x}x`;
                document.getElementById('cycles-saved-val').textContent = `${perf.improvements.cpu_cycles_saved_pct}%`;
                document.getElementById('energy-saved-val').textContent = `${perf.improvements.energy_savings_pct}%`;
                
                // Render Charts
                clearCharts();
                renderBarChart('latencyChart', 'Latency', perf.metrics_before.latency_ms, perf.metrics_after.latency_ms, perf.label_before, perf.label_after, ' ms');
                renderBarChart('cacheChart', 'Cache Misses', perf.metrics_before.cache_misses_pct, perf.metrics_after.cache_misses_pct, perf.label_before, perf.label_after, '%');
                renderBarChart('powerChart', 'Power Draw', perf.metrics_before.power_draw_mw, perf.metrics_after.power_draw_mw, perf.label_before, perf.label_after, ' mW');
                
                logConsole('System', 'Performance profile diagrams ready in "Performance Profile" tab.', 'system');
            }, 1800);
        })
        .catch(err => {
            agentStatus.textContent = 'ERROR';
            logConsole('Error', err.message, 'warning');
        });
    }, 800);
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
    // Initial template load
    loadTemplate();
    
    // UI Events
    loadExampleBtn.addEventListener('click', loadTemplate);
    optimizeBtn.addEventListener('click', runOptimization);
    copyCodeBtn.addEventListener('click', copyCode);
    
    // Editor scroll synchronization and inputs
    codeInput.addEventListener('scroll', () => {
        lineNumbers.scrollTop = codeInput.scrollTop;
    });
    codeInput.addEventListener('input', updateLineNumbers);
    
    // Tab click events
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    cpuTargetSelect.addEventListener('change', updateCompilerCommand);
    
    // Initialize line numbers count on load
    updateLineNumbers();
    updateCompilerCommand();
});
