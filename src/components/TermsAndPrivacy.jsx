import { useState } from "react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.tp-root { min-height: 100vh; background: #F7F3EE; font-family: 'DM Sans', sans-serif; color: #2C1A0E; }
.tp-topbar { background: #2C1A0E; padding: 14px 32px; display: flex; align-items: center; gap: 12px; }
.tp-logo { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #C4622D; background: #3D2B1A; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 16px; color: #E8D5C0; flex-shrink: 0; }
.tp-brand-name { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 500; color: #E8D5C0; }
.tp-brand-sub { font-size: 10px; color: #8B6B47; letter-spacing: 0.1em; text-transform: uppercase; }

.tp-hero { background: linear-gradient(150deg, #2C1A0E 0%, #3D2B1A 60%, #5C3D22 100%); padding: 48px 32px 44px; text-align: center; }
.tp-hero-eye { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #C4622D; margin-bottom: 14px; }
.tp-hero-h1 { font-family: 'Fraunces', serif; font-size: clamp(26px, 4vw, 42px); font-weight: 500; color: #F5EDE3; line-height: 1.15; margin-bottom: 12px; }
.tp-hero-p { font-size: 13px; color: #8B6B47; line-height: 1.7; max-width: 480px; margin: 0 auto; }

.tp-tabs { max-width: 800px; margin: 0 auto; padding: 36px 24px 0; display: flex; gap: 8px; }
.tp-tab { flex: 1; padding: 12px 20px; border-radius: 10px 10px 0 0; border: 1.5px solid #E8DDD0; border-bottom: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: #EDE8E0; color: #9C8068; text-align: center; }
.tp-tab.active { background: #FFFFFF; color: #2C1A0E; border-color: #E8DDD0; }
.tp-tab:hover:not(.active) { background: #E8E0D8; color: #6B4E35; }

.tp-body { max-width: 800px; margin: 0 auto; padding: 0 24px 64px; }
.tp-doc { background: #FFFFFF; border-radius: 0 0 16px 16px; border: 1.5px solid #E8DDD0; border-top: none; padding: 44px 52px; }

@media (max-width: 640px) {
  .tp-doc { padding: 28px 22px; }
  .tp-topbar { padding: 14px 20px; }
  .tp-hero { padding: 36px 20px 32px; }
  .tp-tabs { padding: 28px 16px 0; gap: 6px; }
  .tp-body { padding: 0 16px 50px; }
  .tp-tab { font-size: 12px; padding: 10px 12px; }
}

.tp-doc-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 500; color: #2C1A0E; margin-bottom: 6px; }
.tp-doc-date { font-size: 11px; color: #C4B5A5; letter-spacing: 0.08em; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #E8DDD0; }

.tp-section { margin-bottom: 36px; }
.tp-section:last-of-type { margin-bottom: 0; }

.tp-section-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 500; color: #2C1A0E; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.tp-section-num { width: 26px; height: 26px; border-radius: 50%; background: #FBF3ED; border: 1.5px solid #E8C5A8; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 500; color: #C4622D; flex-shrink: 0; font-family: 'DM Sans', sans-serif; }

.tp-p { font-size: 13.5px; color: #4A3526; line-height: 1.85; margin-bottom: 12px; }
.tp-p:last-child { margin-bottom: 0; }
.tp-p a { color: #C4622D; text-decoration: none; }
.tp-p a:hover { text-decoration: underline; }
.tp-p strong { color: #2C1A0E; font-weight: 500; }

.tp-list { margin: 10px 0 12px 0; padding-left: 0; list-style: none; }
.tp-list li { font-size: 13.5px; color: #4A3526; line-height: 1.8; padding: 5px 0 5px 22px; position: relative; }
.tp-list li::before { content: '—'; position: absolute; left: 0; color: #C4622D; font-size: 13px; }

.tp-highlight { background: #FBF3ED; border: 1px solid #E8C5A8; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
.tp-highlight .tp-p { color: #6B4E35; }
.tp-highlight .tp-p:last-child { margin-bottom: 0; }

.tp-contact-card { background: #FBF8F3; border: 1.5px solid #E8DDD0; border-radius: 12px; padding: 22px 26px; margin-top: 28px; }
.tp-contact-title { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500; color: #2C1A0E; margin-bottom: 16px; }
.tp-contact-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; font-size: 13px; color: #4A3526; }
.tp-contact-row:last-child { margin-bottom: 0; }
.tp-contact-row a { color: #C4622D; text-decoration: none; }
.tp-contact-row a:hover { text-decoration: underline; }
.tp-contact-icon { width: 32px; height: 32px; border-radius: 50%; background: #FBF3ED; border: 1px solid #E8C5A8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.tp-divider { height: 1px; background: #E8DDD0; margin: 28px 0; }

.tp-footer-note { text-align: center; font-size: 11px; color: #C4B5A5; margin-top: 28px; line-height: 1.7; padding: 0 20px; }

.tp-footer { background: #2C1A0E; padding: 20px 32px; text-align: center; font-size: 11px; color: #4A3526; letter-spacing: 0.06em; margin-top: 40px; }
`;

const CONTACT = {
  email: "kelli.owens@theKOrealtygroup.com",
  phone: "346-628-5216",
  name: "Kelli Owens",
  company: "CKO Global LLC — TalkToKelli.com",
};

const EFFECTIVE = "April 6, 2026";

function IconEmail() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="3" width="13" height="9" rx="1.5" stroke="#C4622D" strokeWidth="1.2"/>
      <path d="M1 4.5l6.5 4.5L14 4.5" stroke="#C4622D" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 2.5C2 2 2.5 1.5 3 1.5h2.5l1 3-1.5 1a9 9 0 004.5 4.5l1-1.5 3 1V12c0 .5-.5 1-1 1C5.5 13 2 8.5 2 2.5z" stroke="#C4622D" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function IconBiz() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="4.5" width="12" height="9" rx="1" stroke="#C4622D" strokeWidth="1.2"/>
      <path d="M5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5" stroke="#C4622D" strokeWidth="1.2"/>
      <path d="M1.5 8.5h12" stroke="#C4622D" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function Terms() {
  return (
    <div>
      <div className="tp-doc-title">Terms &amp; Conditions</div>
      <div className="tp-doc-date">Effective Date: {EFFECTIVE} &nbsp;·&nbsp; Last Updated: {EFFECTIVE}</div>

      <div className="tp-highlight">
        <p className="tp-p">Please read these Terms carefully before using TalkToKelli.com or submitting any coaching intake form. By using this site or submitting your information, you agree to be bound by the terms below.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">1</span>Who We Are</div>
        <p className="tp-p">TalkToKelli.com is operated by <strong>CKO Global LLC</strong>, a real estate education and coaching company founded by Kelli Owens. References to "Kelli," "we," "us," or "our" in these Terms refer to CKO Global LLC and its representatives.</p>
        <p className="tp-p">Kelli Owens is a licensed Texas real estate agent. Coaching services provided through this platform are educational in nature and are not legal, financial, tax, or investment advisory services.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">2</span>Services Provided</div>
        <p className="tp-p">This platform provides:</p>
        <ul className="tp-list">
          <li>A pre-call coaching intake and agenda-setting form</li>
          <li>AI-assisted prompting tools to help you articulate your goals</li>
          <li>Scheduling access to one-on-one coaching sessions with Kelli Owens</li>
          <li>Educational real estate investing coaching content and guidance</li>
        </ul>
        <p className="tp-p">Coaching sessions are designed to educate, motivate, and guide — not to replace the advice of a licensed financial advisor, attorney, accountant, or mortgage professional. You are solely responsible for any real estate investment decisions you make.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">3</span>Coaching Relationship</div>
        <p className="tp-p">Entering into a coaching relationship with Kelli Owens does not create a fiduciary, legal, or agency relationship. Coaching is a collaborative, results-focused process — the outcomes depend significantly on your own effort, commitment, and follow-through.</p>
        <p className="tp-p"><strong>No guarantees of results are made or implied.</strong> Real estate investing involves risk. Past results discussed in educational content are not indicative of future results for any individual client.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">4</span>Pre-Call Intake Form</div>
        <p className="tp-p">By submitting the pre-call agenda form, you:</p>
        <ul className="tp-list">
          <li>Consent to your answers being reviewed by Kelli Owens and her AI-assisted coaching tools</li>
          <li>Understand that your responses will be used to prepare coaching notes and guide your session</li>
          <li>Acknowledge that submitted information is transmitted via email and is subject to the limitations of that medium</li>
          <li>Confirm that the information you provide is accurate and your own</li>
        </ul>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">5</span>AI-Powered Tools</div>
        <p className="tp-p">This platform uses AI tools (including Anthropic's Claude) to generate prompting questions, follow-up questions, and coaching preparation notes. By using these features, you understand and agree that:</p>
        <ul className="tp-list">
          <li>AI-generated content is for informational and organizational purposes only</li>
          <li>AI responses are not reviewed for accuracy in real time and should not be treated as professional advice</li>
          <li>Your inputs may be processed through third-party AI systems subject to their own terms and privacy policies</li>
          <li>Kelli Owens reviews and applies her own professional judgment to all coaching engagements</li>
        </ul>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">6</span>Scheduling &amp; Cancellations</div>
        <p className="tp-p">Coaching calls are scheduled through the booking system linked from this portal. Please review any specific cancellation or rescheduling policies provided at the time of booking. As a general courtesy:</p>
        <ul className="tp-list">
          <li>Provide at least 24 hours notice if you need to reschedule</li>
          <li>Complete and submit your pre-call agenda before booking your call</li>
          <li>Late arrivals may result in a shortened session time</li>
        </ul>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">7</span>Intellectual Property</div>
        <p className="tp-p">All content on TalkToKelli.com — including the Exit First Framework™, Proactively Lazy™ methodology, coaching materials, scripts, and platform design — is the intellectual property of CKO Global LLC. You may not reproduce, share, sell, or distribute coaching content without written permission.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">8</span>Limitation of Liability</div>
        <p className="tp-p">To the fullest extent permitted by law, CKO Global LLC and Kelli Owens shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of this platform or participation in coaching services. Our total liability for any claim shall not exceed the amount paid for the specific coaching session in question.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">9</span>Governing Law</div>
        <p className="tp-p">These Terms are governed by the laws of the State of Texas. Any disputes shall be resolved in the courts of Harris County, Texas, or through mutually agreed-upon mediation.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">10</span>Changes to These Terms</div>
        <p className="tp-p">We may update these Terms from time to time. The most current version will always be available on this page with the updated effective date. Continued use of the platform after changes constitutes your acceptance of the updated Terms.</p>
      </div>

      <div className="tp-divider" />

      <div className="tp-contact-card">
        <div className="tp-contact-title">Questions About These Terms?</div>
        <div className="tp-contact-row"><div className="tp-contact-icon"><IconEmail /></div><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>
        <div className="tp-contact-row"><div className="tp-contact-icon"><IconPhone /></div><a href={`tel:${CONTACT.phone.replace(/-/g,"")}`}>{CONTACT.phone}</a></div>
        <div className="tp-contact-row"><div className="tp-contact-icon"><IconBiz /></div><span>{CONTACT.company}</span></div>
      </div>
    </div>
  );
}

function Privacy() {
  return (
    <div>
      <div className="tp-doc-title">Privacy Policy</div>
      <div className="tp-doc-date">Effective Date: {EFFECTIVE} &nbsp;·&nbsp; Last Updated: {EFFECTIVE}</div>

      <div className="tp-highlight">
        <p className="tp-p">Your privacy matters. This policy explains what information we collect, how we use it, and your rights regarding your data when you use TalkToKelli.com.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">1</span>Who This Policy Covers</div>
        <p className="tp-p">This Privacy Policy applies to all visitors and users of TalkToKelli.com, including anyone who submits a pre-call intake form, books a coaching session, or otherwise interacts with this platform. It is operated by <strong>CKO Global LLC</strong>, a Texas-based real estate education company.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">2</span>Information We Collect</div>
        <p className="tp-p"><strong>Information you provide directly:</strong></p>
        <ul className="tp-list">
          <li>Name, email address, and phone number</li>
          <li>Coaching session number and call history notes</li>
          <li>Your responses to the pre-call agenda form (goals, accomplishments, questions, priorities)</li>
          <li>Answers to AI-generated follow-up qualifying questions</li>
        </ul>
        <p className="tp-p" style={{ marginTop: 14 }}><strong>Information collected automatically:</strong></p>
        <ul className="tp-list">
          <li>Basic browser and device information (type, screen size)</li>
          <li>General geographic region (not precise location)</li>
          <li>Pages visited and time spent on the platform</li>
        </ul>
        <p className="tp-p" style={{ marginTop: 14 }}>We do not collect payment card information directly. Any payments are processed through third-party platforms (such as Stripe or GHL) under their own privacy policies.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">3</span>How We Use Your Information</div>
        <p className="tp-p">We use the information you provide to:</p>
        <ul className="tp-list">
          <li>Prepare Kelli for your coaching call and personalize your session</li>
          <li>Generate AI-assisted coaching notes and follow-up questions (using Anthropic Claude)</li>
          <li>Send you your booking link and Zoom call confirmation</li>
          <li>Communicate with you about your coaching engagement</li>
          <li>Maintain records of your coaching progress over time</li>
          <li>Improve the platform and coaching experience</li>
        </ul>
        <p className="tp-p">We do <strong>not</strong> sell your personal information. We do not use your information for unrelated advertising or share it with third-party marketers.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">4</span>AI Processing of Your Data</div>
        <p className="tp-p">This platform uses Anthropic's Claude AI to process your form responses in two ways:</p>
        <ul className="tp-list">
          <li><strong>Hint generation</strong> — when you request prompting help on a form section</li>
          <li><strong>Qualifying questions</strong> — AI reads your agenda and generates targeted follow-ups</li>
          <li><strong>Coaching prep notes</strong> — AI analyzes your full submission to help Kelli prepare for your call</li>
        </ul>
        <p className="tp-p">Your inputs are sent to Anthropic's API to generate these responses. Anthropic's own privacy policy governs how they handle data on their end. We do not store your inputs within the AI system beyond what is needed to complete each request.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">5</span>Email &amp; Communications</div>
        <p className="tp-p">When you submit your pre-call agenda, the completed form is sent via email to Kelli Owens at the address you provide and to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. Standard email is not encrypted end-to-end. Please do not include highly sensitive personal or financial information in your form responses beyond what is necessary for coaching preparation.</p>
        <p className="tp-p">By providing your email and phone number, you consent to receiving coaching-related communications from Kelli Owens, including your booking link, session confirmation, and follow-up resources. You may opt out at any time by replying to any email with "unsubscribe" or contacting us directly.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">6</span>Data Retention</div>
        <p className="tp-p">We retain coaching intake information for the duration of your active coaching relationship and for a reasonable period after to support follow-up and continuity. If you would like your information removed from our records, please contact us using the details below and we will honor that request within 30 days.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">7</span>Third-Party Services</div>
        <p className="tp-p">This platform uses the following third-party services, each with their own privacy policies:</p>
        <ul className="tp-list">
          <li><strong>Anthropic (Claude AI)</strong> — AI response generation — <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">anthropic.com/privacy</a></li>
          <li><strong>Vercel</strong> — Platform hosting and serverless functions</li>
          <li><strong>HeyGen</strong> — AI video hosting for the welcome message</li>
          <li><strong>Google Fonts</strong> — Typography (no personal data collected)</li>
          <li><strong>GoHighLevel (GHL)</strong> — CRM and scheduling (if applicable to your booking)</li>
        </ul>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">8</span>Your Rights</div>
        <p className="tp-p">Depending on your location, you may have rights regarding your personal information, including the right to:</p>
        <ul className="tp-list">
          <li>Access the information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal data</li>
          <li>Opt out of communications at any time</li>
        </ul>
        <p className="tp-p">To exercise any of these rights, contact us at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. We will respond within 30 days.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">9</span>Children's Privacy</div>
        <p className="tp-p">This platform is intended for adults 18 years of age and older. We do not knowingly collect personal information from anyone under 18. If you believe a minor has submitted information through this platform, please contact us immediately and we will remove it.</p>
      </div>

      <div className="tp-section">
        <div className="tp-section-title"><span className="tp-section-num">10</span>Changes to This Policy</div>
        <p className="tp-p">We may update this Privacy Policy periodically. When we do, we will update the effective date at the top of this page. Continued use of the platform after any updates constitutes acceptance of the revised policy. Material changes will be communicated directly to active coaching clients where feasible.</p>
      </div>

      <div className="tp-divider" />

      <div className="tp-contact-card">
        <div className="tp-contact-title">Privacy Questions or Requests</div>
        <div className="tp-contact-row"><div className="tp-contact-icon"><IconEmail /></div><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>
        <div className="tp-contact-row"><div className="tp-contact-icon"><IconPhone /></div><a href={`tel:${CONTACT.phone.replace(/-/g,"")}`}>{CONTACT.phone}</a></div>
        <div className="tp-contact-row"><div className="tp-contact-icon"><IconBiz /></div><span>{CONTACT.company}</span></div>
      </div>
    </div>
  );
}

export default function TermsAndPrivacy() {
  const [tab, setTab] = useState("terms");

  return (
    <>
      <style>{css}</style>
      <div className="tp-root">
        <div className="tp-topbar">
          <div className="tp-logo">K</div>
          <div>
            <div className="tp-brand-name">Kelli Owens</div>
            <div className="tp-brand-sub">Real Estate Coach · TalkToKelli.com</div>
          </div>
        </div>

        <div className="tp-hero">
          <div className="tp-hero-eye">Legal &amp; Privacy</div>
          <h1 className="tp-hero-h1">Terms &amp; Privacy Policy</h1>
          <p className="tp-hero-p">Clear, plain-language policies for how we work together and how your information is handled.</p>
        </div>

        <div className="tp-tabs">
          <button className={`tp-tab${tab === "terms" ? " active" : ""}`} onClick={() => setTab("terms")}>
            Terms &amp; Conditions
          </button>
          <button className={`tp-tab${tab === "privacy" ? " active" : ""}`} onClick={() => setTab("privacy")}>
            Privacy Policy
          </button>
        </div>

        <div className="tp-body">
          <div className="tp-doc">
            {tab === "terms" ? <Terms /> : <Privacy />}
          </div>

          <div className="tp-footer-note">
            These documents apply to TalkToKelli.com and related coaching services operated by CKO Global LLC.<br />
            For questions, contact <a href={`mailto:${CONTACT.email}`} style={{ color: "#C4622D" }}>{CONTACT.email}</a> or call <a href="tel:3466285216" style={{ color: "#C4622D" }}>346-628-5216</a>.
          </div>
        </div>

        <div className="tp-footer">
          © {new Date().getFullYear()} CKO Global LLC · TalkToKelli.com · All rights reserved
        </div>
      </div>
    </>
  );
}
