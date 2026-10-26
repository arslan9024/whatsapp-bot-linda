/**
 * PHASE 5: Database Organization System (Session 16)
 * 
 * OrganizedSheets maps each project to its new organized Google Sheet
 * These sheets contain:
 *   - Master Data tab: All deduplicated records with unique codes (P001, C001, F001)
 *   - Code Reference Map: Lookup table
 *   - Data Viewer: Interactive filterable view
 *   - Contacts, Properties, Financials: Separated by type
 *   - Analytics: Deduplication metrics
 *   - Metadata: Transformation details
 * 
 * Usage: Get organized sheet ID for Akoya:
 *   import { OrganizedSheets } from './DamacHills2List.js';
 *   const akoyaOrgId = OrganizedSheets.Akoya;  // Use in message handlers
 * 
 * Format: 'ProjectName': 'Google Sheet ID string'
 * Sheet ID found in URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
 */
export const OrganizedSheets = {
  // DAMAC Hills 2 Projects - Organized Sheets
  Akoya: process.env.AKOYA_ORGANIZED_SHEET_ID || '',  // Set in .env or manually
  Janusia: process.env.JANUSIA_ORGANIZED_SHEET_ID || '',
  Sanctuary: process.env.SANCTUARY_ORGANIZED_SHEET_ID || '',
  // Add more as projects are organized
};

/**
 * Legacy sheets - kept for backward compatibility
 * New implementations should use OrganizedSheets instead
 */
export const D2Sheets=[
{ProjectID:"1", ProjectName:"Vardon", ProjectSheetID:""},
{ProjectID:"2", ProjectName:"Sanctnary", ProjectSheetID:""},
{ProjectID:"3", ProjectName:"", ProjectSheetID:""},
{ProjectID:"4", ProjectName:"", ProjectSheetID:""},
{ProjectID:"5", ProjectName:"", ProjectSheetID:""},
{ProjectID:"6", ProjectName:"", ProjectSheetID:""},
{ProjectID:"7", ProjectName:"", ProjectSheetID:""},
{ProjectID:"8", ProjectName:"", ProjectSheetID:""},
{ProjectID:"9", ProjectName:"Janusia", ProjectSheetID:"1p0Fngwst3BEv1gl40J02o08jDcVETs67zFUv-wTED9s"},
{ProjectID:"10", ProjectName:"", ProjectSheetID:""},
{ProjectID:"11", ProjectName:"", ProjectSheetID:""},
{ProjectID:"12", ProjectName:"", ProjectSheetID:""},
{ProjectID:"13", ProjectName:"", ProjectSheetID:""},
{ProjectID:"14", ProjectName:"Claret", ProjectSheetID:""},
{ProjectID:"15", ProjectName:"Juniper", ProjectSheetID:""},
{ProjectID:"16", ProjectName:"", ProjectSheetID:""},
{ProjectID:"17", ProjectName:"Primrose", ProjectSheetID:""},
{ProjectID:"18", ProjectName:"", ProjectSheetID:""},
{ProjectID:"19", ProjectName:"", ProjectSheetID:""},
{ProjectID:"20", ProjectName:"Aster", ProjectSheetID:""},
{ProjectID:"21", ProjectName:"Coursetia", ProjectSheetID:""},
{ProjectID:"22", ProjectName:"", ProjectSheetID:""},
{ProjectID:"23", ProjectName:"", ProjectSheetID:""},
{ProjectID:"24", ProjectName:"", ProjectSheetID:""},
{ProjectID:"25", ProjectName:"", ProjectSheetID:""},
{ProjectID:"26", ProjectName:"", ProjectSheetID:""},
{ProjectID:"27", ProjectName:"", ProjectSheetID:""},
{ProjectID:"28", ProjectName:"", ProjectSheetID:""},
{ProjectID:"29", ProjectName:"", ProjectSheetID:""},
{ProjectID:"30", ProjectName:"", ProjectSheetID:""},
{ProjectID:"31", ProjectName:"", ProjectSheetID:""},
{ProjectID:"32", ProjectName:"Amargo", ProjectSheetID:""},


];

export const D2Array=[
    "Sanctnary", "D2-2023","Oxygen2023","DH2I2022",
    "Akoya202301","SidraOne", "Navitas",
    "Viridis2023",
    "Odora2023",
    "Trixis2023",
    "Primrose2023",
    "Claret2023",
    "Pacifica2023",
    "Janusia2023",
    "Centaury2023",
    "Aster-Sample1",
    
];
export const ProjectsInD2=[
"Akoya",
"Albizia",
"Basswood",
"Mimosa",
"Amargo",
"Avencia",
"Avencia-2",
"Victoria",
"Trixis",  
"Janusia",
"Amazonia-Ex",
"Sycamore", 
"Acuna",
"Amazonia", 
"Sanctnary",
"Pacifica",
"Centaury",
"Aster","Coursetia",
"Viridis",
    "Aquilegia",
    "Zinnia",
    "Odora",
    "Mulberry",
    "Hawthorn",
    "Juniper",  
    "Primrose", 
    "Claret",
];
