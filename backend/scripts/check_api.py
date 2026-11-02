"""Quick API health check script."""
import urllib.request
import json

BASE = "http://localhost:8000"
endpoints = [
    ("GET", "/api/health"),
    ("GET", "/api/traffic/current"),
    ("GET", "/api/demo/steps"),
    ("GET", "/api/simulation/scenarios"),
    ("GET", "/api/experiments"),
    ("GET", "/api/controller/status"),
    ("GET", "/api/intent/current"),
]

print("PULSE API Health Check")
print("=" * 50)
for method, path in endpoints:
    try:
        req = urllib.request.Request(BASE + path, method=method)
        with urllib.request.urlopen(req, timeout=5) as r:
            data = r.read().decode()
            parsed = json.loads(data)
            if isinstance(parsed, list):
                print(f"✅ {method} {path} → [{len(parsed)} items]")
            elif isinstance(parsed, dict):
                keys = list(parsed.keys())[:4]
                print(f"✅ {method} {path} → {{{', '.join(keys)}, ...}}")
            else:
                print(f"✅ {method} {path} → {str(parsed)[:60]}")
    except Exception as e:
        print(f"❌ {method} {path} → {e}")

# Test POST experiment run
print()
print("Testing experiment run (duration=120)...")
try:
    payload = json.dumps({"duration": 120, "seed": 42, "scenario": "baseline"}).encode()
    req = urllib.request.Request(
        BASE + "/api/experiments/run",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
        print(f"✅ POST /api/experiments/run → {len(data)} results")
        for item in data:
            ctrl = item.get("controller", "?")
            avg_delay = item.get("avg_delay", 0)
            throughput = item.get("throughput", 0)
            print(f"   {ctrl}: avg_delay={avg_delay:.1f}s, throughput={throughput}")
except Exception as e:
    print(f"❌ POST /api/experiments/run → {e}")

print()
print("Done.")

