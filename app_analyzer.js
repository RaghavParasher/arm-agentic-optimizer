function analyzeCpp(code) {
    const candidates = [];
    
    // 1. Triple nested loop for MatMul detection
    const matmulPattern = /for\s*\(\s*(?:int|size_t)\s+(\w+)\s*=\s*0\s*;\s*\1\s*<\s*(\w+)\s*;\s*(?:\+\+\1|\1\+\+)\s*\)\s*\{\s*(?:[^{]*?)\s*for\s*\(\s*(?:int|size_t)\s+(\w+)\s*=\s*0\s*;\s*\3\s*<\s*(\w+)\s*;\s*(?:\+\+\3|\3\+\+)\s*\)\s*\{\s*(?:[^{]*?)\s*for\s*\(\s*(?:int|size_t)\s+(\w+)\s*=\s*0\s*;\s*\5\s*<\s*(\w+)\s*;\s*(?:\+\+\5|\5\+\+)\s*\)\s*\{/g;
    
    let match;
    while ((match = matmulPattern.exec(code)) !== null) {
        const startChar = match.index;
        const lineNum = code.substring(0, startChar).split('\n').length;
        candidates.push({
            type: "Matrix Multiplication (GEMM)",
            line: lineNum,
            snippet: match[0],
            suggestion: "Arm KleidiAI Micro-kernels (`kai_matmul_clamp_f32_f32_f32`) or NEON vectorization (`vmlaq_f32` / `vfmaq_f32`)",
            description: "Found a triple nested loop, which is a classic O(N^3) matrix multiplication. It can be dramatically accelerated using Arm KleidiAI's optimized Gemm routines or NEON vector registers to perform multiple multiply-accumulate operations in a single cycle.",
            impact: "High (Up to 4x to 8x speedup on Arm CPUs)"
        });
    }
        
    // 2. Simple C++ Loop Vectorization Candidate (element-wise add/mul)
    const vectorLoopPattern = /for\s*\(\s*(?:int|size_t)\s+(\w+)\s*=\s*0\s*;\s*\1\s*<\s*(\w+)\s*;\s*(?:\+\+\1|\1\+\+)\s*\)\s*\{\s*([\w\[\]\+\-\*\/=\s\.\(\)]+?);?\s*\}/g;
    
    while ((match = vectorLoopPattern.exec(code)) !== null) {
        const snippet = match[0];
        const startChar = match.index;
        const lineNum = code.substring(0, startChar).split('\n').length;
        
        // Check if this loop is nested in a gemm match to avoid double flagging
        let alreadyFlagged = false;
        for (const c of candidates) {
            if (c.line <= lineNum && lineNum <= (c.line + 5)) {
                alreadyFlagged = true;
                break;
            }
        }
        if (alreadyFlagged) continue;
            
        const loopVar = match[1];
        const body = match[3];
        if (body.includes(`[${loopVar}]`)) {
            candidates.push({
                type: "Element-wise Loop Vectorization",
                line: lineNum,
                snippet: snippet,
                suggestion: "Arm NEON Vector Intrinsics (`vaddq_f32`, `vmulq_f32`)",
                description: "Found a sequential loop performing element-wise arithmetic on arrays. This can be vectorized using NEON SIMD registers, processing 4 float values or 8 half-float values per instruction.",
                impact: "Medium-High (Up to 4x speedup)"
            });
        }
    }
        
    // 3. Activation functions (ReLU or Sigmoid in loop)
    const reluPattern = /(?:std::)?max\s*\(\s*0(?:\.0f)?\s*,\s*([\w\[\]\(\)]+)\s*\)/g;
    while ((match = reluPattern.exec(code)) !== null) {
        const startChar = match.index;
        const lineNum = code.substring(0, startChar).split('\n').length;
        candidates.push({
            type: "Activation Function (ReLU)",
            line: lineNum,
            snippet: match[0],
            suggestion: "NEON Vectorized ReLU (`vmaxq_f32` with a zero vector)",
            description: "Found a ReLU activation function. In CPU neural networks, doing elements one-by-one is highly inefficient. Using NEON `vmaxq_f32` allows processing 4 elements in a single instruction.",
            impact: "Medium (Up to 3x speedup)"
        });
    }

    // 4. Softmax activation (exp function inside loops)
    const softmaxPattern = /(?:std::)?exp\s*\(\s*([\w\[\]\(\)\+\-\*\/]+)\s*\)/g;
    while ((match = softmaxPattern.exec(code)) !== null) {
        const startChar = match.index;
        const lineNum = code.substring(0, startChar).split('\n').length;
        candidates.push({
            type: "Activation Function (Softmax/Exp)",
            line: lineNum,
            snippet: match[0],
            suggestion: "NEON Vectorized Softmax with Taylor approximation (`vexpq_f32`)",
            description: "Found an exponential activation function. Exponential functions are extremely slow on CPUs because they involve floating-point expansions. Using NEON SIMD with polynomial Taylor series approximations enables compiling it into parallel additions and multiplications.",
            impact: "High (Up to 6x speedup)"
        });
    }
        
    return candidates;
}

function analyzePython(code) {
    const candidates = [];
    
    // Simple PyTorch modules or NumPy operations
    const pytorchPattern = /(?:self\.)?(\w+)\s*=\s*(?:nn\.)?(Linear|Conv2d|ReLU|LogSoftmax|BatchNorm2d)\s*\(/g;
    let match;
    while ((match = pytorchPattern.exec(code)) !== null) {
        const name = match[1];
        const layerType = match[2];
        const startChar = match.index;
        const lineNum = code.substring(0, startChar).split('\n').length;
        
        let suggestion = "";
        let desc = "";
        let impact = "Medium-High";
        
        if (layerType === "Linear" || layerType === "Conv2d") {
            suggestion = "ExecuTorch with KleidiAI / XNNPACK backend or PyTorch Mobile with Arm KleidiAI integration";
            desc = `PyTorch \`${layerType}\` layers can be compiled using ExecuTorch. When deployed on Arm, it leverages KleidiAI micro-kernels (e.g. for matrix multiply and convolution), bypassing Python runtime overhead and accelerating the float operations directly on Arm cores.`;
        } else if (layerType === "ReLU") {
            suggestion = "KleidiAI or XNNPACK optimized activation execution";
            desc = "ReLU operations are highly memory-bandwidth bound. Using ExecuTorch's XNNPACK delegates it to optimized SIMD execution paths.";
        } else {
            suggestion = "ExecuTorch deployment";
            desc = `Deploying \`${layerType}\` on Arm using ExecuTorch compiles the model graph into a flatbuffer, allowing lightweight, optimized inference.`;
        }
            
        candidates.push({
            type: `PyTorch ${layerType} Layer`,
            line: lineNum,
            snippet: match[0] + "...",
            suggestion: suggestion,
            description: desc,
            impact: impact
        });
    }
        
    // Standard Python loops (naive dot product)
    const pyLoopPattern = /for\s+(\w+)\s+in\s+range\(\s*len\(\s*(\w+)\s*\)\s*\)\s*:\s*\n\s+([\w\[\]\+\-\*\/=\s\.]+)/g;
    while ((match = pyLoopPattern.exec(code)) !== null) {
        const startChar = match.index;
        const lineNum = code.substring(0, startChar).split('\n').length;
        candidates.push({
            type: "Naive Python Element-wise Loop",
            line: lineNum,
            snippet: match[0],
            suggestion: "Vectorized NumPy (utilizing OpenBLAS/Arm Performance Libraries) or Numba compile with Arm SIMD flags",
            description: "Standard Python loops are slow due to dynamic typing and interpreter overhead. Replacing with NumPy vector operations leverages Arm Performance Libraries, which are hand-optimized for Arm hardware.",
            impact: "Very High (Up to 50x-100x speedup by shifting to native math kernels)"
        });
    }
        
    return candidates;
}

function analyze(code, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['cpp', 'c', 'h', 'hpp', 'cc'].includes(ext)) {
        return analyzeCpp(code);
    } else if (ext === 'py') {
        return analyzePython(code);
    } else {
        if (code.includes('def ') || code.includes('import ')) {
            return analyzePython(code);
        } else {
            return analyzeCpp(code);
        }
    }
}

module.exports = { analyze };
