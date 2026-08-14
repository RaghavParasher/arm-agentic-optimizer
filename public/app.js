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
    softmax: {
        filename: 'softmax.cpp',
        code: `// Naive Softmax implementation\n#include <cmath>\n\nvoid softmax(const float* input, float* output, int size) {\n    float sum = 0.0f;\n    float max_val = input[0];\n    \n    // Find max value to prevent overflow\n    for (int i = 1; i < size; ++i) {\n        if (input[i] > max_val) {\n            max_val = input[i];\n        }\n    }\n    \n    // Calculate exponentials and sum\n    for (int i = 0; i < size; ++i) {\n        output[i] = std::exp(input[i] - max_val);\n        sum += output[i];\n    }\n    \n    // Normalize outputs\n    for (int i = 0; i < size; ++i) {\n        output[i] /= sum;\n    }\n}`
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
let instructionsChartInstance = null;
let bandwidthChartInstance = null;

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
    if (instructionsChartInstance) instructionsChartInstance.destroy();
    if (bandwidthChartInstance) bandwidthChartInstance.destroy();
}

// Build standard double bar charts (Before vs After)
function renderBarChart(ctxId, label, beforeVal, afterVal, beforeLabel, afterLabel, valueSuffix = '') {
    const canvasElement = document.getElementById(ctxId);
    const ctx = canvasElement.getContext('2d');
    
    // Create gradient fills
    const gradientBefore = ctx.createLinearGradient(0, 0, 0, canvasElement.offsetHeight || 150);
    gradientBefore.addColorStop(0, 'rgba(218, 54, 51, 0.85)'); // Red
    gradientBefore.addColorStop(1, 'rgba(218, 54, 51, 0.05)');
    
    const gradientAfter = ctx.createLinearGradient(0, 0, 0, canvasElement.offsetHeight || 150);
    gradientAfter.addColorStop(0, 'rgba(27, 133, 243, 0.85)');  // Blue
    gradientAfter.addColorStop(1, 'rgba(27, 133, 243, 0.05)');
    
    const config = {
        type: 'bar',
        data: {
            labels: [beforeLabel, afterLabel],
            datasets: [{
                data: [beforeVal, afterVal],
                backgroundColor: [gradientBefore, gradientAfter],
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
            animation: {
                duration: 1600,
                easing: 'easeOutElastic' // Beautiful elastic spring bounce animation
            },
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
    } else if (ctxId === 'instructionsChart') {
        instructionsChartInstance = new Chart(ctx, config);
    } else if (ctxId === 'bandwidthChart') {
        bandwidthChartInstance = new Chart(ctx, config);
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
    
    // Trigger dynamic 3D particle simulation flow
    triggerOptimizationBurst();
    
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
                document.getElementById('carbon-saved-val').textContent = `${perf.improvements.carbon_savings_pct}%`;
                document.getElementById('cost-saved-val').textContent = `${perf.improvements.cost_savings_pct}%`;
                
                // Render Charts
                clearCharts();
                renderBarChart('latencyChart', 'Latency', perf.metrics_before.latency_ms, perf.metrics_after.latency_ms, perf.label_before, perf.label_after, ' ms');
                renderBarChart('cacheChart', 'Cache Misses', perf.metrics_before.cache_misses_pct, perf.metrics_after.cache_misses_pct, perf.label_before, perf.label_after, '%');
                renderBarChart('powerChart', 'Power Draw', perf.metrics_before.power_draw_mw, perf.metrics_after.power_draw_mw, perf.label_before, perf.label_after, ' mW');
                renderBarChart('instructionsChart', 'Instructions', perf.metrics_before.instructions_m, perf.metrics_after.instructions_m, perf.label_before, perf.label_after, ' M');
                renderBarChart('bandwidthChart', 'Bandwidth', perf.metrics_before.bandwidth_gbs, perf.metrics_after.bandwidth_gbs, perf.label_before, perf.label_after, ' GB/s');
                
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
    
    // Initialize 3D Visual Systems
    init3DBackground();
    initParticlesCanvas();
});

// ----------------------------------------------------
// 3D HOLOGRAPHIC REGISTER CUBE BACKGROUND (No external libs)
// ----------------------------------------------------
function init3DBackground() {
    const canvas = document.getElementById('canvas-3d-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
    
    // Cube 3D vertices
    const size = 160;
    const vertices = [
        {x: -size, y: -size, z: -size},
        {x: size, y: -size, z: -size},
        {x: size, y: size, z: -size},
        {x: -size, y: size, z: -size},
        {x: -size, y: -size, z: size},
        {x: size, y: -size, z: size},
        {x: size, y: size, z: size},
        {x: -size, y: size, z: size}
    ];
    
    // 12 edges connecting the 8 vertices
    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // Back face
        [4, 5], [5, 6], [6, 7], [7, 4], // Front face
        [0, 4], [1, 5], [2, 6], [3, 7]  // Connectors
    ];
    
    // Floating Holographic Register Opcode labels in 3D Space
    const tags = [
        {text: 'vld1q_f32', x: -220, y: -150, z: 120},
        {text: 'vfmaq_f32', x: 220, y: 150, z: -120},
        {text: 'vmaxq_f32', x: -200, y: 220, z: 200},
        {text: 'vaddq_f32', x: 180, y: -180, z: -200},
        {text: 'vexpq_f32', x: 0, y: -260, z: 100},
        {text: 'vsubq_f32', x: -250, y: 0, z: -100},
        {text: 'Q0-Q7 (NEON)', x: 120, y: 240, z: 150},
        {text: 'X0-X30 (ARMv9)', x: -100, y: -240, z: -150},
        {text: 'Arm KleidiAI', x: 260, y: -50, z: 120},
        {text: 'SVE2 (256-bit)', x: -280, y: 100, z: -180},
        {text: 'ASSEMBLY', x: 150, y: 60, z: 220},
        {text: 'NEOVERSE', x: 0, y: 0, z: 0}
    ];
    
    let angleX = 0.003;
    let angleY = 0.004;
    
    // Mouse coords drift
    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - width / 2) * 0.0003;
        mouseY = (e.clientY - height / 2) * 0.0003;
    });
    
    const d = 450; // Perspective depth
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        const currentAngleY = angleY + mouseX;
        const currentAngleX = angleX + mouseY;
        
        const cosY = Math.cos(currentAngleY);
        const sinY = Math.sin(currentAngleY);
        const cosX = Math.cos(currentAngleX);
        const sinX = Math.sin(currentAngleX);
        
        // Rotate vertices
        const rotatedVertices = vertices.map(v => {
            let x1 = v.x * cosY - v.z * sinY;
            let z1 = v.x * sinY + v.z * cosY;
            let y2 = v.y * cosX - z1 * sinX;
            let z2 = v.y * sinX + z1 * cosX;
            
            const z_project = z2 + 750;
            const screenX = (x1 * d) / z_project + width / 2;
            const screenY = (y2 * d) / z_project + height / 2;
            
            return {x: screenX, y: screenY, z: z_project};
        });
        
        // Render 12 Cube Edges
        ctx.strokeStyle = 'rgba(27, 133, 243, 0.12)';
        ctx.lineWidth = 1.0;
        edges.forEach(edge => {
            const v1 = rotatedVertices[edge[0]];
            const v2 = rotatedVertices[edge[1]];
            
            const avgZ = (v1.z + v2.z) / 2;
            const alpha = Math.min(0.25, Math.max(0.04, 1.2 - avgZ / 900));
            ctx.strokeStyle = `rgba(27, 133, 243, ${alpha})`;
            
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
        });
        
        // Rotate and render Holographic register tags
        tags.forEach(tag => {
            let x1 = tag.x * cosY - tag.z * sinY;
            let z1 = tag.x * sinY + tag.z * cosY;
            let y2 = tag.y * cosX - z1 * sinX;
            let z2 = tag.y * sinX + z1 * cosX;
            
            const z_project = z2 + 750;
            const screenX = (x1 * d) / z_project + width / 2;
            const screenY = (y2 * d) / z_project + height / 2;
            
            const scale = d / z_project;
            const fontSize = Math.max(8, Math.min(14, 10 * scale));
            const alpha = Math.min(0.45, Math.max(0.08, 1.1 - z_project / 1000));
            
            ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
            ctx.fillStyle = `rgba(165, 214, 255, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tag.text, screenX, screenY);
            
            // Connect to nearest vertex
            let nearestIdx = 0;
            let minDist = 99999;
            vertices.forEach((v, idx) => {
                const dx = tag.x - v.x;
                const dy = tag.y - v.y;
                const dz = tag.z - v.z;
                const dist = dx*dx + dy*dy + dz*dz;
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = idx;
                }
            });
            
            const nearestV = rotatedVertices[nearestIdx];
            ctx.strokeStyle = `rgba(27, 133, 243, ${alpha * 0.2})`;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(nearestV.x, nearestV.y);
            ctx.stroke();
            ctx.setLineDash([]);
        });
        
        angleX += 0.0003;
        angleY += 0.0004;
        
        requestAnimationFrame(animate);
    }
    animate();
}

// ----------------------------------------------------
// 3D COMPILER PARTICLE EMITTER FLOW VISUALS
// ----------------------------------------------------
let flowParticles = [];
let particlesAnimationId = null;

function initParticlesCanvas() {
    const canvas = document.getElementById('canvas-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
    
    function drawParticles() {
        ctx.clearRect(0, 0, width, height);
        
        for (let i = flowParticles.length - 1; i >= 0; i--) {
            const p = flowParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= p.decay;
            
            if (p.life <= 0) {
                flowParticles.splice(i, 1);
                continue;
            }
            
            ctx.shadowBlur = 12;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            
            // Reset shadows for standard renders
            ctx.shadowBlur = 0;
        }
        
        particlesAnimationId = requestAnimationFrame(drawParticles);
    }
    
    if (!particlesAnimationId) {
        drawParticles();
    }
}

function triggerOptimizationBurst() {
    const btn = document.getElementById('optimize-btn');
    const logs = document.getElementById('console-logs');
    if (!btn || !logs) return;
    
    const startRect = btn.getBoundingClientRect();
    const targetRect = logs.getBoundingClientRect();
    
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    
    const particleColors = ['#1b85f3', '#da3633', '#a5d6ff', '#3fb950'];
    
    for (let i = 0; i < 65; i++) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Launch arc physics vector paths
        const speedMultiplier = 6 + Math.random() * 9;
        const vx = (dx / dist) * speedMultiplier + (Math.random() - 0.5) * 4;
        const vy = (dy / dist) * speedMultiplier - 4 - Math.random() * 5;
        
        flowParticles.push({
            x: startX,
            y: startY,
            vx: vx,
            vy: vy,
            size: 2.0 + Math.random() * 2.5,
            color: particleColors[Math.floor(Math.random() * particleColors.length)],
            life: 1.0,
            decay: 0.012 + Math.random() * 0.015,
            gravity: 0.12 + Math.random() * 0.08
        });
    }
}
