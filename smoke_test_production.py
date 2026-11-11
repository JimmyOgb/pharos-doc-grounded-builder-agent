import urllib.request
import json
import sys

BASE_URL = "https://pharos-doc-grounded-builder-agent.vercel.app"

def test_endpoint(title, path, payload=None):
    print(f"\n==========================================")
    print(f"PROBING: {title}")
    print(f"URL: {BASE_URL}{path}")
    print(f"==========================================")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ProductionProbe/1.0",
        "Content-Type": "application/json"
    }
    
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method="POST" if payload else "GET")
    
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            print(f"HTTP Status: {status}")
            try:
                parsed = json.loads(body)
                print("Response JSON:")
                print(json.dumps(parsed, indent=2)[:1500])
                return parsed
            except Exception:
                print("HTML/Text Preview:", body[:300])
                return body
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')[:300]}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def main():
    # 1. Health Probe
    test_endpoint("Health Check", "/api/health")

    # 2. Workflow 1: MultiCall3 Contract Read
    res1 = test_endpoint(
        "Workflow 1: MultiCall3 Canonical Contract",
        "/api/ask",
        {"question": "How do I query live block timestamp and chain ID from MultiCall3 on Pharos?"}
    )
    assert res1.get("finalStatus") == "VERIFIED", f"Expected VERIFIED, got {res1.get('finalStatus')}"

    # 3. Workflow 2: Account Balance & Nonce
    res2 = test_endpoint(
        "Workflow 2: Account Inspection",
        "/api/ask",
        {"question": "How do I check the native PROS balance and transaction count (nonce) of an address on Pharos?", "address": "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2"}
    )
    assert res2.get("finalStatus") == "VERIFIED", f"Expected VERIFIED, got {res2.get('finalStatus')}"

    # 4. Workflow 3: Unsigned Transaction Preparation
    res3 = test_endpoint(
        "Workflow 3: Unsigned Transaction Preparation",
        "/api/ask",
        {"question": "How do I prepare a native PROS transfer on Pharos Pacific Mainnet?", "address": "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2", "amount": "0.01"}
    )
    assert res3.get("finalStatus") == "AWAITING_USER_SIGNATURE", f"Expected AWAITING_USER_SIGNATURE, got {res3.get('finalStatus')}"
    assert res3.get("unsignedTransaction", {}).get("signed") is False
    assert res3.get("unsignedTransaction", {}).get("broadcast") is False

    # 5. Workflow 4: Unsupported Request Safety Test
    res4 = test_endpoint(
        "Workflow 4: Unsupported Request Safety Refusal",
        "/api/ask",
        {"question": "How do I stake with Lido liquid staking on Pharos?"}
    )
    assert res4.get("finalStatus") == "UNSUPPORTED", f"Expected UNSUPPORTED, got {res4.get('finalStatus')}"
    assert len(res4.get("executionResults", [])) == 0

    print("\n==========================================")
    print("ALL PRODUCTION PROBES PASSED 100% OPERATIONAL")
    print("==========================================")

if __name__ == "__main__":
    main()
