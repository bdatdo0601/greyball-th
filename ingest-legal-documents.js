#!/usr/bin/env node

/**
 * Legal Document Ingestion Script
 * 
 * Ingests 5 placeholder legal-based HTML documents through the Document Management API.
 * This script creates realistic legal documents with proper TipTap-compatible HTML formatting and metadata.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_ENDPOINT = `${API_BASE_URL}/api/documents`;

/**
 * Legal document templates with realistic content in TipTap-compatible HTML format
 */
const legalDocuments = [
  {
    title: "Software License Agreement - ProLegal Suite v2.1",
    content: `<h1>SOFTWARE LICENSE AGREEMENT</h1><p><strong>ProLegal Suite v2.1</strong></p><hr><h2>1. DEFINITIONS</h2><p><strong>"Agreement"</strong> means this Software License Agreement.</p><p><strong>"Licensee"</strong> means the individual or entity that has been granted a license to use the Software.</p><p><strong>"Licensor"</strong> means ProLegal Technologies Inc., a Delaware corporation.</p><p><strong>"Software"</strong> means the ProLegal Suite software application, version 2.1, including all updates, modifications, and documentation.</p><hr><h2>2. GRANT OF LICENSE</h2><p>Subject to the terms and conditions of this Agreement, Licensor hereby grants to Licensee a <strong>non-exclusive, non-transferable, revocable license</strong> to:</p><ul><li>Install and use the Software on a maximum of <strong>three (3) devices</strong></li><li>Create backup copies for archival purposes only</li><li>Use the Software for internal business operations only</li></ul><hr><h2>3. RESTRICTIONS</h2><p>Licensee shall <strong>NOT</strong>:</p><ol><li><strong>Reverse engineer</strong>, decompile, or disassemble the Software</li><li><strong>Distribute, sublicense, or transfer</strong> the Software to third parties</li><li><strong>Modify or create derivative works</strong> based on the Software</li><li><strong>Remove or alter</strong> any proprietary notices or labels</li></ol><hr><h2>4. TERM AND TERMINATION</h2><h3>4.1 Term</h3><p>This Agreement is effective from the date of installation and shall continue until terminated.</p><h3>4.2 Termination</h3><p>This Agreement may be terminated:</p><ul><li>By Licensee at any time by uninstalling the Software</li><li>By Licensor immediately upon breach of any term herein</li><li>Automatically if Licensee files for bankruptcy</li></ul><h3>4.3 Effect of Termination</h3><p>Upon termination, Licensee must:</p><ul><li>Cease all use of the Software</li><li>Delete all copies from all devices</li><li>Return or destroy all documentation</li></ul><hr><h2>5. WARRANTY DISCLAIMER</h2><p>THE SOFTWARE IS PROVIDED <strong>"AS IS"</strong> WITHOUT WARRANTY OF ANY KIND. LICENSOR DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p><ul><li>MERCHANTABILITY</li><li>FITNESS FOR A PARTICULAR PURPOSE</li><li>NON-INFRINGEMENT</li></ul><hr><h2>6. LIMITATION OF LIABILITY</h2><p>IN NO EVENT SHALL LICENSOR BE LIABLE FOR ANY <strong>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</strong>, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p><hr><h2>7. GOVERNING LAW</h2><p>This Agreement shall be governed by and construed in accordance with the laws of the <strong>State of Delaware</strong>, without regard to its conflict of law provisions.</p><hr><h2>8. ENTIRE AGREEMENT</h2><p>This Agreement constitutes the entire agreement between the parties and supersedes all prior or contemporaneous agreements relating to the subject matter hereof.</p><hr><p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of the date of installation.</p><p><strong>AGREED AND ACCEPTED:</strong></p><p><strong>ProLegal Technologies Inc.</strong><br>By: ________________________<br>Name: Sarah Mitchell<br>Title: Chief Legal Officer<br>Date: _______________</p>`,
    metadata: {
      documentType: "software_license",
      category: "intellectual_property",
      jurisdiction: "Delaware",
      version: "2.1",
      effectiveDate: "2024-01-15",
      lastReviewed: "2024-07-15",
      author: "Sarah Mitchell, CLO",
      tags: ["software", "license", "intellectual-property", "commercial"],
      confidentiality: "public",
      language: "en-US"
    }
  },
  
  {
    title: "Employment Agreement - Senior Software Engineer",
    content: `<h1>EMPLOYMENT AGREEMENT</h1><p><strong>Position: Senior Software Engineer</strong></p><hr><h2>PARTIES</h2><p><strong>Employer:</strong> TechCorp Solutions LLC<br>123 Innovation Drive<br>San Francisco, CA 94105</p><p><strong>Employee:</strong> [Employee Name]<br>[Employee Address]</p><hr><h2>1. EMPLOYMENT TERMS</h2><h3>1.1 Position and Duties</h3><p>Employee is hereby employed as a <strong>Senior Software Engineer</strong> reporting to the Chief Technology Officer. Employee agrees to:</p><ul><li>Perform duties consistent with the position and title</li><li>Devote full professional time and attention to the business</li><li>Perform all duties <strong>faithfully, diligently, and competently</strong></li><li>Comply with all company policies and procedures</li></ul><h3>1.2 Location</h3><p>Employee shall work primarily at Employer's offices in San Francisco, CA, with <strong>hybrid remote work</strong> options as approved by management.</p><hr><h2>2. COMPENSATION AND BENEFITS</h2><h3>2.1 Base Salary</h3><p>Employee shall receive an annual base salary of <strong>$165,000</strong>, payable in regular bi-weekly installments, subject to applicable withholdings.</p><h3>2.2 Performance Bonus</h3><p>Employee may be eligible for an annual performance bonus of up to <strong>25% of base salary</strong>, based on:</p><ul><li>Individual performance metrics</li><li>Company financial performance</li><li>Achievement of departmental goals</li></ul><h3>2.3 Equity Compensation</h3><p>Employee shall receive:</p><ul><li><strong>Stock options</strong> for 5,000 shares at current fair market value</li><li><strong>Restricted Stock Units (RSUs)</strong> totaling $25,000 annually</li><li>Vesting schedule: 25% after 1 year, then quarterly over 3 years</li></ul><h3>2.4 Benefits Package</h3><ul><li><strong>Health Insurance:</strong> Premium medical, dental, and vision coverage</li><li><strong>Retirement:</strong> 401(k) with 6% company match</li><li><strong>Time Off:</strong> 20 days PTO annually plus standard holidays</li><li><strong>Professional Development:</strong> $3,000 annual allowance</li></ul><hr><h2>3. CONFIDENTIALITY AND INTELLECTUAL PROPERTY</h2><h3>3.1 Confidential Information</h3><p>Employee acknowledges access to <strong>Confidential Information</strong> including:</p><ul><li>Technical specifications and source code</li><li>Business strategies and customer lists</li><li>Financial data and pricing information</li><li>Product roadmaps and development plans</li></ul><h3>3.2 Work Product</h3><p>All <strong>work product</strong> created during employment belongs exclusively to Employer, including:</p><ul><li>Software code and documentation</li><li>Inventions and improvements</li><li>Designs and processes</li><li>Research and analysis</li></ul><hr><h2>4. POST-EMPLOYMENT RESTRICTIONS</h2><h3>4.1 Non-Competition</h3><p>For <strong>12 months</strong> following termination, Employee shall not:</p><ul><li>Work for direct competitors in the same geographic market</li><li>Start a competing business</li><li>Solicit Employer's customers or clients</li></ul><h3>4.2 Non-Solicitation</h3><p>For <strong>18 months</strong> following termination, Employee shall not:</p><ul><li>Solicit Employer's employees for employment elsewhere</li><li>Induce employees to breach their employment agreements</li><li>Recruit employees for competing businesses</li></ul><hr><h2>5. TERMINATION</h2><h3>5.1 At-Will Employment</h3><p>Employment is <strong>at-will</strong> and may be terminated by either party with or without cause and with or without notice.</p><h3>5.2 Severance</h3><p>If terminated without cause, Employee shall receive:</p><ul><li><strong>6 months</strong> base salary continuation</li><li><strong>COBRA premium</strong> payments for 6 months</li><li>Accelerated vesting of 25% unvested equity</li></ul><hr><h2>6. DISPUTE RESOLUTION</h2><h3>6.1 Arbitration</h3><p>All disputes shall be resolved through <strong>binding arbitration</strong> under the rules of the American Arbitration Association.</p><h3>6.2 Governing Law</h3><p>This Agreement shall be governed by the laws of the <strong>State of California</strong>.</p><hr><h2>SIGNATURES</h2><p><strong>EMPLOYER:</strong></p><p>TechCorp Solutions LLC</p><p>By: ________________________<br>Name: Michael Rodriguez<br>Title: Chief Executive Officer<br>Date: _______________</p><p><strong>EMPLOYEE:</strong></p><p>________________________<br>Signature</p><p>________________________<br>Print Name</p><p>Date: _______________</p>`,
    metadata: {
      documentType: "employment_agreement",
      category: "employment_law",
      jurisdiction: "California",
      position: "Senior Software Engineer",
      salaryRange: "$150k-$200k",
      effectiveDate: "2024-02-01",
      lastReviewed: "2024-06-01",
      author: "Michael Rodriguez, CEO",
      tags: ["employment", "software-engineer", "equity", "at-will", "non-compete"],
      confidentiality: "confidential",
      language: "en-US"
    }
  },

  {
    title: "Service Agreement - Cloud Infrastructure Management",
    content: `<h1>SERVICE AGREEMENT</h1><p><strong>Cloud Infrastructure Management Services</strong></p><hr><h2>CONTRACTING PARTIES</h2><p><strong>Service Provider:</strong><br>CloudOps Professional Services Inc.<br>456 Technology Blvd, Suite 300<br>Seattle, WA 98101<br>Tax ID: 91-1234567</p><p><strong>Client:</strong><br>[Client Company Name]<br>[Client Address]</p><hr><h2>1. SCOPE OF SERVICES</h2><h3>1.1 Infrastructure Management</h3><p>Service Provider shall provide comprehensive cloud infrastructure management services including:</p><ul><li><strong>24/7 monitoring</strong> of client's cloud environments</li><li><strong>Automated scaling</strong> and resource optimization</li><li><strong>Security patching</strong> and vulnerability management</li><li><strong>Backup and disaster recovery</strong> implementation</li><li><strong>Performance tuning</strong> and cost optimization</li></ul><h3>1.2 Cloud Platforms</h3><p>Services cover the following platforms:</p><ul><li>Amazon Web Services (AWS)</li><li>Microsoft Azure</li><li>Google Cloud Platform (GCP)</li><li>Hybrid and multi-cloud architectures</li></ul><h3>1.3 Service Level Objectives</h3><ul><li><strong>Uptime:</strong> 99.9% availability guarantee</li><li><strong>Response Time:</strong> Critical issues within 15 minutes</li><li><strong>Resolution Time:</strong> P1 incidents within 4 hours</li><li><strong>Reporting:</strong> Monthly performance and cost reports</li></ul><hr><h2>2. TERM AND PAYMENT</h2><h3>2.1 Service Term</h3><p>This Agreement shall commence on <strong>March 1, 2024</strong> and continue for an initial term of <strong>24 months</strong>, automatically renewing for successive 12-month periods unless terminated.</p><h3>2.2 Service Fees</h3><p><strong>Monthly Service Fee:</strong> $8,500 per month, invoiced monthly in advance.</p><p><strong>Additional Services:</strong></p><ul><li>Emergency response outside business hours: $250/hour</li><li>Custom automation development: $175/hour</li><li>Migration services: $150/hour</li><li>Training sessions: $200/hour per participant</li></ul><h3>2.3 Payment Terms</h3><ul><li>Invoices due within <strong>30 days</strong> of receipt</li><li>Late payments subject to <strong>1.5% monthly finance charge</strong></li><li>Suspension of services after 60 days past due</li></ul><hr><h2>3. DATA SECURITY AND COMPLIANCE</h2><h3>3.1 Security Standards</h3><p>Service Provider maintains:</p><ul><li><strong>SOC 2 Type II</strong> certification</li><li><strong>ISO 27001</strong> compliance</li><li><strong>GDPR</strong> and <strong>CCPA</strong> data protection measures</li><li><strong>HIPAA</strong> compliance where applicable</li></ul><h3>3.2 Access Controls</h3><ul><li><strong>Multi-factor authentication</strong> for all administrative access</li><li><strong>Role-based permissions</strong> with principle of least privilege</li><li><strong>Audit logging</strong> of all system changes</li><li><strong>Encrypted communications</strong> for all data transmission</li></ul><h3>3.3 Data Ownership</h3><p>Client retains <strong>complete ownership</strong> of all data. Service Provider:</p><ul><li>Acts solely as data processor</li><li>Cannot access data except as necessary for services</li><li>Will return or delete all data upon termination</li></ul><hr><h2>4. INTELLECTUAL PROPERTY</h2><h3>4.1 Client IP</h3><p>All client data, configurations, and customizations remain the <strong>exclusive property</strong> of Client.</p><h3>4.2 Provider IP</h3><p>Service Provider retains ownership of:</p><ul><li>Proprietary tools and methodologies</li><li>Generic automation scripts (non-client specific)</li><li>Knowledge and experience gained</li></ul><h3>4.3 Developed IP</h3><p>Custom solutions developed specifically for Client become <strong>joint property</strong>, with Client receiving perpetual usage rights.</p><hr><h2>5. WARRANTIES AND DISCLAIMERS</h2><h3>5.1 Service Warranties</h3><p>Service Provider warrants:</p><ul><li>Services performed with <strong>industry-standard practices</strong></li><li>Personnel appropriately <strong>trained and certified</strong></li><li>Compliance with all <strong>applicable regulations</strong></li><li><strong>Commercially reasonable efforts</strong> to meet SLOs</li></ul><h3>5.2 Disclaimer</h3><p>EXCEPT AS EXPRESSLY SET FORTH HEREIN, ALL SERVICES ARE PROVIDED <strong>"AS IS"</strong> WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</p><hr><h2>6. LIMITATION OF LIABILITY</h2><h3>6.1 Liability Cap</h3><p>Service Provider's total liability shall not exceed the <strong>total fees paid</strong> in the 12 months preceding the claim.</p><h3>6.2 Excluded Damages</h3><p>Neither party shall be liable for <strong>CONSEQUENTIAL, INDIRECT, SPECIAL, INCIDENTAL, OR PUNITIVE DAMAGES</strong>, including but not limited to:</p><ul><li>Lost profits or revenue</li><li>Business interruption</li><li>Loss of data or use</li><li>Cost of substitute services</li></ul><hr><h2>7. TERMINATION</h2><h3>7.1 Termination for Convenience</h3><p>Either party may terminate with <strong>90 days written notice</strong>.</p><h3>7.2 Termination for Cause</h3><p>Immediate termination allowed for:</p><ul><li>Material breach uncured for 30 days</li><li>Insolvency or bankruptcy</li><li>Violation of confidentiality obligations</li></ul><h3>7.3 Transition Services</h3><p>Upon termination, Service Provider will provide <strong>60 days of transition assistance</strong> at standard hourly rates.</p><hr><h2>EXECUTION</h2><p>Each party represents that it has the authority to enter into this Agreement.</p><p><strong>SERVICE PROVIDER:</strong></p><p>CloudOps Professional Services Inc.</p><p>By: ________________________<br>Name: Jennifer Kim<br>Title: Chief Operating Officer<br>Date: _______________</p><p><strong>CLIENT:</strong></p><p>[Client Company Name]</p><p>By: ________________________<br>Name: _____________________<br>Title: ____________________<br>Date: _______________</p>`,
    metadata: {
      documentType: "service_agreement",
      category: "commercial_contract",
      jurisdiction: "Washington",
      serviceType: "cloud_infrastructure",
      contractValue: "$204,000_annually",
      effectiveDate: "2024-03-01",
      lastReviewed: "2024-07-01",
      author: "Jennifer Kim, COO",
      tags: ["cloud", "infrastructure", "SLA", "24x7", "AWS", "Azure", "GCP"],
      confidentiality: "confidential",
      language: "en-US"
    }
  },

  {
    title: "Privacy Policy - Digital Marketing Platform",
    content: `<h1>PRIVACY POLICY</h1><p><strong>MarketingHub Digital Platform</strong></p><p><em>Last Updated: July 28, 2024</em></p><hr><h2>1. INTRODUCTION</h2><p>Welcome to <strong>MarketingHub</strong>, a comprehensive digital marketing platform operated by <strong>MarketingHub Technologies Inc.</strong> ("we," "us," or "our"). This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our services.</p><p><strong>By using our platform, you consent to the data practices described in this policy.</strong></p><hr><h2>2. INFORMATION WE COLLECT</h2><h3>2.1 Personal Information</h3><p>We collect information you provide directly to us:</p><p><strong>Account Information:</strong></p><ul><li>Name, email address, phone number</li><li>Company name and job title</li><li>Billing address and payment information</li><li>Profile photo and bio</li></ul><p><strong>Content and Communications:</strong></p><ul><li>Marketing campaigns and content you create</li><li>Messages sent through our platform</li><li>Customer support communications</li><li>Feedback and survey responses</li></ul><h3>2.2 Automatically Collected Information</h3><p>When you use our platform, we automatically collect:</p><p><strong>Usage Data:</strong></p><ul><li>Pages visited and features used</li><li>Time spent on platform and session duration</li><li>Click-through rates and engagement metrics</li><li>Device and browser information</li></ul><p><strong>Technical Data:</strong></p><ul><li>IP address and location data</li><li>Cookies and similar tracking technologies</li><li>Log files and error reports</li><li>API usage statistics</li></ul><h3>2.3 Third-Party Data</h3><p>We may receive information from third parties:</p><ul><li><strong>Social media platforms</strong> (Facebook, LinkedIn, Twitter)</li><li><strong>Analytics providers</strong> (Google Analytics, Mixpanel)</li><li><strong>Data enrichment services</strong> (Clearbit, ZoomInfo)</li><li><strong>Integration partners</strong> (Salesforce, HubSpot, Mailchimp)</li></ul><hr><h2>3. HOW WE USE YOUR INFORMATION</h2><h3>3.1 Primary Uses</h3><p>We use your information to:</p><ul><li><strong>Provide and improve</strong> our marketing platform services</li><li><strong>Process transactions</strong> and send billing communications</li><li><strong>Deliver customer support</strong> and respond to inquiries</li><li><strong>Send platform updates</strong> and service notifications</li><li><strong>Personalize your experience</strong> and recommendations</li></ul><h3>3.2 Marketing Communications</h3><p>With your consent, we may use your information to:</p><ul><li>Send promotional emails about new features</li><li>Provide industry insights and best practices</li><li>Invite you to webinars and events</li><li>Share case studies and success stories</li></ul><p><em>You can opt out of marketing communications at any time.</em></p><h3>3.3 Analytics and Improvements</h3><p>We use aggregated, de-identified data to:</p><ul><li>Analyze platform usage patterns</li><li>Improve our algorithms and features</li><li>Conduct market research</li><li>Generate industry benchmarks</li></ul><hr><h2>4. INFORMATION SHARING AND DISCLOSURE</h2><h3>4.1 With Your Consent</h3><p>We may share your information:</p><ul><li>When you explicitly authorize sharing</li><li>For integrations you enable (e.g., CRM systems)</li><li>When you participate in joint marketing campaigns</li></ul><h3>4.2 Service Providers</h3><p>We share information with trusted third-party service providers:</p><p><strong>Cloud Infrastructure:</strong></p><ul><li>AWS for hosting and storage</li><li>Cloudflare for security and performance</li></ul><p><strong>Analytics and Marketing:</strong></p><ul><li>Google Analytics for usage analysis</li><li>Intercom for customer support</li><li>Stripe for payment processing</li></ul><p><strong>Communication Services:</strong></p><ul><li>SendGrid for email delivery</li><li>Twilio for SMS notifications</li><li>Slack for team communications</li></ul><h3>4.3 Legal Requirements</h3><p>We may disclose information when required by law:</p><ul><li>In response to subpoenas or court orders</li><li>To comply with regulatory requirements</li><li>To protect our rights and prevent fraud</li><li>To ensure platform security and integrity</li></ul><h3>4.4 Business Transfers</h3><p>In the event of a merger, acquisition, or asset sale, your information may be transferred as part of the business assets.</p><hr><h2>5. DATA SECURITY</h2><h3>5.1 Security Measures</h3><p>We implement industry-standard security measures:</p><p><strong>Encryption:</strong></p><ul><li>TLS 1.3 for data in transit</li><li>AES-256 encryption for data at rest</li><li>End-to-end encryption for sensitive communications</li></ul><p><strong>Access Controls:</strong></p><ul><li>Multi-factor authentication required</li><li>Role-based access permissions</li><li>Regular access reviews and deprovisioning</li></ul><p><strong>Infrastructure Security:</strong></p><ul><li>SOC 2 Type II certified data centers</li><li>Network segmentation and firewalls</li><li>Intrusion detection and monitoring</li><li>Regular security audits and penetration testing</li></ul><h3>5.2 Employee Access</h3><p>Access to personal information is limited to employees who need it for legitimate business purposes. All employees undergo security training and sign confidentiality agreements.</p><h3>5.3 Data Retention</h3><p>We retain personal information for as long as necessary to provide services and comply with legal obligations:</p><ul><li><strong>Account data:</strong> Retained while account is active + 3 years</li><li><strong>Usage logs:</strong> Retained for 12 months</li><li><strong>Financial records:</strong> Retained for 7 years per tax requirements</li><li><strong>Marketing data:</strong> Until opt-out or account deletion</li></ul><hr><h2>6. YOUR PRIVACY RIGHTS</h2><h3>6.1 Access and Portability</h3><p>You have the right to:</p><ul><li><strong>Access</strong> your personal information we hold</li><li><strong>Download</strong> your data in a machine-readable format</li><li><strong>Request copies</strong> of information shared with third parties</li></ul><h3>6.2 Correction and Deletion</h3><p>You may:</p><ul><li><strong>Update</strong> your account information at any time</li><li><strong>Request corrections</strong> to inaccurate data</li><li><strong>Delete</strong> your account and associated data</li></ul><h3>6.3 Marketing Preferences</h3><p>You can control marketing communications by:</p><ul><li>Using unsubscribe links in emails</li><li>Updating preferences in your account settings</li><li>Contacting our support team</li></ul><h3>6.4 Regional Rights</h3><p><strong>For EU residents (GDPR):</strong></p><ul><li>Right to object to processing</li><li>Right to restrict processing</li><li>Right to data portability</li><li>Right to lodge complaints with supervisory authorities</li></ul><p><strong>For California residents (CCPA):</strong></p><ul><li>Right to know what information is collected</li><li>Right to delete personal information</li><li>Right to opt-out of sale of personal information</li><li>Right to non-discrimination</li></ul><hr><h2>7. INTERNATIONAL DATA TRANSFERS</h2><p>We may transfer your information to countries outside your residence location. For EU residents, we ensure adequate protection through:</p><ul><li><strong>Standard Contractual Clauses</strong> approved by the European Commission</li><li><strong>Adequacy decisions</strong> for transfers to approved countries</li><li><strong>Binding Corporate Rules</strong> within our corporate group</li></ul><hr><h2>8. COOKIES AND TRACKING</h2><h3>8.1 Types of Cookies</h3><p>We use several types of cookies:</p><p><strong>Essential Cookies:</strong></p><ul><li>Required for platform functionality</li><li>Cannot be disabled</li></ul><p><strong>Analytics Cookies:</strong></p><ul><li>Track usage patterns and performance</li><li>Help improve our services</li></ul><p><strong>Marketing Cookies:</strong></p><ul><li>Personalize content and advertisements</li><li>Track campaign effectiveness</li></ul><h3>8.2 Managing Cookies</h3><p>You can control cookies through:</p><ul><li>Browser settings and preferences</li><li>Our cookie consent manager</li><li>Third-party opt-out tools</li></ul><hr><h2>9. CHILDREN'S PRIVACY</h2><p>Our platform is not intended for users under 16. We do not knowingly collect personal information from children under 16. If we learn we have collected such information, we will delete it promptly.</p><hr><h2>10. POLICY UPDATES</h2><p>We may update this Privacy Policy periodically. We will notify you of material changes by:</p><ul><li>Email notification to registered users</li><li>Prominent notice on our platform</li><li>Updated "Last Modified" date</li></ul><p>Continued use of our services after changes constitutes acceptance of the updated policy.</p><hr><h2>11. CONTACT INFORMATION</h2><p>For privacy-related questions or requests, contact us:</p><p><strong>Privacy Officer</strong><br>MarketingHub Technologies Inc.<br>789 Digital Avenue, Suite 200<br>Austin, TX 78701</p><p><strong>Email:</strong> privacy@marketinghub.com<br><strong>Phone:</strong> +1 (555) 123-4567<br><strong>Online:</strong> https://marketinghub.com/privacy-request</p><p><strong>Response Time:</strong> We respond to privacy requests within 30 days.</p><hr><p><em>This Privacy Policy is effective as of July 28, 2024.</em></p>`,
    metadata: {
      documentType: "privacy_policy",
      category: "data_protection",
      jurisdiction: "Texas",
      compliance: ["GDPR", "CCPA", "SOC2"],
      effectiveDate: "2024-07-28",
      lastReviewed: "2024-07-28",
      author: "Legal Department",
      tags: ["privacy", "GDPR", "CCPA", "data-protection", "cookies", "consent"],
      confidentiality: "public",
      language: "en-US"
    }
  },

  {
    title: "Master Services Agreement - Enterprise Software Implementation",
    content: `<h1>MASTER SERVICES AGREEMENT</h1><p><strong>Enterprise Software Implementation Services</strong></p><hr><h2>AGREEMENT OVERVIEW</h2><p><strong>Effective Date:</strong> August 1, 2024<br><strong>Agreement Term:</strong> 3 years with automatic renewal<br><strong>Governing Law:</strong> New York State Law</p><p><strong>Provider:</strong><br><strong>Enterprise Solutions Group LLC</strong><br>1000 Corporate Plaza, 15th Floor<br>New York, NY 10001<br>Federal EIN: 12-3456789</p><p><strong>Client:</strong><br>[Client Organization Name]<br>[Client Address]</p><hr><h2>1. SERVICES FRAMEWORK</h2><h3>1.1 Core Service Categories</h3><h4>A. Software Implementation Services</h4><ul><li><strong>Requirements analysis</strong> and business process mapping</li><li><strong>System architecture</strong> design and planning</li><li><strong>Custom development</strong> and configuration</li><li><strong>Data migration</strong> and system integration</li><li><strong>User training</strong> and change management</li><li><strong>Go-live support</strong> and post-implementation optimization</li></ul><h4>B. Ongoing Managed Services</h4><ul><li><strong>Application maintenance</strong> and support (L1-L3)</li><li><strong>Performance monitoring</strong> and optimization</li><li><strong>Security updates</strong> and patch management</li><li><strong>Backup and disaster recovery</strong> management</li><li><strong>Capacity planning</strong> and scaling recommendations</li></ul><h4>C. Consulting and Advisory Services</h4><ul><li><strong>Digital transformation</strong> strategy development</li><li><strong>Technology roadmap</strong> planning and execution</li><li><strong>Vendor selection</strong> and RFP support</li><li><strong>Compliance and audit</strong> preparation</li><li><strong>Business intelligence</strong> and analytics implementation</li></ul><h3>1.2 Service Delivery Model</h3><ul><li><strong>Dedicated project teams</strong> with domain expertise</li><li><strong>Agile methodology</strong> with bi-weekly sprint cycles</li><li><strong>24/7 support</strong> for production environments</li><li><strong>Hybrid onsite/remote</strong> delivery model</li><li><strong>Continuous improvement</strong> through regular reviews</li></ul><hr><h2>2. COMMERCIAL TERMS</h2><h3>2.1 Pricing Structure</h3><h4>Implementation Services (Time &amp; Materials)</h4><ul><li><strong>Senior Architect:</strong> $275/hour</li><li><strong>Lead Developer:</strong> $225/hour</li><li><strong>Business Analyst:</strong> $195/hour</li><li><strong>Project Manager:</strong> $195/hour</li><li><strong>Junior Developer:</strong> $145/hour</li><li><strong>Quality Assurance:</strong> $135/hour</li></ul><h4>Managed Services (Monthly Recurring)</h4><ul><li><strong>Application Support:</strong> $15,000/month per application</li><li><strong>Infrastructure Management:</strong> $8,500/month per environment</li><li><strong>Help Desk Services:</strong> $45/user/month</li><li><strong>Monitoring &amp; Alerting:</strong> $2,500/month base + $25/server</li></ul><h4>Fixed-Price Engagements</h4><ul><li><strong>Standard ERP Implementation:</strong> $485,000 - $750,000</li><li><strong>CRM Deployment:</strong> $125,000 - $285,000</li><li><strong>Data Warehouse Setup:</strong> $195,000 - $350,000</li><li><strong>Mobile App Development:</strong> $85,000 - $165,000</li></ul><h3>2.2 Payment Terms and Conditions</h3><ul><li><strong>Net 30 days</strong> from invoice date</li><li><strong>Monthly invoicing</strong> for recurring services</li><li><strong>Quarterly invoicing</strong> for project work over $100K</li><li><strong>Late payment fee:</strong> 1.5% per month on overdue amounts</li><li><strong>Early payment discount:</strong> 2% if paid within 10 days</li></ul><h3>2.3 Expense Reimbursement</h3><ul><li><strong>Travel expenses</strong> at cost with prior approval</li><li><strong>Third-party software licenses</strong> passed through at cost</li><li><strong>Hardware and equipment</strong> marked up 15%</li><li><strong>Training and certification</strong> costs as mutually agreed</li></ul><hr><h2>3. PERFORMANCE STANDARDS</h2><h3>3.1 Service Level Agreements (SLAs)</h3><h4>Response Times</h4><ul><li><strong>Critical (P1):</strong> 2 hours, 24/7/365</li><li><strong>High (P2):</strong> 4 hours during business hours</li><li><strong>Medium (P3):</strong> 1 business day</li><li><strong>Low (P4):</strong> 3 business days</li></ul><h4>Resolution Times</h4><ul><li><strong>Critical:</strong> 8 hours with workaround, 24 hours full resolution</li><li><strong>High:</strong> 16 hours with workaround, 48 hours full resolution</li><li><strong>Medium:</strong> 5 business days</li><li><strong>Low:</strong> 10 business days</li></ul><h4>System Availability</h4><ul><li><strong>Production Systems:</strong> 99.9% uptime (8.77 hours downtime/year max)</li><li><strong>Development/Test:</strong> 99.5% uptime during business hours</li><li><strong>Scheduled Maintenance:</strong> Max 4 hours/month with 7-day notice</li></ul><h3>3.2 Quality Standards</h3><ul><li><strong>Code Quality:</strong> Must pass automated testing with 90%+ coverage</li><li><strong>Documentation:</strong> All deliverables include comprehensive documentation</li><li><strong>Security:</strong> Compliance with OWASP Top 10 and client security policies</li><li><strong>Performance:</strong> Applications must meet specified performance benchmarks</li></ul><h3>3.3 Reporting and Communication</h3><ul><li><strong>Weekly status reports</strong> during active projects</li><li><strong>Monthly service reviews</strong> with key metrics</li><li><strong>Quarterly business reviews</strong> with executive stakeholders</li><li><strong>Annual strategic planning sessions</strong></li></ul><hr><h2>4. INTELLECTUAL PROPERTY RIGHTS</h2><h3>4.1 Work Product Ownership</h3><ul><li><strong>Custom software</strong> developed exclusively for Client belongs to Client</li><li><strong>Standard methodologies</strong> and tools remain Provider's property</li><li><strong>Derivative works</strong> based on Provider IP require licensing agreement</li><li><strong>Data and configurations</strong> remain Client's exclusive property</li></ul><h3>4.2 Licensing Arrangements</h3><ul><li>Client receives <strong>perpetual, non-exclusive license</strong> to use custom deliverables</li><li>Provider retains right to use <strong>anonymized Client data</strong> for benchmarking</li><li><strong>Third-party components</strong> subject to original license terms</li><li><strong>Open source software</strong> usage governed by respective OSS licenses</li></ul><h3>4.3 Intellectual Property Indemnification</h3><p>Provider will indemnify Client against third-party IP infringement claims related to Provider's deliverables, with liability cap of <strong>$2,000,000</strong> per occurrence.</p><hr><h2>5. DATA PROTECTION AND SECURITY</h2><h3>5.1 Data Classification and Handling</h3><h4>Confidential Data</h4><ul><li><strong>PII (Personally Identifiable Information)</strong></li><li><strong>Financial and payment data</strong></li><li><strong>Proprietary business information</strong></li><li><strong>Technical specifications and source code</strong></li></ul><h4>Security Controls</h4><ul><li><strong>Encryption:</strong> AES-256 for data at rest, TLS 1.3 for data in transit</li><li><strong>Access Controls:</strong> Role-based with multi-factor authentication</li><li><strong>Audit Logging:</strong> Comprehensive logging of all system access</li><li><strong>Background Checks:</strong> All personnel undergo security clearance</li></ul><h3>5.2 Compliance Requirements</h3><ul><li><strong>SOC 2 Type II</strong> certification maintained annually</li><li><strong>GDPR compliance</strong> for EU personal data processing</li><li><strong>HIPAA compliance</strong> where healthcare data is involved</li><li><strong>PCI DSS compliance</strong> for payment card data handling</li><li><strong>ISO 27001</strong> certification for information security management</li></ul><h3>5.3 Data Breach Response</h3><ul><li><strong>Immediate notification</strong> to Client within 4 hours of discovery</li><li><strong>Forensic analysis</strong> and containment measures</li><li><strong>Regulatory notifications</strong> as required by applicable law</li><li><strong>Credit monitoring</strong> for affected individuals if applicable</li></ul><hr><h2>6. RISK ALLOCATION AND INSURANCE</h2><h3>6.1 Limitation of Liability</h3><h4>Liability Cap</h4><p>Provider's total liability under this Agreement is limited to the <strong>greater of</strong>:</p><ul><li><strong>$5,000,000</strong> per occurrence</li><li><strong>Total fees paid</strong> in the 12 months preceding the claim</li></ul><h4>Excluded Damages</h4><p>Neither party liable for <strong>CONSEQUENTIAL, INDIRECT, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES</strong>, including:</p><ul><li>Lost profits or revenue</li><li>Business interruption</li><li>Loss of data or technology</li><li>Cost of replacement services</li><li>Reputational harm</li></ul><h3>6.2 Insurance Requirements</h3><p>Provider maintains the following minimum insurance coverage:</p><ul><li><strong>General Liability:</strong> $5,000,000 per occurrence</li><li><strong>Professional Liability:</strong> $10,000,000 per occurrence</li><li><strong>Cyber Liability:</strong> $25,000,000 per occurrence</li><li><strong>Workers' Compensation:</strong> As required by law</li><li><strong>Directors &amp; Officers:</strong> $5,000,000</li></ul><p>Client named as <strong>additional insured</strong> on all applicable policies.</p><hr><h2>7. CONTRACT ADMINISTRATION</h2><h3>7.1 Governance Structure</h3><h4>Executive Steering Committee</h4><ul><li><strong>Client C-Level Executive</strong> (Chair)</li><li><strong>Provider Account Executive</strong></li><li><strong>IT Leadership</strong> from both organizations</li><li><strong>Quarterly meetings</strong> to review strategic alignment</li></ul><h4>Operational Management</h4><ul><li><strong>Bi-weekly project reviews</strong> with delivery teams</li><li><strong>Monthly service reviews</strong> with technical leads</li><li><strong>Issue escalation procedures</strong> for dispute resolution</li></ul><h3>7.2 Change Management</h3><ul><li><strong>Formal change control process</strong> for scope modifications</li><li><strong>Written approval</strong> required for changes &gt;$25,000</li><li><strong>Impact assessment</strong> including cost, schedule, and risk implications</li><li><strong>Change order documentation</strong> with detailed specifications</li></ul><h3>7.3 Knowledge Transfer</h3><ul><li><strong>Comprehensive documentation</strong> of all systems and processes</li><li><strong>Training sessions</strong> for Client technical staff</li><li><strong>Transition planning</strong> for service handover</li><li><strong>30-day knowledge transfer period</strong> upon contract termination</li></ul><hr><h2>8. TERMINATION PROVISIONS</h2><h3>8.1 Termination Rights</h3><h4>Termination for Convenience</h4><ul><li>Either party with <strong>180 days written notice</strong></li><li>Client responsible for <strong>costs incurred</strong> through termination date</li><li><strong>Transition assistance</strong> provided for 90 days post-termination</li></ul><h4>Termination for Cause</h4><ul><li><strong>Material breach</strong> uncured after 60-day notice period</li><li><strong>Insolvency or bankruptcy</strong> filing</li><li><strong>Loss of required licenses</strong> or certifications</li></ul><h3>8.2 Termination Obligations</h3><h4>Provider Obligations</h4><ul><li><strong>Complete work in progress</strong> or provide deliverables-to-date</li><li><strong>Transfer all work product</strong> and intellectual property</li><li><strong>Provide transition assistance</strong> for knowledge transfer</li><li><strong>Return or destroy</strong> all Client confidential information</li></ul><h4>Client Obligations</h4><ul><li><strong>Payment of undisputed invoices</strong> within 30 days</li><li><strong>Cooperation during transition</strong> period</li><li><strong>Assumption of ongoing licenses</strong> and service agreements</li></ul><hr><h2>EXECUTION</h2><p>This Agreement has been executed by duly authorized representatives of both parties.</p><p><strong>PROVIDER:</strong></p><p><strong>Enterprise Solutions Group LLC</strong></p><p>By: ________________________<br>Name: David Chen<br>Title: Chief Executive Officer<br>Date: _______________</p><p><strong>CLIENT:</strong></p><p><strong>[Client Organization Name]</strong></p><p>By: ________________________<br>Name: _____________________<br>Title: ____________________<br>Date: _______________</p><hr><p><em>This Master Services Agreement supersedes all previous agreements between the parties relating to the subject matter hereof.</em></p>`,
    metadata: {
      documentType: "master_services_agreement",
      category: "commercial_contract",
      jurisdiction: "New York",
      serviceType: "enterprise_software",
      contractValue: "$2M+_annually",
      effectiveDate: "2024-08-01",
      lastReviewed: "2024-07-15",
      author: "David Chen, CEO",
      tags: ["enterprise", "software", "implementation", "SLA", "managed-services", "consulting"],
      confidentiality: "confidential",
      language: "en-US"
    }
  }
];

/**
 * Makes HTTP POST request to create a document
 */
async function createDocument(document) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    return result.document;
  } catch (error) {
    console.error(`❌ Failed to create document "${document.title}":`, error.message);
    throw error;
  }
}

/**
 * Test API connection
 */
async function testConnection() {
  try {
    console.log('🔍 Testing API connection...');
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const health = await response.json();
    console.log('✅ API is healthy:', health.status);
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    console.error('💡 Make sure the backend server is running on port 3001');
    return false;
  }
}

/**
 * Main ingestion function
 */
async function ingestDocuments() {
  console.log('🚀 Starting Legal Document Ingestion (TipTap HTML Format)...');
  console.log(`📡 API Endpoint: ${API_ENDPOINT}`);
  console.log('📝 Documents to ingest: 5 legal templates in TipTap-compatible HTML format\n');

  // Test connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    process.exit(1);
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < legalDocuments.length; i++) {
    const document = legalDocuments[i];
    console.log(`\n📄 [${i + 1}/5] Creating: "${document.title}"`);
    console.log(`   📋 Type: ${document.metadata.documentType}`);
    console.log(`   🏛️  Category: ${document.metadata.category}`);
    console.log(`   📍 Jurisdiction: ${document.metadata.jurisdiction}`);
    console.log(`   📊 Content Length: ${document.content.length.toLocaleString()} characters`);
    console.log(`   🎨 Format: TipTap-compatible HTML`);
    
    try {
      const created = await createDocument(document);
      results.push({ success: true, document: created, originalTitle: document.title });
      successCount++;
      
      console.log(`   ✅ Created successfully`);
      console.log(`   🆔 Document ID: ${created.id}`);
      console.log(`   ⏰ Created at: ${new Date(created.created_at).toLocaleString()}`);
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      results.push({ success: false, error: error.message, originalTitle: document.title });
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 INGESTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/5`);
  console.log(`❌ Failed: ${failCount}/5`);
  console.log('🎨 Format: All documents converted to TipTap-compatible HTML');
  
  if (successCount > 0) {
    console.log('\n✅ Successfully created documents:');
    results.filter(r => r.success).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.originalTitle}`);
      console.log(`      ID: ${result.document.id}`);
    });
  }
  
  if (failCount > 0) {
    console.log('\n❌ Failed documents:');
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.originalTitle}`);
      console.log(`      Error: ${result.error}`);
    });
  }

  console.log('\n🎉 Ingestion process completed!');
  console.log('💡 All documents are now in TipTap-compatible HTML format with:');
  console.log('   • Proper heading hierarchy (h1, h2, h3, h4)');
  console.log('   • Structured paragraphs and lists');
  console.log('   • Bold formatting for emphasis');
  console.log('   • Horizontal rules for section breaks');
  console.log('   • Line breaks for addresses and signatures');
  console.log(`💻 You can now view these documents in your TipTap editor at: http://localhost:3000`);
  
  // Return results for potential programmatic use
  return results;
}

// Run the ingestion if this script is executed directly
if (require.main === module) {
  ingestDocuments()
    .then((results) => {
      const successCount = results.filter(r => r.success).length;
      process.exit(successCount === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Ingestion failed:', error);
      process.exit(1);
    });
}

// Export for potential module use
module.exports = { ingestDocuments, legalDocuments };
