# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json


class GenPatent(gl.Contract):
    user_count: u256
    user_addresses: TreeMap[u256, str]
    user_balances: TreeMap[u256, u256]

    patent_count: u256
    patent_titles: TreeMap[u256, str]
    patent_descriptions: TreeMap[u256, str]
    patent_urls: TreeMap[u256, str]
    patent_owners: TreeMap[u256, str]
    patent_statuses: TreeMap[u256, str]
    patent_uniqueness_scores: TreeMap[u256, u256]
    patent_reasons: TreeMap[u256, str]
    patent_license_fees: TreeMap[u256, u256]
    patent_total_royalties: TreeMap[u256, u256]

    project_count: u256
    project_names: TreeMap[u256, str]
    project_urls: TreeMap[u256, str]
    project_owners: TreeMap[u256, str]
    project_escrows: TreeMap[u256, u256]
    project_statuses: TreeMap[u256, str]

    claim_count: u256
    claim_patent_ids: TreeMap[u256, u256]
    claim_project_ids: TreeMap[u256, u256]
    claim_evidence_urls: TreeMap[u256, str]
    claim_statuses: TreeMap[u256, str]
    claim_similarity_scores: TreeMap[u256, u256]
    claim_reasons: TreeMap[u256, str]
    claim_complainants: TreeMap[u256, str]

    def __init__(self):
        self.user_count = u256(0)
        self.patent_count = u256(0)
        self.project_count = u256(0)
        self.claim_count = u256(0)

    def _get_or_create_user(self, address: str) -> u256:
        for idx in range(int(self.user_count)):
            if self.user_addresses[u256(idx)] == address:
                return u256(idx)
        user_id = self.user_count
        self.user_addresses[user_id] = address
        self.user_balances[user_id] = u256(1000)
        self.user_count = user_id + u256(1)
        return user_id

    @gl.public.write
    def register_user(self, address: str) -> typing.Any:
        if len(address) == 0:
            return "MISSING_ADDRESS"
        user_id = self._get_or_create_user(address)
        return user_id

    @gl.public.write
    def file_patent(
        self,
        owner_address: str,
        title: str,
        description: str,
        url: str,
        license_fee: u256,
    ) -> typing.Any:
        if len(owner_address) == 0:
            return "MISSING_OWNER"
        if len(title) == 0:
            return "MISSING_TITLE"
        if len(description) == 0:
            return "MISSING_DESCRIPTION"
        if len(url) == 0:
            return "MISSING_URL"

        user_id = self._get_or_create_user(owner_address)
        bal = self.user_balances[user_id]
        filing_fee = u256(50)
        if bal < filing_fee:
            return "INSUFFICIENT_FUNDS"

        self.user_balances[user_id] = bal - filing_fee

        patent_id = self.patent_count
        self.patent_titles[patent_id] = title
        self.patent_descriptions[patent_id] = description
        self.patent_urls[patent_id] = url
        self.patent_owners[patent_id] = owner_address
        self.patent_statuses[patent_id] = "PENDING"
        self.patent_uniqueness_scores[patent_id] = u256(0)
        self.patent_reasons[patent_id] = ""
        self.patent_license_fees[patent_id] = license_fee
        self.patent_total_royalties[patent_id] = u256(0)

        self.patent_count = patent_id + u256(1)
        return patent_id

    @gl.public.write
    def evaluate_patent(self, patent_id: u256) -> typing.Any:
        if patent_id >= self.patent_count:
            return "INVALID_PATENT_ID"
        status = self.patent_statuses[patent_id]
        if status != "PENDING":
            return "ALREADY_EVALUATED"

        title = self.patent_titles[patent_id]
        desc = self.patent_descriptions[patent_id]
        url = self.patent_urls[patent_id]

        def run_eval() -> str:
            web_content = ""
            if len(url) > 0:
                try:
                    resp = gl.nondet.web.get(url)
                    web_content = resp.body.decode("utf-8")
                except Exception:
                    web_content = "[URL_FETCH_FAILED]"

            if len(web_content) > 4000:
                web_content = web_content[:4000]

            prompt = (
                "You are the GenPatent AI Jury, a decentralized board evaluating the novelty and uniqueness of filed patents and technology disclosures.\n\n"
                "Review this patent submission against international patent databases (WIPO, Google Patents) and open source codebases (GitHub):\n\n"
                "Title: " + title + "\n"
                "Description: " + desc + "\n"
                "Source URL: " + url + "\n\n"
                "Scraped content from source URL:\n" + web_content + "\n\n"
                "Determine the novelty, architectural originality, and potential overlap with existing patents or tech solutions.\n\n"
                "Assign a 'uniqueness_score' from 0 to 100 (where 100 is completely unique/novel, and 0 is identical copy/known art).\n"
                "Decide the status: APPROVE if uniqueness_score >= 70, else REJECT.\n\n"
                "Respond with ONLY this JSON, no other text or markdown block:\n"
                '{"status":"APPROVED|REJECTED",'
                '"uniqueness_score":N,'
                '"reason":"1-2 sentence detailed explanation of your novelty assessment"}'
            )
            raw_answer = gl.nondet.exec_prompt(prompt)
            return raw_answer.replace("```json", "").replace("```", "").strip()

        eval_json = gl.eq_principle.strict_eq(run_eval)
        try:
            data = json.loads(eval_json)
        except Exception:
            return "INVALID_EVALUATION_JSON"

        decision = str(data.get("status", ""))
        if decision not in ["APPROVED", "REJECTED"]:
            return "INVALID_DECISION"
        score = int(data.get("uniqueness_score", 0))
        if score < 0 or score > 100:
            return "INVALID_UNIQUENESS_SCORE"

        self.patent_uniqueness_scores[patent_id] = u256(score)
        self.patent_reasons[patent_id] = str(data.get("reason", ""))
        self.patent_statuses[patent_id] = decision

        return json.dumps(data, sort_keys=True, separators=(",", ":"))

    @gl.public.write
    def purchase_license(self, buyer_address: str, patent_id: u256) -> typing.Any:
        if patent_id >= self.patent_count:
            return "INVALID_PATENT_ID"
        if self.patent_statuses[patent_id] != "APPROVED":
            return "PATENT_NOT_ACTIVE"
        if len(buyer_address) == 0:
            return "MISSING_BUYER"

        fee = self.patent_license_fees[patent_id]
        buyer_id = self._get_or_create_user(buyer_address)
        buyer_bal = self.user_balances[buyer_id]
        if buyer_bal < fee:
            return "INSUFFICIENT_FUNDS"

        owner_address = self.patent_owners[patent_id]
        owner_id = self._get_or_create_user(owner_address)

        self.user_balances[buyer_id] = buyer_bal - fee
        self.user_balances[owner_id] = self.user_balances[owner_id] + fee
        self.patent_total_royalties[patent_id] = self.patent_total_royalties[patent_id] + fee

        return "LICENSED"

    @gl.public.write
    def register_project(
        self,
        owner_address: str,
        name: str,
        url: str,
        deposit: u256,
    ) -> typing.Any:
        if len(owner_address) == 0:
            return "MISSING_OWNER"
        if len(name) == 0:
            return "MISSING_NAME"
        if len(url) == 0:
            return "MISSING_URL"
        if deposit == u256(0):
            return "ZERO_DEPOSIT"

        owner_id = self._get_or_create_user(owner_address)
        bal = self.user_balances[owner_id]
        if bal < deposit:
            return "INSUFFICIENT_FUNDS"

        self.user_balances[owner_id] = bal - deposit

        project_id = self.project_count
        self.project_names[project_id] = name
        self.project_urls[project_id] = url
        self.project_owners[project_id] = owner_address
        self.project_escrows[project_id] = deposit
        self.project_statuses[project_id] = "ACTIVE"

        self.project_count = project_id + u256(1)
        return project_id

    @gl.public.write
    def file_infringement_claim(
        self,
        complainant: str,
        patent_id: u256,
        project_id: u256,
        evidence_url: str,
    ) -> typing.Any:
        if patent_id >= self.patent_count:
            return "INVALID_PATENT_ID"
        if self.patent_statuses[patent_id] != "APPROVED":
            return "PATENT_NOT_APPROVED"
        if project_id >= self.project_count:
            return "INVALID_PROJECT_ID"
        if self.project_statuses[project_id] != "ACTIVE":
            return "PROJECT_NOT_ACTIVE"
        if len(complainant) == 0:
            return "MISSING_COMPLAINANT"
        if len(evidence_url) == 0:
            return "MISSING_EVIDENCE_URL"

        comp_id = self._get_or_create_user(complainant)
        bal = self.user_balances[comp_id]
        dispute_fee = u256(30)
        if bal < dispute_fee:
            return "INSUFFICIENT_FUNDS"

        self.user_balances[comp_id] = bal - dispute_fee

        claim_id = self.claim_count
        self.claim_patent_ids[claim_id] = patent_id
        self.claim_project_ids[claim_id] = project_id
        self.claim_evidence_urls[claim_id] = evidence_url
        self.claim_statuses[claim_id] = "PENDING"
        self.claim_similarity_scores[claim_id] = u256(0)
        self.claim_reasons[claim_id] = ""
        self.claim_complainants[claim_id] = complainant

        self.claim_count = claim_id + u256(1)
        return claim_id

    @gl.public.write
    def evaluate_infringement(self, claim_id: u256) -> typing.Any:
        if claim_id >= self.claim_count:
            return "INVALID_CLAIM_ID"
        status = self.claim_statuses[claim_id]
        if status != "PENDING":
            return "ALREADY_EVALUATED"

        patent_id = self.claim_patent_ids[claim_id]
        project_id = self.claim_project_ids[claim_id]
        evidence_url = self.claim_evidence_urls[claim_id]

        patent_title = self.patent_titles[patent_id]
        patent_desc = self.patent_descriptions[patent_id]
        patent_url = self.patent_urls[patent_id]

        project_name = self.project_names[project_id]
        project_url = self.project_urls[project_id]

        def run_infringement_check() -> str:
            pat_web = ""
            if len(patent_url) > 0:
                try:
                    resp = gl.nondet.web.get(patent_url)
                    pat_web = resp.body.decode("utf-8")
                except Exception:
                    pat_web = "[PATENT_URL_FETCH_FAILED]"

            evidence_web = ""
            if len(evidence_url) > 0:
                try:
                    resp = gl.nondet.web.get(evidence_url)
                    evidence_web = resp.body.decode("utf-8")
                except Exception:
                    evidence_web = "[EVIDENCE_URL_FETCH_FAILED]"

            if len(pat_web) > 2500:
                pat_web = pat_web[:2500]
            if len(evidence_web) > 2500:
                evidence_web = evidence_web[:2500]

            prompt = (
                "You are the GenPatent AI Jury. You are reviewing a copyright/IP infringement claim.\n\n"
                "Review the registered patent below and compare it with the suspect project evidence:\n\n"
                "=== PATENT ===\n"
                "Title: " + patent_title + "\n"
                "Description: " + patent_desc + "\n"
                "Source URL: " + patent_url + "\n"
                "Scraped patent content:\n" + pat_web + "\n\n"
                "=== SUSPECT PROJECT ===\n"
                "Name: " + project_name + "\n"
                "Claimed Suspect URL: " + project_url + "\n"
                "Infringement Evidence URL: " + evidence_url + "\n"
                "Scraped suspect content:\n" + evidence_web + "\n\n"
                "Compare the architectural logic, technical workflows, logic similarity, and design parameters. "
                "Assign a 'similarity_score' from 0 to 100 (where 0 is completely different/clean, and 100 is direct plagiarism/unauthorized copy).\n\n"
                "Decision rules:\n"
                "- If similarity_score >= 75: decision is INFRINGING.\n"
                "- Otherwise: decision is CLEAN.\n\n"
                "Respond with ONLY this JSON, no other text or explanation:\n"
                '{"decision":"INFRINGING|CLEAN",'
                '"similarity_score":N,'
                '"reason":"1-2 sentence technical analysis comparing the two systems"}'
            )
            raw_answer = gl.nondet.exec_prompt(prompt)
            return raw_answer.replace("```json", "").replace("```", "").strip()

        dispute_json = gl.eq_principle.strict_eq(run_infringement_check)
        try:
            data = json.loads(dispute_json)
        except Exception:
            return "INVALID_DISPUTE_JSON"

        decision = str(data.get("decision", ""))
        if decision not in ["INFRINGING", "CLEAN"]:
            return "INVALID_DECISION"
        similarity = int(data.get("similarity_score", 0))
        if similarity < 0 or similarity > 100:
            return "INVALID_SIMILARITY_SCORE"

        self.claim_similarity_scores[claim_id] = u256(similarity)
        self.claim_reasons[claim_id] = str(data.get("reason", ""))

        patent_owner = self.patent_owners[patent_id]
        patent_owner_id = self._get_or_create_user(patent_owner)
        complainant = self.claim_complainants[claim_id]
        complainant_id = self._get_or_create_user(complainant)
        project_owner = self.project_owners[project_id]
        project_owner_id = self._get_or_create_user(project_owner)

        if decision == "INFRINGING":
            self.claim_statuses[claim_id] = "RESOLVED_INFRINGING"
            self.project_statuses[project_id] = "SUSPENDED"

            escrow_amount = self.project_escrows[project_id]
            penalty = u256(200)
            if escrow_amount < penalty:
                penalty = escrow_amount

            self.project_escrows[project_id] = escrow_amount - penalty

            owner_reward = penalty
            complainant_reward = u256(0)
            if penalty == u256(200):
                owner_reward = u256(150)
                complainant_reward = u256(50)

            self.user_balances[patent_owner_id] = (
                self.user_balances[patent_owner_id] + owner_reward
            )
            self.user_balances[complainant_id] = (
                self.user_balances[complainant_id] + complainant_reward + u256(30)
            )
        else:
            self.claim_statuses[claim_id] = "RESOLVED_CLEAN"
            self.user_balances[project_owner_id] = (
                self.user_balances[project_owner_id] + u256(30)
            )

        return json.dumps(data, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_user(self, user_id: u256) -> str:
        if user_id >= self.user_count:
            return json.dumps(
                {"error": "INVALID_USER_ID"},
                sort_keys=True,
                separators=(",", ":"),
            )
        obj = {
            "address": self.user_addresses[user_id],
            "balance": str(self.user_balances[user_id]),
            "user_id": str(user_id),
        }
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_user_balance(self, address: str) -> u256:
        for idx in range(int(self.user_count)):
            if self.user_addresses[u256(idx)] == address:
                return self.user_balances[u256(idx)]
        return u256(0)

    @gl.public.view
    def get_patent(self, patent_id: u256) -> str:
        if patent_id >= self.patent_count:
            return json.dumps(
                {"error": "INVALID_PATENT_ID"},
                sort_keys=True,
                separators=(",", ":"),
            )
        obj = {
            "patent_id": str(patent_id),
            "title": self.patent_titles[patent_id],
            "description": self.patent_descriptions[patent_id],
            "url": self.patent_urls[patent_id],
            "owner": self.patent_owners[patent_id],
            "status": self.patent_statuses[patent_id],
            "uniqueness_score": str(self.patent_uniqueness_scores[patent_id]),
            "reason": self.patent_reasons[patent_id],
            "license_fee": str(self.patent_license_fees[patent_id]),
            "total_royalties": str(self.patent_total_royalties[patent_id]),
        }
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_project(self, project_id: u256) -> str:
        if project_id >= self.project_count:
            return json.dumps(
                {"error": "INVALID_PROJECT_ID"},
                sort_keys=True,
                separators=(",", ":"),
            )
        obj = {
            "project_id": str(project_id),
            "name": self.project_names[project_id],
            "url": self.project_urls[project_id],
            "owner": self.project_owners[project_id],
            "escrow": str(self.project_escrows[project_id]),
            "status": self.project_statuses[project_id],
        }
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_claim(self, claim_id: u256) -> str:
        if claim_id >= self.claim_count:
            return json.dumps(
                {"error": "INVALID_CLAIM_ID"},
                sort_keys=True,
                separators=(",", ":"),
            )
        obj = {
            "claim_id": str(claim_id),
            "patent_id": str(self.claim_patent_ids[claim_id]),
            "project_id": str(self.claim_project_ids[claim_id]),
            "evidence_url": self.claim_evidence_urls[claim_id],
            "status": self.claim_statuses[claim_id],
            "similarity_score": str(self.claim_similarity_scores[claim_id]),
            "reason": self.claim_reasons[claim_id],
            "complainant": self.claim_complainants[claim_id],
        }
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_user_count(self) -> u256:
        return self.user_count

    @gl.public.view
    def get_patent_count(self) -> u256:
        return self.patent_count

    @gl.public.view
    def get_project_count(self) -> u256:
        return self.project_count

    @gl.public.view
    def get_claim_count(self) -> u256:
        return self.claim_count
