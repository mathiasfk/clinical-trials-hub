package bootstrap

import "github.com/mathias/clinical-trials-hub/backend/internal/domain"

func crit(description, dimensionID, operator string, value float64, unit string) domain.EligibilityCriterion {
	return domain.EligibilityCriterion{
		Description: description,
		DeterministicRule: domain.DeterministicRule{
			DimensionID: dimensionID,
			Operator:    operator,
			Value:       value,
			Unit:        unit,
		},
	}
}

func SeedStudies() []domain.Study {
	return []domain.Study{
		{
			ID:         "study-0001",
			Objectives: []string{"Assess efficacy of treatment X in moderate rheumatoid arthritis"},
			Endpoints:  []string{"ACR20 response at Week 12", "Safety profile through Week 24"},
			InclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants must be at least 18 years old.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "age",
						Operator:    ">=",
						Value:       18,
						Unit:        "years old",
					},
				},
				{
					Description: "Participants must have hsCRP above 2 mg/L.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "hsCRP",
						Operator:    ">",
						Value:       2,
						Unit:        "mg/L",
					},
				},
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants with systolic blood pressure below 95 mmHg are excluded.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "SBP",
						Operator:    "<",
						Value:       95,
						Unit:        "mmHg",
					},
				},
			},
			Participants:           120,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Cardiovascular",
			PatientPopulation:      "Adults with moderate rheumatoid arthritis",
			FirstPatientFirstVisit: "2025-03-15",
			LastPatientFirstVisit:  "2025-09-30",
			ProtocolApprovalDate:   "2025-01-10",
		},
		{
			ID:         "study-0002",
			Objectives: []string{"Evaluate dose-ranging effect of treatment Y in type 2 diabetes"},
			Endpoints:  []string{"HbA1c reduction at Week 16"},
			InclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants must be older than 50 years.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "age",
						Operator:    ">",
						Value:       50,
						Unit:        "years old",
					},
				},
				{
					Description: "Participants must have LVEF below 40%.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "LVEF",
						Operator:    "<",
						Value:       40,
						Unit:        "%",
					},
				},
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants with systolic blood pressure below 95 mmHg are excluded.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "SBP",
						Operator:    "<",
						Value:       95,
						Unit:        "mmHg",
					},
				},
			},
			Participants:           180,
			StudyType:              "parallel",
			NumberOfArms:           3,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Diabetes",
			PatientPopulation:      "Adults with type 2 diabetes uncontrolled on oral therapy",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "",
		},

		// Cardiovascular — inspired by NCT04913207 (CT-guided vs echo-guided LAA occlusion strategy)
		{
			ID: "study-0003",
			Objectives: []string{
				"Compare imaging-guided left atrial appendage closure strategies on procedural success and periprocedural complications",
			},
			Endpoints: []string{
				"Device success rate at index procedure",
				"Major bleeding or pericardial effusion requiring intervention through 30 days",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Left ventricular ejection fraction at least 30 percent for procedural eligibility.", "LVEF", ">=", 30, "%"),
				crit("Office systolic blood pressure controlled below 160 mmHg on stable therapy.", "SBP", "<", 160, "mmHg"),
				crit("Diastolic blood pressure below 100 mmHg on stable antihypertensive regimen.", "DBP", "<", 100, "mmHg"),
				crit("Body mass index between 18.5 and 45 kg per square meter.", "BMI", "<=", 45, "kg/m²"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Systolic blood pressure below 90 mmHg at screening.", "SBP", "<", 90, "mmHg"),
			},
			Participants:           310,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 3",
			TherapeuticArea:        "Cardiovascular",
			PatientPopulation:      "Adults with nonvalvular atrial fibrillation referred for percutaneous left atrial appendage closure",
			FirstPatientFirstVisit: "2024-06-01",
			LastPatientFirstVisit:  "2026-03-01",
			ProtocolApprovalDate:   "2024-01-15",
		},

		// Diabetes — inspired by NCT00162175 (Phase 3 oral combination in type 2 diabetes)
		{
			ID: "study-0004",
			Objectives: []string{
				"Demonstrate glycemic improvement with add-on therapy in adults with inadequately controlled type 2 diabetes",
			},
			Endpoints: []string{
				"Change in HbA1c from baseline to Week 24",
				"Proportion reaching HbA1c below seven percent without severe hypoglycemia",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("HbA1c at screening between seven and ten percent inclusive.", "HbA1c", ">=", 7, "%"),
				crit("HbA1c at screening between seven and ten percent inclusive.", "HbA1c", "<=", 10, "%"),
				crit("Body mass index at or below forty-five kilograms per square meter.", "BMI", "<=", 45, "kg/m²"),
				crit("Participants must be at least eighteen years old.", "age", ">=", 18, "years old"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Estimated GFR below thirty milliliters per minute per 1.73 square meters.", "eGFR", "<", 30, "mL/min/1.73m²"),
			},
			Participants:           534,
			StudyType:              "parallel",
			NumberOfArms:           3,
			Phase:                  "Phase 3",
			TherapeuticArea:        "Diabetes",
			PatientPopulation:      "Adults with type 2 diabetes mellitus with suboptimal control on baseline oral therapy",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "2023-11-01",
		},

		// Diabetes — inspired by NCT00726505 (renal glucose handling / SGLT2 mechanism in T2DM)
		{
			ID: "study-0005",
			Objectives: []string{
				"Characterize short-term glycemic and renal responses to investigational glucose-lowering therapy in a crossover design",
			},
			Endpoints: []string{
				"Fasting plasma glucose change during each treatment period",
				"Body weight change from baseline to end of each period",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("HbA1c at screening at least six point five percent.", "HbA1c", ">=", 6.5, "%"),
				crit("Body weight stable within five percent over the prior eight weeks.", "weight", "<=", 120, "kg"),
				crit("Fasting plasma glucose elevated at screening visit.", "fastingPlasmaGlucose", ">=", 126, "mg/dL"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Estimated GFR below forty-five for renal safety monitoring.", "eGFR", "<", 45, "mL/min/1.73m²"),
			},
			Participants:           48,
			StudyType:              "crossover",
			NumberOfArms:           2,
			Phase:                  "Phase 1",
			TherapeuticArea:        "Diabetes",
			PatientPopulation:      "Adults with type 2 diabetes suitable for tightly controlled inpatient crossover pharmacology",
			FirstPatientFirstVisit: "2025-02-10",
			LastPatientFirstVisit:  "2025-08-10",
			ProtocolApprovalDate:   "2024-12-01",
		},

		// Hematology — inspired by NCT07496827 (hematology inpatient cohort characterization)
		{
			ID: "study-0006",
			Objectives: []string{
				"Evaluate hematologic response and transfusion burden with standard-of-care therapy in cytopenic hematology patients",
			},
			Endpoints: []string{
				"Hemoglobin response by Week 12",
				"Platelet count stabilization without platelet transfusion through Week 24",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Hemoglobin at or below ten grams per deciliter at screening.", "hemoglobin", "<=", 10, "g/dL"),
				crit("Platelet count at least fifty times ten to the ninth per liter.", "platelets", ">=", 50, "×10⁹/L"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("ECOG performance status greater than two.", "ECOG", ">", 2, ""),
			},
			Participants:           90,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Hematology",
			PatientPopulation:      "Adults with cytopenic hematologic disorders requiring protocol-driven supportive care",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "2025-01-20",
		},

		// Hematology — inspired by NCT02806791 (G-CSF mobilization in hematology-oncology setting)
		{
			ID: "study-0007",
			Objectives: []string{
				"Assess long-term hematologic recovery and neutrophil engraftment kinetics after mobilization therapy",
			},
			Endpoints: []string{
				"Median time to neutrophil engraftment",
				"Transfusion independence rate at Day 100",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Participants must be at least eighteen years old.", "age", ">=", 18, "years old"),
				crit("Hemoglobin at least eight grams per deciliter prior to mobilization.", "hemoglobin", ">=", 8, "g/dL"),
				crit("Absolute neutrophil count at least one point zero times ten to the ninth per liter.", "ANC", ">=", 1, "×10⁹/L"),
			},
			ExclusionCriteria:      []domain.EligibilityCriterion{},
			Participants:           200,
			StudyType:              "single-arm",
			NumberOfArms:           1,
			Phase:                  "Phase 4",
			TherapeuticArea:        "Hematology",
			PatientPopulation:      "Adults undergoing peripheral blood stem cell mobilization for planned transplantation",
			FirstPatientFirstVisit: "2023-04-01",
			LastPatientFirstVisit:  "2025-12-01",
			ProtocolApprovalDate:   "2023-01-10",
		},

		// Sickle cell disease — inspired by NCT02972138 (vitamin D and bone health in SCD)
		{
			ID: "study-0008",
			Objectives: []string{
				"Evaluate effects of adjunct therapy on hemoglobin stabilization and vaso-occlusive event rate in sickle cell disease",
			},
			Endpoints: []string{
				"Annualized rate of vaso-occlusive crises",
				"Change in fetal hemoglobin fraction from baseline to Week 24",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Hemoglobin at or below ten grams per deciliter at baseline.", "hemoglobin", "<=", 10, "g/dL"),
				crit("Fetal hemoglobin fraction at least five percent.", "HbF", ">=", 5, "%"),
				crit("Participants must be at least sixteen years old.", "age", ">=", 16, "years old"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Systolic blood pressure above one hundred eighty millimeters mercury.", "SBP", ">", 180, "mmHg"),
			},
			Participants:           80,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Sickle Cell Disease",
			PatientPopulation:      "Adults and adolescents with sickle cell disease with recurrent painful crises",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "2019-09-01",
		},

		// Sickle cell disease — inspired by NCT05681598 (hydroxyurea in adult SCA)
		{
			ID: "study-0009",
			Objectives: []string{
				"Measure hydroxyurea-driven improvements in hemoglobin and fetal hemoglobin in a single-arm observational treatment cohort",
			},
			Endpoints: []string{
				"Median hemoglobin change at twelve weeks",
				"Proportion achieving HbF target increment from baseline",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Fetal hemoglobin at least three percent at screening.", "HbF", ">=", 3, "%"),
				crit("Hemoglobin between six and ten grams per deciliter.", "hemoglobin", "<=", 10, "g/dL"),
				crit("Participants must be adults eighteen to sixty-five years old.", "age", "<=", 65, "years old"),
			},
			ExclusionCriteria:      []domain.EligibilityCriterion{},
			Participants:           120,
			StudyType:              "single-arm",
			NumberOfArms:           1,
			Phase:                  "Phase 3",
			TherapeuticArea:        "Sickle Cell Disease",
			PatientPopulation:      "Adults with sickle cell anemia initiating or optimizing hydroxyurea therapy",
			FirstPatientFirstVisit: "2024-01-15",
			LastPatientFirstVisit:  "2025-06-30",
			ProtocolApprovalDate:   "2023-10-01",
		},

		// Obesity — inspired by NCT06153654 (nasal environment and adiposity)
		{
			ID: "study-0010",
			Objectives: []string{
				"Assess lifestyle and biomarker changes in adults with obesity enrolled in a structured weight-management program",
			},
			Endpoints: []string{
				"Percent change in body weight at Week 26",
				"Change in HbA1c among participants with prediabetes at baseline",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Body mass index at least thirty kilograms per square meter.", "BMI", ">=", 30, "kg/m²"),
				crit("Body weight at least ninety kilograms.", "weight", ">=", 90, "kg"),
				crit("HbA1c at least five point seven percent for prediabetes enrollment.", "HbA1c", ">=", 5.7, "%"),
				crit("HbA1c no higher than six point four percent for prediabetes enrollment.", "HbA1c", "<=", 6.4, "%"),
				crit("Participants must be between eighteen and sixty-five years old.", "age", "<=", 65, "years old"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("HbA1c at or above six point five percent indicating diabetes requiring alternate protocols.", "HbA1c", ">=", 6.5, "%"),
			},
			Participants:           150,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Obesity",
			PatientPopulation:      "Adults with obesity seeking structured behavioral and dietary intervention",
			FirstPatientFirstVisit: "2025-03-01",
			LastPatientFirstVisit:  "2026-01-01",
			ProtocolApprovalDate:   "2024-11-01",
		},

		// Obesity — inspired by NCT01785004 (VITAL adiposity ancillary cohort)
		{
			ID: "study-0011",
			Objectives: []string{
				"Compare body-composition and cardiometabolic outcomes between crossover intervention arms in adults with elevated BMI",
			},
			Endpoints: []string{
				"Change in waist circumference at twenty-four weeks",
				"Mean change in office systolic and diastolic blood pressure",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Body mass index between thirty and forty kilograms per square meter.", "BMI", "<=", 40, "kg/m²"),
				crit("Stable body weight within three percent over eight weeks prior.", "weight", "<=", 130, "kg"),
				crit("Office systolic blood pressure below one hundred sixty millimeters mercury.", "SBP", "<", 160, "mmHg"),
				crit("Diastolic blood pressure below one hundred millimeters mercury.", "DBP", "<", 100, "mmHg"),
			},
			ExclusionCriteria:      []domain.EligibilityCriterion{},
			Participants:           600,
			StudyType:              "crossover",
			NumberOfArms:           2,
			Phase:                  "Phase 3",
			TherapeuticArea:        "Obesity",
			PatientPopulation:      "Adults with obesity participating in a nutritional supplement crossover ancillary trial",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "2012-07-01",
		},

		// Rare diseases — inspired by NCT02397824 (orodental manifestations registry)
		{
			ID: "study-0012",
			Objectives: []string{
				"Characterize safety and tolerability of an ultra-orphan biologic in a small single-arm rare-disease cohort",
			},
			Endpoints: []string{
				"Incidence of treatment-emergent adverse events through Week 12",
				"Exploratory change in disease-specific functional score",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Participants must be at least twelve years old.", "age", ">=", 12, "years old"),
				crit("ECOG performance status zero or one.", "ECOG", "<=", 1, ""),
				crit("Hemoglobin at least nine grams per deciliter.", "hemoglobin", ">=", 9, "g/dL"),
			},
			ExclusionCriteria:      []domain.EligibilityCriterion{},
			Participants:           12,
			StudyType:              "single-arm",
			NumberOfArms:           1,
			Phase:                  "Phase 1",
			TherapeuticArea:        "Rare Diseases",
			PatientPopulation:      "Children and adults with a documented ultra-rare syndromic disorder amenable to enzyme replacement",
			FirstPatientFirstVisit: "2026-02-01",
			LastPatientFirstVisit:  "2026-12-01",
			ProtocolApprovalDate:   "2025-09-15",
		},

		// Rare diseases — inspired by NCT04024774 (unsolved rare disease diagnostics)
		{
			ID: "study-0013",
			Objectives: []string{
				"Evaluate renal and hepatic safety during prolonged phenotyping and omics profiling in rare disease participants",
			},
			Endpoints: []string{
				"Proportion completing twelve months of observation without protocol-defined renal impairment",
				"Exploratory biomarker discovery endpoints from serial plasma sampling",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Participants must be at least eighteen years old.", "age", ">=", 18, "years old"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Serum creatinine above two milligrams per deciliter.", "creatinine", ">", 2, "mg/dL"),
				crit("Alanine aminotransferase above three times upper limit of normal.", "ALT", ">", 120, "U/L"),
			},
			Participants:           2000,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Rare Diseases",
			PatientPopulation:      "Adults with diagnostically unsolved rare diseases undergoing deep phenotyping",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "2021-03-01",
		},

		// Oncology — generic advanced solid tumor fixture
		{
			ID: "study-0014",
			Objectives: []string{
				"Estimate objective response rate and disease control in pretreated advanced solid tumors receiving investigational immunotherapy",
			},
			Endpoints: []string{
				"Confirmed objective response by RECIST 1.1 at Week 12",
				"Progression-free survival assessed by blinded independent review",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("ECOG performance status zero to two.", "ECOG", "<=", 2, ""),
				crit("Absolute neutrophil count at least one point five times ten to the ninth per liter.", "ANC", ">=", 1.5, "×10⁹/L"),
				crit("Platelet count at least one hundred times ten to the ninth per liter.", "platelets", ">=", 100, "×10⁹/L"),
				crit("Hemoglobin at least nine grams per deciliter without transfusion within seven days.", "hemoglobin", ">=", 9, "g/dL"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Alanine aminotransferase above three times upper limit of normal.", "ALT", ">", 120, "U/L"),
				crit("Total bilirubin above two milligrams per deciliter unless Gilbert syndrome documented.", "totalBilirubin", ">", 2, "mg/dL"),
			},
			Participants:           96,
			StudyType:              "single-arm",
			NumberOfArms:           1,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Oncology",
			PatientPopulation:      "Adults with advanced non-small-cell lung cancer after prior platinum-based chemotherapy",
			FirstPatientFirstVisit: "2025-05-01",
			LastPatientFirstVisit:  "2027-01-01",
			ProtocolApprovalDate:   "2025-01-01",
		},

		// Oncology — generic solid tumor renal-safety cohort
		{
			ID: "study-0015",
			Objectives: []string{
				"Compare progression-free survival between treatment arms in metastatic solid tumors with controlled performance status",
			},
			Endpoints: []string{
				"Investigator-assessed progression-free survival",
				"Incidence of renal adverse events grade two or higher",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("ECOG performance status zero or one.", "ECOG", "<=", 1, ""),
				crit("Hemoglobin at least ten grams per deciliter.", "hemoglobin", ">=", 10, "g/dL"),
				crit("Estimated GFR at least forty-five milliliters per minute per 1.73 square meters.", "eGFR", ">=", 45, "mL/min/1.73m²"),
				crit("Serum creatinine no higher than one point five milligrams per deciliter.", "creatinine", "<=", 1.5, "mg/dL"),
			},
			ExclusionCriteria:      []domain.EligibilityCriterion{},
			Participants:           420,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 3",
			TherapeuticArea:        "Oncology",
			PatientPopulation:      "Adults with metastatic solid tumors and adequate bone marrow and renal reserve",
			FirstPatientFirstVisit: "2024-09-01",
			LastPatientFirstVisit:  "2026-12-01",
			ProtocolApprovalDate:   "2024-04-01",
		},

		// Neurology — generic early cognitive impairment cohort
		{
			ID: "study-0016",
			Objectives: []string{
				"Evaluate cognitive and functional outcomes with a disease-modifying therapy in early-stage neurodegenerative disease",
			},
			Endpoints: []string{
				"Change in standardized cognitive composite score at Week 52",
				"Time to clinically meaningful decline on investigator assessment",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Mini-Mental State Examination score between twenty and twenty-six inclusive.", "MMSE", ">=", 20, ""),
				crit("Participants must be fifty to eighty-five years old.", "age", "<=", 85, "years old"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Serum creatinine above two milligrams per deciliter.", "creatinine", ">", 2, "mg/dL"),
			},
			Participants:           180,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Neurology",
			PatientPopulation:      "Early Alzheimers disease with MMSE twenty to twenty-six at screening",
			FirstPatientFirstVisit: "2025-01-20",
			LastPatientFirstVisit:  "2027-06-30",
			ProtocolApprovalDate:   "2024-10-15",
		},

		// Neurology — generic cognitive-motor cohort with cardiac conduction monitoring
		{
			ID: "study-0017",
			Objectives: []string{
				"Assess clinical benefit and cardiac safety of adjunct therapy in mild-to-moderate cognitive impairment",
			},
			Endpoints: []string{
				"Cognitive endpoint change on standardized battery at Month 12",
				"Incidence of QT prolongation events on serial ECG monitoring",
			},
			InclusionCriteria: []domain.EligibilityCriterion{
				crit("Mini-Mental State Examination score at least twenty at screening.", "MMSE", ">=", 20, ""),
				crit("Participants must be fifty-five to eighty-five years old.", "age", ">=", 55, "years old"),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				crit("Corrected QT interval above five hundred milliseconds on screening ECG.", "QTc", ">", 500, "ms"),
			},
			Participants:           260,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 3",
			TherapeuticArea:        "Neurology",
			PatientPopulation:      "Adults with mild cognitive impairment or early dementia with measurable baseline cognition",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "2025-02-01",
		},
	}
}
