"use client";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  GraduationCap,
  Medal,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortfolioHome({ onOpenLabs }: { onOpenLabs: () => void }) {
  return (
    <div className="portfolio-page">
      <section className="portfolio-hero">
        <div className="portfolio-hero-copy">
          <p className="eyebrow">SECURITY ENGINEERING · INFORMATION SYSTEMS</p>
          <h2>Hi, I&apos;m Aarav.</h2>
          <p className="portfolio-lede">
            I build practical security tooling, investigate how systems fail, and
            turn those findings into safer, easier-to-understand workflows.
          </p>
          <div className="portfolio-actions">
            <Button onClick={onOpenLabs}>
              <ShieldCheck size={16} /> Explore vulnerability labs
            </Button>
            <a className="outline-action" href="https://www.linkedin.com/in/aarav-rego/" target="_blank" rel="noreferrer">
              LinkedIn <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="portfolio-signal">
          <span className="signal-dot" />
          <strong>Currently building</strong>
          <p>Guardrail: a reproducible application security lab for XSS, prompt injection, and authentication controls.</p>
        </div>
      </section>

      <div className="portfolio-metrics">
        <div><strong>300+</strong><span>students reached through security workshops</span></div>
        <div><strong>100+</strong><span>endpoints supported through Intune configuration</span></div>
        <div><strong>71</strong><span>WAM in a UNSW Bachelor of Computer Science</span></div>
      </div>

      <section className="portfolio-section">
        <div className="portfolio-section-heading"><p className="eyebrow">EXPERIENCE</p><h2>Security work with an operational edge.</h2></div>
        <div className="portfolio-cards portfolio-experience">
          <article className="portfolio-card portfolio-card-wide"><BriefcaseBusiness className="portfolio-icon" /><div><div className="portfolio-card-top"><h3>Technology, Services and Platform Consultant</h3><span>Insurance Australia Group · 2026–present</span></div><p>Support PolicyCenter and BillingCenter across Australia and New Zealand, resolve 15–25 access and platform issues each week, and manage Microsoft Intune profiles across 100+ endpoints.</p></div></article>
          <article className="portfolio-card portfolio-card-wide"><ShieldCheck className="portfolio-icon" /><div><div className="portfolio-card-top"><h3>Outreach and Security Assistant</h3><span>UTS Faculty of Engineering and IT · 2022–2025</span></div><p>Delivered phishing, password security, and social engineering workshops to 300+ students; automated Dean&apos;s List certificate workflows and reduced processing time by 40%.</p></div></article>
          <article className="portfolio-card portfolio-card-wide"><ShieldCheck className="portfolio-icon" /><div><div className="portfolio-card-top"><h3>Security Monitoring and Investigation Lab</h3><span>Wazuh · Enriching Journeys</span></div><p>Built a centralised monitoring lab, investigated simulated incidents, refined alert rules, and documented response recommendations through reproducible tests.</p></div></article>
        </div>
      </section>

      <div className="portfolio-columns">
        <section className="portfolio-section compact"><div className="portfolio-section-heading"><p className="eyebrow">ACADEMICS</p><h2>Learning by building.</h2></div><article className="portfolio-card"><GraduationCap className="portfolio-icon" /><div><h3>Bachelor of Computer Science</h3><p>UNSW · 2022–2026</p><span className="portfolio-tag">71 WAM</span><p className="portfolio-muted">Focus areas include application security, networking, endpoint security, and systems.</p></div></article></section>
        <section className="portfolio-section compact"><div className="portfolio-section-heading"><p className="eyebrow">EXTRACURRICULARS</p><h2>Security is a team sport.</h2></div><div className="portfolio-cards"><article className="portfolio-card"><Users className="portfolio-icon" /><div><h3>Outreach Director</h3><p>CSESoc UNSW</p></div></article><article className="portfolio-card"><Medal className="portfolio-icon" /><div><h3>Competition highlights</h3><p>UTS CSEC CTF · First place<br />DataSoc × Atlassian × Allianz Datathon · Runner up</p></div></article></div></section>
      </div>

      <section className="portfolio-lab-cta"><div><p className="eyebrow">THE HANDS-ON PART</p><h2>See the security work in action.</h2><p>Run controlled tests, inspect evidence, and compare the vulnerable fixture with the hardened result.</p></div><Button variant="outline" onClick={onOpenLabs}>Open vulnerability labs <ArrowUpRight size={15} /></Button></section>
    </div>
  );
}
