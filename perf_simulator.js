function simulatePerformance(code, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    // Baseline defaults (unoptimized)
    let metrics_before = {
        latency_ms: 120.0,
        cpu_cycles_m: 240.0,
        cache_misses_pct: 18.5,
        power_draw_mw: 4800,
        ram_footprint_kb: 1200,
        instructions_m: 200.0,
        bandwidth_gbs: 4.2,
        carbon_g: 15.2,
        cost_usd: 1.50
    };
    
    let metrics_after = {
        latency_ms: 15.0,
        cpu_cycles_m: 30.0,
        cache_misses_pct: 2.1,
        power_draw_mw: 2600,
        ram_footprint_kb: 1220,
        instructions_m: 50.0,
        bandwidth_gbs: 12.8,
        carbon_g: 6.4,
        cost_usd: 0.65
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
                ram_footprint_kb: 8192,
                instructions_m: 550.0,
                bandwidth_gbs: 3.1,
                carbon_g: 36.4,
                cost_usd: 3.80
            };
            // KleidiAI provides the best result
            metrics_after = {
                latency_ms: 28.5,
                cpu_cycles_m: 57.0,
                cache_misses_pct: 1.8,
                power_draw_mw: 2800,
                ram_footprint_kb: 8320,
                instructions_m: 90.0,
                bandwidth_gbs: 25.4,
                carbon_g: 9.8,
                cost_usd: 1.25
            };
            label_optimized = "Arm KleidiAI Assembly";
            
        } else if (/for\s*\(\s*(?:int|size_t)\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\s*;\s*(?:\+\+\w+|\w+\+\+)\s*\)\s*\{\s*[\w\[\]\+\-\*\/=\s\.]+/.test(code)) {
            // Vector loops
            metrics_before = {
                latency_ms: 45.0,
                cpu_cycles_m: 90.0,
                cache_misses_pct: 8.5,
                power_draw_mw: 3900,
                ram_footprint_kb: 4096,
                instructions_m: 80.0,
                bandwidth_gbs: 6.2,
                carbon_g: 8.2,
                cost_usd: 0.90
            };
            metrics_after = {
                latency_ms: 11.2,
                cpu_cycles_m: 22.4,
                cache_misses_pct: 1.2,
                power_draw_mw: 1900,
                ram_footprint_kb: 4112,
                instructions_m: 20.0,
                bandwidth_gbs: 18.5,
                carbon_g: 3.4,
                cost_usd: 0.35
            };
            label_optimized = "Arm NEON SIMD";
            
        } else if (code.includes('exp') || code.includes('std::exp')) {
            // Softmax loop
            metrics_before = {
                latency_ms: 150.0,
                cpu_cycles_m: 300.0,
                cache_misses_pct: 14.8,
                power_draw_mw: 4200,
                ram_footprint_kb: 3072,
                instructions_m: 280.0,
                bandwidth_gbs: 5.1,
                carbon_g: 18.5,
                cost_usd: 2.10
            };
            metrics_after = {
                latency_ms: 25.0,
                cpu_cycles_m: 50.0,
                cache_misses_pct: 1.5,
                power_draw_mw: 2100,
                ram_footprint_kb: 3088,
                instructions_m: 60.0,
                bandwidth_gbs: 16.8,
                carbon_g: 7.2,
                cost_usd: 0.85
            };
            label_optimized = "NEON Vector Softmax";

        } else if (code.includes('max') || code.includes('std::max')) {
            // ReLU loop
            metrics_before = {
                latency_ms: 35.0,
                cpu_cycles_m: 70.0,
                cache_misses_pct: 12.1,
                power_draw_mw: 3500,
                ram_footprint_kb: 2048,
                instructions_m: 60.0,
                bandwidth_gbs: 4.5,
                carbon_g: 6.5,
                cost_usd: 0.70
            };
            metrics_after = {
                latency_ms: 9.5,
                cpu_cycles_m: 19.0,
                cache_misses_pct: 1.5,
                power_draw_mw: 1700,
                ram_footprint_kb: 2056,
                instructions_m: 15.0,
                bandwidth_gbs: 14.2,
                carbon_g: 2.8,
                cost_usd: 0.28
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
                ram_footprint_kb: 16384,
                instructions_m: 1200.0,
                bandwidth_gbs: 1.1,
                carbon_g: 45.0,
                cost_usd: 5.20
            };
            metrics_after = {
                latency_ms: 12.5,
                cpu_cycles_m: 25.0,
                cache_misses_pct: 0.8,
                power_draw_mw: 2100,
                ram_footprint_kb: 16550,
                instructions_m: 40.0,
                bandwidth_gbs: 15.2,
                carbon_g: 4.8,
                cost_usd: 0.55
            };
            label_optimized = "Vectorized NumPy";
        }
    }
    
    // Calculate percentage improvements
    const improvements = {
        latency_speedup_x: Math.round((metrics_before.latency_ms / metrics_after.latency_ms) * 10) / 10,
        cpu_cycles_saved_pct: Math.round(((metrics_before.cpu_cycles_m - metrics_after.cpu_cycles_m) / metrics_before.cpu_cycles_m) * 100 * 10) / 10,
        cache_miss_reduction_pct: Math.round(((metrics_before.cache_misses_pct - metrics_after.cache_misses_pct) / metrics_before.cache_misses_pct) * 100 * 10) / 10,
        energy_savings_pct: Math.round(((metrics_before.power_draw_mw - metrics_after.power_draw_mw) / metrics_before.power_draw_mw) * 100 * 10) / 10,
        carbon_savings_pct: Math.round(((metrics_before.carbon_g - metrics_after.carbon_g) / metrics_before.carbon_g) * 100 * 10) / 10,
        cost_savings_pct: Math.round(((metrics_before.cost_usd - metrics_after.cost_usd) / metrics_before.cost_usd) * 100 * 10) / 10
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
