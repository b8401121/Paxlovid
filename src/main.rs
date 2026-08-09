#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use eframe::egui;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaxlovidInteraction {
    pub generic: String,
    pub brand: String,
    pub severity: String,
    pub mechanism: String,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MedicalData {
    pub paxlovid_interactions: Vec<PaxlovidInteraction>,
}

#[derive(Debug, Clone)]
pub struct ParsedLineItem {
    pub id: String,
    pub raw_line: String,
    pub drug_name: String,
    pub visit_date: String,
    pub match_keyword: String,
    pub severity: String, // "contraindicated", "interactive", "safe", "unknown"
    pub recommendation: String,
    pub mechanism: String,
    pub clean_line_screen: String,
    pub clean_line_print: String,
    pub selected_for_print: bool,
}

#[derive(Debug, Clone, Default)]
pub struct CategorizedResults {
    pub contraindicated: Vec<ParsedLineItem>,
    pub interactive: Vec<ParsedLineItem>,
    pub safe: Vec<ParsedLineItem>,
    pub unknown: Vec<ParsedLineItem>,
}

// Global HTA Data lists
const PROH_LIST: &[&str] = &[
    "paxlovid", "molnupiravir", "veklury", "remdesivir", "isavuconazole", "thioridazine",
    "ziprasidone", "triamcinolone", "voriconazole", "zuclopenthixol", "cobicistat", "darunavir",
    "dasabuvir", "atazanavir", "aprepitant", "bedaquiline", "chloroquine", "orkambi",
    "dihydroergotamine", "elbasvir", "grazoprevir", "enzalutamide", "ergometrine", "ergonovine",
    "ergotamine", "glecaprevir", "pibrentasvir", "ivosidenib", "methylergometrine", "methylergonovine",
    "pimozide", "rifampicin", "rifapentine", "dronedarone", "amiodarone", "carbamazepine",
    "phenobarbital", "phenobarbitone", "phenytoin"
];

const DONT_LIST: &[&str] = &[
    "umbralisib", "sonidegib", "pralsetinib", "pexidartinib", "pemigatinib", "mobocertinib",
    "larotrectinib", "entrectinib", "avanafil", "piroxicam", "macitentan", "bexarotene",
    "bulevirtide", "cariprazine", "cenobamate", "darifenacin", "eletriptan", "enasidenib",
    "finerenone", "flibanserin", "infigratinib", "ivacaftor/lumacaftor", "lomitapide", "lorlatinib",
    "naloxegol", "rimegepant", "silodosin", "sorafenib", "suvorexant", "tolvaptan", "toremifene",
    "ubrogepant", "vardenafil", "vorapaxar", "avapritinib", "crizotinib", "dabrafenib", "mitotane",
    "tazemetostat", "tepotinib", "topotecan", "vemurafenib", "cobimetinib", "regorafenib",
    "acalabrutinib", "alfuzosin", "aliskiren", "amiodarone", "apalutamide", "apixaban", "bepridil",
    "bosentan", "bosutinib", "carbamazepine", "clorazepate", "clozapine", "colchicine", "crizotinib",
    "dabigatran", "dalfampridine", "dapsone", "dasatinib", "diazepam", "digoxin", "disopyramide",
    "doxazosin", "edoxaban", "eplerenone", "ergotamine", "everolimus", "felodipine", "fentanyl",
    "flecainide", "flurazepam", "ibrutinib", "ivabradine", "ketoconazole", "lapatinib", "letermovir",
    "lurasidone", "maraviroc", "midazolam", "nifedipine", "nilotinib", "nimodipine", "nisoldipine",
    "olaparib", "oxycodone", "paclitaxel", "palbociclib", "pazopanib", "phenytoin", "pimozide",
    "propafenone", "quetiapine", "quinidine", "ranolazine", "reboxetine", "rifabutin", "rifampicin",
    "rivaroxaban", "salmeterol", "saxagliptin", "sildenafil", "simvastatin", "sirolimus",
    "solifenacin", "sunitinib", "tacrolimus", "tadalafil", "tamsulosin", "ticagrelor", "tizanidine",
    "tolterodine", "triazolam", "trimipramine", "venetoclax", "vinblastine", "vincristine"
];

const SAFE_LIST: &[&str] = &[
    "acetaminophen", "ibuprofen", "naproxen", "celecoxib", "aspirin", "metformin", "glimepiride",
    "gliclazide", "linagliptin", "sitagliptin", "empagliflozin", "dapagliflozin", "amlodipine",
    "losartan", "valsartan", "irbesartan", "candesartan", "olmesartan", "telmisartan", "enalapril",
    "lisinopril", "ramipril", "atenolol", "bisoprolol", "metoprolol", "carvedilol", "atorvastatin",
    "rosuvastatin", "pravastatin", "ezetimibe", "levothyroxine", "pantoprazole", "lansoprazole",
    "rabeprazole", "esomeprazole", "famotidine", "furosemide", "spironolactone", "hydrochlorothiazide",
    "cetirizine", "loratadine", "fexofenadine", "levocetirizine", "montelukast", "ambroxol",
    "dextromethorphan", "acetylcysteine", "guaifenesin", "prednisolone", "dexamethasone"
];

fn load_medical_data() -> Option<MedicalData> {
    let raw = include_str!("medical_data.json");
    serde_json::from_str(raw).ok()
}

pub fn parse_cloud_prescription(text: &str) -> CategorizedResults {
    let mut results = CategorizedResults::default();
    if text.trim().is_empty() {
        return results;
    }

    let medical_data = load_medical_data();
    let interactions = medical_data.as_ref().map(|d| &d.paxlovid_interactions);

    let blacklist = [
        "機轉 / 臨床表現", "建議：", "嚴重程度：", "發生速度：",
        "分類(專科", "發現", "Paxlovid", "列印日期:"
    ];

    let lines_raw: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    let mut lines = Vec::new();

    for r_line in lines_raw {
        if blacklist.iter().any(|bad| r_line.contains(bad)) {
            continue;
        }
        let target_line = if let Some(pos) = r_line.find("原本用藥：") {
            r_line[pos + 15..].trim()
        } else {
            r_line
        };
        if !target_line.is_empty() {
            lines.push(target_line.to_string());
        }
    }

    if lines.is_empty() && !text.trim().is_empty() {
        lines.push(text.trim().to_string());
    }

    let mut seen_drugs = HashSet::new();

    for (idx, line) in lines.iter().enumerate() {
        let line_u = line.to_uppercase();
        let mut matched = false;

        // Check against medical_data.json interactions
        if let Some(interaction_list) = interactions {
            for item in interaction_list {
                let gen_u = item.generic.to_uppercase();
                let brand_u = item.brand.to_uppercase();

                let keywords: Vec<&str> = gen_u
                    .split(&['+', ','][..])
                    .chain(brand_u.split(&['/', ','][..]))
                    .map(|s| s.trim())
                    .filter(|s| s.len() > 2)
                    .collect();

                for kw in keywords {
                    if line_u.contains(kw) {
                        matched = true;
                        let item_id = format!("{}_{}", idx, kw);
                        if seen_drugs.insert(item_id.clone()) {
                            let severity_cat = if item.severity.contains("禁忌") || item.severity.contains("Contraindicated") {
                                "contraindicated"
                            } else {
                                "interactive"
                            };

                            let parsed = ParsedLineItem {
                                id: item_id,
                                raw_line: line.clone(),
                                drug_name: format!("{} / {}", item.generic, item.brand),
                                visit_date: "".to_string(),
                                match_keyword: kw.to_string(),
                                severity: severity_cat.to_string(),
                                recommendation: item.recommendation.clone(),
                                mechanism: item.mechanism.clone(),
                                clean_line_screen: format!("🛑 {} (成分: {}) - 建議: {}", line, item.generic, item.recommendation),
                                clean_line_print: format!("• {} : {}", item.generic, item.recommendation),
                                selected_for_print: true,
                            };

                            if severity_cat == "contraindicated" {
                                results.contraindicated.push(parsed);
                            } else {
                                results.interactive.push(parsed);
                            }
                        }
                        break;
                    }
                }
                if matched {
                    break;
                }
            }
        }

        if matched {
            continue;
        }

        // HTA Data lists check
        let line_words: Vec<&str> = line_u.split_whitespace().collect();
        let mut hta_matched = false;

        for word in line_words {
            if word.len() < 3 {
                continue;
            }
            if PROH_LIST.iter().any(|&p| word.contains(&p.to_uppercase())) {
                results.contraindicated.push(ParsedLineItem {
                    id: format!("{}_{}", idx, word),
                    raw_line: line.clone(),
                    drug_name: line.clone(),
                    visit_date: "".to_string(),
                    match_keyword: word.to_string(),
                    severity: "contraindicated".to_string(),
                    recommendation: "禁忌併用，需停藥8天".to_string(),
                    mechanism: "強效 CYP3A 抑制交互作用".to_string(),
                    clean_line_screen: format!("⛔ {} - Paxlovid 禁忌藥物 (需停藥8天)", line),
                    clean_line_print: format!("• {} : 停藥8天", line),
                    selected_for_print: true,
                });
                hta_matched = true;
                break;
            } else if DONT_LIST.iter().any(|&d| word.contains(&d.to_uppercase())) {
                results.interactive.push(ParsedLineItem {
                    id: format!("{}_{}", idx, word),
                    raw_line: line.clone(),
                    drug_name: line.clone(),
                    visit_date: "".to_string(),
                    match_keyword: word.to_string(),
                    severity: "interactive".to_string(),
                    recommendation: "需減量或暫停使用8天".to_string(),
                    mechanism: "中/高度 CYP3A 交互作用".to_string(),
                    clean_line_screen: format!("⚠️ {} - 有交互作用 (需減量或停藥8天)", line),
                    clean_line_print: format!("• {} : 減量或停藥8天", line),
                    selected_for_print: true,
                });
                hta_matched = true;
                break;
            } else if SAFE_LIST.iter().any(|&s| word.contains(&s.to_uppercase())) {
                results.safe.push(ParsedLineItem {
                    id: format!("{}_{}", idx, word),
                    raw_line: line.clone(),
                    drug_name: line.clone(),
                    visit_date: "".to_string(),
                    match_keyword: word.to_string(),
                    severity: "safe".to_string(),
                    recommendation: "安全用藥，無需停藥".to_string(),
                    mechanism: "無顯著 CYP3A4 交互作用".to_string(),
                    clean_line_screen: format!("✅ {} - 安全用藥 (無需停藥)", line),
                    clean_line_print: format!("• {} : 正常使用", line),
                    selected_for_print: false,
                });
                hta_matched = true;
                break;
            }
        }

        if !hta_matched {
            results.unknown.push(ParsedLineItem {
                id: format!("{}_unk", idx),
                raw_line: line.clone(),
                drug_name: line.clone(),
                visit_date: "".to_string(),
                match_keyword: "".to_string(),
                severity: "unknown".to_string(),
                recommendation: "未在常見清單中，請人工確認".to_string(),
                mechanism: "未知/未歸類".to_string(),
                clean_line_screen: format!("❓ {} - 未定類藥物 (請人工核對)", line),
                clean_line_print: format!("• {} : 請人工確認", line),
                selected_for_print: false,
            });
        }
    }

    results
}

struct PaxlovidApp {
    input_text: String,
    search_query: String,
    results: CategorizedResults,
    notice_message: Option<(String, std::time::Instant)>,
}

impl Default for PaxlovidApp {
    fn default() -> Self {
        Self {
            input_text: String::new(),
            search_query: String::new(),
            results: CategorizedResults::default(),
            notice_message: None,
        }
    }
}

impl PaxlovidApp {
    fn generate_report(&self) -> String {
        let mut out = String::new();
        out.push_str("Paxlovid (口服抗病毒藥) 處方交互作用衛教單張\n");
        out.push_str("==============================================\n\n");

        out.push_str("■■■◤ 以下藥物需 [ 停藥 8 天 ] ◢■■■\n");
        let mut count_proh = 0;
        for item in &self.results.contraindicated {
            if item.selected_for_print {
                out.push_str(&format!("  {}\n", item.clean_line_print));
                count_proh += 1;
            }
        }
        if count_proh == 0 {
            out.push_str("  (無禁忌藥物)\n");
        }
        out.push_str("\n");

        out.push_str("■■■◤ 以下藥物需 [ 減量或停藥 8 天 ] ◢■■■\n");
        let mut count_inter = 0;
        for item in &self.results.interactive {
            if item.selected_for_print {
                out.push_str(&format!("  {}\n", item.clean_line_print));
                count_inter += 1;
            }
        }
        if count_inter == 0 {
            out.push_str("  (無顯著交互作用藥物)\n");
        }
        out.push_str("\n");

        out.push_str("----------------------------------------------\n");
        out.push_str("【注意事項】\n");
        out.push_str("1. Paxlovid 只吃 5 天，但藥效在體內長達 8 天，故有交互作用藥物需維持減量/暫停 8 天。\n");
        out.push_str("2. 清冠一號需同步暫停 5 天（以免造成腹瀉）。\n");
        out.push_str("3. 本藥錠不可磨粉或泡水，請整錠吞服。\n");

        out
    }
}

impl eframe::App for PaxlovidApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Notification banner timeout check
        if let Some((_, time)) = &self.notice_message {
            if time.elapsed().as_secs() > 3 {
                self.notice_message = None;
            }
        }

        egui::TopBottomPanel::top("header_panel").show(ctx, |ui| {
            ui.add_space(8.0);
            ui.horizontal(|ui| {
                ui.heading("💊 Paxlovid (Nirmatrelvir/Ritonavir) 用藥交互作用獨立檢查系統");
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.label(egui::RichText::new("100% 獨立免安裝原生版 (Zero WebView2)").color(egui::Color32::LIGHT_BLUE));
                });
            });
            ui.add_space(8.0);
        });

        egui::TopBottomPanel::bottom("footer_panel").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label("Paxlovid Standalone Interaction Checker | Native Win32 Edition");
                if let Some((msg, _)) = &self.notice_message {
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.label(egui::RichText::new(msg).color(egui::Color32::GREEN).strong());
                    });
                }
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                // Quick Action Buttons
                ui.group(|ui| {
                    ui.horizontal(|ui| {
                        ui.label("⚡ 快速複製:");
                        if ui.button("ICD10: U07.1").clicked() {
                            ui.output_mut(|o| o.copied_text = "U07.1".to_string());
                            self.notice_message = Some(("已複製 ICD10: U07.1".to_string(), std::time::Instant::now()));
                        }
                        if ui.button("ICD10: Z20822").clicked() {
                            ui.output_mut(|o| o.copied_text = "Z20822".to_string());
                            self.notice_message = Some(("已複製 ICD10: Z20822".to_string(), std::time::Instant::now()));
                        }
                        if ui.button("Paxlovid 1N1R (eGFR 30-60)").clicked() {
                            ui.output_mut(|o| o.copied_text = "Paxlovid 1N1R BID".to_string());
                            self.notice_message = Some(("已複製 Paxlovid 1N1R 處方".to_string(), std::time::Instant::now()));
                        }
                        if ui.button("Paxlovid 2N1R (eGFR > 60)").clicked() {
                            ui.output_mut(|o| o.copied_text = "Paxlovid 2N1R BID".to_string());
                            self.notice_message = Some(("已複製 Paxlovid 2N1R 處方".to_string(), std::time::Instant::now()));
                        }
                        if ui.button("Molnupiravir 4# Q12H").clicked() {
                            ui.output_mut(|o| o.copied_text = "Molnupiravir 4# Q12H".to_string());
                            self.notice_message = Some(("已複製 Molnupiravir 處方".to_string(), std::time::Instant::now()));
                        }
                    });
                });

                ui.add_space(8.0);

                // Input Section
                ui.group(|ui| {
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new("📋 請貼上健保雲端用藥文字或手動輸入藥名:").strong());
                        if ui.button("📋 一鍵貼上剪貼簿").clicked() {
                            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                                if let Ok(text) = clipboard.get_text() {
                                    self.input_text = text.clone();
                                    self.results = parse_cloud_prescription(&text);
                                    self.notice_message = Some(("已成功自剪貼簿貼上並解析！".to_string(), std::time::Instant::now()));
                                }
                            }
                        }
                        if ui.button("🗑️ 清空").clicked() {
                            self.input_text.clear();
                            self.results = CategorizedResults::default();
                        }
                    });

                    let response = ui.add(
                        egui::TextEdit::multiline(&mut self.input_text)
                            .desired_rows(5)
                            .desired_width(f32::INFINITY)
                            .hint_text("在此直接貼上健保雲端用藥清單（例如：100101 Amlodipine 5mg...）")
                    );

                    if response.changed() {
                        self.results = parse_cloud_prescription(&self.input_text);
                    }
                });

                ui.add_space(8.0);

                // Filter / Search section
                ui.horizontal(|ui| {
                    ui.label("🔍 關鍵字即時搜尋:");
                    ui.text_edit_singleline(&mut self.search_query);
                    if ui.button("📋 複製衛教單張報告").clicked() {
                        let rpt = self.generate_report();
                        ui.output_mut(|o| o.copied_text = rpt);
                        self.notice_message = Some(("衛教報告已複製至剪貼簿！".to_string(), std::time::Instant::now()));
                    }
                });

                ui.add_space(8.0);

                // Display Results Category Cards

                // 1. Contraindicated Section (Red)
                if !self.results.contraindicated.is_empty() {
                    ui.group(|ui| {
                        ui.horizontal(|ui| {
                            ui.heading(egui::RichText::new("🔴 禁忌藥物 (需停藥 8 天)").color(egui::Color32::RED).strong());
                            ui.label(format!("({} 項)", self.results.contraindicated.len()));
                        });
                        ui.separator();
                        for item in &mut self.results.contraindicated {
                            if !self.search_query.is_empty() && !item.raw_line.to_lowercase().contains(&self.search_query.to_lowercase()) {
                                continue;
                            }
                            ui.horizontal(|ui| {
                                ui.checkbox(&mut item.selected_for_print, "列印");
                                ui.colored_label(egui::Color32::LIGHT_RED, &item.clean_line_screen);
                            });
                        }
                    });
                    ui.add_space(8.0);
                }

                // 2. Interactive Section (Orange)
                if !self.results.interactive.is_empty() {
                    ui.group(|ui| {
                        ui.horizontal(|ui| {
                            ui.heading(egui::RichText::new("🟠 交互作用藥物 (需減量或停藥 8 天)").color(egui::Color32::GOLD).strong());
                            ui.label(format!("({} 項)", self.results.interactive.len()));
                        });
                        ui.separator();
                        for item in &mut self.results.interactive {
                            if !self.search_query.is_empty() && !item.raw_line.to_lowercase().contains(&self.search_query.to_lowercase()) {
                                continue;
                            }
                            ui.horizontal(|ui| {
                                ui.checkbox(&mut item.selected_for_print, "列印");
                                ui.colored_label(egui::Color32::YELLOW, &item.clean_line_screen);
                            });
                        }
                    });
                    ui.add_space(8.0);
                }

                // 3. Safe Section (Green)
                if !self.results.safe.is_empty() {
                    ui.group(|ui| {
                        ui.horizontal(|ui| {
                            ui.heading(egui::RichText::new("🟢 常見安全藥物 (吃 Paxlovid 時無需停藥)").color(egui::Color32::GREEN).strong());
                            ui.label(format!("({} 項)", self.results.safe.len()));
                        });
                        ui.separator();
                        for item in &self.results.safe {
                            if !self.search_query.is_empty() && !item.raw_line.to_lowercase().contains(&self.search_query.to_lowercase()) {
                                continue;
                            }
                            ui.label(egui::RichText::new(&item.clean_line_screen).color(egui::Color32::LIGHT_GREEN));
                        }
                    });
                    ui.add_space(8.0);
                }

                // 4. Unknown Section (Gray)
                if !self.results.unknown.is_empty() {
                    ui.group(|ui| {
                        ui.horizontal(|ui| {
                            ui.heading(egui::RichText::new("⚪ 未歸類用藥 (請人工核對)").color(egui::Color32::LIGHT_GRAY).strong());
                            ui.label(format!("({} 項)", self.results.unknown.len()));
                        });
                        ui.separator();
                        for item in &self.results.unknown {
                            if !self.search_query.is_empty() && !item.raw_line.to_lowercase().contains(&self.search_query.to_lowercase()) {
                                continue;
                            }
                            ui.label(&item.clean_line_screen);
                        }
                    });
                }
            });
        });
    }
}

fn main() -> eframe::Result<()> {
    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("Paxlovid (Nirmatrelvir/Ritonavir) 用藥交互作用獨立檢查系統 - 100% 免 WebView2 原生版")
            .with_inner_size([1100.0, 780.0])
            .with_min_inner_size([800.0, 600.0]),
        ..Default::default()
    };

    eframe::run_native(
        "Paxlovid Standalone",
        native_options,
        Box::new(|cc| {
            // Load Windows Traditional Chinese font (Microsoft JhengHei)
            let mut fonts = egui::FontDefinitions::default();
            let font_paths = [
                "C:\\Windows\\Fonts\\msjh.ttc",
                "C:\\Windows\\Fonts\\msjh.ttf",
                "C:\\Windows\\Fonts\\msjhbd.ttc",
                "C:\\Windows\\Fonts\\msjhbd.ttf",
                "C:\\Windows\\Fonts\\mingliu.ttc",
            ];

            let mut font_loaded = false;
            for path in font_paths {
                if let Ok(font_data) = std::fs::read(path) {
                    fonts.font_data.insert("custom_chinese".to_owned(), egui::FontData::from_owned(font_data));
                    fonts.families.get_mut(&egui::FontFamily::Proportional).unwrap().insert(0, "custom_chinese".to_owned());
                    fonts.families.get_mut(&egui::FontFamily::Monospace).unwrap().insert(0, "custom_chinese".to_owned());
                    font_loaded = true;
                    break;
                }
            }

            if font_loaded {
                cc.egui_ctx.set_fonts(fonts);
            }

            Ok(Box::new(PaxlovidApp::default()))
        }),
    )
}
