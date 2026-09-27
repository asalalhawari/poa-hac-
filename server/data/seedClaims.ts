/**
 * ============================================================================
 * SEED CLINICAL CLAIMS DATASET
 * ============================================================================
 * Diverse, realistic inpatient episode datasets exercising all scoring
 * components (A through E), edge cases, missing timestamps, suppressors,
 * recognized progressions, and provider readmission lookbacks.
 */

import { ClaimEntity } from '../contracts/hac.types.js';

export const INITIAL_SEED_CLAIMS: ClaimEntity[] = [
  // 1. Classic HAC Case: Late-onset post-op abscess with return to theatre
  {
    claimId: 'CLM-2024-001',
    patientId: 'P-45872',
    patientAge: 42,
    patientGender: 'M',
    providerId: 'PRV-GEN-9901',
    providerFacilityCode: 'FAC-GH-01',
    providerDisplayName: 'General Hospital',
    admissionDateTime: '2024-01-15T08:10:00Z',
    dischargeDateTime: '2024-01-22T13:10:00Z',
    lengthOfStayDays: 7,
    reviewStatus: 'IN_REVIEW',
    assignedTo: 'Dr. Sarah Al-Busaidi',
    isPatientHistoryAvailable: true,
    primaryDiagnosis: {
      code: 'K35.80',
      description: 'Unspecified acute appendicitis',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-01-15T08:10:00Z',
    },
    diagnoses: [
      {
        code: 'K35.80',
        description: 'Unspecified acute appendicitis',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-01-15T08:10:00Z',
      },
      {
        code: 'L02.211',
        description: 'Cutaneous abscess of abdominal wall',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-01-18T10:15:00Z', // 74h elapsed (Mid-stay)
      },
    ],
    procedures: [
      {
        code: '47.09',
        description: 'Appendicectomy, laparoscopic',
        performedDateTime: '2024-01-15T14:20:00Z',
        anatomicalSite: 'Abdominal wall / Appendix',
        isPlannedOnAdmission: true,
      },
      {
        code: '54.0',
        description: 'Incision and drainage of abdominal wall abscess',
        performedDateTime: '2024-01-18T16:05:00Z',
        anatomicalSite: 'Abdominal wall',
        isPlannedOnAdmission: false,
        isReturnToTheatre: true, // Unplanned return
      },
    ],
    patientHistory: [
      {
        id: 'hist-001',
        claimId: 'CLM-HIST-101',
        providerId: 'PRV-GEN-9901',
        facilityCode: 'FAC-GH-01',
        serviceDateTime: '2023-11-10T09:00:00Z',
        diagnosisCode: 'Z00.00',
        procedureDescription: 'Routine preventive exam',
        isRelatedToCurrentCondition: false,
        daysPriorToAdmission: 66,
      },
    ],
  },

  // 2. Post-procedural pneumothorax (Direct care-event transparency A1)
  {
    claimId: 'CLM-2024-002',
    patientId: 'P-31695',
    patientAge: 68,
    patientGender: 'F',
    providerId: 'PRV-GEN-9901',
    providerFacilityCode: 'FAC-GH-01',
    providerDisplayName: 'General Hospital',
    admissionDateTime: '2024-01-14T09:00:00Z',
    dischargeDateTime: '2024-01-20T11:00:00Z',
    lengthOfStayDays: 6,
    reviewStatus: 'NEW',
    isPatientHistoryAvailable: true,
    primaryDiagnosis: {
      code: 'I25.10',
      description: 'Atherosclerotic heart disease of native coronary artery',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-01-14T09:00:00Z',
    },
    diagnoses: [
      {
        code: 'I25.10',
        description: 'Atherosclerotic heart disease',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-01-14T09:00:00Z',
      },
      {
        code: 'J95.811',
        description: 'Postprocedural pneumothorax',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-01-16T15:30:00Z', // 54.5h elapsed
      },
    ],
    procedures: [
      {
        code: '02.71',
        description: 'Percutaneous insertion of catheter into central venous line',
        performedDateTime: '2024-01-14T12:00:00Z',
        isPlannedOnAdmission: true,
      },
      {
        code: '34.04',
        description: 'Insertion of intercostal catheter for chest drainage',
        performedDateTime: '2024-01-16T16:30:00Z',
        isPlannedOnAdmission: false,
        isRescueIntervention: true,
      },
    ],
  },

  // 3. Postprocedural hemorrhage (Component C intermediate / A1)
  {
    claimId: 'CLM-2024-003',
    patientId: 'P-78234',
    patientAge: 55,
    patientGender: 'M',
    providerId: 'PRV-REG-4420',
    providerFacilityCode: 'FAC-RMC-02',
    providerDisplayName: 'Regional Medical Center',
    admissionDateTime: '2024-01-12T11:15:00Z',
    dischargeDateTime: '2024-01-18T16:00:00Z',
    lengthOfStayDays: 6,
    reviewStatus: 'IN_REVIEW',
    assignedTo: 'Nurse Reviewer Tariq',
    isPatientHistoryAvailable: true,
    primaryDiagnosis: {
      code: 'K29.00',
      description: 'Acute gastritis without bleeding',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-01-12T11:15:00Z',
    },
    diagnoses: [
      {
        code: 'K29.00',
        description: 'Acute gastritis without bleeding',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-01-12T11:15:00Z',
      },
      {
        code: 'K91.870',
        description: 'Postprocedural hemorrhage following a digestive system procedure',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-01-14T02:00:00Z', // 38.75h (intermediate 24-48h window)
      },
    ],
    procedures: [
      {
        code: '45.13',
        description: 'Esophagogastroduodenoscopy with biopsy',
        performedDateTime: '2024-01-12T15:00:00Z',
        isPlannedOnAdmission: true,
      },
      {
        code: '44.43',
        description: 'Endoscopic control of gastric hemorrhage',
        performedDateTime: '2024-01-14T04:00:00Z',
        isPlannedOnAdmission: false,
      },
    ],
  },

  // 4. Early condition present on admission (<24h -> Low signal score)
  {
    claimId: 'CLM-2024-004',
    patientId: 'P-90123',
    patientAge: 31,
    patientGender: 'F',
    providerId: 'PRV-CTY-1102',
    providerFacilityCode: 'FAC-CH-03',
    providerDisplayName: 'City Hospital',
    admissionDateTime: '2024-01-10T06:30:00Z',
    dischargeDateTime: '2024-01-13T10:00:00Z',
    lengthOfStayDays: 3,
    reviewStatus: 'RESOLVED',
    isPatientHistoryAvailable: true,
    primaryDiagnosis: {
      code: 'O20.0',
      description: 'Threatened abortion',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-01-10T06:30:00Z',
    },
    diagnoses: [
      {
        code: 'O20.0',
        description: 'Threatened abortion',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-01-10T06:30:00Z',
      },
      {
        code: 'D62',
        description: 'Acute posthemorrhagic anemia',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-01-10T11:00:00Z', // 4.5h elapsed (<24h -> POA)
      },
    ],
    procedures: [
      {
        code: '99.04',
        description: 'Packed red blood cell transfusion',
        performedDateTime: '2024-01-10T13:00:00Z',
        isPlannedOnAdmission: true,
      },
    ],
  },

  // 5. Retained foreign body post-op (A1 / Return to theatre -> High Score 71)
  {
    claimId: 'CLM-2024-005',
    patientId: 'P-67321',
    patientAge: 59,
    patientGender: 'M',
    providerId: 'PRV-GEN-9901',
    providerFacilityCode: 'FAC-GH-01',
    providerDisplayName: 'General Hospital',
    admissionDateTime: '2024-01-08T07:45:00Z',
    dischargeDateTime: '2024-01-16T14:30:00Z',
    lengthOfStayDays: 8,
    reviewStatus: 'NEW',
    isPatientHistoryAvailable: true,
    primaryDiagnosis: {
      code: 'K80.00',
      description: 'Calculus of gallbladder with acute cholecystitis',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-01-08T07:45:00Z',
    },
    diagnoses: [
      {
        code: 'K80.00',
        description: 'Calculus of gallbladder with acute cholecystitis',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-01-08T07:45:00Z',
      },
      {
        code: 'T81.50XA',
        description: 'Unspecified foreign body accidentally left in body following procedure',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-01-11T12:00:00Z', // 76h elapsed
      },
    ],
    procedures: [
      {
        code: '51.23',
        description: 'Laparoscopic cholecystectomy',
        performedDateTime: '2024-01-08T11:00:00Z',
        isPlannedOnAdmission: true,
      },
      {
        code: '54.11',
        description: 'Exploratory laparotomy and removal of foreign body',
        performedDateTime: '2024-01-11T16:00:00Z',
        isPlannedOnAdmission: false,
        isReturnToTheatre: true,
      },
    ],
  },

  // 6. Data Quality Edge Case: Missing observation datetime
  {
    claimId: 'CLM-2024-006',
    patientId: 'P-11244',
    patientAge: 73,
    patientGender: 'M',
    providerId: 'PRV-GEN-9901',
    providerFacilityCode: 'FAC-GH-01',
    providerDisplayName: 'General Hospital',
    admissionDateTime: '2024-01-20T10:00:00Z',
    dischargeDateTime: '2024-01-26T12:00:00Z',
    lengthOfStayDays: 6,
    reviewStatus: 'NEED_MORE_INFORMATION',
    isPatientHistoryAvailable: false, // History unavailable
    primaryDiagnosis: {
      code: 'I21.0',
      description: 'ST elevation myocardial infarction of anterior wall',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-01-20T10:00:00Z',
    },
    diagnoses: [
      {
        code: 'I21.0',
        description: 'Acute myocardial infarction',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-01-20T10:00:00Z',
      },
      {
        code: 'N17.9',
        description: 'Acute kidney injury, unspecified',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        // Missing firstObservedDateTime deliberately!
      },
    ],
    procedures: [
      {
        code: '36.06',
        description: 'Insertion of coronary artery stent',
        performedDateTime: '2024-01-20T13:30:00Z',
        isPlannedOnAdmission: true,
      },
    ],
  },

  // 7. Recognized Clinical Progression Case: Severe Pancreatitis -> Peripancreatic Fluid
  {
    claimId: 'CLM-2024-007',
    patientId: 'P-55321',
    patientAge: 51,
    patientGender: 'M',
    providerId: 'PRV-REG-4420',
    providerFacilityCode: 'FAC-RMC-02',
    providerDisplayName: 'Regional Medical Center',
    admissionDateTime: '2024-01-18T14:00:00Z',
    dischargeDateTime: '2024-01-25T17:00:00Z',
    lengthOfStayDays: 7,
    reviewStatus: 'NEW',
    isPatientHistoryAvailable: true,
    primaryDiagnosis: {
      code: 'K85.0',
      description: 'Idiopathic acute pancreatitis (severe)',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-01-18T14:00:00Z',
    },
    diagnoses: [
      {
        code: 'K85.0',
        description: 'Severe acute pancreatitis',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-01-18T14:00:00Z',
      },
      {
        code: 'K85.9',
        description: 'Acute necrotizing pancreatitis with peripancreatic fluid',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-01-21T18:00:00Z', // 76h elapsed
      },
    ],
    procedures: [
      {
        code: '88.74',
        description: 'Diagnostic ultrasound of upper abdomen',
        performedDateTime: '2024-01-19T09:00:00Z',
        isPlannedOnAdmission: true,
      },
    ],
  },

  // 8. Longitudinal Provider Linkage Case: Readmission within 14 days after Joint Replacement
  {
    claimId: 'CLM-2024-008',
    patientId: 'P-88219',
    patientAge: 64,
    patientGender: 'F',
    providerId: 'PRV-GEN-9901',
    providerFacilityCode: 'FAC-GH-01',
    providerDisplayName: 'General Hospital',
    admissionDateTime: '2024-02-01T10:00:00Z',
    dischargeDateTime: '2024-02-09T14:00:00Z',
    lengthOfStayDays: 8,
    reviewStatus: 'IN_REVIEW',
    assignedTo: 'Dr. Sarah Al-Busaidi',
    isPatientHistoryAvailable: true,
    primaryDiagnosis: {
      code: 'T84.50XA',
      description: 'Infection and inflammatory reaction due to internal joint prosthesis',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: true,
      firstObservedDateTime: '2024-02-01T10:00:00Z',
    },
    diagnoses: [
      {
        code: 'T84.50XA',
        description: 'Infection and inflammatory reaction due to internal joint prosthesis',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-02-01T10:00:00Z',
      },
    ],
    procedures: [
      {
        code: '0SP902Z',
        description: 'Removal and revision of right hip synthetic prosthesis',
        performedDateTime: '2024-02-02T11:00:00Z',
        isPlannedOnAdmission: false,
        isReturnToTheatre: true,
      },
    ],
    patientHistory: [
      {
        id: 'hist-joint-01',
        claimId: 'CLM-HIST-7712',
        providerId: 'PRV-GEN-9901',
        facilityCode: 'FAC-GH-01',
        serviceDateTime: '2024-01-18T08:00:00Z', // 14 days prior
        procedureCode: '0SR902Z',
        procedureDescription: 'Replacement of right hip joint with synthetic substitute',
        diagnosisCode: 'M16.11',
        isRelatedToCurrentCondition: true,
        daysPriorToAdmission: 14, // DIRECT_30D -> 15 points in Component E!
      },
    ],
  },

  // 9. Suppressor Case: Palliative Care protocol documented
  {
    claimId: 'CLM-2024-009',
    patientId: 'P-99120',
    patientAge: 84,
    patientGender: 'M',
    providerId: 'PRV-CTY-1102',
    providerFacilityCode: 'FAC-CH-03',
    providerDisplayName: 'City Hospital',
    admissionDateTime: '2024-02-05T12:00:00Z',
    dischargeDateTime: '2024-02-12T08:00:00Z',
    lengthOfStayDays: 7,
    reviewStatus: 'RESOLVED',
    isPatientHistoryAvailable: true,
    isPalliativeCareDocumented: true, // Trigger suppressor!
    primaryDiagnosis: {
      code: 'C34.90',
      description: 'Malignant neoplasm of unspecified part of bronchus or lung, stage IV',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: '2024-02-05T12:00:00Z',
    },
    diagnoses: [
      {
        code: 'C34.90',
        description: 'Malignant neoplasm of lung',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
        firstObservedDateTime: '2024-02-05T12:00:00Z',
      },
      {
        code: 'J95.811',
        description: 'Postprocedural pneumothorax following pleural tap',
        isPrimaryAdmissionDiagnosis: false,
        isSuspectedHacCondition: true,
        firstObservedDateTime: '2024-02-08T15:00:00Z',
      },
    ],
    procedures: [
      {
        code: '34.91',
        description: 'Diagnostic pleural tap / thoracentesis',
        performedDateTime: '2024-02-08T11:00:00Z',
        isPlannedOnAdmission: true,
      },
    ],
  },
];
