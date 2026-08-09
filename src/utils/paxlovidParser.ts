import medicalData from "../medical_data.json";
import { proh, dont, pote, safe as htaSafe, safe2 as htaSafe2, DICT } from "./paxlovidHtaData";

export interface MatchedInteraction {
  text: string;
  generic: string;
  brand: string;
  user_drug_str: string;
  visit_date: string;
}

export function searchInteractions(text: string): MatchedInteraction[] {
  const found: any[] = [];
  if (!text || !text.trim()) {
    return found;
  }

  const blacklist = [
    "機轉 / 臨床表現", "建議：", "嚴重程度：", "發生速度：",
    "分類(專科", "發現", "Paxlovid", "列印日期:"
  ];

  const linesRaw = text.split(/[\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  const lines: string[] = [];

  for (const rL of linesRaw) {
    if (blacklist.some(bad => rL.includes(bad))) {
      continue;
    }
    let targetLine = rL;
    const pos = rL.indexOf("原本用藥：");
    if (pos !== -1) {
      targetLine = rL.substring(pos + 5).trim();
    }
    if (targetLine.length > 0) {
      lines.push(targetLine);
    }
  }

  if (lines.length === 0 && text.trim().length > 0) {
    lines.push(text.trim());
  }

  const codeRe = /^[A-Za-z]{1,3}\d{5,10}[A-Za-z0-9]{0,3}(?:（[^）]+）|\([^)]+\))?$/;
  const dateRe = /^\d{2,4}[/\.-]\d{1,2}[/\.-]\d{1,2}/;
  const re1 = /^(\S+)\s+(.*?\(.*?\))\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*?。)\s*(.*)$/;
  const re2 = /^(\S+)\s+(.*?\(.*?\))\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/;

  const interactions = medicalData.paxlovid_interactions;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineU = line.toUpperCase();

    for (const item of interactions) {
      const generic = item.generic.toUpperCase();
      const brand = item.brand.toUpperCase();

      const genTokens = generic
        .replace(/\+/g, ",")
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 2);

      const brandTokens = brand
        .replace(/\//g, ",")
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 2);

      const allKeywords = [...genTokens, ...brandTokens];

      let isMatched = false;
      let firstMatchIdx = 999999;

      for (const kw of allKeywords) {
        if (kw) {
          const pos = lineU.indexOf(kw);
          if (pos !== -1) {
            isMatched = true;
            firstMatchIdx = Math.min(firstMatchIdx, pos);
          }
        }
      }

      // Substring fallback for single line manual searches
      if (!isMatched && lines.length === 1 && lineU.length > 2) {
        for (const kw of allKeywords) {
          if (kw && kw.includes(lineU)) {
            isMatched = true;
            firstMatchIdx = 0;
            break;
          }
        }
      }

      if (isMatched) {
        let finalDrugName = line;
        let visitDateRaw = "";
        let foundByCode = false;

        if (line.includes("\t")) {
          const cols = line.split("\t").map(c => c.trim()).filter(c => c.length > 0);

          // 1. Try code match
          for (let i = 0; i < cols.length; i++) {
            if (codeRe.test(cols[i])) {
              if (i + 1 < cols.length) {
                finalDrugName = cols[i + 1];
                foundByCode = true;
                break;
              }
            }
          }

          // 2. Keyword proximity match
          if (!foundByCode) {
            let maxColIdx = -1;
            let bestMatchingCol = null;
            for (let colIdx = 0; colIdx < cols.length; colIdx++) {
              const colU = cols[colIdx].toUpperCase();
              for (const kw of allKeywords) {
                if (kw && colU.includes(kw)) {
                  if (colIdx > maxColIdx) {
                    maxColIdx = colIdx;
                    bestMatchingCol = cols[colIdx];
                  }
                  break;
                }
              }
            }
            if (bestMatchingCol !== null) {
              finalDrugName = bestMatchingCol;
            }
          }

          // 3. Unified Date Scanner
          const targetIdx = cols.indexOf(finalDrugName);
          if (targetIdx !== -1) {
            for (let j = targetIdx + 1; j < cols.length; j++) {
              if (dateRe.test(cols[j])) {
                visitDateRaw = cols[j];
                break;
              }
            }
          }
          if (!visitDateRaw) {
            for (const c of cols) {
              if (dateRe.test(c)) {
                visitDateRaw = c;
                break;
              }
            }
          }
        }

        // Parse signatures for deduplication
        let mechSig = item.text;
        let suggSig = "";

        const caps1 = item.text.match(re1);
        if (caps1) {
          mechSig = caps1[6]?.trim() || "";
          suggSig = caps1[7]?.trim() || "";
        } else {
          const caps2 = item.text.match(re2);
          if (caps2) {
            mechSig = caps2[6]?.trim() || "";
          }
        }

        // Generate date sort key
        let dateKey = "0000/00/00";
        if (visitDateRaw) {
          const parts = visitDateRaw.split(/[\/\.-]/);
          if (parts.length >= 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
              dateKey = `${y.toString().padStart(4, "0")}/${m.toString().padStart(2, "0")}/${d.toString().padStart(2, "0")}`;
            }
          }
        }

        found.push({
          text: item.text,
          generic: item.generic,
          brand: item.brand,
          user_drug_str: finalDrugName,
          visit_date: visitDateRaw,
          date_key: dateKey,
          sort_score: lineIdx * 10000 + firstMatchIdx,
          mech_sig: mechSig,
          sugg_sig: suggSig,
          has_code: foundByCode,
        });
      }
    }
  }

  // Deduplication
  const championMap = new Map<string, any>();
  for (const item of found) {
    const key = `${item.visit_date}|${item.mech_sig}|${item.sugg_sig}`;
    const incumbent = championMap.get(key);
    if (!incumbent) {
      championMap.set(key, item);
    } else {
      if (item.has_code && !incumbent.has_code) {
        championMap.set(key, item);
      }
    }
  }

  const finalList = Array.from(championMap.values());

  // Final Sort
  finalList.sort((a, b) => {
    if (b.date_key !== a.date_key) {
      return b.date_key.localeCompare(a.date_key);
    }
    return a.sort_score - b.sort_score;
  });

  return finalList;
}

export interface ParsedLineItem {
  id: string;
  originalLine: string;
  cleanLineScreen: string;
  cleanLinePrint: string;
  selectedForPrint: boolean;
  severity: "contraindicated" | "interactive" | "safe" | "unknown";
  genericName?: string;
  brandName?: string;
  hasCode: boolean;
  isDuplicate?: boolean;
  visitDate?: string;
  dateKey?: string;
}

export interface CategorizedResults {
  contraindicated: ParsedLineItem[];
  interactive: ParsedLineItem[];
  safe: ParsedLineItem[];
  unknown: ParsedLineItem[];
}

const BZD_GENERICS = [
  "midazolam", "triazolam", "diazepam", "clonazepam", "chlordiazepoxide", 
  "alprazolam", "lorazepam", "oxazepam", "temazepam", "flurazepam", 
  "estazolam", "brotizolam", "bromazepam", "flunitrazepam", "fludiazepam", "etizolam"
];

const BZD_BRAND_TO_GENERIC: { [brand: string]: string } = {
  "lendormin": "brotizolam",
  "lendorm": "brotizolam",
  "戀多眠": "brotizolam",
  "ativan": "lorazepam",
  "anxicam": "lorazepam",
  "wempty": "lorazepam",
  "lowen": "lorazepam",
  "安定文": "lorazepam",
  "xanax": "alprazolam",
  "alpraline": "alprazolam",
  "kinax": "alprazolam",
  "solax": "alprazolam",
  "贊安諾": "alprazolam",
  "景安寧": "alprazolam",
  "valium": "diazepam",
  "dupin": "diazepam",
  "煩寧": "diazepam",
  "dormicum": "midazolam",
  "導眠靜": "midazolam",
  "rivotril": "clonazepam",
  "ripam": "clonazepam",
  "利福全": "clonazepam",
  "eurodin": "estazolam",
  "eszo": "estazolam",
  "悠樂丁": "estazolam",
  "lexotan": "bromazepam",
  "柔速瑞": "bromazepam",
  "立舒保": "bromazepam",
  "modipanol": "flunitrazepam",
  "fm2": "flunitrazepam",
  "氟硝西泮": "flunitrazepam",
  "erispan": "fludiazepam",
  "癒利舒盼": "fludiazepam",
  "halcion": "triazolam",
  "酣樂欣": "triazolam",
  "librium": "chlordiazepoxide",
  "serax": "oxazepam",
  "normison": "temazepam",
  "dalmadorm": "flurazepam",
  "達眠": "flurazepam",
  "depas": "etizolam",
"etizolan": "etizolam",
  "戴帕斯": "etizolam"
};

const SAFE_KEYWORDS = [
  "acetaminophen",
  "paracetamol",
  "doxycycline",
  "fexofenadine",
  "pseudoephedrine",
  "diclofenac",
  "ibuprofen",
  "mefenamic acid",
  "potassium",
  "agomelatine"
];

export function parseAndCategorizeCloudPrescription(rawText: string): CloudPrescriptionResult {
  const contraindicated: ParsedLineItem[] = [];
  const interactive: ParsedLineItem[] = [];
  const safe: ParsedLineItem[] = [];
  const unknown: ParsedLineItem[] = [];

  if (!rawText || !rawText.trim()) {
    return { contraindicated, interactive, safe, unknown };
  }

  // Exact HTA normalization: replace newlines and semicolons with '；'
  let txt = rawText
    .replace(/\s*藥\s*品\s*名\s*稱/g, '')
    .replace(/\r/g, '')
    .replace(/\；/g, ';')
    .replace(/\n+/g, '；');

  // Apply HTA brand name replacements
  txt = txt
    .replace(/brilinta/gi, 'ticagrelor')
    .replace(/xarelto/gi, 'rivaroxaban')
    .replace(/eliquis/gi, 'apixaban')
    .replace(/lixiana/gi, 'edoxaban')
    .replace(/pradaxa/gi, 'dabigatran')
    .replace(/efient/gi, 'prasugrel')
    .replace(/amtrel/gi, 'amtrel含有amlodipine')
    .replace(/exforge/gi, 'exforge含有amlodipine')
    .replace(/co-diovan/gi, 'co-diovan含有valsartan')
    .replace(/galvus/gi, 'galvus含有vildagliptin')
    .replace(/trajenta/gi, 'trajenta含有linagliptin')
    .replace(/glyxambi/gi, 'glyxambi含有linagliptin')
    .replace(/actos/gi, 'actos含有pioglitazone')
    .replace(/vytorin/gi, 'vytorin含有simvastatin')
    .replace(/linicor/gi, 'linicor含有lovastatin')
    .replace(/jardiance/gi, 'jardiance含有empagliflozin')
    .replace(/qtern/gi, 'qtern含有saxagliptin')
    .replace(/ryzodeg/gi, 'ryzodeg含有insulin')
    .replace(/entresto/gi, 'entresto含有sacubitril')
    .replace(/caduet/gi, 'caduet含有atorvastatin');

  const blocks = txt.split('；').map(b => b.trim()).filter(b => b.length > 0);
  const codeRe = /^[A-Za-z]{1,3}\d{5,10}[A-Za-z0-9]{0,3}(?:（[^）]+）|\([^)]+\))?$/;
  const dateRe = /^\d{2,4}[/\.-]\d{1,2}[/\.-]\d{1,2}/;

  const tempItems: (ParsedLineItem & { drugKey: string })[] = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    const blockLower = block.toLowerCase();
    const cols = block.split('\t').map(c => c.trim());

    let hasCode = false;
    let codeIdx = -1;
    for (let i = 0; i < cols.length; i++) {
      if (codeRe.test(cols[i])) {
        hasCode = true;
        codeIdx = i;
        break;
      }
    }

    let genericName = "";
    let brandName = "";
    if (hasCode) {
      // Look left for first non-empty column (generic name)
      for (let i = codeIdx - 1; i >= 0; i--) {
        if (cols[i]) {
          genericName = cols[i];
          break;
        }
      }
      // Look right for first non-empty column (brand name)
      for (let i = codeIdx + 1; i < cols.length; i++) {
        if (cols[i]) {
          brandName = cols[i];
          break;
        }
      }
    }

    // Unified Date Scanner for this block
    let visitDate = "";
    const targetIdx = cols.indexOf(genericName || brandName || "");
    if (targetIdx !== -1) {
      for (let j = targetIdx + 1; j < cols.length; j++) {
        if (dateRe.test(cols[j])) {
          visitDate = cols[j];
          break;
        }
      }
    }
    if (!visitDate) {
      for (const c of cols) {
        if (dateRe.test(c)) {
          visitDate = c;
          break;
        }
      }
    }

    // Generate date sort key
    let dateKey = "0000-00-00";
    if (visitDate) {
      const parts = visitDate.split(/[\/\.-]/);
      if (parts.length >= 3) {
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        let d = parseInt(parts[2], 10);
        if (y < 1911) {
          y += 1911; // Taiwan ROC Year to Common Era Year
        }
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          dateKey = `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
        }
      }
    }

    // HTA Matching sequence: proh -> dont -> pote -> safe
    const matchedProh = proh.find(k => blockLower.includes(k));
    const matchedDont = dont.find(k => blockLower.includes(k));
    const matchedPote = pote.find(k => blockLower.includes(k));
    const matchedSafe = htaSafe.find(k => blockLower.includes(k)) || htaSafe2.find(k => blockLower.includes(k));

    let severity: "contraindicated" | "interactive" | "safe" | "unknown" = "unknown";
    let matchedKw = "";

    if (matchedProh) {
      severity = "contraindicated";
      matchedKw = matchedProh;
    } else if (matchedDont) {
      severity = "contraindicated";
      matchedKw = matchedDont;
    } else if (matchedPote) {
      severity = "interactive";
      matchedKw = matchedPote;
    } else if (matchedSafe) {
      severity = "safe";
      matchedKw = matchedSafe;
    }

    let cleanLineScreen = "";
    let cleanLinePrint = "";

    if (severity === "contraindicated" || severity === "interactive") {
      let rawSugg = DICT[matchedKw] || "";
      if (rawSugg && rawSugg.startsWith('{') && rawSugg.includes('}')) {
        rawSugg = rawSugg.substring(rawSugg.indexOf('}') + 1).trim();
      }

      const screenSugg = rawSugg ? `【${rawSugg}】👈` : `👈`;
      const printSugg = rawSugg ? `【☗☗${rawSugg}】` : ``;

      let baseLine = cols.join(" ").toLowerCase().replace(/\s+/g, " ");
      baseLine = baseLine.replace(/magnesium/g, "magnesium👈👈👈");

      const targetSearch = (genericName || matchedKw).toLowerCase();
      const posIdx = baseLine.indexOf(targetSearch);
      if (posIdx !== -1 && targetSearch.length > 0) {
        const insertPos = posIdx + targetSearch.length;
        cleanLineScreen = baseLine.substring(0, insertPos) + screenSugg + baseLine.substring(insertPos);
      } else {
        cleanLineScreen = baseLine + " " + screenSugg;
      }

      if (hasCode) {
        const sourceVal = cols[0] ? cols[0].toLowerCase() : "";
        const genericVal = genericName ? genericName.toLowerCase() : "";
        const codeVal = cols[codeIdx] ? cols[codeIdx].toLowerCase() : "";
        const brandVal = brandName ? brandName.toLowerCase() : "";
        cleanLinePrint = `⛨${sourceVal}\t${genericVal}\t${codeVal}\t${brandVal}${printSugg}`;
      } else {
        cleanLinePrint = `⛨${block.toLowerCase()}\t${printSugg}`;
      }
    } else {
      cleanLineScreen = cols.join(" ").toLowerCase().replace(/\s+/g, " ");
      
      if (hasCode) {
        const sourceVal = cols[0] ? cols[0].toLowerCase() : "";
        const genericVal = genericName ? genericName.toLowerCase() : "";
        const codeVal = cols[codeIdx] ? cols[codeIdx].toLowerCase() : "";
        const brandVal = brandName ? brandName.toLowerCase() : "";
        cleanLinePrint = `⛨${sourceVal}\t${genericVal}\t${codeVal}\t${brandVal}`;
      } else {
        cleanLinePrint = `⛨${block.toLowerCase()}`;
      }
    }
    
    const drugKey = matchedKw || genericName || brandName || blockLower;

    tempItems.push({
      id: `block_${idx}`,
      originalLine: block,
      cleanLineScreen,
      cleanLinePrint,
      selectedForPrint: true,
      severity,
      genericName: genericName || undefined,
      brandName: brandName || undefined,
      hasCode,
      visitDate,
      dateKey,
      drugKey
    });
  }

  // Deduplicate and precheck latest items grouped by drugKey
  const groups = new Map<string, typeof tempItems>();
  for (const item of tempItems) {
    if (!groups.has(item.drugKey)) {
      groups.set(item.drugKey, []);
    }
    groups.get(item.drugKey)!.push(item);
  }

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      // Sort in descending order of dateKey so the latest is first
      group.sort((a, b) => b.dateKey!.localeCompare(a.dateKey!));
      
      // Mark all of them as duplicate
      group.forEach((item, index) => {
        item.isDuplicate = true;
        // Pre-check only the latest one (index === 0)
        item.selectedForPrint = (index === 0);
      });
    }
  }

  // Push to final lists
  for (const parsedItem of tempItems) {
    if (parsedItem.severity === "contraindicated") {
      contraindicated.push(parsedItem);
    } else if (parsedItem.severity === "interactive") {
      interactive.push(parsedItem);
    } else if (parsedItem.severity === "safe") {
      safe.push(parsedItem);
    } else {
      unknown.push(parsedItem);
    }
  }
  
  return {
    contraindicated,
    interactive,
    safe,
    unknown
  };
}
