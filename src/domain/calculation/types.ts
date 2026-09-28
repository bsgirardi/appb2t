export type Technology = 'FDM' | 'RESIN';
export type DecimalText = string;
export interface PrinterValues { acquisitionCost:string; amortizationMonths:number; daysPerMonth:number; hoursPerDay:string; watts:string }
export interface SettingsValues { energyRate:string; maintenancePercent:string; failurePercent:string; finishingPercent:string; fixation:string; markupPercent:string }
export interface CalculationInput { technology:Technology; consumption:string; hours:number; minutes:number; materialPrice:string; printer:PrinterValues; settings:SettingsValues }
export interface CalculationResult { material:string; energy:string; hourlyMachine:string; machine:string; maintenance:string; subtotal:string; failure:string; finishing:string; fixation:string; total:string; profit:string; sale:string }
export interface MaterialDTO { id:string; name:string; technology:Technology; price:string; active:boolean; version:number }
export interface PrinterDTO extends PrinterValues { id:string; name:string; technology:Technology; active:boolean; version:number }
export interface SettingsDTO extends SettingsValues { version:number }
export interface CalculatorData { materials:MaterialDTO[]; printers:PrinterDTO[]; settings:SettingsDTO|null; loadedAt:string }
