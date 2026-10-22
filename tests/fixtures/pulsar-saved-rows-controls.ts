// HAND-WRITTEN CONTROL FILES in the recovered saved-row writer layout (docs/PULSAR-SAVED-ROWS.md). They are UI controls:
// not CLEA output, not observations, not acquired data and not a writer oracle. Shared by the standalone viewer spec
// (tests/pulsar-saved-rows.spec.ts) and the actual App flows (tests/radio-saved-rows-app.spec.ts).
export const HEADER = '"Object","Freq (MHz)","Gain (Rel)","Ref (Secs)","Vert (Secs)","Horz (Rel)","Start (JD)","Comments","Data Pts","Del T (msec)","Aperture (M)","File Name"';
export const ROW_A = '"PSR B0329+54",408.00,1.000,0.123456,"",5.0000E-01,49999.12345678,"first, pulse",1000,10.00,26,"C:\\CLEA\\PULSARS\\B0329.PLR"';
export const ROW_B = '"PSR B0531+21",1420.00,2.500,"",0.033000,"",50000.50000000,"",2000,1.00,300';
export const ROW_C = '"PSR B1919+21",430.00,0.500,1.337000,0.250000,-1.2345E+02,49000.00000000,"Crab? no, B1919",500,33.33,40,"D:\\data\\b1919+21.plr"';
export const CONTROL = ['"10/22/2026","9:41:07 AM"', '"Table Number: 3"', '', '"Ada Student"', '"Ben Student"', '', HEADER, ROW_A, ROW_A, ROW_B, ROW_C].map(l => l + '\r\n').join('');
export const OTHER = ['"2026-10-22","21:41"', '"Table Number: "', '', '', HEADER, ROW_B, '"<b>Markup</b>",1.00,1.000,"","","",1.00000000,"<img src=x onerror=alert(1)>",1,1.00,1,"x.plr"'].map(l => l + '\n').join('');
// SYNTHETIC .PLR recording for the existing analysis panel (same form as tests/pulsar-analysis.spec.ts).
export const PLR = ["'SYNTHETIC E2E',40,1", '430.00,1420.00,0', '1.000,0.000,1.000', '49999.12345678,0.01', ...Array.from({ length: 1000 }, (_, i) => `${(i % 50) / 10},10,0`)].join('\r\n') + '\r\n';
