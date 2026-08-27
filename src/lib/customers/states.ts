/**
 * The GST state/UT code master (28 states + 8 union territories = 36 entries)
 * — a customer/address's `state` free-text field becomes a `Select` over
 * these names (`CustomerCreateScreen`'s `AddressForm`), matching the GSTN
 * code list the backend resolves `place_of_supply_state` from by name. Two
 * codes in the 01–38 range are deliberately absent: `25` (the old Daman & Diu
 * code, retired when it merged into Dadra & Nagar Haveli in 2020 — see `26`)
 * and `28` (the old undivided Andhra Pradesh code, retired when the state
 * split into Telangana (`36`) and a new Andhra Pradesh (`37`) in 2014). `97`
 * ("Other Territory", used for embassies/offshore areas) is excluded outright
 * — no customer address is ever raised against it.
 */
export type IndianState = { code: string; name: string };

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

export function stateName(code: string): string | undefined {
  return INDIAN_STATES.find((s) => s.code === code)?.name;
}
