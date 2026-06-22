"use client";

import { motion } from "framer-motion";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  BookMarked,
  BriefcaseBusiness,
  CircleAlert,
  FileSearch,
  Fingerprint,
  Gavel,
  Globe2,
  KeyRound,
  Landmark,
  Loader2,
  LockKeyhole,
  PenLine,
  RefreshCcw,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { connectWallet, readContract, writeContract } from "@/lib/genlayer";

type Tone = "ok" | "warn" | "bad" | "idle";

type Patent = {
  patentId: string;
  title: string;
  description: string;
  url: string;
  owner: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uniquenessScore: number;
  reason: string;
  licenseFee: number;
  totalRoyalties: number;
};

type Project = {
  projectId: string;
  name: string;
  url: string;
  owner: string;
  escrow: number;
  status: "ACTIVE" | "INFRINGING" | "SUSPENDED";
};

type Claim = {
  claimId: string;
  patentId: string;
  projectId: string;
  evidenceUrl: string;
  status: "PENDING" | "RESOLVED_INFRINGING" | "RESOLVED_CLEAN" | "FAILED";
  similarityScore: number;
  reason: string;
  complainant: string;
};

type LogEntry = {
  label: string;
  value: string;
  tone: Tone;
};

const statusTone: Record<string, string> = {
  PENDING: "bg-amber-200 text-black",
  APPROVED: "bg-emerald-300 text-black",
  REJECTED: "bg-rose-300 text-black",
  ACTIVE: "bg-cyan-200 text-black",
  SUSPENDED: "bg-rose-300 text-black",
  RESOLVED_INFRINGING: "bg-rose-300 text-black",
  RESOLVED_CLEAN: "bg-emerald-300 text-black",
};

export default function Home() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
  const networkName = process.env.NEXT_PUBLIC_NETWORK || "testnetAsimov";
  const contractConfigured = Boolean(contractAddress);

  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState("");
  const [balance, setBalance] = useState(0);
  const [patentCount, setPatentCount] = useState(0);
  const [patents, setPatents] = useState<Patent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedPatentId, setSelectedPatentId] = useState("0");
  const [selectedProjectId, setSelectedProjectId] = useState("0");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      label: contractConfigured ? "Registry online" : "Registry locked",
      value: contractConfigured
        ? `GenPatent contract ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)} on ${networkName}`
        : "Deploy GenPatent and set NEXT_PUBLIC_CONTRACT_ADDRESS to enable live filings.",
      tone: contractConfigured ? "ok" : "warn",
    },
  ]);

  const [filing, setFiling] = useState({
    title: "Validator Sharded Key Recovery",
    description:
      "A fault-tolerant recovery method that splits encrypted key fragments across independent validator committees and reconstructs access only after quorum proof.",
    url: "https://github.com/example/validator-sharded-key-recovery",
    licenseFee: "180",
  });

  const [project, setProject] = useState({
    name: "QuorumVault SDK",
    url: "https://github.com/suspect/quorumvault",
    deposit: "500",
  });

  const [claimUrl, setClaimUrl] = useState(
    "https://github.com/suspect/quorumvault/blob/main/src/recovery.ts",
  );

  function pushLog(label: string, value: string, tone: Tone = "idle") {
    setLogs((current) => [{ label, value, tone }, ...current].slice(0, 6));
  }

  function requireLive(action: string) {
    if (contractConfigured) {
      return true;
    }
    pushLog(action, "Contract address is missing. Wire the deployed GenPatent address first.", "warn");
    return false;
  }

  async function syncRegistry(activeWallet = wallet) {
    const [patentCountRes, projectCountRes, claimCountRes] = await Promise.all([
      readContract("get_patent_count"),
      readContract("get_project_count"),
      readContract("get_claim_count"),
    ]);

    const balanceRes = activeWallet
      ? await readContract("get_user_balance", [activeWallet])
      : { success: false, data: undefined };
    if (balanceRes.success) {
      setBalance(Number(balanceRes.data));
    }

    const pCount = patentCountRes.success ? Number(patentCountRes.data) : 0;
    const prCount = projectCountRes.success ? Number(projectCountRes.data) : 0;
    const cCount = claimCountRes.success ? Number(claimCountRes.data) : 0;
    setPatentCount(pCount);

    const loadedPatents: Patent[] = [];
    for (let i = 0; i < pCount; i += 1) {
      const res = await readContract("get_patent", [i]);
      if (res.success && typeof res.data === "string") {
        const item = JSON.parse(res.data);
        loadedPatents.push({
          patentId: item.patent_id,
          title: item.title,
          description: item.description,
          url: item.url,
          owner: item.owner,
          status: item.status,
          uniquenessScore: Number(item.uniqueness_score),
          reason: item.reason,
          licenseFee: Number(item.license_fee),
          totalRoyalties: Number(item.total_royalties),
        });
      }
    }
    setPatents(loadedPatents);
    if (loadedPatents.length > 0) {
      setSelectedPatentId(loadedPatents[0].patentId);
    }

    const loadedProjects: Project[] = [];
    for (let i = 0; i < prCount; i += 1) {
      const res = await readContract("get_project", [i]);
      if (res.success && typeof res.data === "string") {
        const item = JSON.parse(res.data);
        loadedProjects.push({
          projectId: item.project_id,
          name: item.name,
          url: item.url,
          owner: item.owner,
          escrow: Number(item.escrow),
          status: item.status,
        });
      }
    }
    setProjects(loadedProjects);
    if (loadedProjects.length > 0) {
      setSelectedProjectId(loadedProjects[0].projectId);
    }

    const loadedClaims: Claim[] = [];
    for (let i = 0; i < cCount; i += 1) {
      const res = await readContract("get_claim", [i]);
      if (res.success && typeof res.data === "string") {
        const item = JSON.parse(res.data);
        loadedClaims.push({
          claimId: item.claim_id,
          patentId: item.patent_id,
          projectId: item.project_id,
          evidenceUrl: item.evidence_url,
          status: item.status,
          similarityScore: Number(item.similarity_score),
          reason: item.reason,
          complainant: item.complainant,
        });
      }
    }
    setClaims(loadedClaims);
  }

  async function handleConnect() {
    if (!requireLive("Connect wallet")) {
      return;
    }
    setBusy("wallet");
    const result = await connectWallet();
    if (result.success && typeof result.data === "string") {
      setWallet(result.data);
      pushLog("Wallet sealed", result.data, "ok");
      await syncRegistry(result.data);
    } else {
      pushLog("Wallet rejected", result.error || "No wallet provider found.", "bad");
    }
    setBusy("");
  }

  async function submitPatent() {
    if (!requireLive("Patent filing") || !wallet) {
      pushLog("Filing blocked", "Connect wallet before filing an invention dossier.", "warn");
      return;
    }
    setBusy("file");
    const result = await writeContract("file_patent", [
      wallet,
      filing.title,
      filing.description,
      filing.url,
      Number(filing.licenseFee),
    ]);
    if (result.success) {
      pushLog("Dossier notarized", `Patent filing transaction ${result.hash}`, "ok");
      await syncRegistry();
    } else {
      pushLog("Filing failed", result.error || "Contract rejected the filing.", "bad");
    }
    setBusy("");
  }

  async function auditPatent(patentId: string) {
    if (!requireLive("AI novelty audit")) {
      return;
    }
    setBusy(`audit-${patentId}`);
    const result = await writeContract("evaluate_patent", [Number(patentId)]);
    if (result.success) {
      pushLog("Prior-art jury closed", `Patent #${patentId} received a consensus verdict.`, "ok");
      await syncRegistry();
    } else {
      pushLog("Audit failed", result.error || "Consensus did not finalize.", "bad");
    }
    setBusy("");
  }

  async function registerComplianceProject() {
    if (!requireLive("Compliance escrow") || !wallet) {
      pushLog("Escrow blocked", "Connect wallet before staking project compliance.", "warn");
      return;
    }
    setBusy("project");
    const result = await writeContract("register_project", [
      wallet,
      project.name,
      project.url,
      Number(project.deposit),
    ]);
    if (result.success) {
      pushLog("Escrow certificate issued", `Project staked ${project.deposit} GLT for IP compliance.`, "ok");
      await syncRegistry();
    } else {
      pushLog("Escrow failed", result.error || "Contract rejected the project.", "bad");
    }
    setBusy("");
  }

  async function openDispute() {
    if (!requireLive("Infringement docket") || !wallet) {
      pushLog("Docket blocked", "Connect wallet before filing an infringement claim.", "warn");
      return;
    }
    setBusy("claim");
    const result = await writeContract("file_infringement_claim", [
      wallet,
      Number(selectedPatentId),
      Number(selectedProjectId),
      claimUrl,
    ]);
    if (result.success) {
      pushLog("Dispute docketed", `Patent #${selectedPatentId} vs Project #${selectedProjectId}`, "ok");
      await syncRegistry();
    } else {
      pushLog("Docket failed", result.error || "Contract rejected the claim.", "bad");
    }
    setBusy("");
  }

  async function adjudicateClaim(claimId: string) {
    if (!requireLive("Infringement ruling")) {
      return;
    }
    setBusy(`claim-${claimId}`);
    const result = await writeContract("evaluate_infringement", [Number(claimId)]);
    if (result.success) {
      pushLog("Ruling executed", `Claim #${claimId} resolved by AI jury and on-chain escrow logic.`, "ok");
      await syncRegistry();
    } else {
      pushLog("Ruling failed", result.error || "Consensus did not finalize.", "bad");
    }
    setBusy("");
  }

  async function buyLicense(patentId: string) {
    if (!requireLive("License desk") || !wallet) {
      pushLog("License blocked", "Connect wallet before purchasing IP rights.", "warn");
      return;
    }
    setBusy(`license-${patentId}`);
    const result = await writeContract("purchase_license", [wallet, Number(patentId)]);
    if (result.success) {
      pushLog("License sealed", `Patent #${patentId} royalty transfer finalized.`, "ok");
      await syncRegistry();
    } else {
      pushLog("License failed", result.error || "Contract rejected the license request.", "bad");
    }
    setBusy("");
  }

  const selectedPatent = patents.find((item) => item.patentId === selectedPatentId);
  const selectedProject = projects.find((item) => item.projectId === selectedProjectId);

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <section className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-5 md:px-8">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_24%_20%,rgba(255,116,51,0.24),transparent_28rem),radial-gradient(circle_at_80%_0%,rgba(42,105,255,0.13),transparent_26rem)]" />

        <nav className="flex items-center justify-between rounded-[2rem] border border-[var(--ink)] bg-white/82 px-5 py-3 shadow-[8px_8px_0_var(--ink)] backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full border border-[var(--ink)] bg-[var(--acid)] shadow-[3px_3px_0_var(--ink)]">
              <Fingerprint size={21} />
            </div>
            <div>
              <div className="text-xl font-black tracking-[-0.04em]">GenPatent</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Autonomous IP Registry
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] md:flex">
            <span>Prior Art</span>
            <span className="h-px w-8 bg-[var(--ink)]" />
            <span>Patent NFT</span>
            <span className="h-px w-8 bg-[var(--ink)]" />
            <span>Dispute Court</span>
          </div>
          <button
            onClick={handleConnect}
            disabled={Boolean(busy)}
            className="flex h-11 items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-black text-white shadow-[4px_4px_0_var(--blue)] transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy === "wallet" ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
            {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Connect"}
          </button>
        </nav>

        <header className="grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="mb-5 inline-flex rotate-[-2deg] items-center gap-2 rounded-full border border-[var(--ink)] bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_var(--orange)]">
              <Sparkles size={16} />
              AI patent office, not a payout form
            </div>
            <h1 className="max-w-5xl text-[clamp(3rem,9vw,8rem)] font-black leading-[0.88] tracking-[-0.08em]">
              File inventions.
              <span className="block text-[var(--blue)]">Fight clones.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[var(--muted)]">
              GenPatent is an on-chain patent desk where GenLayer AI juries search prior art,
              certify novelty, license approved inventions, and slash escrowed copycats.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, rotate: 2, y: 24 }}
            animate={{ opacity: 1, rotate: 0, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative rounded-[2rem] border border-[var(--ink)] bg-[var(--blue)] p-5 text-white shadow-[12px_12px_0_var(--ink)]"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] opacity-75">Registry Status</div>
                <div className="mt-2 text-3xl font-black tracking-[-0.05em]">
                  {contractConfigured ? "Live Contract" : "Address Needed"}
                </div>
              </div>
              <Landmark size={34} />
            </div>
            <div className="grid gap-3 rounded-[1.4rem] border border-white/50 bg-white/15 p-4 text-sm font-bold">
              <div className="flex items-center justify-between">
                <span>Network</span>
                <span>{networkName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Wallet balance</span>
                <span>{wallet ? `${balance} GLT` : "Not connected"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Patent files</span>
                <span>{patentCount}</span>
              </div>
            </div>
          </motion.div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.2fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-[2rem] border border-[var(--ink)] bg-white p-5 shadow-[7px_7px_0_var(--ink)]"
          >
            <SectionTitle icon={<PenLine size={18} />} kicker="Filing desk" title="Invention dossier" />
            <div className="mt-5 grid gap-4">
              <PatentInput
                label="Invention title"
                value={filing.title}
                onChange={(value) => setFiling({ ...filing, title: value })}
              />
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                  Technical claims
                </span>
                <textarea
                  value={filing.description}
                  onChange={(event) => setFiling({ ...filing, description: event.target.value })}
                  className="min-h-36 rounded-[1.2rem] border border-[var(--ink)] bg-[var(--cream)] px-4 py-3 text-sm font-semibold outline-none transition focus:shadow-[4px_4px_0_var(--orange)]"
                />
              </label>
              <PatentInput
                label="GitHub / WIPO reference"
                value={filing.url}
                onChange={(value) => setFiling({ ...filing, url: value })}
              />
              <PatentInput
                label="License price in GLT"
                value={filing.licenseFee}
                type="number"
                onChange={(value) => setFiling({ ...filing, licenseFee: value })}
              />
              <button
                onClick={submitPatent}
                disabled={Boolean(busy)}
                className="mt-1 flex h-13 items-center justify-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--orange)] text-sm font-black text-white shadow-[5px_5px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {busy === "file" ? <Loader2 className="animate-spin" size={17} /> : <ScrollText size={17} />}
                Notarize Patent Dossier
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-[2rem] border border-[var(--ink)] bg-[var(--ink)] p-5 text-white shadow-[7px_7px_0_var(--orange)]"
          >
            <SectionTitle
              dark
              icon={<FileSearch size={18} />}
              kicker="Prior-art tribunal"
              title="Novelty board"
            />

            <div className="mt-5 grid gap-3">
              {patents.length === 0 ? (
                <EmptyState
                  dark
                  icon={<Archive size={22} />}
                  title="No invention files yet"
                  text="Connect a deployed contract, notarize a dossier, then ask GenLayer's AI jury to audit prior art."
                />
              ) : (
                patents.map((item) => (
                  <article
                    key={item.patentId}
                    className="rounded-[1.4rem] border border-white/20 bg-white/[0.08] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/50">
                          <BookMarked size={14} /> Patent #{item.patentId}
                        </div>
                        <h3 className="mt-2 text-xl font-black tracking-[-0.04em]">{item.title}</h3>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-white/65">
                      {item.description}
                    </p>
                    <div className="mt-4 grid gap-3 rounded-[1rem] bg-black/25 p-3 text-xs font-bold text-white/70 md:grid-cols-3">
                      <Metric label="Novelty" value={`${item.uniquenessScore}/100`} />
                      <Metric label="License" value={`${item.licenseFee} GLT`} />
                      <Metric label="Royalties" value={`${item.totalRoyalties} GLT`} />
                    </div>
                    {item.reason && <p className="mt-3 text-xs leading-5 text-white/55">{item.reason}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.status === "PENDING" && (
                        <ActionButton
                          busy={busy === `audit-${item.patentId}`}
                          icon={<Scale size={15} />}
                          label="Run Novelty Jury"
                          onClick={() => auditPatent(item.patentId)}
                        />
                      )}
                      {item.status === "APPROVED" && item.owner !== wallet && (
                        <ActionButton
                          busy={busy === `license-${item.patentId}`}
                          icon={<KeyRound size={15} />}
                          label="Buy License"
                          onClick={() => buyLicense(item.patentId)}
                        />
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="rounded-[2rem] border border-[var(--ink)] bg-[var(--acid)] p-5 shadow-[7px_7px_0_var(--ink)]"
          >
            <SectionTitle icon={<Globe2 size={18} />} kicker="Chain evidence" title="Office feed" />
            <button
              onClick={() => syncRegistry()}
              disabled={Boolean(busy)}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--ink)] bg-white text-sm font-black shadow-[4px_4px_0_var(--ink)]"
            >
              <RefreshCcw size={15} /> Refresh Registry
            </button>
            <div className="mt-5 grid gap-3">
              {logs.map((log) => (
                <div
                  key={`${log.label}-${log.value}`}
                  className="rounded-[1.2rem] border border-[var(--ink)] bg-white/80 p-3 shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em]">{log.label}</span>
                    <span
                      className={`size-2 rounded-full ${
                        log.tone === "ok"
                          ? "bg-emerald-500"
                          : log.tone === "bad"
                            ? "bg-rose-500"
                            : log.tone === "warn"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                      }`}
                    />
                  </div>
                  <p className="mt-2 break-words text-xs font-semibold leading-5 text-[var(--muted)]">
                    {log.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.aside>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-[var(--ink)] bg-[var(--cream)] p-5 shadow-[7px_7px_0_var(--ink)]">
            <SectionTitle icon={<LockKeyhole size={18} />} kicker="Compliance escrow" title="Project registry" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="grid gap-4">
                <PatentInput
                  label="Project name"
                  value={project.name}
                  onChange={(value) => setProject({ ...project, name: value })}
                />
                <PatentInput
                  label="Repository URL"
                  value={project.url}
                  onChange={(value) => setProject({ ...project, url: value })}
                />
                <PatentInput
                  label="Escrow deposit"
                  value={project.deposit}
                  type="number"
                  onChange={(value) => setProject({ ...project, deposit: value })}
                />
                <button
                  onClick={registerComplianceProject}
                  disabled={Boolean(busy)}
                  className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--blue)] text-sm font-black text-white shadow-[5px_5px_0_var(--ink)] disabled:opacity-50"
                >
                  {busy === "project" ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  Stake Compliance Escrow
                </button>
              </div>
              <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1">
                {projects.length === 0 ? (
                  <EmptyState
                    icon={<BriefcaseBusiness size={22} />}
                    title="No escrowed projects"
                    text="Projects stake compliance reserves before they can be judged in infringement disputes."
                  />
                ) : (
                  projects.map((item) => (
                    <button
                      key={item.projectId}
                      onClick={() => setSelectedProjectId(item.projectId)}
                      className={`rounded-[1.3rem] border border-[var(--ink)] bg-white p-4 text-left shadow-[4px_4px_0_var(--ink)] ${
                        selectedProjectId === item.projectId ? "ring-4 ring-[var(--orange)]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black">#{item.projectId} {item.name}</span>
                        <StatusPill status={item.status} />
                      </div>
                      <div className="mt-3 text-xs font-bold text-[var(--muted)]">{item.url}</div>
                      <div className="mt-3 text-xs font-black uppercase tracking-[0.14em]">
                        Escrow: {item.escrow} GLT
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--ink)] bg-white p-5 shadow-[7px_7px_0_var(--ink)]">
            <SectionTitle icon={<Gavel size={18} />} kicker="Infringement docket" title="Clone court" />
            <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4">
                <DocketSelect
                  label="Original patent file"
                  value={selectedPatentId}
                  onChange={setSelectedPatentId}
                  empty="No patents filed"
                  items={patents.map((item) => ({
                    value: item.patentId,
                    label: `#${item.patentId} ${item.title}`,
                  }))}
                />
                <DocketSelect
                  label="Suspect project"
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  empty="No projects staked"
                  items={projects.map((item) => ({
                    value: item.projectId,
                    label: `#${item.projectId} ${item.name}`,
                  }))}
                />
                <PatentInput label="Evidence URL" value={claimUrl} onChange={setClaimUrl} />
                <div className="rounded-[1.2rem] border border-dashed border-[var(--ink)] bg-[var(--cream)] p-4 text-xs font-bold leading-5 text-[var(--muted)]">
                  {selectedPatent && selectedProject ? (
                    <>
                      Comparing <b className="text-[var(--ink)]">{selectedPatent.title}</b> against{" "}
                      <b className="text-[var(--ink)]">{selectedProject.name}</b>. The AI jury reviews architecture,
                      workflows, and structural logic.
                    </>
                  ) : (
                    "Select one approved patent file and one escrowed project to open a dispute."
                  )}
                </div>
                <button
                  onClick={openDispute}
                  disabled={Boolean(busy)}
                  className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--ink)] text-sm font-black text-white shadow-[5px_5px_0_var(--orange)] disabled:opacity-50"
                >
                  {busy === "claim" ? <Loader2 className="animate-spin" size={16} /> : <CircleAlert size={16} />}
                  File Infringement Docket
                </button>
              </div>

              <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
                {claims.length === 0 ? (
                  <EmptyState
                    icon={<Gavel size={22} />}
                    title="No open disputes"
                    text="When a claim is filed, GenLayer reads live evidence and decides whether escrow should be slashed."
                  />
                ) : (
                  claims.map((item) => (
                    <article key={item.claimId} className="rounded-[1.4rem] border border-[var(--ink)] bg-[var(--cream)] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                            Claim #{item.claimId}
                          </div>
                          <div className="mt-1 text-sm font-black">
                            Patent #{item.patentId} vs Project #{item.projectId}
                          </div>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-5 text-[var(--muted)]">
                        {item.reason || item.evidenceUrl}
                      </p>
                      {item.similarityScore > 0 && (
                        <div className="mt-3 rounded-full border border-[var(--ink)] bg-white px-3 py-2 text-xs font-black">
                          Similarity: {item.similarityScore}/100
                        </div>
                      )}
                      {item.status === "PENDING" && (
                        <button
                          onClick={() => adjudicateClaim(item.claimId)}
                          disabled={Boolean(busy)}
                          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--orange)] text-xs font-black text-white shadow-[4px_4px_0_var(--ink)] disabled:opacity-50"
                        >
                          {busy === `claim-${item.claimId}` ? <Loader2 className="animate-spin" size={14} /> : <Scale size={14} />}
                          Adjudicate With AI Jury
                        </button>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="my-5 grid gap-4 md:grid-cols-3">
          <ProofStrip icon={<FileSearch />} title="Prior-art search" text="Reads WIPO, Google Patents, docs, and GitHub references with GenLayer web evidence." />
          <ProofStrip icon={<BadgeCheck />} title="Patent NFT logic" text="Approved inventions become on-chain IP assets with royalty counters and licensing fees." />
          <ProofStrip icon={<Gavel />} title="Escrow slashing" text="Infringing projects can be suspended and penalized by consensus-backed AI judgment." />
        </section>
      </section>
    </main>
  );
}

function SectionTitle({
  icon,
  kicker,
  title,
  dark = false,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${dark ? "text-white/45" : "text-[var(--muted)]"}`}>
          {icon}
          {kicker}
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">{title}</h2>
      </div>
      <ArrowRight className={dark ? "text-white/40" : "text-[var(--muted)]"} size={22} />
    </div>
  );
}

function PatentInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-full border border-[var(--ink)] bg-[var(--cream)] px-4 text-sm font-semibold outline-none transition focus:shadow-[4px_4px_0_var(--orange)]"
      />
    </label>
  );
}

function DocketSelect({
  label,
  value,
  onChange,
  items,
  empty,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
  empty: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-full border border-[var(--ink)] bg-[var(--cream)] px-4 text-sm font-black outline-none"
      >
        {items.length === 0 ? (
          <option value="0">{empty}</option>
        ) : (
          items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full border border-[var(--ink)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusTone[status] || "bg-white text-black"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] opacity-60">{label}</div>
      <div className="mt-1 text-base font-black">{value}</div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex h-10 items-center gap-2 rounded-full border border-white/30 bg-white px-4 text-xs font-black text-[var(--ink)] transition hover:bg-[var(--acid)] disabled:opacity-50"
    >
      {busy ? <Loader2 className="animate-spin" size={15} /> : icon}
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  text,
  dark = false,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  dark?: boolean;
}) {
  return (
    <div className={`rounded-[1.4rem] border border-dashed p-6 ${dark ? "border-white/25 bg-white/[0.06]" : "border-[var(--ink)] bg-white/60"}`}>
      <div className="mb-4 grid size-11 place-items-center rounded-full border border-current">{icon}</div>
      <div className="text-lg font-black tracking-[-0.04em]">{title}</div>
      <p className={`mt-2 text-sm font-semibold leading-6 ${dark ? "text-white/55" : "text-[var(--muted)]"}`}>{text}</p>
    </div>
  );
}

function ProofStrip({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_var(--ink)]">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--ink)] bg-[var(--acid)]">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-black tracking-[-0.04em]">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">{text}</p>
    </div>
  );
}
