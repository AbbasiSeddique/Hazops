"""
Gemini prompt templates for HAZOP analysis.

All prompts used by the HAZOP agent and tools are centralized here
for consistency and ease of maintenance.
"""

AGENT_SYSTEM_PROMPT = """You are a senior process safety engineer and HAZOP study leader with over 20 years of experience in the chemical, petrochemical, and oil & gas industries. You are an expert in conducting Hazard and Operability (HAZOP) studies following IEC 61882 and other industry standards.

Your role is to assist users in conducting thorough HAZOP studies by:

1. **Node Identification**: Analyzing process flow diagrams (PFDs) and piping & instrumentation diagrams (P&IDs) to identify study nodes — distinct sections of the process where deviations from design intent can be systematically examined.

2. **Deviation Generation**: For each node, systematically applying guide words (NO/NOT, MORE, LESS, AS WELL AS, PART OF, REVERSE, OTHER THAN, EARLY, LATE, BEFORE, AFTER) to process parameters (Flow, Temperature, Pressure, Level, Composition, pH, Speed, Viscosity, Voltage, Sequence) to identify meaningful deviations.

3. **Cause Analysis**: Identifying realistic causes for each deviation based on equipment type, operating conditions, and historical failure modes.

4. **Consequence Assessment**: Determining potential consequences including safety impacts, environmental effects, production losses, and equipment damage.

5. **Risk Assessment**: Evaluating severity (1-5 scale) and likelihood (A-E scale) for each deviation scenario, producing a risk ranking.

6. **Safeguard Identification**: Identifying existing safeguards and recommending additional layers of protection based on the hierarchy of controls.

7. **Incident Cross-Reference**: Relating findings to historical process safety incidents to strengthen the analysis with real-world precedents.

You always:
- Apply systematic, methodical analysis following HAZOP methodology
- Consider multiple initiating events and escalation scenarios
- Reference relevant industry standards (API, NFPA, IEC, ASME)
- Prioritize safety-critical findings
- Provide actionable, specific recommendations
- Use proper process engineering terminology
- Consider human factors and procedural safeguards alongside engineering controls
- Flag high-risk scenarios that require immediate attention

When analyzing diagrams, you carefully examine:
- Equipment types and their design specifications
- Process streams (composition, flow rates, temperatures, pressures)
- Control loops and instrumentation
- Safety systems (PSVs, SIS, fire & gas detection)
- Material compatibility and corrosion considerations
- Operating procedures and maintenance requirements
"""

NODE_IDENTIFICATION_VISION_PROMPT = """Analyze this process flow diagram (PFD) or piping & instrumentation diagram (P&ID) and identify all study nodes for a HAZOP analysis.

For each node identified, provide:
1. **node_id**: A unique identifier (e.g., "NODE-001")
2. **equipment_type**: The type of equipment (reactor, heat_exchanger, distillation_column, pump, compressor, storage_tank, valve, pipeline, separator, furnace, or other)
3. **name**: A descriptive name (e.g., "Feed Preheater E-101")
4. **operating_conditions**: Temperature, pressure, flow rate, and other relevant parameters visible on the diagram
5. **inlet_streams**: List of inlet streams with their identifiers
6. **outlet_streams**: List of outlet streams with their identifiers
7. **control_instruments**: List of control instruments (e.g., TIC-101, FCV-201, PSV-301) associated with this node

Respond in valid JSON format with a "nodes" array containing all identified nodes. Example:
{
  "nodes": [
    {
      "node_id": "NODE-001",
      "equipment_type": "reactor",
      "name": "Main Reactor R-101",
      "operating_conditions": {
        "temperature": "350°C",
        "pressure": "15 bar",
        "phase": "gas-liquid"
      },
      "inlet_streams": ["Feed A from E-101", "Catalyst feed"],
      "outlet_streams": ["Product to D-201"],
      "control_instruments": ["TIC-101", "PIC-101", "LIC-101", "PSV-101"]
    }
  ]
}

Be thorough — identify ALL equipment that should be studied as separate HAZOP nodes. Include interconnecting pipework as nodes where significant changes in process conditions occur."""

NODE_IDENTIFICATION_TEXT_PROMPT = """Based on the following process description, identify all study nodes for a HAZOP analysis.

Process Description:
{process_description}

For each node identified, provide:
1. **node_id**: A unique identifier (e.g., "NODE-001")
2. **equipment_type**: The type of equipment (reactor, heat_exchanger, distillation_column, pump, compressor, storage_tank, valve, pipeline, separator, furnace, or other)
3. **name**: A descriptive name
4. **operating_conditions**: Inferred temperature, pressure, flow rate, and other relevant parameters
5. **inlet_streams**: List of inlet streams
6. **outlet_streams**: List of outlet streams
7. **control_instruments**: Expected control instruments based on standard practice

Respond in valid JSON format with a "nodes" array. Be thorough and use your process engineering knowledge to infer likely configurations even when not explicitly stated."""

DEVIATION_ASSESSMENT_PROMPT = """You are conducting a HAZOP study on the following node:

**Node**: {node_name} ({equipment_type})
**Operating Conditions**: {operating_conditions}
**Inlet Streams**: {inlet_streams}
**Outlet Streams**: {outlet_streams}
**Control Instruments**: {control_instruments}

For the deviation: **{guide_word} {parameter}**

Provide a comprehensive analysis including:

1. **Causes** (list at least 3 realistic causes):
   - Consider equipment failures, human errors, external events, and upstream/downstream effects

2. **Consequences** (list all significant consequences):
   - Safety consequences (injury, fatality potential)
   - Environmental consequences (releases, contamination)
   - Production consequences (shutdown, quality issues)
   - Equipment consequences (damage, accelerated wear)

3. **Severity** (1-5 scale):
   1 = Negligible (minor production impact only)
   2 = Minor (minor injury, small release, brief shutdown)
   3 = Moderate (lost time injury, reportable release, extended shutdown)
   4 = Major (permanent disability, major release, major equipment damage)
   5 = Catastrophic (fatality, massive release, explosion)

4. **Likelihood** (A-E scale):
   A = Extremely unlikely (<1e-6 per year)
   B = Remote (1e-6 to 1e-4 per year)
   C = Unlikely (1e-4 to 1e-2 per year)
   D = Likely (1e-2 to 1 per year)
   E = Frequent (>1 per year)

5. **Existing Safeguards**: Standard safeguards expected for this equipment type

6. **Recommendations**: Additional safeguards or actions to reduce risk

Respond in valid JSON format:
{{
  "guide_word": "{guide_word}",
  "parameter": "{parameter}",
  "causes": ["cause1", "cause2", "cause3"],
  "consequences": ["consequence1", "consequence2"],
  "severity": 3,
  "likelihood": "C",
  "risk_score": "3C",
  "existing_safeguards": ["safeguard1", "safeguard2"],
  "recommendations": ["recommendation1", "recommendation2"]
}}"""

RISK_ASSESSMENT_PROMPT = """Evaluate the risk for the following HAZOP deviation scenario:

**Equipment**: {equipment_type} - {node_name}
**Deviation**: {guide_word} {parameter}
**Causes**: {causes}
**Consequences**: {consequences}
**Existing Safeguards**: {existing_safeguards}

Consider:
1. The effectiveness of existing safeguards (are they independent? reliable? tested?)
2. The potential for escalation (can this scenario cascade into a larger event?)
3. Human factors (operator response time, training, shift patterns)
4. Historical precedent (similar incidents in industry)
5. Environmental and regulatory context

Provide an updated risk assessment in JSON format:
{{
  "severity": <1-5>,
  "likelihood": "<A-E>",
  "risk_score": "<severity><likelihood>",
  "risk_category": "<low|medium|high|critical>",
  "safeguard_effectiveness": "<adequate|partially_adequate|inadequate>",
  "escalation_potential": "<low|medium|high>",
  "recommendations": ["specific actionable recommendations"],
  "priority": "<immediate|short_term|medium_term|long_term>",
  "references": ["relevant standards or industry references"]
}}"""

SAFEGUARD_ANALYSIS_PROMPT = """Analyze the safeguards for the following scenario:

**Equipment Type**: {equipment_type}
**Deviation**: {deviation_type}
**Current Safeguards**: {current_safeguards}

Evaluate each existing safeguard for:
1. Independence (is it independent of the initiating cause?)
2. Reliability (what is its probability of failure on demand?)
3. Testability (can it be regularly tested?)
4. Response time (is it fast enough for the hazard scenario?)

Then recommend additional safeguards following the hierarchy of controls:
1. Elimination / substitution
2. Engineering controls (inherently safer design)
3. Safety instrumented systems (SIS / SIL-rated)
4. Alarms and operator response
5. Administrative controls and procedures
6. Personal protective equipment

Respond in JSON format:
{{
  "existing_safeguards_evaluation": [
    {{
      "safeguard": "name",
      "type": "PSV|SIS|alarm|interlock|procedural|mechanical|administrative",
      "independence": "yes|no|partial",
      "reliability": "high|medium|low",
      "testability": "yes|limited|no",
      "adequacy": "adequate|partially_adequate|inadequate"
    }}
  ],
  "recommended_additional": [
    {{
      "safeguard": "name",
      "type": "type",
      "description": "description",
      "priority": "high|medium|low"
    }}
  ],
  "gap_analysis": "summary of gaps in current protection layers"
}}"""
