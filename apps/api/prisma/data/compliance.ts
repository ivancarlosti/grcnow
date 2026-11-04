export interface RequirementSeed {
  ref: string;
  title: string;
  description?: string;
  category?: string;
}

export interface ChapterSeed {
  ref: string;
  title: string;
  description?: string;
  requirements: RequirementSeed[];
}

export interface PackageSeed {
  slug: string;
  name: string;
  authority: string;
  version: string;
  description: string;
  sourceUrl?: string;
  chapters: ChapterSeed[];
}

export const ISO_27001: PackageSeed = {
  slug: 'iso-27001',
  name: 'ISO/IEC 27001:2022',
  authority: 'ISO',
  version: '2022',
  description:
    'Information security management system requirements (clauses 4-10) and the Annex A control set.',
  sourceUrl: 'https://www.iso.org/standard/27001',
  chapters: [
    {
      ref: '4',
      title: 'Context of the organization',
      requirements: [
        { ref: '4.1', title: 'Understanding the organization and its context', category: 'context' },
        { ref: '4.2', title: 'Needs and expectations of interested parties', category: 'context' },
        { ref: '4.3', title: 'Determining the scope of the ISMS', category: 'context' },
        { ref: '4.4', title: 'Information security management system', category: 'context' },
      ],
    },
    {
      ref: '5',
      title: 'Leadership',
      requirements: [
        { ref: '5.1', title: 'Leadership and commitment', category: 'leadership' },
        { ref: '5.2', title: 'Information security policy', category: 'leadership' },
        { ref: '5.3', title: 'Organizational roles, responsibilities and authorities', category: 'leadership' },
      ],
    },
    {
      ref: '6',
      title: 'Planning',
      requirements: [
        { ref: '6.1.1', title: 'General risk planning', category: 'risk' },
        { ref: '6.1.2', title: 'Information security risk assessment', category: 'risk' },
        { ref: '6.1.3', title: 'Information security risk treatment', category: 'risk' },
        { ref: '6.2', title: 'Information security objectives and planning', category: 'planning' },
      ],
    },
    {
      ref: '7',
      title: 'Support',
      requirements: [
        { ref: '7.1', title: 'Resources', category: 'support' },
        { ref: '7.2', title: 'Competence', category: 'support' },
        { ref: '7.3', title: 'Awareness', category: 'support' },
        { ref: '7.4', title: 'Communication', category: 'support' },
        { ref: '7.5', title: 'Documented information', category: 'support' },
      ],
    },
    {
      ref: '8',
      title: 'Operation',
      requirements: [
        { ref: '8.1', title: 'Operational planning and control', category: 'operation' },
        { ref: '8.2', title: 'Risk assessment (operation)', category: 'operation' },
        { ref: '8.3', title: 'Risk treatment (operation)', category: 'operation' },
      ],
    },
    {
      ref: '9',
      title: 'Performance evaluation',
      requirements: [
        { ref: '9.1', title: 'Monitoring, measurement, analysis and evaluation', category: 'monitoring' },
        { ref: '9.2', title: 'Internal audit', category: 'audit' },
        { ref: '9.3', title: 'Management review', category: 'management' },
      ],
    },
    {
      ref: '10',
      title: 'Improvement',
      requirements: [
        { ref: '10.1', title: 'Continual improvement', category: 'improvement' },
        { ref: '10.2', title: 'Nonconformity and corrective action', category: 'improvement' },
      ],
    },
    {
      ref: 'A.5',
      title: 'Annex A - Organizational controls',
      requirements: [
        { ref: 'A.5.1', title: 'Policies for information security', category: 'organizational' },
        { ref: 'A.5.2', title: 'Information security roles and responsibilities', category: 'organizational' },
        { ref: 'A.5.3', title: 'Segregation of duties', category: 'organizational' },
        { ref: 'A.5.7', title: 'Threat intelligence', category: 'organizational' },
        { ref: 'A.5.15', title: 'Access control', category: 'organizational' },
        { ref: 'A.5.23', title: 'Information security for cloud services', category: 'organizational' },
        { ref: 'A.5.29', title: 'Information security during disruption', category: 'organizational' },
        { ref: 'A.5.34', title: 'Privacy and protection of PII', category: 'organizational' },
        { ref: 'A.5.36', title: 'Compliance with policies and standards', category: 'organizational' },
      ],
    },
    {
      ref: 'A.6',
      title: 'Annex A - People controls',
      requirements: [
        { ref: 'A.6.1', title: 'Screening', category: 'people' },
        { ref: 'A.6.3', title: 'Awareness, education and training', category: 'people' },
        { ref: 'A.6.5', title: 'Responsibilities after termination', category: 'people' },
      ],
    },
    {
      ref: 'A.7',
      title: 'Annex A - Physical controls',
      requirements: [
        { ref: 'A.7.1', title: 'Physical security perimeters', category: 'physical' },
        { ref: 'A.7.4', title: 'Physical security monitoring', category: 'physical' },
      ],
    },
    {
      ref: 'A.8',
      title: 'Annex A - Technological controls',
      requirements: [
        { ref: 'A.8.2', title: 'Privileged access rights', category: 'technological' },
        { ref: 'A.8.7', title: 'Protection against malware', category: 'technological' },
        { ref: 'A.8.8', title: 'Management of technical vulnerabilities', category: 'technological' },
        { ref: 'A.8.12', title: 'Data leakage prevention', category: 'technological' },
        { ref: 'A.8.16', title: 'Monitoring activities', category: 'technological' },
        { ref: 'A.8.24', title: 'Use of cryptography', category: 'technological' },
        { ref: 'A.8.25', title: 'Secure development life cycle', category: 'technological' },
        { ref: 'A.8.32', title: 'Change management', category: 'technological' },
        { ref: 'A.8.34', title: 'Protection of systems during audit testing', category: 'technological' },
      ],
    },
  ],
};
export const SOC2: PackageSeed = {
  slug: 'soc2',
  name: 'SOC 2 Trust Services Criteria',
  authority: 'SOC2',
  version: '2022',
  description: 'AICPA trust services criteria for security, availability, processing integrity, confidentiality and privacy.',
  chapters: [
    {
      ref: 'CC1',
      title: 'Control environment',
      requirements: [
        { ref: 'CC1.1', title: 'Integrity and ethical values', category: 'control_environment' },
        { ref: 'CC1.2', title: 'Board independence and oversight', category: 'control_environment' },
        { ref: 'CC1.4', title: 'Commitment to competence', category: 'control_environment' },
      ],
    },
    {
      ref: 'CC2',
      title: 'Communication and information',
      requirements: [
        { ref: 'CC2.1', title: 'Information quality and communication', category: 'communication' },
        { ref: 'CC2.2', title: 'Internal communication of objectives', category: 'communication' },
      ],
    },
    {
      ref: 'CC3',
      title: 'Risk assessment',
      requirements: [
        { ref: 'CC3.1', title: 'Objectives specification', category: 'risk' },
        { ref: 'CC3.2', title: 'Risk identification and analysis', category: 'risk' },
        { ref: 'CC3.4', title: 'Fraud risk assessment', category: 'risk' },
      ],
    },
    {
      ref: 'CC4',
      title: 'Monitoring activities',
      requirements: [{ ref: 'CC4.1', title: 'Ongoing and separate evaluations', category: 'monitoring' }],
    },
    {
      ref: 'CC5',
      title: 'Control activities',
      requirements: [
        { ref: 'CC5.1', title: 'Selection of control activities', category: 'controls' },
        { ref: 'CC5.3', title: 'Deployment through policies and procedures', category: 'controls' },
      ],
    },
    {
      ref: 'CC6',
      title: 'Logical and physical access',
      requirements: [
        { ref: 'CC6.1', title: 'Logical access security', category: 'access' },
        { ref: 'CC6.2', title: 'User registration and de-registration', category: 'access' },
        { ref: 'CC6.3', title: 'Role-based access and least privilege', category: 'access' },
        { ref: 'CC6.6', title: 'Protection against external threats', category: 'access' },
        { ref: 'CC6.7', title: 'Data transmission and disposal', category: 'access' },
      ],
    },
    {
      ref: 'CC7',
      title: 'System operations',
      requirements: [
        { ref: 'CC7.1', title: 'Vulnerability and configuration monitoring', category: 'operations' },
        { ref: 'CC7.2', title: 'Security event monitoring', category: 'operations' },
        { ref: 'CC7.3', title: 'Incident evaluation', category: 'operations' },
        { ref: 'CC7.4', title: 'Incident response', category: 'operations' },
      ],
    },
    {
      ref: 'CC8',
      title: 'Change management',
      requirements: [{ ref: 'CC8.1', title: 'Authorized and tested changes', category: 'change' }],
    },
    {
      ref: 'CC9',
      title: 'Risk mitigation',
      requirements: [{ ref: 'CC9.1', title: 'Business disruption risk mitigation', category: 'risk' }],
    },
    {
      ref: 'A1',
      title: 'Availability',
      requirements: [{ ref: 'A1.2', title: 'Environmental and infrastructure protection', category: 'availability' }],
    },
    {
      ref: 'C1',
      title: 'Confidentiality',
      requirements: [{ ref: 'C1.1', title: 'Confidential information protection', category: 'confidentiality' }],
    },
    {
      ref: 'PI1',
      title: 'Processing integrity',
      requirements: [{ ref: 'PI1.1', title: 'Processing accuracy and completeness', category: 'integrity' }],
    },
    {
      ref: 'P1',
      title: 'Privacy',
      requirements: [{ ref: 'P1.1', title: 'Privacy notice and consent', category: 'privacy' }],
    },
  ],
};

export const NIST_CSF: PackageSeed = {
  slug: 'nist-csf',
  name: 'NIST Cybersecurity Framework 2.0',
  authority: 'NIST',
  version: '2.0',
  description: 'Six functions (Govern, Identify, Protect, Detect, Respond, Recover) with categories and outcomes.',
  chapters: [
    {
      ref: 'GV',
      title: 'Govern',
      requirements: [
        { ref: 'GV.OC', title: 'Organizational context', category: 'govern' },
        { ref: 'GV.RM', title: 'Risk management strategy', category: 'govern' },
        { ref: 'GV.RR', title: 'Roles, responsibilities and authorities', category: 'govern' },
      ],
    },
    {
      ref: 'ID',
      title: 'Identify',
      requirements: [
        { ref: 'ID.AM', title: 'Asset management', category: 'identify' },
        { ref: 'ID.RA', title: 'Risk assessment', category: 'identify' },
        { ref: 'ID.SC', title: 'Supply chain risk management', category: 'identify' },
      ],
    },
    {
      ref: 'PR',
      title: 'Protect',
      requirements: [
        { ref: 'PR.AA', title: 'Identity management and access control', category: 'protect' },
        { ref: 'PR.AT', title: 'Awareness and training', category: 'protect' },
        { ref: 'PR.DS', title: 'Data security', category: 'protect' },
        { ref: 'PR.PS', title: 'Platform security', category: 'protect' },
      ],
    },
    {
      ref: 'DE',
      title: 'Detect',
      requirements: [
        { ref: 'DE.CM', title: 'Continuous monitoring', category: 'detect' },
        { ref: 'DE.AE', title: 'Adverse event analysis', category: 'detect' },
      ],
    },
    {
      ref: 'RS',
      title: 'Respond',
      requirements: [
        { ref: 'RS.MA', title: 'Incident management', category: 'respond' },
        { ref: 'RS.CO', title: 'Incident communication', category: 'respond' },
      ],
    },
    {
      ref: 'RC',
      title: 'Recover',
      requirements: [
        { ref: 'RC.RP', title: 'Incident recovery plan execution', category: 'recover' },
        { ref: 'RC.CO', title: 'Recovery communication', category: 'recover' },
      ],
    },
  ],
};

export const GDPR: PackageSeed = {
  slug: 'gdpr',
  name: 'GDPR (EU) 2016/679',
  authority: 'GDPR',
  version: '2016/679',
  description: 'General Data Protection Regulation obligations for controllers and processors.',
  chapters: [
    {
      ref: 'Ch. II',
      title: 'Principles',
      requirements: [
        { ref: 'Art.5', title: 'Principles relating to processing of personal data', category: 'principles' },
        { ref: 'Art.6', title: 'Lawfulness of processing', category: 'principles' },
      ],
    },
    {
      ref: 'Ch. III',
      title: 'Rights of the data subject',
      requirements: [
        { ref: 'Art.13', title: 'Information to be provided (collection)', category: 'rights' },
        { ref: 'Art.15', title: 'Right of access', category: 'rights' },
        { ref: 'Art.17', title: 'Right to erasure', category: 'rights' },
        { ref: 'Art.20', title: 'Right to data portability', category: 'rights' },
      ],
    },
    {
      ref: 'Ch. IV',
      title: 'Controller and processor',
      requirements: [
        { ref: 'Art.24', title: 'Responsibility of the controller', category: 'governance' },
        { ref: 'Art.25', title: 'Data protection by design and by default', category: 'governance' },
        { ref: 'Art.28', title: 'Processor obligations', category: 'third_party' },
        { ref: 'Art.30', title: 'Records of processing activities', category: 'governance' },
      ],
    },
    {
      ref: 'Ch. IV.2',
      title: 'Security and breach',
      requirements: [
        { ref: 'Art.32', title: 'Security of processing', category: 'security' },
        { ref: 'Art.33', title: 'Notification of a personal data breach', category: 'incident' },
        { ref: 'Art.35', title: 'Data protection impact assessment', category: 'risk' },
      ],
    },
    {
      ref: 'Ch. IV.4',
      title: 'Data protection officer',
      requirements: [{ ref: 'Art.37', title: 'Designation of the DPO', category: 'governance' }],
    },
  ],
};

export const DORA: PackageSeed = {
  slug: 'dora',
  name: 'DORA (EU) 2022/2554',
  authority: 'DORA',
  version: '2022/2554',
  description: 'Digital Operational Resilience Act for financial entities and their ICT third-party providers.',
  chapters: [
    {
      ref: 'Ch. II',
      title: 'ICT risk management',
      requirements: [
        { ref: 'Art.5', title: 'Governance and organization', category: 'governance' },
        { ref: 'Art.6', title: 'ICT risk management framework', category: 'risk' },
        { ref: 'Art.8', title: 'Identification of ICT assets and dependencies', category: 'assets' },
        { ref: 'Art.9', title: 'Protection and prevention', category: 'security' },
      ],
    },
    {
      ref: 'Ch. III',
      title: 'Incident reporting',
      requirements: [
        { ref: 'Art.17', title: 'ICT-related incident management process', category: 'incident' },
        { ref: 'Art.19', title: 'Reporting of major ICT-related incidents', category: 'incident' },
      ],
    },
    {
      ref: 'Ch. IV',
      title: 'Resilience testing',
      requirements: [
        { ref: 'Art.24', title: 'Digital operational resilience testing programme', category: 'testing' },
        { ref: 'Art.26', title: 'Threat-led penetration testing', category: 'testing' },
      ],
    },
    {
      ref: 'Ch. V',
      title: 'ICT third-party risk',
      requirements: [
        { ref: 'Art.28', title: 'Key contractual provisions', category: 'third_party' },
        { ref: 'Art.29', title: 'Register of information on ICT contracts', category: 'third_party' },
      ],
    },
  ],
};

export const PCI_DSS: PackageSeed = {
  slug: 'pci-dss',
  name: 'PCI DSS 4.0',
  authority: 'PCI-DSS',
  version: '4.0',
  description: 'Payment Card Industry Data Security Standard requirements for cardholder data environments.',
  chapters: [
    {
      ref: '1',
      title: 'Network security controls',
      requirements: [{ ref: '1.2', title: 'Network security controls configuration', category: 'network' }],
    },
    {
      ref: '2',
      title: 'Secure configurations',
      requirements: [{ ref: '2.2', title: 'System components hardened', category: 'configuration' }],
    },
    {
      ref: '3',
      title: 'Protect stored account data',
      requirements: [{ ref: '3.4', title: 'PAN secured at rest', category: 'data' }],
    },
    {
      ref: '4',
      title: 'Protect data in transit',
      requirements: [{ ref: '4.2', title: 'Strong cryptography for transmission', category: 'data' }],
    },
    {
      ref: '5',
      title: 'Malware protection',
      requirements: [{ ref: '5.2', title: 'Anti-malware solutions deployed', category: 'security' }],
    },
    {
      ref: '6',
      title: 'Secure development',
      requirements: [{ ref: '6.3', title: 'Security vulnerabilities addressed', category: 'development' }],
    },
    {
      ref: '7',
      title: 'Access control',
      requirements: [{ ref: '7.2', title: 'Access restricted by business need', category: 'access' }],
    },
    {
      ref: '8',
      title: 'Authentication',
      requirements: [{ ref: '8.4', title: 'MFA for all access into the CDE', category: 'access' }],
    },
    {
      ref: '9',
      title: 'Physical security',
      requirements: [{ ref: '9.2', title: 'Physical access controls', category: 'physical' }],
    },
    {
      ref: '10',
      title: 'Logging and monitoring',
      requirements: [{ ref: '10.2', title: 'Audit logs recorded', category: 'monitoring' }],
    },
    {
      ref: '11',
      title: 'Security testing',
      requirements: [{ ref: '11.3', title: 'Vulnerability scans and penetration tests', category: 'testing' }],
    },
    {
      ref: '12',
      title: 'Governance',
      requirements: [{ ref: '12.1', title: 'Information security policy', category: 'governance' }],
    },
  ],
};

export const COMPLIANCE_PACKAGES: PackageSeed[] = [ISO_27001, SOC2, NIST_CSF, GDPR, DORA, PCI_DSS];

