function simulatePerformance(code, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    // Baseline defaults (unoptimized)
    let metrics_before = {
        latency_ms: 120.0,
        cpu_cycles_m: 240.0,
        cache_misses_pct: 18.5,
        power_draw_mw: 4800,
        ram_footprint_kb: 1200
    };
    
    let metrics_after = {
        latency_ms: 15.0,
        cpu_cycles_m: 30.0,
        cache_misses_pct: 2.1,
        power_draw_mw: 2600,
        ram_footprint_kb: 1220
    };
    
    let label_optimized = "Arm NEON (Vectorized)";
    
    // Customize based on detection
    if (['cpp', 'c', 'h', 'hpp', 'cc'].includes(ext)) {
        if (/for\s*\(\s*(?:int|size_t)\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\s*;\s*(?:\+\+\w+|\w+\+\+)\s*\)\s*\{\s*for\s*\(/.test(code)) {
            // Matrix multiplication
            metrics_before = {
                latency_ms: 320.0,
                cpu_cycles_m: 640.0,
                cache_misses_pct: 28.4,
                power_draw_mw: 5200,
                ram_footprint_kb: 8192
            };
            // KleidiAI provides the best result
            metrics_after = {
                latency_ms: 28.5,
                cpu_cycles_m: 57.0,
                cache_misses_pct: 1.8,
                power_draw_mw: 2800,
                ram_footprint_kb: 8320
            };
            label_optimized = "Arm KleidiAI Assembly";
            
        } else if (/for\s*\(\s*(?:int|size_t)\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\s*;\s*(?:\+\+\w+|\w+\+\+)\s*\)\s*\{\s*[\w\[\]\+\-\*\/=\s\.]+/.test(code)) {
            // Vector loops
            metrics_before = {
                latency_ms: 45.0,
                cpu_cycles_m: 90.0,
                cache_misses_pct: 8.5,
                power_draw_mw: 3900,
                ram_footprint_kb: 4096
            };
            metrics_after = {
                latency_ms: 11.2,
                cpu_cycles_m: 22.4,
                cache_misses_pct: 1.2,
                power_draw_mw: 1900,
                ram_footprint_kb: 4112
            };
            label_optimized = "Arm NEON SIMD";
            
        } else if (code.includes('max') || code.includes('std::max')) {
            // ReLU loop
            metrics_before = {
                latency_ms: 35.0,
                cpu_cycles_m: 70.0,
                cache_misses_pct: 12.1,
                power_draw_mw: 3500,
                ram_footprint_kb: 2048
            };
            metrics_after = {
                latency_ms: 9.5,
                cpu_cycles_m: 19.0,
                cache_misses_pct: 1.5,
                power_draw_mw: 1700,
                ram_footprint_kb: 2056
            };
            label_optimized = "NEON Vectorized ReLU";
        }
            
    } else if (ext === 'py') {
        if (code.includes('for ') && code.includes('range')) {
            // Python loop
            metrics_before = {
                latency_ms: 820.0,
                cpu_cycles_m: 1640.0,
                cache_misses_pct: 4.5,
                power_draw_mw: 2900,
                ram_footprint_kb: 16384
            };
            metrics_after = {
                latency_ms: 12.5,
                cpu_cycles_m: 25.0,
                cache_misses_pct: 0.8,
                power_draw_mw: 2100,
                ram_footprint_kb: 16550
            };
            label_optimized = "Vectorized NumPy";
        }
    }
    
    // Calculate percentage improvements
    const improvements = {
        latency_speedup_x: Math.round((metrics_before.latency_ms / metrics_after.latency_ms) * 10) / 10,
        cpu_cycles_saved_pct: Math.round(((metrics_before.cpu_cycles_m - metrics_after.cpu_cycles_m) / metrics_before.cpu_cycles_m) * 100 * 10) / 10,
        cache_miss_reduction_pct: Math.round(((metrics_before.cache_misses_pct - metrics_after.cache_misses_pct) / metrics_before.cache_misses_pct) * 100 * 10) / 10,
        energy_savings_pct: Math.round(((metrics_before.power_draw_mw - metrics_after.power_draw_mw) / metrics_before.power_draw_mw) * 100 * 10) / 10
    };
    
    return {
        metrics_before,
        metrics_after,
        label_before: "Standard (Unoptimized)",
        label_after: label_optimized,
        improvements
    };
}

module.exports = { simulatePerformance };
