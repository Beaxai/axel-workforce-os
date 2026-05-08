import {
  Siren,
  Cannabis,
  HardHat,
  Trash2,
  HeartPulse,
  TriangleAlert,
  UtensilsCrossed,
  Factory,
  UsersRound,
  Truck,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface VerticalData {
  name: string;
  slug: string;
  descriptor: string;
  icon: LucideIcon;
  image: string;
  description: string;
  wcDescription: string;
  peoDescription: string;
  wcFeatures: string[];
  peoFeatures: string[];
}

export const VERTICALS: VerticalData[] = [
  {
    name: "Ambulances & Emergency Transport",
    slug: "ambulances-emergency-transport",
    descriptor: "Coverage built for first responders on the move",
    icon: Siren,
    image: "/images/verticals/ambulances.jpg",
    description:
      "The ambulance and emergency transport industry faces unique workers\u2019 compensation challenges. From EMTs and paramedics handling high-acuity patients to drivers navigating urgent response conditions, your workforce is exposed to physical strain, infectious disease, and vehicular risk every shift. Axel partners with carriers who understand NCCI class codes specific to emergency medical services, offering tailored programs that address the real exposures your team faces daily. Whether you operate a private ambulance fleet, municipal EMS contract, or non-emergency medical transport service, we build coverage that keeps your crews protected and your operations compliant.",
    wcDescription:
      "Standalone workers\u2019 compensation insurance tailored for the ambulances & emergency transport industry. Get competitive rates, flexible payment options, and dedicated claims management from carriers who specialize in your class codes.",
    peoDescription:
      "A comprehensive Professional Employer Organization solution for ambulances & emergency transport businesses. Bundle workers\u2019 comp with HR, payroll, and benefits administration under one roof to reduce costs and administrative burden.",
    wcFeatures: [
      "Competitive premium rates",
      "Pay-as-you-go billing available",
      "Dedicated claims management and return-to-work programs",
      "Safety and loss control consulting included",
    ],
    peoFeatures: [
      "Workers\u2019 comp bundled with payroll and HR administration",
      "Access to Fortune 500-level employee benefits",
      "Dedicated HR compliance support and handbook creation",
      "Streamlined onboarding and offboarding processes",
      "Risk management and safety program implementation",
      "Single point of contact for all workforce needs",
    ],
  },
  {
    name: "Cannabis",
    slug: "cannabis",
    descriptor: "Compliant coverage for a growing industry",
    icon: Cannabis,
    image: "/images/verticals/cannabis.jpg",
    description:
      "The cannabis industry operates in a complex regulatory landscape where traditional insurance markets often refuse to participate. From cultivation and processing to retail dispensaries and distribution, cannabis businesses face unique exposures including plant-touching operations, compliance requirements, and rapidly evolving state regulations. Axel works with specialty carriers who understand the nuances of cannabis operations across all license types. We help you navigate the gap between federal and state law to secure legitimate workers\u2019 compensation coverage that protects your employees and keeps your business compliant.",
    wcDescription:
      "Standalone workers\u2019 compensation coverage designed for licensed cannabis operations. We work with admitted and surplus lines carriers experienced in plant-touching and ancillary cannabis businesses to deliver competitive, compliant programs.",
    peoDescription:
      "A full-service PEO solution built for cannabis businesses. Combine workers\u2019 compensation with payroll processing, benefits administration, and HR compliance support tailored to the unique regulatory demands of the cannabis industry.",
    wcFeatures: [
      "Coverage for all license types: cultivation, manufacturing, retail, distribution",
      "Carriers experienced with cannabis-specific class codes",
      "Compliance documentation for state licensing requirements",
      "Safety programs tailored to grow, process, and retail environments",
      "Claims management familiar with industry-specific injuries",
      "Flexible payment plans for seasonal workforce fluctuations",
    ],
    peoFeatures: [
      "Workers\u2019 comp bundled with cannabis-compliant payroll processing",
      "Benefits packages that help attract and retain talent",
      "HR compliance support for multi-state cannabis regulations",
      "Employee handbook and policy creation for regulated environments",
      "Background check and credential verification services",
      "Single platform for all workforce administration needs",
    ],
  },
  {
    name: "Construction",
    slug: "construction",
    descriptor: "Protect your crew from the ground up",
    icon: HardHat,
    image: "/images/verticals/construction.jpg",
    description:
      "Construction remains one of the most hazardous industries in the United States, with workers facing falls, equipment accidents, and repetitive strain injuries on a daily basis. Workers\u2019 compensation costs in construction are among the highest of any sector, making it critical to partner with carriers who understand jobsite risk and can price coverage accurately. Axel specializes in connecting general contractors, subcontractors, and specialty trades with insurance programs that reflect the true nature of their operations. Our carrier partners offer experience-rated programs, wrap-up options, and loss control resources that help you manage risk and control premium costs over time.",
    wcDescription:
      "Workers\u2019 compensation insurance built for the construction industry. From general contractors to specialty trades, get coverage from carriers who understand your class codes, jobsite exposures, and experience modification factors.",
    peoDescription:
      "A PEO solution designed for construction companies looking to streamline workforce management. Bundle workers\u2019 comp with certified payroll, benefits, and HR administration to simplify compliance and reduce your total cost of risk.",
    wcFeatures: [
      "Specialized rates for construction class codes and trades",
      "Experience modification factor management and improvement strategies",
      "Wrap-up and OCIP/CCIP program support",
      "Jobsite safety inspections and OSHA compliance consulting",
      "Subcontractor certificate tracking and verification",
      "Audit preparation and classification review services",
    ],
    peoFeatures: [
      "Workers\u2019 comp with certified payroll for prevailing wage projects",
      "Access to competitive health, dental, and vision benefits",
      "OSHA compliance support and safety training programs",
      "Multi-state workforce management for traveling crews",
      "Streamlined new hire onboarding and drug testing coordination",
      "Dedicated account team familiar with construction operations",
    ],
  },
  {
    name: "Garbage & Waste Management",
    slug: "garbage-waste-management",
    descriptor: "Reliable coverage for essential services",
    icon: Trash2,
    image: "/images/verticals/garbage-waste.jpg",
    description:
      "Waste management and sanitation workers face significant physical hazards every day, from heavy lifting and repetitive motion injuries to exposure to hazardous materials and traffic accidents during collection routes. The industry\u2019s high claim frequency and severity make it difficult to find affordable coverage in the standard market. Axel partners with carriers who specialize in waste hauling, recycling operations, and environmental services to deliver programs that properly classify your workforce and manage risk. We help waste management companies of all sizes\u2014from single-truck operators to multi-facility enterprises\u2014find coverage that keeps employees protected without breaking the budget.",
    wcDescription:
      "Workers\u2019 compensation coverage tailored for garbage and waste management operations. Our carrier partners understand the unique exposures of collection crews, transfer station workers, and recycling facility employees.",
    peoDescription:
      "A PEO solution for waste management companies seeking to consolidate workforce administration. Bundle workers\u2019 comp with payroll, HR, and benefits to reduce overhead and improve employee retention in a high-turnover industry.",
    wcFeatures: [
      "Rates aligned to waste industry class codes and exposures",
      "Pay-as-you-go billing to match seasonal volume changes",
      "Return-to-work programs designed for physical labor roles",
      "Fleet safety and driver training program support",
      "DOT compliance and drug testing coordination",
      "Claims advocacy for complex injury scenarios",
    ],
    peoFeatures: [
      "Workers\u2019 comp bundled with payroll and tax administration",
      "Health benefits to improve recruitment in a competitive labor market",
      "HR support for compliance with DOT and OSHA regulations",
      "Employee retention strategies and engagement programs",
      "Bilingual HR support and onboarding materials",
      "Centralized workforce platform for multi-location operations",
    ],
  },
  {
    name: "Healthcare",
    slug: "healthcare",
    descriptor: "Caring for those who care for others",
    icon: HeartPulse,
    image: "/images/verticals/healthcare.jpg",
    description:
      "Healthcare workers face some of the highest injury rates in the American workforce. From patient handling injuries in hospitals and nursing facilities to needle sticks and workplace violence, the healthcare industry presents complex workers\u2019 compensation challenges that require specialized underwriting expertise. Axel connects healthcare organizations with carriers who understand the full spectrum of medical workplace risks. Whether you operate a home health agency, outpatient clinic, skilled nursing facility, or physician practice, we deliver programs that properly address your exposures while keeping premiums competitive through targeted loss control and claims management.",
    wcDescription:
      "Workers\u2019 compensation coverage designed for healthcare providers. Our programs address the unique exposures of patient-facing roles, from home health aides to hospital staff, with carriers experienced in healthcare class codes.",
    peoDescription:
      "A healthcare-focused PEO solution that bundles workers\u2019 comp with credentialing support, payroll, benefits, and HR compliance. Reduce administrative burden so your team can focus on patient care.",
    wcFeatures: [
      "Specialized rates for healthcare and home health class codes",
      "Patient handling injury prevention and ergonomics programs",
      "Needle stick and bloodborne pathogen exposure protocols",
      "Workplace violence prevention and response planning",
      "Return-to-work programs for clinical and non-clinical staff",
      "Certificate and credentialing compliance documentation",
    ],
    peoFeatures: [
      "Workers\u2019 comp with healthcare-specific payroll processing",
      "Competitive health benefits for clinical and support staff",
      "Credentialing and license verification management",
      "HIPAA compliance support and training programs",
      "Multi-location workforce administration",
      "Dedicated HR support for healthcare labor regulations",
    ],
  },
  {
    name: "High Experience Mod \u2013 Hard to Place Risks",
    slug: "high-experience-mod",
    descriptor: "Solutions when others say no",
    icon: TriangleAlert,
    image: "/images/verticals/high-exp-mod.jpg",
    description:
      "When your experience modification rate exceeds 1.0, finding affordable workers\u2019 compensation coverage becomes a significant challenge. Many standard carriers decline businesses with elevated loss histories, leaving employers struggling to maintain coverage and comply with state requirements. Axel specializes in connecting hard-to-place risks with carriers and programs designed specifically for accounts with challenging loss histories. We go beyond simply finding coverage\u2014we help you develop loss control strategies, implement safety programs, and build a path back to the standard market. Our approach combines specialty carrier access with hands-on risk management consulting to reduce your mod over time.",
    wcDescription:
      "Workers\u2019 compensation programs for businesses with experience modification rates above 1.0. We partner with specialty carriers and state assigned risk pools to keep your business covered while working to improve your loss history.",
    peoDescription:
      "A PEO solution designed to help high-mod businesses regain control of their workers\u2019 comp costs. By co-employing your workforce, we can often access master policy rates and provide intensive safety and claims management support.",
    wcFeatures: [
      "Access to specialty carriers for high experience mod accounts",
      "State assigned risk pool navigation and placement",
      "Experience mod analysis and improvement roadmap",
      "Intensive loss control and safety program implementation",
      "Claims review and reserve reduction strategies",
      "Transition planning back to standard market carriers",
    ],
    peoFeatures: [
      "Master policy access to potentially bypass individual mod rating",
      "Intensive on-site safety audits and corrective action plans",
      "Dedicated claims management to control loss development",
      "Employee training programs to reduce workplace injuries",
      "Monthly loss runs and performance tracking",
      "Long-term partnership approach to mod improvement",
    ],
  },
  {
    name: "Hospitality",
    slug: "hospitality",
    descriptor: "Coverage as welcoming as your service",
    icon: UtensilsCrossed,
    image: "/images/verticals/hospitality.jpg",
    description:
      "The hospitality industry employs millions of workers across hotels, restaurants, bars, event venues, and catering operations. With high employee turnover, part-time workforces, and common injuries including slips, falls, burns, and repetitive motion, hospitality businesses need workers\u2019 compensation programs that can adapt to their dynamic operations. Axel works with carriers who specialize in hospitality risk, offering programs that account for seasonal staffing fluctuations, tip-based compensation structures, and multi-location operations. From a single restaurant to a hotel portfolio, we build coverage that protects your team and your bottom line.",
    wcDescription:
      "Workers\u2019 compensation coverage built for hotels, restaurants, bars, and event venues. Our carrier partners understand hospitality class codes and offer flexible programs that adapt to your seasonal and staffing needs.",
    peoDescription:
      "A PEO solution for hospitality businesses looking to simplify workforce management. Bundle workers\u2019 comp with payroll, tip reporting, benefits administration, and HR support tailored to the service industry.",
    wcFeatures: [
      "Competitive rates for hospitality and food service class codes",
      "Pay-as-you-go billing aligned to fluctuating payroll",
      "Slip, trip, and fall prevention programs",
      "Burns and kitchen safety training resources",
      "Multi-location certificate management",
      "Audit support for tip credit and wage calculations",
    ],
    peoFeatures: [
      "Workers\u2019 comp with integrated tip reporting and payroll",
      "Affordable health benefits to reduce employee turnover",
      "HR compliance for wage and hour regulations",
      "Multi-state workforce support for franchise operations",
      "Harassment prevention training and policy development",
      "Streamlined scheduling and onboarding tools",
    ],
  },
  {
    name: "Manufacturing",
    slug: "manufacturing",
    descriptor: "Engineered protection for your workforce",
    icon: Factory,
    image: "/images/verticals/manufacturing.jpg",
    description:
      "Manufacturing facilities present complex workers\u2019 compensation exposures ranging from heavy machinery accidents and repetitive motion injuries to chemical exposure and material handling risks. With multiple job classifications often operating under one roof, accurate class code assignment is critical to controlling premium costs. Axel partners with carriers experienced in manufacturing risk to deliver programs that properly classify your workforce, implement targeted safety protocols, and manage claims efficiently. Whether you operate a light assembly operation or a heavy industrial plant, we build coverage that reflects the true nature of your manufacturing processes.",
    wcDescription:
      "Workers\u2019 compensation insurance designed for manufacturing operations. Get accurate classification, competitive rates, and loss control support from carriers who understand production environments and industrial exposures.",
    peoDescription:
      "A PEO solution for manufacturers seeking to streamline HR, payroll, and benefits while gaining access to competitive workers\u2019 comp rates. Reduce administrative overhead and focus on production efficiency.",
    wcFeatures: [
      "Accurate class code assignment for multi-operation facilities",
      "Machine guarding and industrial safety consulting",
      "Ergonomics programs for repetitive motion injury prevention",
      "OSHA compliance support and record-keeping assistance",
      "Claims management experienced with industrial injuries",
      "Premium audit preparation and classification defense",
    ],
    peoFeatures: [
      "Workers\u2019 comp bundled with manufacturing payroll processing",
      "Competitive benefits to attract skilled production workers",
      "OSHA 300 log management and safety training programs",
      "Multi-shift and overtime payroll administration",
      "Employee handbook and workplace policy creation",
      "Immigration compliance and E-Verify support",
    ],
  },
  {
    name: "Staffing",
    slug: "staffing",
    descriptor: "Temporary & contract workforce",
    icon: UsersRound,
    image: "/images/verticals/staffing.jpg",
    description:
      "Staffing agencies face unique workers\u2019 compensation challenges. You\u2019re placing employees at client worksites across multiple industries, often with limited control over workplace safety conditions. Class code complexity, employee turnover, and the dual-employer relationship create risk management issues that standard carriers frequently decline. Axel works with carriers who specialize in staffing industry risk, offering programs that handle multi-state, multi-classification payrolls and provide the flexibility to scale coverage as your placements grow. We understand the staffing business model and build coverage that supports your growth without exposing you to uncontrolled risk.",
    wcDescription:
      "Workers\u2019 compensation programs built specifically for staffing agencies and temporary employment firms. Our carriers understand dual-employer risk, client site exposures, and the unique classification challenges of placing workers across industries.",
    peoDescription:
      "A PEO solution for staffing agencies looking to offer better benefits, simplify back-office operations, and access more competitive workers\u2019 comp rates for their placed employees.",
    wcFeatures: [
      "Multi-classification payroll support across client industries",
      "Client site safety evaluation and risk assessment",
      "Dual-employer liability management",
      "Rapid certificate issuance for client compliance",
      "Pay-as-you-go billing aligned to weekly payroll cycles",
      "Experience mod management across diverse placements",
    ],
    peoFeatures: [
      "Workers\u2019 comp with flexible, high-volume payroll processing",
      "Benefits packages to improve candidate recruitment",
      "ACA compliance tracking for variable-hour employees",
      "Multi-state tax registration and compliance",
      "Rapid onboarding and offboarding workflows",
      "Client billing integration and reporting",
    ],
  },
  {
    name: "Transportation",
    slug: "transportation",
    descriptor: "Trucking, logistics, delivery",
    icon: Truck,
    image: "/images/verticals/transportation.jpg",
    description:
      "The transportation industry encompasses trucking, last-mile delivery, freight logistics, and passenger services\u2014all with significant workers\u2019 compensation exposures. Drivers face long hours, loading and unloading injuries, vehicular accidents, and repetitive strain. The combination of DOT compliance requirements, CDL workforce management, and interstate operations makes transportation one of the more complex industries to insure. Axel partners with carriers who specialize in motor carrier and logistics risk, offering programs that properly classify your drivers, dock workers, and dispatchers while providing loss control resources that address the real hazards of the road.",
    wcDescription:
      "Workers\u2019 compensation coverage for trucking companies, freight brokers, delivery services, and logistics operations. Our carrier partners understand DOT classifications and offer programs designed for motor carrier risk.",
    peoDescription:
      "A PEO solution for transportation companies seeking to consolidate driver management, payroll, benefits, and workers\u2019 comp under one platform. Simplify compliance and improve driver retention.",
    wcFeatures: [
      "Rates aligned to transportation and trucking class codes",
      "DOT compliance and driver qualification file management",
      "Fleet safety programs and driver training resources",
      "Loading/unloading injury prevention protocols",
      "Multi-state coverage for interstate operations",
      "Claims management experienced with auto and cargo losses",
    ],
    peoFeatures: [
      "Workers\u2019 comp with per-mile or per-load payroll processing",
      "Health benefits to improve driver recruitment and retention",
      "CDL verification and drug testing program administration",
      "Hours-of-service compliance support",
      "Multi-state tax and regulatory compliance",
      "Centralized driver onboarding and credential management",
    ],
  },
  {
    name: "All Other Industries",
    slug: "all-other-industries",
    descriptor: "If it's not listed, we'll find a solution",
    icon: BarChart3,
    image: "/images/verticals/all-other.png",
    description:
      "Not every business fits neatly into a defined industry vertical, and that\u2019s perfectly fine. Axel\u2019s platform is built to serve employers across the full spectrum of American commerce\u2014from professional services and technology firms to agriculture, education, and beyond. If your industry isn\u2019t listed in our specialty verticals, our team will work to understand your operations, identify the right class codes, and connect you with carriers who can competitively price your workers\u2019 compensation coverage. No business is too niche or too complex for our network of carrier partners and PEO solutions.",
    wcDescription:
      "Workers\u2019 compensation coverage for any industry not covered by our specialty verticals. Tell us about your operations and we\u2019ll match you with carriers who understand your class codes and risk profile.",
    peoDescription:
      "A flexible PEO solution for businesses in any industry. Bundle workers\u2019 comp with payroll, benefits, and HR administration regardless of your business type or size.",
    wcFeatures: [
      "Coverage available for virtually any industry classification",
      "Expert class code analysis and assignment",
      "Competitive rate shopping across our carrier network",
      "Customized safety and loss control programs",
      "Flexible payment plans and billing options",
      "Annual audit support and premium optimization",
    ],
    peoFeatures: [
      "Workers\u2019 comp bundled with full-service payroll",
      "Access to enterprise-level health and retirement benefits",
      "HR compliance support for federal and state regulations",
      "Employee handbook and policy development",
      "Performance management and training tools",
      "Scalable solution that grows with your business",
    ],
  },
];

export function getVerticalBySlug(slug: string): VerticalData | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}
