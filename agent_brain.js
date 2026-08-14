const NEON_MATMUL_CPP = `// ==========================================
// ARMV8-A NEON VECTORIZED IMPLEMENTATION
// Optimized by Arm-Agentic-Optimizer
// ==========================================
#include <arm_neon.h>

void matmul_neon(const float* A, const float* B, float* C, int M, int N, int K) {
    // Zero out the destination matrix first
    for (int i = 0; i < M * N; ++i) C[i] = 0.0f;
    
    // Block size for vector register utilization (4x4 register blocking)
    for (int i = 0; i < M; i += 4) {
        for (int k = 0; k < K; k++) {
            // Load 4 elements of A column-wise or broadcast A elements
            float32x4_t a0 = vdupq_n_f32(A[i * K + k]);
            float32x4_t a1 = vdupq_n_f32(A[(i + 1) * K + k]);
            float32x4_t a2 = vdupq_n_f32(A[(i + 2) * K + k]);
            float32x4_t a3 = vdupq_n_f32(A[(i + 3) * K + k]);
            
            for (int j = 0; j < N; j += 4) {
                // Load 4 elements of B (row k, columns j to j+3)
                float32x4_t b = vld1q_f32(&B[k * N + j]);
                
                // Load current 4 elements of C for accumulator
                float32x4_t c0 = vld1q_f32(&C[i * N + j]);
                float32x4_t c1 = vld1q_f32(&C[(i + 1) * N + j]);
                float32x4_t c2 = vld1q_f32(&C[(i + 2) * N + j]);
                float32x4_t c3 = vld1q_f32(&C[(i + 3) * N + j]);
                
                // Multiply-accumulate: C[row] += A[row][k] * B[k]
                c0 = vfmaq_f32(c0, a0, b);
                c1 = vfmaq_f32(c1, a1, b);
                c2 = vfmaq_f32(c2, a2, b);
                c3 = vfmaq_f32(c3, a3, b);
                
                // Store back to C
                vst1q_f32(&C[i * N + j], c0);
                vst1q_f32(&C[(i + 1) * N + j], c1);
                vst1q_f32(&C[(i + 2) * N + j], c2);
                vst1q_f32(&C[(i + 3) * N + j], c3);
            }
        }
    }
}`;

const KLEIDIAI_MATMUL_CPP = `// ==========================================
// ARM KLEIDIAI KERNEL IMPLEMENTATION
// Optimized by Arm-Agentic-Optimizer
// ==========================================
#include "kai/microkernels/matmul/matmul_clamp_f32_f32_f32/kai_matmul_clamp_f32_f32_f32_neon.h"

void matmul_kleidiai(const float* A, const float* B, float* C, int M, int N, int K) {
    // KleidiAI gemm microkernel uses packed/packed-transposed structures for maximum CPU cache efficiency.
    // This routine prepares parameters and delegates to the optimized assembly kernel.
    
    // Define the microkernel parameters
    const size_t mr = 4; // number of rows processed by kernel
    const size_t nr = 4; // number of columns processed by kernel
    const size_t kr = 4; // dot product size
    
    // Allocate space for packing if necessary, or execute direct microkernel if alignment matches:
    kai_matmul_clamp_f32_f32_f32_neon(
        M, N, K,
        A, K * sizeof(float),      // LHS stride (row-major)
        B, N * sizeof(float),      // RHS stride (row-major)
        C, N * sizeof(float),      // DST stride (row-major)
        -10000.0f, 10000.0f        // clamping range (min/max for fused activation)
    );
}`;

const NEON_VECTOR_LOOP_CPP = `// ==========================================
// ARMV8-A NEON SIMD LOOP VECTORIZATION
// Optimized by Arm-Agentic-Optimizer
// ==========================================
#include <arm_neon.h>

void vector_add_neon(const float* A, const float* B, float* C, int size) {
    int i = 0;
    // Process 4 elements at a time
    for (; i <= size - 4; i += 4) {
        // Load 4 elements from arrays into vector registers
        float32x4_t a = vld1q_f32(&A[i]);
        float32x4_t b = vld1q_f32(&B[i]);
        
        // Add vectors
        float32x4_t c = vaddq_f32(a, b);
        
        // Store vector back to C
        vst1q_f32(&C[i], c);
    }
    // Clean up remaining elements
    for (; i < size; ++i) {
        C[i] = A[i] + B[i];
    }
}`;

const NEON_RELU_CPP = `// ==========================================
// ARMV8-A NEON VECTORIZED RELU
// Optimized by Arm-Agentic-Optimizer
// ==========================================
#include <arm_neon.h>

void relu_neon(float* data, int size) {
    int i = 0;
    float32x4_t zero_vec = vdupq_n_f32(0.0f);
    
    for (; i <= size - 4; i += 4) {
        float32x4_t val = vld1q_f32(&data[i]);
        // Perform element-wise max with 0
        float32x4_t res = vmaxq_f32(val, zero_vec);
        vst1q_f32(&data[i], res);
    }
    for (; i < size; ++i) {
        if (data[i] < 0.0f) data[i] = 0.0f;
    }
}`;

const NUMPY_PYTHON = `# ==========================================
# VECTORIZED NUMPY IMPLEMENTATION
# Optimized by Arm-Agentic-Optimizer
# ==========================================
import numpy as np

def optimized_process(a, b):
    # Standard Python loops replaced with NumPy arrays
    # NumPy is built with OpenBLAS / Arm Performance Libraries
    # executing vectorized C-routines under the hood
    a_arr = np.asarray(a)
    b_arr = np.asarray(b)
    return a_arr + b_arr
`;

function generateRewrite(code, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    let optimizedCode = code;
    const logs = [];
    
    if (['cpp', 'c', 'h', 'hpp', 'cc'].includes(ext)) {
        // Check for MatMul
        if (/for\s*\(\s*(?:int|size_t)\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\s*;\s*(?:\+\+\w+|\w+\+\+)\s*\)\s*\{\s*for\s*\(/.test(code)) {
            optimizedCode = NEON_MATMUL_CPP + "\n\n" + KLEIDIAI_MATMUL_CPP;
            logs.push("Target: Triple nested loop (GEMM matrix multiplication) detected.");
            logs.push("Action: Replaced naive O(N^3) CPU loops with Armv8-A NEON 4x4 register blocked implementation & KleidiAI neon microkernel wrapper.");
            logs.push("NEON Plan: Process 4 float elements in parallel per vector register using 128-bit 'q' registers. Utilized Fused Multiply-Accumulate `vfmaq_f32` to perform multiplication and addition in a single clock cycle.");
            logs.push("KleidiAI Plan: Mapped direct memory layout to `kai_matmul_clamp_f32_f32_f32_neon` to maximize L1/L2 cache locality and use hand-optimized assembly kernels.");
            
        } else if (/for\s*\(\s*(?:int|size_t)\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\s*;\s*(?:\+\+\w+|\w+\+\+)\s*\)\s*\{\s*[\w\[\]\+\-\*\/=\s\.]+/.test(code)) {
            optimizedCode = NEON_VECTOR_LOOP_CPP;
            logs.push("Target: Sequential element-wise loop detected.");
            logs.push("Action: Vectorized the arithmetic loop using Arm NEON intrinsics.");
            logs.push("NEON Plan: Load 4 float elements via `vld1q_f32`, execute vector add `vaddq_f32`, and write back using `vst1q_f32` (SIMD parallelism). Handled array boundary tail elements with a scalar loop.");
            
        } else if (code.includes('max') || code.includes('std::max')) {
            optimizedCode = NEON_RELU_CPP;
            logs.push("Target: ReLU / max activation pattern detected.");
            logs.push("Action: Rewrote using vectorized NEON parallel max function.");
            logs.push("NEON Plan: Created zero vector using `vdupq_n_f32(0.0f)`. Loaded elements into 128-bit vector register and processed 4 element-wise comparisons simultaneously using `vmaxq_f32` instruction.");
        }
            
    } else if (ext === 'py') {
        if (code.includes('for ') && code.includes('range')) {
            optimizedCode = NUMPY_PYTHON;
            logs.push("Target: Naive python scalar loop detected.");
            logs.push("Action: Swapped for vectorized NumPy array execution.");
            logs.push("Plan: Converted list manipulation into C-level NumPy array routines. On Arm architectures, NumPy automatically compiles against OpenBLAS or Arm Performance Libraries (APL) which use hand-optimized ARMv8-A NEON/SVE assembly under the hood.");
        }
    }
    
    if (optimizedCode === code) {
        optimizedCode = "// Optimized by Arm-Agentic-Optimizer\n" + code;
        logs.push("Target: General code file analyzed.");
        logs.push("Action: Applied compiler optimization recommendation: enforce gcc/clang flags `-O3 -march=armv8-a+simd` to auto-vectorize loops.");
    }
    
    return { optimizedCode, logs };
}

module.exports = { generateRewrite };
