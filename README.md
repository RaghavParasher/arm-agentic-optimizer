# Arm-Agentic-Optimizer (⚡)

Arm-Agentic-Optimizer is an agentic profiling and code refactoring suite designed to automate the acceleration of AI/ML mathematical kernels on Arm-powered platforms. 

By analyzing code patterns (such as loops and matrix operations), the optimizer identifies performance bottlenecks and automatically generates optimized code utilizing **Arm NEON SIMD intrinsics**, **Arm KleidiAI micro-kernels**, and vectorized library mappings. It also simulates CPU cycle counts, cache-line misses, and active thermal power draw to provide evidence-based benchmarks in a high-fidelity visual dashboard.

This project was built for **Track 2: Cloud AI** in the **Arm Create: AI Optimization Challenge 2026**.

🚀 **Live Web App:** [https://arm-agentic-optimizer.vercel.app/](https://arm-agentic-optimizer.vercel.app/)  
🔗 **GitHub Repository:** [https://github.com/RaghavParasher/arm-agentic-optimizer](https://github.com/RaghavParasher/arm-agentic-optimizer)

---

## 🚀 Key Features

1. **AST-Based Code Profiler:** Parses source implementations (C++ or Python) to locate nested loop architectures, naive array structures, and activation operations that are candidates for vector hardware acceleration.
2. **AI Refactoring Agent:** Suggests and applies drop-in assembly/C++ optimizations:
   * **Arm NEON SIMD:** Employs registers to parallelize floating-point vector additions, multiplications, and activations.
   * **Arm KleidiAI:** Incorporates microkernels like `kai_matmul_clamp_f32_f32_f32_neon` to maximize L1/L2 cache efficiency and run low-level assembly gemm kernels.
   * **Vectorized Library Mappings:** Converts naive Python iterations into compiled NumPy backend operations executing against OpenBLAS / Arm Performance Libraries.
3. **Interactive Benchmarking Simulator:** Models compiler flag logic (`-O3 -march=armv8-a+simd`) to project execution latency, cycle count reductions, cache-miss drops, memory bandwidth improvements (GB/s), instructions executed, active power footprint (mW), estimated carbon offset (g CO2), and hosting cost reductions ($).
4. **Visual Optimization Dashboard:** A dark-themed, premium front-end displaying side-by-side code diffs, real-time agent execution logs, dynamic compiler preset outputs, and detailed comparison charts.

---

## 🛠️ Technological Implementation

### 1. Vectorized Matrix Multiplication (NEON Blocked)
Naive matrix multiplication ($O(N^3)$) incurs high cache misses and scalar execution overhead. The refactoring engine outputs a 4x4 register-blocked NEON matrix multiply routine that:
* Broadcasts Left-Hand-Side (LHS) matrix elements into vector registers using `vdupq_n_f32`.
* Loads contiguous Right-Hand-Side (RHS) elements into vector registers with `vld1q_f32`.
* Multiplies and accumulates results using Fused Multiply-Accumulate `vfmaq_f32` in a single clock cycle.

### 2. Arm KleidiAI Integration
The optimizer links dense linear layers to specialized microkernels designed specifically for LLM inference on Neoverse CPUs. It delegates the core operations to the assembly microkernels (e.g. `kai_matmul_clamp_f32_f32_f32_neon`), avoiding pipeline stalls.

### 3. Element-wise SIMD Loop Unrolling
Standard operations ($C[i] = A[i] + B[i]$) are parallelized by loading four 32-bit floats into 128-bit SIMD registers, performing `vaddq_f32`, and writing them back via `vst1q_f32` in a single step.

### 4. Vectorized Softmax (Taylor Approximation)
Exponential functions are compute-bound due to scalar Taylor expansions. The engine refactors loops to:
* Find the maximum vector element using parallel reduction with `vmaxq_f32`.
* Subtract it from the inputs via `vsubq_f32` to avoid exponent overflow.
* Approximate exponential coefficients in parallel using a polynomial Taylor series mapped to `vfmaq_f32` (Fused Multiply-Accumulate) instructions.

---

## 📦 Project Structure

```
arm-agentic-optimizer/
├── public/
│   ├── index.html        # Main Dashboard Layout
│   ├── styles.css        # Premium Design Styling
│   └── app.js            # Interactivity & Chart Rendering
├── app_analyzer.py       # Code pattern/bottleneck identifier (Python)
├── agent_brain.py        # NEON/KleidiAI refactoring engine (Python)
├── perf_simulator.py     # CPU performance characteristics simulator (Python)
├── server.js             # Express API server (Node.js)
├── package.json          # Node dependencies configuration
├── LICENSE               # MIT Open Source License
└── README.md             # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites
* **Node.js** (v16.0 or higher)
* **Python 3** (with standard libraries)

### Step-by-Step Guide

1. **Clone and Navigate to Repository:**
   ```bash
   git clone <your-repository-url>
   cd arm-agentic-optimizer
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Application Server:**
   ```bash
   npm start
   ```

4. **Access the Dashboard:**
   Open your browser and navigate to: `http://localhost:3000`

---

## 📊 Verification and Validation

To validate the optimizations:
1. Open the dashboard.
2. Select **Matrix Multiplication (C++)** or **Naive Loops (Python)** from the template dropdown and click **Load Template**.
3. Press **Run Optimization Agent**.
4. Monitor the live execution stream in the **Agent Logs** tab.
5. Review the refactored implementation in the **Optimized Code** tab.
6. Check the **Performance Profile** tab to view the latency, cycles, cache, and power metrics.

---

## 📜 Devpost Hackathon Story

### 💡 Inspiration
Deploying modern generative AI models and heavy mathematical loops onto Arm CPUs is highly energy-efficient but technically challenging. Developers often struggle to manually write vector assembly, configure caching boundaries, or identify where bottlenecks reside. We wanted to build a visual, intelligent developer environment that acts as an "optimization copilot"—analyzing code, refactoring it for Arm SIMD hardware, and immediately demonstrating the speedup and carbon savings.

### 🧠 What it Does
1. **AST-Based Scanner:** Scans C++ and Python source files to detect unoptimized mathematical loops, matrix operations, and activation functions.
2. **Agentic Refactoring:** Automatically rewrites naive loops into vectorized equivalents using **Arm NEON SIMD** vector intrinsics and links to **Arm KleidiAI assembly microkernels**.
3. **Interactive Compiler Preset Card:** Generates exact compiler flags (`-O3 -march=armv9-a -lkai`) tailored to targets like AWS Graviton, Google Axion, Snapdragon X Elite, and Raspberry Pi 5.
4. **Sustainability Benchmarks:** Projects LATENCY, CACHE MISSES, POWER, INSTRUCTION count, and calculated **CARBON OFFSET** and **CLOUD HOSTING COST** savings.

### 🛠️ How We Built It
* **Core backend:** Node.js Express server executing token pattern mapping rules.
* **Visual analytics:** Chart.js rendering comparative latency, cache, bandwidth, instructions, and power diagrams.
* **Immersive frontend:** Modern dark theme styling with a custom scroll-synchronized line-number gutter, interactive particle emitter flow, and a 3D holographic wireframe register cube background rendered in pure HTML5 Canvas.

### 🚧 Challenges We Ran Into
* Developing a pure JS 3D perspective projection model without using heavy packages (to ensure Vercel's serverless cold starts remain instant).
* Mapping approximate polynomial Taylor expansions for vectorized exponentials (`vexpq_f32`) inside Softmax loops.

### 🎉 Accomplishments We're Proud Of
* A zero-dependency, ultra-lightweight client-side 3D render loop running at 60 FPS.
* High-fidelity, direct mapping to the newly released **Arm KleidiAI** spec.

### 📚 What We Learned
* Armv9 instruction pipeline capabilities, register configurations, and compilation targets.
* The business value of Cloud AI code optimizations—where a minor cycle reduction cuts hosting costs by 60% and lowers global datacenter carbon footprints.

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
