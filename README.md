# GenPatent

Decentralized Global Intellectual Property & Copyright Protection on GenLayer.

**One-line pitch:** GenPatent dies without GenLayer because its core value proposition is automated on-chain subjective evaluations of technology novelty and copyright infringement claims using decentralized AI consensus.

---

## Why GenLayer

Traditional patent filing is a slow, expensive centralized process involving manual filings, lawyers, and months of waiting. Furthermore, enforcing software copyright and source code plagiarism is incredibly complex, requiring technical expertise and legal procedures that startups cannot afford.

GenPatent leverages a GenLayer Intelligent Contract to solve this:
1. **Automated AI Audit**: When a creator registers a patent or an open source repository, GenPatent uses `gl.nondet.web.get` to scan international patent databases and GitHub repositories, feeding the results to `gl.nondet.exec_prompt` to evaluate uniqueness.
2. **Dynamic Licensing Exchange**: Creators can buy licensing rights directly from patent owners via an on-chain ledger.
3. **Escrow Slashing for Compliance**: Tech projects stake a compliance escrow on-chain. If an infringement claim is filed against them, the AI jury evaluates both systems' structural and functional logic. If plagiarism is verified, the infringer's escrow is automatically slashed and transferred to the patent owner.

---

## Project Structure

```text
GenPatent/
  contracts/
    GenPatent.py          # Core Intelligent Contract (py-genlayer)
  frontend/
    src/
      app/
        page.tsx          # Agentory-inspired Next.js frontend UI dashboard
        globals.css       # Styling & theme configs matching Framer Agentory colors
        layout.tsx        # Layout wrapper
      lib/
        genlayer.ts       # JavaScript client integration utility
    .env.local            # Environment configurations (address & RPC)
    start-dev.ps1         # Shell script to start the local dev server
  scripts/
    deploy/
      deploy.ps1          # Powershell compile, lint & deploy automation script
  tests/
    test_genpatent.py     # Python static AST rule & compliance validator
  README.md               # Setup and project guide
```

---

## Builder Program Score Target

| Axis | Target | Evidence |
|---|---:|---|
| **GenLayer fit** | 5 | Uniqueness and infringement audits depend on reading web sources and subjective AI logic reasoning; removing AI makes the system fail. |
| **Contract quality** | 4-5 | Storage types fully compliant, virtual accounts ledger, compliance project escrows, dispute resolution and penalty slashing patterns. |
| **Engineering** | 4-5 | Structured directories, deploy script, static AST validation test suite, and clean documentation. |
| **Frontend / UX** | 4-5 | Premium Next.js app styled matching the Agentory Framer template with glassmorphic cards, neon orange accents, micro-animations, logs feed, and a real `genlayer-js` contract workflow. |

---

## Contract Flow

1. `register_user(address)`: Registers or fetches a user ID, seeding 1000 tokens for convenience in demo mode.
2. `file_patent(owner_address, title, description, url, license_fee)`: Files a patent in `PENDING` state by paying a 50 token filing fee.
3. `evaluate_patent(patent_id)`: AI novelty audit scans patent URL, assigns a uniqueness score, and transitions status to `APPROVED` or `REJECTED`.
4. `register_project(owner_address, name, url, deposit)`: Projects register with a staked compliance escrow.
5. `file_infringement_claim(complainant, patent_id, project_id, evidence_url)`: Files a copyright dispute against a suspect project.
6. `evaluate_infringement(claim_id)`: AI compares project evidence vs patent schema. Slashes 200 tokens from the project's escrow to reward the patent owner and complainant if plagiarism is verified, else forfeits complainant's bond to the falsely accused project owner.
7. `purchase_license(buyer_address, patent_id)`: Pays the license fee to transfer ownership/licensing rights.

---

## Pre-Deploy Verification

Run from the root workspace (`D:\Genlayer`):

```powershell
# Run python AST validation tests
python -m unittest GenPatent/tests/test_genpatent.py

# Lint the contract file
genlayer lint GenPatent/contracts/GenPatent.py
```

---

## Deploy

```powershell
# Deploy the contract to GenLayer Testnet/Studio
genlayer deploy GenPatent/contracts/GenPatent.py --name GenPatent
```

Copy the contract address from the CLI output and wire it into `GenPatent/frontend/.env.local`:
```text
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeAc4E7BC0626532A695fF74578f8BCA4dEaD07e1
NEXT_PUBLIC_NETWORK=testnetAsimov
NEXT_PUBLIC_GENLAYER_RPC=
```

The frontend intentionally requires a deployed contract address for write actions. It does not fabricate AI verdicts or payout results in local state.

## Submission Links

- Contract address: `0xeAc4E7BC0626532A695fF74578f8BCA4dEaD07e1`
- GitHub: https://github.com/eaglebooth/GenPatent
- Live app: https://genpatent.vercel.app

---

## Running Frontend

From the `GenPatent/frontend` directory:

```powershell
npm install

# Run dev server
npm run dev
```

Alternatively, you can run the provided PowerShell helper script:
```powershell
./start-dev.ps1
```
Open `http://localhost:3036` to interact with the application.
