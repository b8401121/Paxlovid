import React, { useState, useEffect, useRef } from "react";
import {
  searchInteractions,
  parseAndCategorizeCloudPrescription,
  CategorizedResults,
  ParsedLineItem
} from "../utils/paxlovidParser";
import { proh, dont } from "../utils/paxlovidHtaData";
import wuLogo from "../assets/wu_ent_logo.jpg";
import {
  Button,
  Card,
  CardHeader,
  Text,
  Textarea,
  Input,
  Title3,
  makeStyles,
  shorthands,
  tokens,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Checkbox,
} from "@fluentui/react-components";
import {
  ClipboardPaste24Regular,
  Search24Regular,
  Print24Regular,
  Calendar24Regular,
  Delete24Regular,
} from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    ...shorthands.padding("24px"),
    "@media (max-width: 768px)": {
      ...shorthands.padding("8px"),
      gap: "12px",
    },
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    "@media (max-width: 768px)": {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "8px",
    },
  },
  controlRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    "@media (max-width: 768px)": {
      flexWrap: "wrap",
      gap: "8px",
    },
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
  },
  resultContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    borderLeft: `6px solid ${tokens.colorNeutralStroke1}`,
  },
  cardDanger: {
    borderLeft: `6px solid ${tokens.colorPaletteRedBackground3}`,
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  cardWarning: {
    borderLeft: `6px solid ${tokens.colorPalettePeachBorderActive}`,
    backgroundColor: tokens.colorPalettePeachBackground2,
  },
  badge: {
    ...shorthands.padding("2px", "8px"),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    fontWeight: "bold",
    fontSize: "12px",
  },
  badgeDanger: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundInverted,
  },
  badgeWarning: {
    backgroundColor: tokens.colorPalettePeachBorderActive,
    color: tokens.colorNeutralForeground1,
  },
  suggestionBox: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginTop: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    color: tokens.colorPaletteDarkOrangeBorderActive,
    lineHeight: "1.4",
  },
  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
  },
  editorArea: {
    width: "100%",
    minHeight: "450px",
    maxHeight: "600px",
    overflowY: "auto",
    fontFamily: "'Microsoft JhengHei', sans-serif",
    fontSize: "14px",
    backgroundColor: "#ffffff", // Always white background for accurate print preview representation
    color: "#1e293b", // Always dark text for high contrast readability
    ...shorthands.padding("20px"),
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxSizing: "border-box",
  },
});

interface MatchedInteraction {
  text: string;
  generic: string;
  brand: string;
  user_drug_str: string;
  visit_date: string;
  selectedForPrint?: boolean;
}

export const PaxlovidChecker: React.FC = () => {
  const styles = useStyles();
  const [inputText, setInputText] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [results, setResults] = useState<MatchedInteraction[]>([]);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printHtml, setPrintHtml] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [categorizedResults, setCategorizedResults] = useState<CategorizedResults | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = (text: string) => {
    try {
      const res = searchInteractions(text);
      setResults(res.map((item) => ({ ...item, selectedForPrint: true })));

      if (text.trim().length > 0) {
        const cat = parseAndCategorizeCloudPrescription(text);
        setCategorizedResults(cat);
      } else {
        setCategorizedResults(null);
      }
    } catch (err) {
      console.error("Failed to parse interactions:", err);
    }
  };

  const handlePaste = async () => {
    try {
      let text = "";
      try {
        const { readText: tauriReadText } = await import("@tauri-apps/plugin-clipboard-manager");
        text = await tauriReadText();
      } catch (e) {
        console.warn("Tauri clipboard manager plugin failed, trying navigator.clipboard:", e);
        text = await navigator.clipboard.readText();
      }

      if (text) {
        setInputText(text);
        handleSearch(text);
      }
    } catch (err) {
      console.error("Clipboard access failed:", err);
    }
  };

  const handleClear = () => {
    setInputText("");
    setResults([]);
    setCategorizedResults(null);
  };

  // handleManualSearch is called directly from the input's onChange

  const updateDate = (index: number, dateVal: string) => {
    const updated = [...results];
    updated[index].visit_date = dateVal;
    setResults(updated);
  };

  const togglePrintSelection = (index: number, checked: boolean) => {
    const updated = [...results];
    updated[index].selectedForPrint = checked;
    setResults(updated);
  };

  const getSelectedCount = () => {
    if (!categorizedResults) return 0;
    const countContra = categorizedResults.contraindicated.filter(x => x.selectedForPrint).length;
    const countInter = categorizedResults.interactive.filter(x => x.selectedForPrint).length;
    return countContra + countInter;
  };

  const toggleItemPrint = (severity: "contraindicated" | "interactive" | "unknown", id: string, checked: boolean) => {
    if (!categorizedResults) return;
    const cat = { ...categorizedResults };
    const list = cat[severity];
    const item = list.find(x => x.id === id);
    if (item) {
      item.selectedForPrint = checked;
    }
    setCategorizedResults(cat);
  };

  const setAllPrintStatus = (checked: boolean) => {
    if (!categorizedResults) return;
    const cat = { ...categorizedResults };
    cat.contraindicated.forEach(x => x.selectedForPrint = checked);
    cat.interactive.forEach(x => x.selectedForPrint = checked);
    cat.unknown.forEach(x => x.selectedForPrint = checked);
    setCategorizedResults(cat);
  };

  const setUnknownPrintStatus = (checked: boolean) => {
    if (!categorizedResults) return;
    const cat = { ...categorizedResults };
    cat.unknown.forEach(x => x.selectedForPrint = checked);
    setCategorizedResults(cat);
  };

  const generateTextReport = (cat: CategorizedResults) => {
    let out = "";
    
    out += "Paxlovid不可併用的藥(需停藥8天):\n";
    cat.contraindicated.forEach(item => {
      out += item.cleanLineScreen + "\n";
    });
    out += "\n";
    
    out += "--------------------------------------------------------------------------------\n";
    out += "Paxlovid有交互作用的藥(需減量或停藥8天):\n";
    cat.interactive.forEach(item => {
      out += item.cleanLineScreen + "\n";
    });
    out += "\n";
    
    out += "--------------------------------------------------------------------------------\n\n";
    out += "吃Paxlovid時無需停藥:\n";
    cat.safe.forEach(item => {
      out += item.cleanLineScreen + "\n";
    });
    out += "\n\n";
    
    out += "Paxlovid(口服抗病毒藥)只吃5天但藥效達8天，故有交互作用的西藥8天內減量或暫停，清冠一號也需暫停5天（以免導致腹瀉）。不可磨粉或泡水。\n";
    out += "本單張並沒比對自費藥和『最近1個月內尚未上傳到健保雲端』的健保新藥。\n\n";
    
    out += "■■■◤以下藥物停8天◢■■■\n\n";
    cat.contraindicated.forEach(item => {
      if (item.selectedForPrint) {
        out += item.cleanLinePrint + "\n";
      }
    });
    out += "\n\n";
    
    out += "■■■◤以下藥物需［減量或停］8天◢■■■\n\n";
    cat.interactive.forEach(item => {
      if (item.selectedForPrint) {
        out += item.cleanLinePrint + "\n";
      }
    });
    out += "\n";
    
    return out;
  };

  const handleCopyText = () => {
    if (!categorizedResults) return;
    const text = generateTextReport(categorizedResults);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const parsePrintLine = (item: ParsedLineItem) => {
    let line = item.cleanLinePrint || "";
    if (line.startsWith("⛨")) {
      line = line.substring(1);
    }
    const parts = line.split("\t").map(p => p.trim());
    if (parts.length >= 4) {
      const source = parts[0];
      const code = parts[1];
      const name = parts[2];
      let usage = parts[3];
      let suggestion = "";
      
      const sIdx = usage.indexOf("【☗☗");
      if (sIdx !== -1) {
        const eIdx = usage.indexOf("】", sIdx);
        if (eIdx !== -1) {
          suggestion = usage.substring(sIdx + 3, eIdx).trim();
          usage = usage.substring(0, sIdx).trim();
        } else {
          suggestion = usage.substring(sIdx + 3).trim();
          usage = usage.substring(0, sIdx).trim();
        }
      }
      return { source, code, name, usage, suggestion };
    }
    return { source: "", code: "", name: line, usage: "", suggestion: "" };
  };

  const generatePrintHtml = () => {
    if (!categorizedResults) return;

    const printDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

    const renderTableRows = (items: ParsedLineItem[], isDanger: boolean) => {
      const selectedItems = items.filter(x => x.selectedForPrint);
      if (selectedItems.length === 0) {
        return `<tr><td colspan="2" class="empty-message">🟢 未發現此類交互作用藥物之品項。</td></tr>`;
      }

      const seen = new Set<string>();
      const uniqueItems: ParsedLineItem[] = [];
      for (const item of selectedItems) {
        const detail = parsePrintLine(item);
        const displayName = (detail.usage || detail.code || detail.name || "未知名稱").trim().toLowerCase();
        if (!seen.has(displayName)) {
          seen.add(displayName);
          uniqueItems.push(item);
        }
      }

      return uniqueItems.map(item => {
        const detail = parsePrintLine(item);
        const badgeClass = isDanger ? "badge-danger" : "badge-warning";
        const badgeText = isDanger ? "絕對不可併用" : "需調整/減量";
        const icon = isDanger ? "🔴" : "🟡";
        
        const displayName = detail.usage || detail.code || detail.name || "未知名稱";
        const subDetails = (detail.code || detail.name) && detail.usage
          ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">學名：${detail.code || "-"} / 代碼：${detail.name || "-"}</div>`
          : "";
        const metaInfo = (item.visitDate || item.source)
          ? `<div style="font-size: 8pt; color: #64748b; margin-top: 4px; display: flex; gap: 10px;">
               ${item.visitDate ? `<span>📅 就醫日期：${item.visitDate}</span>` : ""}
               ${item.source ? `<span>🏥 來源：${item.source}${item.visitType ? ` (${item.visitType})` : ""}</span>` : ""}
             </div>`
          : "";

        return `
          <tr>
            <td>
              <div style="font-weight: bold; color: #0f172a;">${displayName}</div>
              ${subDetails}
              ${metaInfo}
            </td>
            <td>
              <div class="suggestion-text">${icon} ${detail.suggestion}</div>
              <div style="margin-top: 4px;">
                <span class="badge ${badgeClass}">${badgeText}</span>
                <span style="font-size: 8pt; color: #64748b; margin-left: 6px;">停藥/減量 8 天</span>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    };

    const renderUnknownRows = (items: ParsedLineItem[]) => {
      const selectedItems = items.filter(x => x.selectedForPrint);
      if (selectedItems.length === 0) {
        return `<tr><td colspan="2" class="empty-message">無其他待確認品項。</td></tr>`;
      }

      const seen = new Set<string>();
      const uniqueItems: ParsedLineItem[] = [];
      for (const item of selectedItems) {
        const detail = parsePrintLine(item);
        const displayName = (detail.usage || detail.code || detail.name || "未知名稱").trim().toLowerCase();
        if (!seen.has(displayName)) {
          seen.add(displayName);
          uniqueItems.push(item);
        }
      }

      return uniqueItems.map(item => {
        const detail = parsePrintLine(item);
        if (item.hasCode) {
          const displayName = detail.usage || detail.code || detail.name || "未知名稱";
          const subDetails = (detail.code || detail.name) && detail.usage
            ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">學名：${detail.code || "-"} / 代碼：${detail.name || "-"}</div>`
            : "";
          const metaInfo = (item.visitDate || item.source)
            ? `<div style="font-size: 8pt; color: #64748b; margin-top: 4px; display: flex; gap: 10px;">
                 ${item.visitDate ? `<span>📅 就醫日期：${item.visitDate}</span>` : ""}
                 ${item.source ? `<span>🏥 來源：${item.source}${item.visitType ? ` (${item.visitType})` : ""}</span>` : ""}
               </div>`
            : "";

          return `
            <tr>
              <td>
                <div style="font-weight: bold; color: #0f172a;">${displayName}</div>
                ${subDetails}
                ${metaInfo}
              </td>
              <td>
                <div style="color: #475569; font-weight: bold;">❓ 尚未比對到交互作用資料</div>
                <div style="margin-top: 4px; font-size: 8pt; color: #64748b;">
                  <span class="badge badge-unknown">待確認</span> 請臨床醫師或藥師再行核對自費藥或健保新藥。
                </div>
              </td>
            </tr>
          `;
        } else {
          return `
            <tr>
              <td colspan="2" style="background-color: #f8fafc; color: #64748b; font-style: italic; font-size: 9pt; padding: 8px 12px;">
                ${detail.name}
              </td>
            </tr>
          `;
        }
      }).join("");
    };

    const contraRows = renderTableRows(categorizedResults.contraindicated, true);
    const interRows = renderTableRows(categorizedResults.interactive, false);
    const unknownRows = renderUnknownRows(categorizedResults.unknown);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Paxlovid 用藥配合衛教單張</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 5mm;
        font-size: 10pt;
        background-color: #ffffff;
      }
      .no-print {
        display: none;
      }
      .page-break {
        page-break-before: always;
      }
      tr {
        page-break-inside: avoid;
      }
      .counseling-box {
        background-color: #fffbeb !important;
        border-left: 5px solid #d97706 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .emergency-box {
        background-color: #fef2f2 !important;
        border-left: 5px solid #dc2626 !important;
        color: #991b1b !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .med-table th {
        background-color: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge-danger {
        background-color: #fef2f2 !important;
        color: #dc2626 !important;
        border: 1px solid #fca5a5 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge-warning {
        background-color: #fffbeb !important;
        color: #d97706 !important;
        border: 1px solid #fcd34d !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge-unknown {
        background-color: #f8fafc !important;
        color: #64748b !important;
        border: 1px solid #cbd5e1 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .info-grid {
        background-color: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    @page {
      size: A4;
      margin: 15mm 12mm 15mm 12mm;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Microsoft JhengHei", Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      margin: 0;
      padding: 10px;
      background-color: #ffffff;
    }
    
    .header-container {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .main-title {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    
    .sub-title {
      font-size: 10pt;
      color: #475569;
      margin: 4px 0 0 0;
      font-weight: 600;
    }
    
    .hospital-brand {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0284c7;
      text-align: right;
    }
    
    /* Patient Info Block */
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    
    .info-grid td {
      padding: 8px 12px;
      font-size: 9.5pt;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    
    .safety-container {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    /* Counseling Card */
    .counseling-box {
      flex: 1;
      border-left: 5px solid #d97706;
      background-color: #fffbeb;
      color: #92400e;
      padding: 12px 15px;
      margin-bottom: 0;
      border-radius: 0 6px 6px 0;
    }
    
    .counseling-title {
      font-size: 11pt;
      font-weight: 800;
      margin: 0 0 6px 0;
    }
    
    .counseling-list {
      margin: 0;
      padding-left: 20px;
      font-size: 9.5pt;
      line-height: 1.6;
    }
    
    /* Emergency Card */
    .emergency-box {
      flex: 1;
      border-left: 5px solid #dc2626;
      background-color: #fef2f2;
      color: #991b1b;
      padding: 12px 15px;
      margin-bottom: 0;
      border-radius: 0 6px 6px 0;
    }
    
    .emergency-title {
      font-size: 11pt;
      font-weight: 800;
      color: #dc2626;
      margin: 0 0 6px 0;
    }
    
    .emergency-list {
      margin: 0;
      padding-left: 20px;
      font-size: 9.5pt;
      line-height: 1.6;
    }
    
    /* Table Styles */
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      margin: 20px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .section-title.danger {
      color: #dc2626;
      border-bottom-color: #fecaca;
    }
    
    .section-title.warning {
      color: #d97706;
      border-bottom-color: #fef3c7;
    }
    
    .section-title.unknown {
      color: #475569;
      border-bottom-color: #cbd5e1;
    }
    
    .med-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9pt;
      text-align: left;
    }
    
    .med-table th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
    }
    
    .med-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      line-height: 1.45;
      word-break: break-all;
    }
    
    .med-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    
    .suggestion-text {
      font-weight: 700;
      color: #b91c1c;
      font-size: 9pt;
    }
    
    .med-table.interactive .suggestion-text {
      color: #b45309;
    }
    
    .badge {
      display: inline-block;
      padding: 1px 5px;
      font-size: 7.5pt;
      font-weight: 700;
      border-radius: 4px;
      text-align: center;
      white-space: nowrap;
    }
    
    .badge-danger {
      background-color: #fef2f2;
      color: #dc2626;
      border: 1px solid #fca5a5;
    }
    
    .badge-warning {
      background-color: #fffbeb;
      color: #d97706;
      border: 1px solid #fcd34d;
    }
    
    .badge-unknown {
      background-color: #f8fafc;
      color: #64748b;
      border: 1px solid #cbd5e1;
    }
    
    .empty-message {
      padding: 12px;
      text-align: center;
      color: #64748b;
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      font-size: 9pt;
    }
    
    .footer {
      margin-top: 30px;
      font-size: 8pt;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="header-container" style="display: flex; align-items: center; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <img src="${wuLogo}" style="width: 45px; height: 45px; border-radius: 50%; border: 1px solid #cbd5e1;" />
      <div>
        <h1 class="main-title" style="margin: 0; font-size: 15pt; font-weight: 800; color: #0f172a;">吳鎮宇耳鼻喉科診所 用藥安全指引報告</h1>
        <p class="sub-title" style="margin: 2px 0 0 0; font-size: 9pt; color: #475569;">Paxlovid (口服抗病毒藥) 雲端藥歷交互作用比對單張</p>
      </div>
    </div>
    <div class="hospital-brand" style="text-align: right; line-height: 1.3;">
      <strong>吳鎮宇耳鼻喉科診所</strong><br>
      <span style="font-size: 8pt; color: #64748b; font-weight: normal;">改版日期: 2026-06-09</span>
    </div>
  </div>

  <table class="info-grid">
    <tr>
      <td style="width: 25%;"><strong>病人姓名:</strong> ____________________</td>
      <td style="width: 25%;"><strong>病歷號碼:</strong> ____________________</td>
      <td style="width: 25%;"><strong>列印日期:</strong> ${printDate}</td>
      <td style="width: 25%;"><strong>處方醫師/藥師:</strong> ____________________</td>
    </tr>
  </table>

  <div class="safety-container">
    <div class="counseling-box">
      <div class="counseling-title">
        🔑 Paxlovid 核心用藥安全須知 (請務必向病人詳加說明)
      </div>
      <ul class="counseling-list">
        <li><strong>只吃 5 天，影響 8 天！</strong> Paxlovid 療程為 5 天，但藥效在體內的影響持續長達 <strong>8 天</strong>。</li>
        <li><strong>配合調整用藥：</strong> 下表交互作用藥物，須於服用 Paxlovid <strong>首日起停藥或減量至少 8 天</strong>。</li>
        <li><strong>中藥禁忌：</strong> 併用中藥<strong>「清冠一號」必須暫停 5 天</strong>（以免產生藥效衝突或加重腹瀉）。</li>
        <li><strong>服藥方式：</strong> 本藥錠 <strong>絕對不可磨粉、不可泡水、不可嚼碎</strong>，必須整顆配水吞服。</li>
        <li><strong>比對限制：</strong> 僅限健保雲端已上傳藥歷，不含自費及近期尚未上傳之新藥。</li>
      </ul>
    </div>
    <div class="emergency-box">
      <div class="emergency-title">
        🚨 確診者重症警訊症狀 (若有以下症狀應立即就醫或返急診)
      </div>
      <ul class="emergency-list">
        <li><strong>呼吸困難、喘：</strong> 呼吸急促、喘或吸不到氣。</li>
        <li><strong>持續胸痛或胸悶：</strong> 胸口有壓迫感或持續性疼痛。</li>
        <li><strong>意識不清：</strong> 意識混亂、言語不清或難以喚醒。</li>
        <li><strong>皮膚/嘴唇/指甲床發青：</strong> 缺氧造成膚色發紫或發白。</li>
        <li><strong>生理機能受阻：</strong> 無法進食、喝水或服用藥物。</li>
        <li><strong>尿量顯著減少：</strong> 過去 24 小時無尿或尿量顯著減少。</li>
        <li><strong>生命徵象異常：</strong> 收縮壓 &lt; 90 mmHg，或無發燒下心跳 &gt; 100 次/分。</li>
      </ul>
    </div>
  </div>

  <div class="section-title danger">🔴 第一類：絕對不可併用之藥物 (Contraindicated) - 須停藥 8 天</div>
  <table class="med-table contraindicated">
    <colgroup>
      <col style="width: 35%;">
      <col style="width: 65%;">
    </colgroup>
    <thead>
      <tr>
        <th>藥品名稱 (學名 / 商品名)</th>
        <th>交互作用警語與臨床處置建議</th>
      </tr>
    </thead>
    <tbody>
      ${contraRows}
    </tbody>
  </table>

  <div class="section-title warning">🟡 第二類：需調整/減量之交互作用藥物 (Interactive) - 須密切監測或暫停 8 天</div>
  <table class="med-table interactive">
    <colgroup>
      <col style="width: 35%;">
      <col style="width: 65%;">
    </colgroup>
    <thead>
      <tr>
        <th>藥品名稱 (學名 / 商品名)</th>
        <th>交互作用警語與臨床處置建議</th>
      </tr>
    </thead>
    <tbody>
      ${interRows}
    </tbody>
  </table>

  <div class="footer">
    ※ 本單張經「新阿山哥醫學計算機」系統輔助比對生成。用藥調整請務必遵照臨床醫師或藥師之專業指示。<br>
    © 臨床藥學與用藥安全查核單張 A4 標準格式
  </div>
</body>
</html>`;

    setPrintHtml(html);
    setIsPrintDialogOpen(true);
  };

  const handlePrint = () => {
    let content = "";
    if (editorRef.current) {
      content = editorRef.current.innerHTML;
    } else {
      const match = printHtml.match(/<body>([\s\S]*?)<\/body>/i);
      content = match ? match[1] : printHtml;
    }

    const stylesMatch = printHtml.match(/<style>([\s\S]*?)<\/style>/i);
    const styles = stylesMatch ? stylesMatch[1] : "";

    const finalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Paxlovid 用藥配合衛教單張</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(finalHtml);
      iframeDoc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
      setIsPrintDialogOpen(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title3>💊 Paxlovid 交互作用比對引擎</Title3>
        <div className={styles.controlRow}>
          <Button
            icon={<ClipboardPaste24Regular />}
            appearance="primary"
            onClick={handlePaste}
          >
            貼上雲端藥歷
          </Button>
          <Button
            icon={<Delete24Regular />}
            disabled={!inputText && results.length === 0}
            onClick={handleClear}
          >
            清除內容
          </Button>
          <Button
            icon={<Print24Regular />}
            disabled={!categorizedResults || getSelectedCount() === 0}
            onClick={generatePrintHtml}
          >
            列印衛教單張 ({categorizedResults ? getSelectedCount() : 0})
          </Button>
        </div>
      </div>

      <Textarea
        className={styles.textarea}
        placeholder="在此處貼上健保雲端藥歷文字..."
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          handleSearch(e.target.value);
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Search24Regular />
        <Input
          placeholder="手動輸入單一藥名查詢 (例如: Sildenafil, Herbesser)..."
          style={{ flexGrow: 1 }}
          value={manualSearch}
          onChange={(e) => {
            const val = e.target.value;
            setManualSearch(val);
            if (val.trim().length > 1) {
              handleSearch(val);
            } else if (val.trim().length === 0 && inputText.trim().length === 0) {
              setResults([]);
              setCategorizedResults(null);
            } else if (val.trim().length === 0 && inputText.trim().length > 0) {
              handleSearch(inputText);
            }
          }}
        />
      </div>

      {manualSearch.trim().length > 1 && results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px", width: "100%" }}>
          <Text weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
            🔍 找到 {results.length} 筆資料庫交互作用符合項：
          </Text>
          {results.map((item, idx) => {
            // Use the same classification logic as paxlovidParser.ts:
            // proh + dont => contraindicated; pote => interactive (needs adjustment)
            const textLower = item.text.toLowerCase();
            const genericLower = (item.generic || "").toLowerCase();
            const brandLower = (item.brand || "").toLowerCase();
            const combined = `${textLower} ${genericLower} ${brandLower}`;
            const isContra =
              proh.some(k => combined.includes(k)) ||
              dont.some(k => combined.includes(k)) ||
              item.text.includes("絕對不可併用");
            const cardStyle = isContra ? styles.cardDanger : styles.cardWarning;
            const badgeClass = isContra ? styles.badgeDanger : styles.badgeWarning;
            const badgeText = isContra ? "絕對不可併用" : "需調整/減量";

            return (
              <Card key={idx} className={cardStyle} style={{ width: "100%" }}>
                <CardHeader
                  header={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <Text weight="bold" size={400}>
                        {item.brand} ({item.generic})
                      </Text>
                      <span className={`${styles.badge} ${badgeClass}`}>{badgeText}</span>
                    </div>
                  }
                  description={
                    <Text size={200} style={{ display: "block", marginTop: "4px" }}>
                      {item.text}
                    </Text>
                  }
                />
              </Card>
            );
          })}
        </div>
      )}

      {categorizedResults ? (
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", width: "100%" }}>
          {/* Left Column: UI interactive cards */}
          <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: "16px", minWidth: "0px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text weight="semibold">🔍 比對分析結果：</Text>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button size="small" onClick={() => setAllPrintStatus(true)}>
                  列印品項全選
                </Button>
                <Button size="small" onClick={() => setAllPrintStatus(false)}>
                  列印品項全不選
                </Button>
              </div>
            </div>

            {/* 1. Contraindicated Group */}
            {categorizedResults.contraindicated.length > 0 && (
              <div className={styles.resultContainer}>
                <Text weight="bold" style={{ color: tokens.colorPaletteRedForeground3 }}>
                  🔴 Paxlovid 不可併用的藥（需停藥 8 天）：
                </Text>
                {categorizedResults.contraindicated.map((item) => (
                  <Card key={item.id} className={styles.cardDanger}>
                    <CardHeader
                      header={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Checkbox
                              checked={item.selectedForPrint}
                              onChange={(_, data) => toggleItemPrint("contraindicated", item.id, !!data.checked)}
                            />
                            <Text weight="bold" size={400}>
                              {item.brandName || item.genericName || "比對藥物"}
                            </Text>
                            {item.isDuplicate && (
                              <span 
                                style={{ 
                                  marginLeft: '8px', 
                                  fontSize: '10px', 
                                  backgroundColor: tokens.colorPaletteRedBackground1, 
                                  color: tokens.colorPaletteRedForeground1, 
                                  padding: '1px 6px', 
                                  borderRadius: '4px',
                                  border: `1px solid ${tokens.colorPaletteRedBorderActive}`,
                                  fontWeight: 'bold'
                                }}
                              >
                                ⚠️ 重複 {item.selectedForPrint ? "(已選最新)" : "(歷程舊藥)"}
                              </span>
                            )}
                          </div>
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>絕對不可併用</span>
                        </div>
                      }
                      description={
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <Text size={200} style={{ color: tokens.colorNeutralForeground4, wordBreak: "break-all" }}>
                            {item.cleanLineScreen}
                          </Text>
                          {(item.visitDate || item.source) && (
                            <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: tokens.colorNeutralForeground3 || "#888", marginTop: "2px" }}>
                              {item.visitDate && <span>📅 就醫日期：{item.visitDate}</span>}
                              {item.source && <span>🏥 來源：{item.source}{item.visitType ? ` (${item.visitType})` : ""}</span>}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Card>
                ))}
              </div>
            )}

            {/* 2. Interactive Group */}
            {categorizedResults.interactive.length > 0 && (
              <div className={styles.resultContainer}>
                <Text weight="bold" style={{ color: tokens.colorPalettePeachBorderActive }}>
                  🟡 Paxlovid 有交互作用的藥（需減量或停藥 8 天）：
                </Text>
                {categorizedResults.interactive.map((item) => (
                  <Card key={item.id} className={styles.cardWarning}>
                    <CardHeader
                      header={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Checkbox
                              checked={item.selectedForPrint}
                              onChange={(_, data) => toggleItemPrint("interactive", item.id, !!data.checked)}
                            />
                            <Text weight="bold" size={400}>
                              {item.brandName || item.genericName || "比對藥物"}
                            </Text>
                            {item.isDuplicate && (
                              <span 
                                style={{ 
                                  marginLeft: '8px', 
                                  fontSize: '10px', 
                                  backgroundColor: tokens.colorPaletteYellowBackground1, 
                                  color: tokens.colorPaletteYellowForeground1 || "#856404", 
                                  padding: '1px 6px', 
                                  borderRadius: '4px',
                                  border: `1px solid ${tokens.colorPaletteYellowBorderActive || "#ffeeba"}`,
                                  fontWeight: 'bold'
                                }}
                              >
                                ⚠️ 重複 {item.selectedForPrint ? "(已選最新)" : "(歷程舊藥)"}
                              </span>
                            )}
                          </div>
                          <span className={`${styles.badge} ${styles.badgeWarning}`}>需調整/減量</span>
                        </div>
                      }
                      description={
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <Text size={200} style={{ color: tokens.colorNeutralForeground4, wordBreak: "break-all" }}>
                            {item.cleanLineScreen}
                          </Text>
                          {(item.visitDate || item.source) && (
                            <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: tokens.colorNeutralForeground3 || "#888", marginTop: "2px" }}>
                              {item.visitDate && <span>📅 就醫日期：{item.visitDate}</span>}
                              {item.source && <span>🏥 來源：{item.source}{item.visitType ? ` (${item.visitType})` : ""}</span>}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Card>
                ))}
              </div>
            )}

            {/* 3. Safe Group */}
            {categorizedResults.safe.length > 0 && (
              <div className={styles.resultContainer}>
                <Text weight="bold" style={{ color: tokens.colorPaletteGreenForeground3 || "green" }}>
                  🟢 吃 Paxlovid 時無需停藥：
                </Text>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", backgroundColor: tokens.colorNeutralBackground3, padding: "12px", borderRadius: "6px" }}>
                  {categorizedResults.safe.map((item) => (
                    <Text key={item.id} size={200} style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                      • {item.cleanLineScreen}
                    </Text>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Copyable Text Report */}
          <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: "12px", minWidth: "0px" }}>
            <Card style={{ height: "100%", minHeight: "500px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <Text weight="semibold">📋 格式化文字報告輸出：</Text>
                <Button appearance="primary" size="small" onClick={handleCopyText}>
                  {copied ? "已複製報告！" : "複製文字報告"}
                </Button>
              </div>
              <Textarea
                readOnly
                style={{ width: "100%", height: "450px", fontFamily: "monospace", fontSize: "12px", resize: "none" }}
                value={generateTextReport(categorizedResults)}
              />
            </Card>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: tokens.colorNeutralForeground4 }}>
          🟢 未發現嚴重之交互作用品項。請手動輸入關鍵字或貼上文字以檢測。
        </div>
      )}

      {/* Print Preview Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={(_, data) => setIsPrintDialogOpen(data.open)}>
        <DialogSurface style={{ maxWidth: "800px", width: "100%" }}>
          <DialogBody>
            <DialogTitle>📋 衛教單張列印預覽與編輯</DialogTitle>
            <DialogContent>
              <Text size={300} style={{ display: "block", marginBottom: "12px", color: tokens.colorNeutralForeground4 }}>
                您可以在下方直接點擊文字進行修改，調整完成後點擊「確定並列印」。
              </Text>
              <div
                ref={editorRef}
                key={printHtml}
                contentEditable
                className={styles.editorArea}
                dangerouslySetInnerHTML={{ __html: printHtml }}
                style={{ outline: "none" }}
              />
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">取消</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handlePrint}>確定並列印</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
